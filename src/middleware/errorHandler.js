const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error no manejado:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    body: req.body
  });

  // Error de validación Joi
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      details: err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  // Error de autenticación
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }

  // Error de token expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado'
    });
  }

  // Error de Supabase
  if (err.message && err.message.includes('Supabase')) {
    return res.status(500).json({
      success: false,
      error: 'Error en la base de datos'
    });
  }

  // Error por defecto
  res.status(err.statusCode || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message
  });
};

module.exports = errorHandler;