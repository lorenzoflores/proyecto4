'use strict';

const config = require('./config');
const createApp = require('./app');
const migrate = require('./db/migrate');
const pool = require('./db/pool');
const storage = require('./services/storage.service');

async function start() {
  await migrate();
  await storage.ensureUploadDir();

  const server = createApp().listen(config.PORT, () => {
    console.log(`API escuchando en el puerto ${config.PORT} (${config.NODE_ENV})`);
  });

  // Parada ordenada: deja de aceptar peticiones y cierra la base de datos.
  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('No se pudo arrancar la API:', err.message);
  process.exit(1);
});
