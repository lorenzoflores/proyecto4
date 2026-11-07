'use strict';

const express = require('express');
const helmet = require('helmet');
const Sentry = require('@sentry/node');
const authRoutes = require('./routes/auth.routes');
const filesRoutes = require('./routes/files.routes');
const healthRoutes = require('./routes/health.routes');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { metricsMiddleware, metricsHandler } = require('./metrics');

function createApp() {
  const app = express();

  // Detrás de un proxy (Railway), la IP real del cliente llega en X-Forwarded-For.
  app.set('trust proxy', config.TRUST_PROXY);

  // Cabeceras de seguridad (y quita X-Powered-By, que revela que usamos Express).
  app.use(requestLogger);
  app.use(metricsMiddleware);
  app.use(helmet());
  // Los cuerpos JSON de esta API son pequeños: credenciales y poco más.
  app.use(express.json({ limit: '10kb' }));

  app.get('/metrics', metricsHandler);
  // Guarda el prefijo de cada router para que logs y métricas tengan la ruta completa.
  const mount = (prefix, router) =>
    app.use(prefix, (req, res, next) => ((req.mountPath = prefix), next()), router);
  mount('/health', healthRoutes);
  mount('/auth', authRoutes);
  mount('/files', filesRoutes);

  app.use(notFound);
  // Sentry recibe los errores 5xx antes que nuestro manejador, que responde al cliente.
  Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
