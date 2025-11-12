const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

class WompiService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://production.wompi.co/v1',
      headers: {
        'Authorization': `Bearer ${process.env.WOMPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Verificar firma del webhook
  verifyWebhookSignature(body, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.WOMPI_SECRET)
        .update(JSON.stringify(body), 'utf8')
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Error verificando firma del webhook:', error);
      return false;
    }
  }

  // Crear transacción de pago
  async createTransaction(transactionData) {
    try {
      const response = await this.client.post('/transactions', {
        amount_in_cents: transactionData.amount_in_cents,
        currency: 'COP',
        customer_email: transactionData.customer_email,
        payment_method: {
          type: transactionData.payment_method_type || 'NEQUI',
          phone_number: transactionData.phone_number
        },
        reference: transactionData.reference || this.generateReference(),
        expiration_time: transactionData.expiration_time || null,
        redirect_url: transactionData.redirect_url || 'https://mi-ia.co/payment-success',
        customer_data: {
          phone_number: transactionData.phone_number,
          full_name: transactionData.full_name
        }
      });

      logger.info('Transacción creada exitosamente:', response.data.data.id);
      return response.data.data;
    } catch (error) {
      logger.error('Error creando transacción:', error);
      throw error;
    }
  }

  // Obtener información de una transacción
  async getTransaction(transactionId) {
    try {
      const response = await this.client.get(`/transactions/${transactionId}`);
      return response.data.data;
    } catch (error) {
      logger.error('Error obteniendo transacción:', error);
      throw error;
    }
  }

  // Crear suscripción
  async createSubscription(subscriptionData) {
    try {
      const response = await this.client.post('/subscriptions', {
        amount_in_cents: subscriptionData.amount_in_cents,
        currency: 'COP',
        customer_email: subscriptionData.customer_email,
        frequency: subscriptionData.frequency || 'MONTHLY',
        interval: subscriptionData.interval || 1,
        reference: subscriptionData.reference || this.generateReference(),
        payment_method: {
          type: 'NEQUI',
          phone_number: subscriptionData.phone_number
        },
        customer_data: {
          phone_number: subscriptionData.phone_number,
          full_name: subscriptionData.full_name
        }
      });

      logger.info('Suscripción creada exitosamente:', response.data.data.id);
      return response.data.data;
    } catch (error) {
      logger.error('Error creando suscripción:', error);
      throw error;
    }
  }

  // Obtener información de una suscripción
  async getSubscription(subscriptionId) {
    try {
      const response = await this.client.get(`/subscriptions/${subscriptionId}`);
      return response.data.data;
    } catch (error) {
      logger.error('Error obteniendo suscripción:', error);
      throw error;
    }
  }

  // Cancelar suscripción
  async cancelSubscription(subscriptionId) {
    try {
      const response = await this.client.delete(`/subscriptions/${subscriptionId}`);
      logger.info('Suscripción cancelada exitosamente:', subscriptionId);
      return response.data.data;
    } catch (error) {
      logger.error('Error cancelando suscripción:', error);
      throw error;
    }
  }

  // Obtener métodos de pago disponibles
  async getPaymentMethods() {
    try {
      const response = await this.client.get('/payment_methods');
      return response.data.data;
    } catch (error) {
      logger.error('Error obteniendo métodos de pago:', error);
      throw error;
    }
  }

  // Generar referencia única para transacciones
  generateReference() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `mi-ia-${timestamp}-${random}`;
  }

  // Crear link de pago (Payment Link)
  async createPaymentLink(paymentLinkData) {
    try {
      const response = await this.client.post('/payment_links', {
        amount_in_cents: paymentLinkData.amount_in_cents,
        currency: 'COP',
        name: paymentLinkData.name,
        description: paymentLinkData.description,
        expires_at: paymentLinkData.expires_at || null,
        single_use: paymentLinkData.single_use || false,
        collect_shipping: paymentLinkData.collect_shipping || false,
        redirect_url: paymentLinkData.redirect_url || 'https://mi-ia.co/payment-success',
        customer_data: {
          full_name: paymentLinkData.full_name,
          phone_number: paymentLinkData.phone_number,
          email: paymentLinkData.customer_email
        }
      });

      logger.info('Payment link creado exitosamente:', response.data.data.id);
      return response.data.data;
    } catch (error) {
      logger.error('Error creando payment link:', error);
      throw error;
    }
  }

  // Obtener información de un payment link
  async getPaymentLink(paymentLinkId) {
    try {
      const response = await this.client.get(`/payment_links/${paymentLinkId}`);
      return response.data.data;
    } catch (error) {
      logger.error('Error obteniendo payment link:', error);
      throw error;
    }
  }

  // Procesar refund (reembolso)
  async processRefund(transactionId, amount_in_cents, reason = 'Solicitud del cliente') {
    try {
      const response = await this.client.post(`/transactions/${transactionId}/refund`, {
        amount_in_cents,
        reason
      });

      logger.info('Reembolso procesado exitosamente:', response.data.data.id);
      return response.data.data;
    } catch (error) {
      logger.error('Error procesando reembolso:', error);
      throw error;
    }
  }

  // Métodos auxiliares para formateo de moneda
  formatAmount(amountInCents) {
    return (amountInCents / 100).toFixed(2);
  }

  parseAmount(amount) {
    return Math.round(parseFloat(amount) * 100);
  }

  // Validar datos de transacción
  validateTransactionData(data) {
    const required = ['amount_in_cents', 'customer_email', 'phone_number'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }

    if (data.amount_in_cents < 1000) {
      throw new Error('El monto mínimo es de $10 COP');
    }

    if (!this.isValidEmail(data.customer_email)) {
      throw new Error('Email inválido');
    }

    if (!this.isValidPhoneNumber(data.phone_number)) {
      throw new Error('Número de teléfono inválido');
    }

    return true;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhoneNumber(phone) {
    const phoneRegex = /^\d{10,15}$/;
    return phoneRegex.test(phone);
  }
}

module.exports = new WompiService();