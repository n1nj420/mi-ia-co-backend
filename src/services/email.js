const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
        if (typeof nodemailer.createTransporter !== 'function') {
      throw new Error('nodemailer.createTransporter is not available');
    }
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendWelcomeEmail(email, name) {
    try {
      const mailOptions = {
        from: `"MI-IA.CO" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '¡Bienvenido a MI-IA.CO! Crea tu primer empleado virtual',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Bienvenido a MI-IA.CO</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px 0; }
              .cta-button { 
                display: inline-block; 
                background: #4F46E5; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px;
                margin: 20px 0;
              }
              .footer { 
                background: #f8f9fa; 
                padding: 20px; 
                text-align: center; 
                font-size: 14px; 
                color: #666; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Bienvenido a MI-IA.CO!</h1>
              </div>
              <div class="content">
                <h2>Hola ${name},</h2>
                <p>
                  Gracias por unirte a MI-IA.CO. Estás a punto de transformar la manera en que gestionas 
                  las comunicaciones de tu negocio con inteligencia artificial.
                </p>
                <p>
                  Con MI-IA.CO puedes crear un "empleado virtual" que se encargue de:
                </p>
                <ul>
                  <li>📅 Gestionar citas y reservas</li>
                  <li>💬 Responder consultas de clientes 24/7</li>
                  <li>📈 Calificar leads automáticamente</li>
                  <li>🎯 Hacer seguimiento de ventas</li>
                </ul>
                <p>
                  <a href="https://mi-ia.co/dashboard" class="cta-button">
                    Comenzar a Crear Mi Bot
                  </a>
                </p>
                <p>
                  ¿Tienes preguntas? Responde a este email o contáctanos en soporte@mi-ia.co
                </p>
              </div>
              <div class="footer">
                <p>Equipo MI-IA.CO</p>
                <p>Transformando negocios con IA</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email de bienvenida enviado a ${email}:`, result.messageId);
      return result;
    } catch (error) {
      logger.error('Error enviando email de bienvenida:', error);
      throw error;
    }
  }

  async sendPaymentConfirmation(email, name, amount) {
    try {
      const mailOptions = {
        from: `"MI-IA.CO" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Pago Confirmado - Tu suscripción MI-IA.CO está activa',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Pago Confirmado - MI-IA.CO</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10B981; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px 0; }
              .cta-button { 
                display: inline-block; 
                background: #4F46E5; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px;
                margin: 20px 0;
              }
              .footer { 
                background: #f8f9fa; 
                padding: 20px; 
                text-align: center; 
                font-size: 14px; 
                color: #666; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>¡Pago Confirmado!</h1>
              </div>
              <div class="content">
                <h2>Hola ${name},</h2>
                <p>
                  Tu pago de $${amount} COP ha sido confirmado exitosamente. 
                  Tu suscripción a MI-IA.CO ya está activa.
                </p>
                <p>
                  Ahora puedes acceder a tu dashboard y crear tu primer empleado virtual:
                </p>
                <p>
                  <a href="https://mi-ia.co/dashboard" class="cta-button">
                    Ir a Mi Dashboard
                  </a>
                </p>
                <p>
                  ¿Necesitas ayuda para comenzar? Tenemos tutoriales y soporte disponible.
                </p>
              </div>
              <div class="footer">
                <p>Equipo MI-IA.CO</p>
                <p>Transformando negocios con IA</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email de confirmación de pago enviado a ${email}:`, result.messageId);
      return result;
    } catch (error) {
      logger.error('Error enviando email de confirmación de pago:', error);
      throw error;
    }
  }

  async sendSupportEmail(userEmail, subject, message) {
    try {
      const mailOptions = {
        from: `"MI-IA.CO" <${process.env.SMTP_USER}>`,
        to: process.env.SUPPORT_EMAIL || 'soporte@mi-ia.co',
        replyTo: userEmail,
        subject: `[SOPORTE] ${subject}`,
        html: `
          <p><strong>De:</strong> ${userEmail}</p>
          <p><strong>Mensaje:</strong></p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email de soporte enviado:`, result.messageId);
      return result;
    } catch (error) {
      logger.error('Error enviando email de soporte:', error);
      throw error;
    }
  }
}

let emailServiceInstance = null;
try {
  emailServiceInstance = new EmailService();
} catch (error) {
  console.error('Failed to initialize EmailService:', error.message);
  emailServiceInstance = null;
}
module.exports = emailServiceInstance;
