const axios = require('axios');
const logger = require('../utils/logger');

class N8NService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.N8N_BASE_URL,
      headers: {
        'X-N8N-API-KEY': process.env.N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });
  }

  async createBotWorkflow(bot, botConfig) {
    try {
      const workflow = this.buildBotWorkflow(bot, botConfig);

      const response = await this.client.post('/workflows', workflow);
      
      logger.info(`Workflow creado exitosamente para bot ${bot.id}:`, response.data.id);
      return response.data;
    } catch (error) {
      logger.error('Error creando workflow en n8n:', error);
      throw error;
    }
  }

  async activateWorkflow(workflowId) {
    try {
      const response = await this.client.post(`/workflows/${workflowId}/activate`);
      logger.info(`Workflow ${workflowId} activado exitosamente`);
      return response.data;
    } catch (error) {
      logger.error('Error activando workflow:', error);
      throw error;
    }
  }

  async deactivateWorkflow(workflowId) {
    try {
      const response = await this.client.post(`/workflows/${workflowId}/deactivate`);
      logger.info(`Workflow ${workflowId} desactivado exitosamente`);
      return response.data;
    } catch (error) {
      logger.error('Error desactivando workflow:', error);
      throw error;
    }
  }

  async updateWorkflow(workflowId, updates) {
    try {
      const response = await this.client.patch(`/workflows/${workflowId}`, updates);
      logger.info(`Workflow ${workflowId} actualizado exitosamente`);
      return response.data;
    } catch (error) {
      logger.error('Error actualizando workflow:', error);
      throw error;
    }
  }

  buildBotWorkflow(bot, botConfig) {
    return {
      name: `Bot WhatsApp - ${bot.name}`,
      active: false,
      nodes: [
        // Trigger: WhatsApp webhook
        {
          name: 'WhatsApp Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            httpMethod: 'POST',
            path: `whatsapp-${bot.id}`,
            responseMode: 'responseNode',
            options: {}
          }
        },
        // Parse WhatsApp message
        {
          name: 'Parse Message',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300],
          parameters: {
            functionCode: `
              const body = items[0].json.body;
              
              // Extraer información del mensaje de WhatsApp
              const message = {
                from: body.from || body.wa_id,
                message: body.text?.body || '',
                timestamp: body.timestamp || Date.now(),
                message_id: body.id,
                type: body.type || 'text'
              };
              
              return [{
                json: message
              }];
            `
          }
        },
        // Check if contact exists
        {
          name: 'Check Contact',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [650, 300],
          parameters: {
            method: 'POST',
            url: `${process.env.SUPABASE_URL}/functions/v1/check-contact`,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_ANON_KEY
            },
            body: `={{ JSON.stringify({ phone: $json.from, bot_id: "${bot.id}" }) }}`
          }
        },
        // Call DeepSeek for AI processing
        {
          name: 'AI Processing',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [850, 300],
          parameters: {
            method: 'POST',
            url: `${process.env.SUPABASE_URL}/functions/v1/process-ai`,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_ANON_KEY
            },
            body: `={{ JSON.stringify({ 
              message: $json.message, 
              phone: $json.from,
              bot_id: "${bot.id}",
              system_prompt: ${JSON.stringify(botConfig.system_prompt)}
            }) }}`
          }
        },
        // Execute action based on intent
        {
          name: 'Execute Action',
          type: 'n8n-nodes-base.switch',
          typeVersion: 1,
          position: [1050, 300],
          parameters: {
            dataType: 'string',
            value1: '={{$json.intent}}',
            rules: {
              string: [
                {
                  value1: 'agendar',
                  operation: 'equals'
                },
                {
                  value1: 'consulta',
                  operation: 'equals'
                },
                {
                  value1: 'venta',
                  operation: 'equals'
                }
              ]
            }
          }
        },
        // Send WhatsApp response
        {
          name: 'Send Response',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [1250, 300],
          parameters: {
            method: 'POST',
            url: 'https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages',
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`
            },
            body: `={{ JSON.stringify({
              messaging_product: "whatsapp",
              to: $json.from,
              type: "text",
              text: { body: $json.response }
            }) }}`
          }
        },
        // Save conversation to database
        {
          name: 'Save Conversation',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 1,
          position: [1450, 300],
          parameters: {
            method: 'POST',
            url: `${process.env.SUPABASE_URL}/functions/v1/save-conversation`,
            authentication: 'genericCredentialType',
            genericAuthType: 'httpHeaderAuth',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_ANON_KEY
            },
            body: `={{ JSON.stringify({
              bot_id: "${bot.id}",
              phone: $json.from,
              message: $json.message,
              response: $json.response,
              intent: $json.intent || 'general'
            }) }}`
          }
        },
        // Webhook response
        {
          name: 'Webhook Response',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [1650, 300],
          parameters: {
            options: {
              responseCode: 200,
              responseData: '{"status": "success"}'
            }
          }
        }
      ],
      connections: {
        'WhatsApp Webhook': {
          main: [
            [
              {
                node: 'Parse Message',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Parse Message': {
          main: [
            [
              {
                node: 'Check Contact',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Check Contact': {
          main: [
            [
              {
                node: 'AI Processing',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'AI Processing': {
          main: [
            [
              {
                node: 'Execute Action',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Execute Action': {
          main: [
            [
              {
                node: 'Send Response',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Send Response': {
          main: [
            [
              {
                node: 'Save Conversation',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Save Conversation': {
          main: [
            [
              {
                node: 'Webhook Response',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      settings: {
        executionOrder: 'v1'
      },
      staticData: null,
      meta: {
        templateCredsSetupCompleted: true
      }
    };
  }

  async getWorkflow(workflowId) {
    try {
      const response = await this.client.get(`/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      logger.error('Error obteniendo workflow:', error);
      throw error;
    }
  }

  async deleteWorkflow(workflowId) {
    try {
      const response = await this.client.delete(`/workflows/${workflowId}`);
      logger.info(`Workflow ${workflowId} eliminado exitosamente`);
      return response.data;
    } catch (error) {
      logger.error('Error eliminando workflow:', error);
      throw error;
    }
  }

  async getWorkflowExecutions(workflowId) {
    try {
      const response = await this.client.get(`/workflows/${workflowId}/executions`);
      return response.data;
    } catch (error) {
      logger.error('Error obteniendo ejecuciones del workflow:', error);
      throw error;
    }
  }
}

module.exports = new N8NService();