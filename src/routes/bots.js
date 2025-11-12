const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const supabaseService = require('../services/supabase');
const deepSeekService = require('../services/deepseek');
const n8nService = require('../services/n8n');

const router = express.Router();

// Esquemas de validación
const createBotSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  business_type: Joi.string().valid(
    'barberia', 'restaurante', 'tienda', 'consultoria', 
    'salud', 'educacion', 'servicios', 'otro'
  ).required(),
  description: Joi.string().min(10).max(500).required(),
  automation_types: Joi.array().items(
    Joi.string().valid('citas', 'ventas', 'atencion', 'marketing')
  ).min(1).required(),
  connect_calendar: Joi.boolean().default(false),
  whatsapp_number: Joi.string().pattern(/^\d{10,15}$/).required()
});

const updateBotStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'paused', 'setup').required()
});

// POST /api/bots/create
router.post('/create', authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = createBotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Datos del bot inválidos',
        details: error.details.map(d => d.message)
      });
    }

    const {
      name,
      business_type,
      description,
      automation_types,
      connect_calendar,
      whatsapp_number
    } = value;

    logger.info(`Creando bot para usuario ${req.user.id}:`, { name, business_type });

    // Generar configuración del bot con DeepSeek
    const botConfig = await deepSeekService.generateBotConfig({
      business_type,
      description,
      automation_types,
      connect_calendar
    });

    // Crear bot en base de datos
    const botData = {
      id: uuidv4(),
      user_id: req.user.id,
      name,
      business_type,
      description,
      config_json: botConfig,
      whatsapp_number,
      status: 'setup',
      created_at: new Date().toISOString()
    };

    const bot = await supabaseService.createBot(botData);

    // Crear workflow en n8n
    try {
      const workflow = await n8nService.createBotWorkflow(bot, botConfig);
      
      // Actualizar bot con el ID del workflow
      await supabaseService.updateBot(bot.id, {
        n8n_workflow_id: workflow.id
      });

      // Activar el workflow
      await n8nService.activateWorkflow(workflow.id);

      logger.info(`Workflow creado y activado para bot ${bot.id}:`, workflow.id);
    } catch (n8nError) {
      logger.error('Error creando workflow en n8n:', n8nError);
      // No fallar la creación del bot si n8n falla
    }

    res.status(201).json({
      success: true,
      data: {
        bot: {
          id: bot.id,
          name: bot.name,
          business_type: bot.business_type,
          status: bot.status,
          whatsapp_number: bot.whatsapp_number,
          config_preview: {
            system_prompt: botConfig.system_prompt?.substring(0, 200) + '...',
            automation_types: botConfig.automation_types,
            available_actions: botConfig.available_actions
          }
        },
        message: 'Bot creado exitosamente',
        next_steps: [
          'Configura tu número de WhatsApp Business',
          'Prueba tu bot enviando un mensaje',
          'Personaliza las respuestas en el dashboard'
        ]
      }
    });
  } catch (error) {
    logger.error('Error creando bot:', error);
    next(error);
  }
});

// GET /api/bots/
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const bots = await supabaseService.getBotsByUser(req.user.id);

    const botsWithStats = await Promise.all(
      bots.map(async (bot) => {
        // Obtener estadísticas básicas para cada bot
        const contacts = await supabaseService.getContactsByBot(bot.id);
        const appointments = await supabaseService.getAppointmentsByBot(bot.id);
        
        return {
          id: bot.id,
          name: bot.name,
          business_type: bot.business_type,
          status: bot.status,
          whatsapp_number: bot.whatsapp_number,
          created_at: bot.created_at,
          stats: {
            total_contacts: contacts.length,
            total_appointments: appointments.length,
            status_label: getStatusLabel(bot.status)
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        bots: botsWithStats,
        total: botsWithStats.length
      }
    });
  } catch (error) {
    logger.error('Error obteniendo bots:', error);
    next(error);
  }
});

// GET /api/bots/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const bot = await supabaseService.getBotById(req.params.id);

    if (!bot || bot.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    // Obtener información adicional
    const [contacts, appointments, conversations] = await Promise.all([
      supabaseService.getContactsByBot(bot.id),
      supabaseService.getAppointmentsByBot(bot.id),
      supabaseService.getRecentConversations(bot.id, 5)
    ]);

    const botDetails = {
      id: bot.id,
      name: bot.name,
      business_type: bot.business_type,
      description: bot.description,
      whatsapp_number: bot.whatsapp_number,
      status: bot.status,
      created_at: bot.created_at,
      config: bot.config_json,
      stats: {
        total_contacts: contacts.length,
        total_appointments: appointments.length,
        recent_conversations: conversations.length
      },
      recent_activity: conversations,
      status_label: getStatusLabel(bot.status)
    };

    res.json({
      success: true,
      data: {
        bot: botDetails
      }
    });
  } catch (error) {
    logger.error('Error obteniendo bot:', error);
    next(error);
  }
});

// PATCH /api/bots/:id/status
router.patch('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { error, value } = updateBotStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido',
        details: error.details.map(d => d.message)
      });
    }

    const bot = await supabaseService.getBotById(req.params.id);

    if (!bot || bot.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    const updatedBot = await supabaseService.updateBot(bot.id, {
      status: value.status
    });

    // Manejar el workflow en n8n según el estado
    if (bot.n8n_workflow_id) {
      try {
        if (value.status === 'active') {
          await n8nService.activateWorkflow(bot.n8n_workflow_id);
        } else if (value.status === 'paused') {
          await n8nService.deactivateWorkflow(bot.n8n_workflow_id);
        }
      } catch (n8nError) {
        logger.error('Error actualizando workflow en n8n:', n8nError);
      }
    }

    res.json({
      success: true,
      data: {
        bot: {
          id: updatedBot.id,
          name: updatedBot.name,
          status: updatedBot.status,
          status_label: getStatusLabel(updatedBot.status)
        },
        message: `Bot ${value.status === 'active' ? 'activado' : 'pausado'} exitosamente`
      }
    });
  } catch (error) {
    logger.error('Error actualizando estado del bot:', error);
    next(error);
  }
});

// Función auxiliar para obtener etiqueta de estado
function getStatusLabel(status) {
  const labels = {
    'setup': 'En configuración',
    'active': 'Activo',
    'paused': 'Pausado'
  };
  return labels[status] || status;
}

module.exports = router;