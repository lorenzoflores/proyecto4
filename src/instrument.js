'use strict';

// Sentry tiene que inicializarse ANTES de cargar Express para poder
// instrumentarlo. Por eso server.js requiere este fichero en su primera línea.

const Sentry = require('@sentry/node');
const config = require('./config');

Sentry.init({
  dsn: config.SENTRY_DSN,
  environment: config.SENTRY_ENVIRONMENT || config.NODE_ENV,
  release: config.RELEASE,
  // No enviar datos personales por defecto (IP, cabeceras, cuerpos).
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
