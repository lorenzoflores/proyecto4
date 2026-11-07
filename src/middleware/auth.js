'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../errors');

// Exige un JWT válido en la cabecera Authorization: Bearer <token>.
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Falta el token de acceso', 'UNAUTHORIZED'));
  }

  try {
    // Fijamos el algoritmo: así nadie puede colar un token con alg "none" u otro algoritmo.
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub };
    return next();
  } catch {
    return next(new AppError(401, 'Token no válido o caducado', 'UNAUTHORIZED'));
  }
}

module.exports = requireAuth;
