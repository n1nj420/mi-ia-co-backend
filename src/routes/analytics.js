const express = require('express');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const supabaseService = require('../services/supabase');

const router = express.Router();

// GET /api/analytics/dashboard
router.get('/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const dashboardData = await supabaseService.getDashboardData(req.user.id);

    // Agregar métricas adicionales calculadas
    const enhancedData = {
      ...dashboardData,
      metrics: {
        conversion_rate: calculateConversionRate(dashboardData),
        avg_conversations_per_contact: calculateAvgConversations(dashboardData),
        active_bots_percentage: calculateActiveBotsPercentage(dashboardData),
        monthly_growth: calculateMonthlyGrowth(dashboardData)
      },
      recent_activity: dashboardData.recent_activity.map(activity => ({
        ...activity,
        time_ago: getTimeAgo(activity.created_at),
        intent_label: getIntentLabel(activity.intent)
      }))
    };

    res.json({
      success: true,
      data: enhancedData,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error obteniendo datos del dashboard:', error);
    next(error);
  }
});

// GET /api/analytics/bots/:bot_id
router.get('/bots/:bot_id', authMiddleware, async (req, res, next) => {
  try {
    const botId = req.params.bot_id;

    // Verificar que el bot pertenece al usuario
    const bot = await supabaseService.getBotById(botId);
    if (!bot || bot.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: 'Bot no encontrado'
      });
    }

    // Obtener datos específicos del bot
    const [
      contacts,
      conversations,
      appointments
    ] = await Promise.all([
      supabaseService.getContactsByBot(botId),
      supabaseService.getConversationsByBot(botId),
      supabaseService.getAppointmentsByBot(botId)
    ]);

    const botAnalytics = {
      bot_id: botId,
      bot_name: bot.name,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      overview: {
        total_contacts: contacts.length,
        total_conversations: conversations.length,
        total_appointments: appointments.length,
        active_today: getActiveToday(conversations),
        active_this_week: getActiveThisWeek(conversations)
      },
      conversations: {
        total: conversations.length,
        by_intent: getConversationsByIntent(conversations),
        by_day: getConversationsByDay(conversations),
        avg_response_time: getAvgResponseTime(conversations),
        satisfaction_rate: getSatisfactionRate(conversations)
      },
      contacts: {
        total: contacts.length,
        by_status: getContactsByStatus(contacts),
        growth_by_day: getContactGrowthByDay(contacts),
        top_sources: getTopSources(contacts)
      },
      appointments: {
        total: appointments.length,
        by_status: getAppointmentsByStatus(appointments),
        by_service: getAppointmentsByService(appointments),
        completion_rate: getCompletionRate(appointments)
      },
      performance: {
        bot_uptime: 99.5, // Simulado - en producción esto vendría de monitoreo real
        response_rate: getResponseRate(conversations),
        error_rate: getErrorRate(conversations)
      }
    };

    res.json({
      success: true,
      data: botAnalytics
    });
  } catch (error) {
    logger.error('Error obteniendo analytics del bot:', error);
    next(error);
  }
});

// Funciones auxiliares para cálculos
function calculateConversionRate(data) {
  if (data.total_contacts === 0) return 0;
  return Math.round((data.total_appointments / data.total_contacts) * 100);
}

function calculateAvgConversations(data) {
  if (data.total_contacts === 0) return 0;
  return Math.round(data.total_conversations / data.total_contacts * 10) / 10;
}

function calculateActiveBotsPercentage(data) {
  if (data.total_bots === 0) return 0;
  const activeBots = (data.bots || []).filter(bot => bot.status === 'active').length;
  return Math.round((activeBots / data.total_bots) * 100);
}

function calculateMonthlyGrowth(data) {
  // Simulado - en producción esto calcularía el crecimiento real mes a mes
  return Math.floor(Math.random() * 50) + 10; // Entre 10-60%
}

function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
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

function getActiveToday(conversations) {
  const today = new Date().toDateString();
  return conversations.filter(c => new Date(c.created_at).toDateString() === today).length;
}

function getActiveThisWeek(conversations) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return conversations.filter(c => new Date(c.created_at) > weekAgo).length;
}

function getConversationsByIntent(conversations) {
  const stats = {};
  conversations.forEach(conv => {
    const intent = conv.intent || 'general';
    stats[intent] = (stats[intent] || 0) + 1;
  });
  return stats;
}

function getConversationsByDay(conversations) {
  const stats = {};
  conversations.forEach(conv => {
    const day = new Date(conv.created_at).toISOString().split('T')[0];
    stats[day] = (stats[day] || 0) + 1;
  });
  return stats;
}

function getAvgResponseTime(conversations) {
  // Simulado - en producción calcularía el tiempo real de respuesta
  return Math.floor(Math.random() * 120) + 30; // Entre 30-150 segundos
}

function getSatisfactionRate(conversations) {
  // Simulado - en producción vendría de feedback real
  return Math.floor(Math.random() * 20) + 80; // Entre 80-100%
}

function getContactsByStatus(contacts) {
  const stats = {};
  contacts.forEach(contact => {
    const status = contact.status || 'lead';
    stats[status] = (stats[status] || 0) + 1;
  });
  return stats;
}

function getContactGrowthByDay(contacts) {
  const stats = {};
  contacts.forEach(contact => {
    const day = new Date(contact.created_at).toISOString().split('T')[0];
    stats[day] = (stats[day] || 0) + 1;
  });
  return stats;
}

function getTopSources(contacts) {
  // Simulado - en producción vendría de tracking real
  return {
    'WhatsApp Directo': Math.floor(contacts.length * 0.6),
    'Referido': Math.floor(contacts.length * 0.25),
    'Redes Sociales': Math.floor(contacts.length * 0.15)
  };
}

function getAppointmentsByStatus(appointments) {
  const stats = {};
  appointments.forEach(apt => {
    const status = apt.status || 'scheduled';
    stats[status] = (stats[status] || 0) + 1;
  });
  return stats;
}

function getAppointmentsByService(appointments) {
  const stats = {};
  appointments.forEach(apt => {
    const service = apt.service || 'General';
    stats[service] = (stats[service] || 0) + 1;
  });
  return stats;
}

function getCompletionRate(appointments) {
  if (appointments.length === 0) return 0;
  const completed = appointments.filter(apt => apt.status === 'completed').length;
  return Math.round((completed / appointments.length) * 100);
}

function getResponseRate(conversations) {
  // Simulado - en producción calcularía basado en respuestas exitosas
  return Math.floor(Math.random() * 10) + 90; // Entre 90-100%
}

function getErrorRate(conversations) {
  // Simulado - en producción calcularía basado en errores reales
  return Math.floor(Math.random() * 5); // Entre 0-4%
}

module.exports = router;