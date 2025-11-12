const axios = require('axios');
const logger = require('../utils/logger');

class DeepSeekService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async generateBotConfig({ business_type, description, automation_types, connect_calendar }) {
    try {
      const prompt = this.buildBotConfigPrompt({
        business_type,
        description,
        automation_types,
        connect_calendar
      });

      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en automatización de WhatsApp para pequeños negocios. Genera configuraciones precisas y efectivas para bots de WhatsApp.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const generatedConfig = response.data.choices[0].message.content;
      
      // Parsear la respuesta JSON
      const config = this.parseBotConfig(generatedConfig);
      
      logger.info('Configuración de bot generada exitosamente:', config);
      return config;
    } catch (error) {
      logger.error('Error generando configuración con DeepSeek:', error);
      
      // Retornar configuración por defecto en caso de error
      return this.getDefaultConfig({
        business_type,
        description,
        automation_types,
        connect_calendar
      });
    }
  }

  async processMessage(systemPrompt, message, conversationHistory = []) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Últimas 10 conversaciones
        { role: 'user', content: message }
      ];

      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages,
        temperature: 0.8,
        max_tokens: 1000
      });

      return {
        response: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error) {
      logger.error('Error procesando mensaje con DeepSeek:', error);
      throw error;
    }
  }

  async classifyIntent(message, context = {}) {
    try {
      const prompt = this.buildIntentClassificationPrompt(message, context);

      const response = await this.client.post('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un clasificador de intenciones para mensajes de WhatsApp. Analiza el mensaje y determina la intención principal.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const result = response.data.choices[0].message.content;
      return this.parseIntentClassification(result);
    } catch (error) {
      logger.error('Error clasificando intención:', error);
      return {
        intent: 'general',
        confidence: 0.5,
        entities: []
      };
    }
  }

  buildBotConfigPrompt({ business_type, description, automation_types, connect_calendar }) {
    return `
Crea una configuración detallada para un bot de WhatsApp para el siguiente negocio:

Tipo de negocio: ${business_type}
Descripción: ${description}
Tipos de automatización requeridos: ${automation_types.join(', ')}
${connect_calendar ? 'Requiere integración con Google Calendar' : 'No requiere Google Calendar'}

Genera un JSON con la siguiente estructura:
{
  "system_prompt": "Un prompt detallado que define la personalidad y comportamiento del bot",
  "automation_types": ["lista de tipos de automatización"],
  "available_actions": [
    {
      "name": "nombre de la acción",
      "description": "descripción de lo que hace",
      "trigger_words": ["palabras que activan esta acción"],
      "parameters": ["parámetros requeridos"]
    }
  ],
  "response_templates": {
    "greeting": "Mensaje de bienvenida",
    "goodbye": "Mensaje de despedida",
    "help": "Mensaje de ayuda",
    "error": "Mensaje de error"
  },
  "business_info": {
    "name": "Nombre del negocio",
    "type": "${business_type}",
    "services": ["lista de servicios principales"],
    "contact_info": "Información de contacto",
    "schedule": "Horario de atención"
  },
  "integrations": {
    "google_calendar": ${connect_calendar},
    "crm": true,
    "notifications": true
  }
}

El bot debe:
1. Sonar natural y profesional en español colombiano
2. Entender el contexto del negocio específico
3. Hacer preguntas relevantes para obtener información
4. Ofrecer opciones claras al usuario
5. Manejar errores gracefully
6. Ser persuasivo pero no agresivo

Responde SOLO con el JSON, sin explicaciones adicionales.`;
  }

  parseBotConfig(response) {
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Si no se puede parsear, retornar estructura por defecto
      return null;
    } catch (error) {
      logger.error('Error parseando configuración del bot:', error);
      return null;
    }
  }

  buildIntentClassificationPrompt(message, context) {
    return `
Clasifica la intención del siguiente mensaje de WhatsApp:

Mensaje: "${message}"

Contexto:
- Tipo de negocio: ${context.business_type || 'general'}
- Historial reciente: ${context.recent_messages || 'Ninguno'}

Las posibles intenciones son:
- agendar: Usuario quiere hacer una cita/reserva
- consulta: Usuario tiene una pregunta general
- venta: Usuario está interesado en comprar
- cancelar: Usuario quiere cancelar algo
- informacion: Usuario solicita información
- saludo: Mensaje de saludo inicial
- despedida: Mensaje de despedida
- queja: Usuario está inconforme
- general: Intención no específica

Responde con un JSON:
{
  "intent": "nombre de la intención",
  "confidence": 0.0-1.0,
  "entities": [
    {
      "type": "tipo de entidad",
      "value": "valor extraído",
      "position": [inicio, fin]
    }
  ],
  "suggested_action": "acción recomendada"
}

Responde SOLO con el JSON.`;
  }

  parseIntentClassification(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        intent: 'general',
        confidence: 0.5,
        entities: [],
        suggested_action: 'continue_conversation'
      };
    } catch (error) {
      logger.error('Error parseando clasificación de intención:', error);
      return {
        intent: 'general',
        confidence: 0.5,
        entities: [],
        suggested_action: 'continue_conversation'
      };
    }
  }

  getDefaultConfig({ business_type, description, automation_types, connect_calendar }) {
    const businessTypes = {
      barberia: {
        system_prompt: 'Eres el asistente virtual de una barbería profesional. Eres amigable, profesional y conoces todos los servicios. Ayudas a agendar citas, responder consultas sobre precios y servicios, y hacer seguimiento a clientes. Siempre confirmas fecha y hora cuando agendás.',
        services: ['Corte de cabello', 'Afeitada', 'Arreglo de barba', 'Tratamiento capilar', 'Tintura'],
        schedule: 'Lunes a Sábado 8AM-7PM, Domingo 9AM-5PM'
      },
      restaurante: {
        system_prompt: 'Eres el asistente virtual de un restaurante. Eres cálido, profesional y conoces el menú completo. Ayudas con reservas, pedidos para llevar, información sobre el menú, y horarios. Siempre confirmas número de personas y fecha/hora para reservas.',
        services: ['Reservas', 'Pedidos para llevar', 'Información del menú', 'Eventos especiales'],
        schedule: 'Lunes a Domingo 11AM-10PM'
      },
      tienda: {
        system_prompt: 'Eres el asistente virtual de una tienda. Eres amable, servicial y conoces todos los productos. Ayudas con consultas de productos, disponibilidad, precios, y proceso de compra. Capturas leads de clientes interesados.',
        services: ['Productos variados', 'Consultas de precio', 'Disponibilidad', 'Compras'],
        schedule: 'Lunes a Sábado 9AM-8PM'
      }
    };

    const defaultBusiness = businessTypes[business_type] || businessTypes.tienda;

    return {
      system_prompt: defaultBusiness.system_prompt,
      automation_types: automation_types,
      available_actions: [
        {
          name: 'agendar_cita',
          description: 'Agendar una cita o reserva',
          trigger_words: ['cita', 'reserva', 'agendar', 'hora', 'cuándo'],
          parameters: ['fecha', 'hora', 'servicio', 'nombre']
        },
        {
          name: 'consultar_precio',
          description: 'Consultar precios de servicios',
          trigger_words: ['precio', 'cuánto cuesta', 'costo', 'tarifa'],
          parameters: ['servicio']
        },
        {
          name: 'consultar_disponibilidad',
          description: 'Verificar disponibilidad',
          trigger_words: ['disponible', 'espacio', 'abierto'],
          parameters: ['fecha', 'hora']
        }
      ],
      response_templates: {
        greeting: '¡Hola! 👋 Bienvenido a nuestro servicio. ¿En qué puedo ayudarte hoy?',
        goodbye: '¡Gracias por contactarnos! 😊 Si necesitas algo más, aquí estoy para ayudarte.',
        help: 'Puedo ayudarte con: citas/reservas, información de precios, disponibilidad, y consultas generales. ¿Qué necesitas?',
        error: 'Lo siento, hubo un problema procesando tu solicitud. Por favor intenta de nuevo o contacta a soporte.'
      },
      business_info: {
        name: description.split(' ').slice(0, 3).join(' ') || 'Mi Negocio',
        type: business_type,
        services: defaultBusiness.services,
        contact_info: 'WhatsApp Business',
        schedule: defaultBusiness.schedule
      },
      integrations: {
        google_calendar: connect_calendar,
        crm: true,
        notifications: true
      }
    };
  }
}

module.exports = new DeepSeekService();