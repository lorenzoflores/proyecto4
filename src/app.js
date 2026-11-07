'use strict';

const express = require('express');
const helmet = require('helmet');
const authRoutes = require('./routes/auth.routes');
const filesRoutes = require('./routes/files.routes');
const healthRoutes = require('./routes/health.routes');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Detrás de un proxy (Railway), la IP real del cliente llega en X-Forwarded-For.
  app.set('trust proxy', config.TRUST_PROXY);

  // Cabeceras de seguridad (y quita X-Powered-By, que revela que usamos Express).
  app.use(helmet());
  // Los cuerpos JSON de esta API son pequeños: credenciales y poco más.
  app.use(express.json({ limit: '10kb' }));

  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/files', filesRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
