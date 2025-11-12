const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );
  }

  // Métodos de usuario
  async createUser(userData) {
    try {
      const { data, error } = await this.client
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creando usuario:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      return { data, error };
    } catch (error) {
      logger.error('Error obteniendo usuario por email:', error);
      throw error;
    }
  }

  async updateUser(id, updates) {
    try {
      const { data, error } = await this.client
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  // Métodos de bots
  async createBot(botData) {
    try {
      const { data, error } = await this.client
        .from('bots')
        .insert([botData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creando bot:', error);
      throw error;
    }
  }

  async getBotsByUser(userId) {
    try {
      const { data, error } = await this.client
        .from('bots')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo bots:', error);
      throw error;
    }
  }

  async getBotById(id) {
    try {
      const { data, error } = await this.client
        .from('bots')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo bot:', error);
      throw error;
    }
  }

  async updateBot(id, updates) {
    try {
      const { data, error } = await this.client
        .from('bots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error actualizando bot:', error);
      throw error;
    }
  }

  // Métodos de contactos
  async createContact(contactData) {
    try {
      const { data, error } = await this.client
        .from('contacts')
        .insert([contactData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creando contacto:', error);
      throw error;
    }
  }

  async getContactsByBot(botId) {
    try {
      const { data, error } = await this.client
        .from('contacts')
        .select('*')
        .eq('bot_id', botId)
        .order('last_interaction', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo contactos:', error);
      throw error;
    }
  }

  async getContactByPhone(botId, phone) {
    try {
      const { data, error } = await this.client
        .from('contacts')
        .select('*')
        .eq('bot_id', botId)
        .eq('phone', phone)
        .single();

      return { data, error };
    } catch (error) {
      logger.error('Error obteniendo contacto por teléfono:', error);
      throw error;
    }
  }

  // Métodos de conversaciones
  async saveConversation(conversationData) {
    try {
      const { data, error } = await this.client
        .from('conversations')
        .insert([conversationData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error guardando conversación:', error);
      throw error;
    }
  }

  async getConversationsByContact(contactId) {
    try {
      const { data, error } = await this.client
        .from('conversations')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo conversaciones:', error);
      throw error;
    }
  }

  async getConversationsByBot(botId) {
    try {
      const { data, error } = await this.client
        .from('conversations')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo conversaciones por bot:', error);
      throw error;
    }
  }

  async getRecentConversations(botId, limit = 10) {
    try {
      const { data, error } = await this.client
        .from('conversations')
        .select(`
          *,
          contacts!inner(name, phone)
        `)
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo conversaciones recientes:', error);
      throw error;
    }
  }

  async getContactById(id) {
    try {
      const { data, error } = await this.client
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo contacto:', error);
      throw error;
    }
  }

  // Métodos de citas
  async createAppointment(appointmentData) {
    try {
      const { data, error } = await this.client
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creando cita:', error);
      throw error;
    }
  }

  async getAppointmentsByBot(botId) {
    try {
      const { data, error } = await this.client
        .from('appointments')
        .select('*')
        .eq('bot_id', botId)
        .order('date_time', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error obteniendo citas:', error);
      throw error;
    }
  }

  // Métodos para analytics
  async getDashboardData(userId) {
    try {
      // Obtener bots del usuario
      const bots = await this.getBotsByUser(userId);
      const botIds = bots.map(bot => bot.id);

      if (botIds.length === 0) {
        return {
          total_bots: 0,
          total_contacts: 0,
          total_conversations: 0,
          total_appointments: 0,
          recent_activity: []
        };
      }

      // Obtener métricas
      const [
        contacts,
        conversations,
        appointments
      ] = await Promise.all([
        this.client
          .from('contacts')
          .select('id', { count: 'exact' })
          .in('bot_id', botIds),
        this.client
          .from('conversations')
          .select('id', { count: 'exact' })
          .in('bot_id', botIds),
        this.client
          .from('appointments')
          .select('id', { count: 'exact' })
          .in('bot_id', botIds)
      ]);

      // Obtener actividad reciente
      const { data: recentConversations } = await this.client
        .from('conversations')
        .select(`
          *,
          contacts!inner(name, phone),
          bots!inner(name)
        `)
        .in('bot_id', botIds)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        total_bots: bots.length,
        total_contacts: contacts.count || 0,
        total_conversations: conversations.count || 0,
        total_appointments: appointments.count || 0,
        recent_activity: recentConversations || []
      };
    } catch (error) {
      logger.error('Error obteniendo datos del dashboard:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();