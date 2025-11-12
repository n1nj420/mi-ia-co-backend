const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado - Token requerido'
      });
    }

    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    // Obtener información completa del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar estado de suscripción
    if (userData.subscription_status === 'cancelled') {
      return res.status(403).json({
        success: false,
        error: 'Suscripción cancelada - Acceso denegado'
      });
    }

    req.user = userData;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      success: false,
      error: 'Error en autenticación'
    });
  }
};

module.exports = authMiddleware;