const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const supabaseService = require('../services/supabase');
const wompiService = require('../services/wompi');
const n8nService = require('../services/n8n');

const router = express.Router();

// Webhook de WhatsApp
router.post('/whatsapp', async (req, res, next) => {
  try {
    const { body } = req;
    logger.info('Webhook WhatsApp recibido:', { 
      from: body.from,
      message_type: body.type,
      timestamp: body.timestamp 
    });

    // Verificar autenticación del webhook (si está configurada)
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (verifyToken && req.headers['x-hub-verify-token'] !== verifyToken) {
      return res.status(401).json({
        success: false,
        error: 'Token de verificación inválido'
      });
    }

    // Procesar el mensaje
    if (body.type === 'text' && body.text) {
      // Aquí normalmente se llamaría al workflow de n8n
      // Por ahora, solo logeamos y respondemos con éxito
      logger.info('Mensaje de texto procesado:', body.text.body);
    }

    res.json({
      success: true,
      message: 'Webhook procesado exitosamente'
    });
  } catch (error) {
    logger.error('Error procesando webhook WhatsApp:', error);
    next(error);
  }
});

// Verificación del webhook de WhatsApp (para configuración inicial)
router.get('/whatsapp', (req, res) => {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('Webhook WhatsApp verificado exitosamente');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Token de verificación inválido');
    }
  } else {
    res.status(400).send('Parámetros requeridos faltantes');
  }
});

// Webhook de Wompi para pagos
router.post('/wompi', async (req, res, next) => {
  try {
    const { body } = req;
    const signature = req.headers['x-wompi-signature'];

    logger.info('Webhook Wompi recibido:', { 
      event: body.event,
      transaction_id: body.data?.transaction?.id,
      timestamp: body.timestamp 
    });

    // Verificar firma del webhook
    if (!wompiService.verifyWebhookSignature(body, signature)) {
      logger.error('Firma del webhook Wompi inválida');
      return res.status(401).json({
        success: false,
        error: 'Firma inválida'
      });
    }

    const { event, data } = body;

    // Procesar diferentes tipos de eventos
    switch (event) {
      case 'transaction.updated':
        await handleTransactionUpdated(data);
        break;
      case 'subscription.created':
        await handleSubscriptionCreated(data);
        break;
      case 'subscription.charge':
        await handleSubscriptionCharge(data);
        break;
      default:
        logger.info('Evento Wompi no manejado:', event);
    }

    res.json({
      success: true,
      message: 'Webhook procesado exitosamente'
    });
  } catch (error) {
    logger.error('Error procesando webhook Wompi:', error);
    next(error);
  }
});

// Webhook de n8n para callbacks
router.post('/n8n', async (req, res, next) => {
  try {
    const { body } = req;
    const apiKey = req.headers['x-n8n-api-key'];

    // Verificar API key
    if (apiKey !== process.env.N8N_API_KEY) {
      return res.status(401).json({
        success: false,
        error: 'API key inválida'
      });
    }

    logger.info('Webhook n8n recibido:', { 
      workflow_id: body.workflow_id,
      execution_id: body.execution_id,
      status: body.status 
    });

    // Procesar el callback de n8n
    if (body.status === 'success') {
      // Workflow ejecutado exitosamente
      logger.info(`Workflow ${body.workflow_id} ejecutado exitosamente`);
    } else if (body.status === 'error') {
      // Error en la ejecución del workflow
      logger.error(`Error en workflow ${body.workflow_id}:`, body.error);
    }

    res.json({
      success: true,
      message: 'Callback procesado exitosamente'
    });
  } catch (error) {
    logger.error('Error procesando webhook n8n:', error);
    next(error);
  }
});

// Funciones auxiliares para manejar eventos de Wompi
async function handleTransactionUpdated(data) {
  try {
    const { transaction } = data;
    
    if (transaction.status === 'APPROVED') {
      // Pago aprobado
      logger.info('Pago aprobado:', transaction.id);
      
      // Actualizar estado del usuario
      const email = transaction.customer_email;
      const { data: user } = await supabaseService.getUserByEmail(email);
      
      if (user) {
        await supabaseService.updateUser(user.id, {
          subscription_status: 'active',
          wompi_subscription_id: transaction.id
        });
        
        logger.info(`Usuario ${user.id} actualizado a estado activo`);
      }
    } else if (transaction.status === 'DECLINED') {
      // Pago rechazado
      logger.warn('Pago rechazado:', transaction.id);
    }
  } catch (error) {
    logger.error('Error manejando transacción actualizada:', error);
  }
}

async function handleSubscriptionCreated(data) {
  try {
    const { subscription } = data;
    logger.info('Suscripción creada:', subscription.id);
    
    // Aquí puedes manejar la lógica cuando se crea una nueva suscripción
    // Por ejemplo, actualizar el estado del usuario, enviar notificaciones, etc.
    
  } catch (error) {
    logger.error('Error manejando suscripción creada:', error);
  }
}

async function handleSubscriptionCharge(data) {
  try {
    const { subscription, charge } = data;
    logger.info('Cobro de suscripción:', { subscription_id: subscription.id, charge_id: charge.id });
    
    // Manejar el cobro recurrente de la suscripción
    if (charge.status === 'APPROVED') {
      logger.info('Cobro de suscripción aprobado:', charge.id);
      // Actualizar la fecha del último pago, extender la suscripción, etc.
    }
    
  } catch (error) {
    logger.error('Error manejando cobro de suscripción:', error);
  }
}

// Ruta para probar webhooks (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({
      message: 'Webhook tester',
      endpoints: {
        whatsapp: '/api/webhooks/whatsapp',
        wompi: '/api/webhooks/wompi',
        n8n: '/api/webhooks/n8n'
      },
      methods: {
        whatsapp: ['GET', 'POST'],
        wompi: ['POST'],
        n8n: ['POST']
      }
    });
  });
}

module.exports = router;