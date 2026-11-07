'use strict';

// Antes de todos los tests: aplica las migraciones a la base de datos de test.
module.exports = async () => {
  require('./env');
  const migrate = require('../src/db/migrate');
  const pool = require('../src/db/pool');
  await migrate();
  await pool.end();
};
