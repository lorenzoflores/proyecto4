'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const validate = require('../middleware/validate');
const { credentials } = require('../schemas');
const controller = require('../controllers/auth.controller');

const router = Router();

// Limita intentos por IP para frenar ataques de fuerza bruta contra el login.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos, prueba más tarde' } },
});

router.post('/register', authLimiter, validate(credentials), controller.register);
router.post('/login', authLimiter, validate(credentials), controller.login);

module.exports = router;
