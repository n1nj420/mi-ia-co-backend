const express = require('express');
const Joi = require('joi');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const supabaseService = require('../services/supabase');

const router = express.Router();

// GET /api/contacts/
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { bot_id } = req.query;

    if (!bot_id) {
      return res.status(400).json({
        success: false,
        error: 'bot_id es requerido'
      });
    }

    // Verificar que el bot pertenece al usuario
    const bot = await supabaseService.getBotById(bot_id);
    if (!bot || bot.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    const contacts = await supabaseService.getContactsByBot(bot_id);

    const contactsWithStats = contacts.map(contact => ({
      id: contact.id,
      phone: contact.phone,
      name: contact.name || 'Sin nombre',
      status: contact.status,
      created_at: contact.created_at,
      last_interaction: contact.last_interaction,
      status_label: getStatusLabel(contact.status),
      metadata: contact.metadata || {}
    }));

    res.json({
      success: true,
      data: {
        contacts: contactsWithStats,
        total: contactsWithStats.length,
        stats: {
          leads: contactsWithStats.filter(c => c.status === 'lead').length,
          customers: contactsWithStats.filter(c => c.status === 'customer').length,
          recent: contactsWithStats.filter(c => 
            new Date(c.last_interaction) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length
        }
      }
    });
  } catch (error) {
    logger.error('Error obteniendo contactos:', error);
    next(error);
  }
});

// GET /api/contacts/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const contact = await supabaseService.getContactById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }

    // Verificar que el bot del contacto pertenece al usuario
    const bot = await supabaseService.getBotById(contact.bot_id);
    if (!bot || bot.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: 'Contacto no encontrado'
      });
    }

    // Obtener conversaciones del contacto
    const conversations = await supabaseService.getConversationsByContact(contact.id);

    const contactDetails = {
      id: contact.id,
      phone: contact.phone,
      name: contact.name || 'Sin nombre',
      status: contact.status,
      status_label: getStatusLabel(contact.status),
      created_at: contact.created_at,
      last_interaction: contact.last_interaction,
      metadata: contact.metadata || {},
      conversations: conversations.map(conv => ({
        id: conv.id,
        message: conv.message,
        response: conv.response,
        intent: conv.intent,
        intent_label: getIntentLabel(conv.intent),
        created_at: conv.created_at
      })),
      stats: {
        total_conversations: conversations.length,
        recent_conversations: conversations.filter(c => 
          new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        intents: getIntentStats(conversations)
      }
    };

    res.json({
      success: true,
      data: {
        contact: contactDetails
      }
    });
  } catch (error) {
    logger.error('Error obteniendo contacto:', error);
    next(error);
  }
});

// Funciones auxiliares
function getStatusLabel(status) {
  const labels = {
    'lead': 'Lead',
    'customer': 'Cliente',
    'inactive': 'Inactivo'
  };
  return labels[status] || status;
}

function getIntentLabel(intent) {
  const labels = {
    'agendar': 'Agendar',
    'consulta': 'Consulta',
    'venta': 'Venta',
    'cancelar': 'Cancelar',
    'informacion': 'Información',
    'saludo': 'Saludo',
    'despedida': 'Despedida',
    'queja': 'Queja',
    'general': 'General'
  };
  return labels[intent] || intent;
}

function getIntentStats(conversations) {
  const stats = {};
  conversations.forEach(conv => {
    const intent = conv.intent || 'general';
    stats[intent] = (stats[intent] || 0) + 1;
  });
  return stats;
}

module.exports = router;