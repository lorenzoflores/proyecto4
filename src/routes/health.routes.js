'use strict';

const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

// Lo usan la plataforma de despliegue y el agente para saber si la API está sana.
router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

module.exports = router;
