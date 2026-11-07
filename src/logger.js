'use strict';

const pino = require('pino');
const config = require('./config');

// Logs en JSON, una línea por evento. En local se pueden ver bonitos con:
//   npm run dev | npx pino-pretty
const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
  base: { service: 'proyecto4-api', release: config.RELEASE },
  // Nunca deben llegar a los logs: tokens, cookies ni contraseñas.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'token',
      '*.token',
    ],
    censor: '[REDACTADO]',
  },
});

module.exports = logger;
