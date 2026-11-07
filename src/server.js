'use strict';

// Primero Sentry, antes que Express (ver instrument.js).
require('./instrument');
const Sentry = require('@sentry/node');
const config = require('./config');
const createApp = require('./app');
const migrate = require('./db/migrate');
const pool = require('./db/pool');
const storage = require('./services/storage.service');
const logger = require('./logger');

async function start() {
  await migrate();
  await storage.ensureUploadDir();

  const server = createApp().listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'API escuchando');
  });

  // Parada ordenada: deja de aceptar peticiones y cierra la base de datos.
  const shutdown = () => {
    logger.info('Parando la API');
    server.close(async () => {
      await pool.end();
      await Sentry.close(2000); // envía los eventos pendientes
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.fatal({ err }, 'No se pudo arrancar la API');
  process.exit(1);
});
