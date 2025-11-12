const express = require('express');
const Joi = require('joi');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const supabaseService = require('../services/supabase');
const authMiddleware = require('../middleware/auth');
const emailService = require('../services/email');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Esquemas de validación
const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Datos de registro inválidos',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password, name } = value;

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabaseService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe'
      });
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      throw authError;
    }

    // Crear usuario en la tabla users
    const userData = {
      id: authData.user.id,
      email,
      name: name || email.split('@')[0],
      subscription_status: 'trial',
      subscription_tier: 'tier1',
      created_at: new Date().toISOString()
    };

    const user = await supabaseService.createUser(userData);

    // Enviar email de bienvenida
    try {
      await emailService.sendWelcomeEmail(email, name || email.split('@')[0]);
    } catch (emailError) {
      logger.error('Error enviando email de bienvenida:', emailError);
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscription_status: user.subscription_status,
          subscription_tier: user.subscription_tier
        },
        message: 'Usuario creado exitosamente. Por favor verifica tu email.'
      }
    });
  } catch (error) {
    logger.error('Error en registro:', error);
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Datos de login inválidos',
        details: error.details.map(d => d.message)
      });
    }

    const { email, password } = value;

    // Autenticar con Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Obtener información del usuario
    const user = await supabaseService.getUserById(data.user.id);

    // Verificar estado de suscripción
    if (user.subscription_status === 'cancelled') {
      return res.status(403).json({
        success: false,
        error: 'Tu suscripción ha sido cancelada. Por favor contacta al soporte.'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscription_status: user.subscription_status,
          subscription_tier: user.subscription_tier
        },
        token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    });
  } catch (error) {
    logger.error('Error en login:', error);
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Error obteniendo usuario actual:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo información del usuario'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    logger.error('Error cerrando sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error cerrando sesión'
    });
  }
});

module.exports = router;