'use strict';

const crypto = require('node:crypto');
const client = require('prom-client');
const config = require('./config');
const pool = require('./db/pool');
const { routePattern } = require('./middleware/requestLogger');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Peticiones HTTP por método, ruta y estado',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpErrors = new client.Counter({
  name: 'http_errors_total',
  help: 'Respuestas 5xx por método y ruta',
  labelNames: ['method', 'route'],
  registers: [register],
});

const filesUploaded = new client.Counter({
  name: 'files_uploaded_total',
  help: 'Ficheros subidos con éxito',
  registers: [register],
});

new client.Gauge({
  name: 'storage_bytes',
  help: 'Bytes ocupados por los ficheros subidos',
  registers: [register],
  // Se calcula al pedir /metrics, no en cada subida.
  async collect() {
    const { rows } = await pool.query('SELECT COALESCE(SUM(size_bytes), 0)::bigint AS total FROM files');
    this.set(Number(rows[0].total));
  },
});

// Mide cada petición. La ruta es el patrón (/files/:id), no la URL real:
// si usáramos la URL, cada id crearía una serie nueva y las métricas explotarían.
function metricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = routePattern(req) ?? 'sin_ruta';
    const labels = { method: req.method, route };
    end(labels);
    httpRequests.inc({ ...labels, status: res.statusCode });
    if (res.statusCode >= 500) httpErrors.inc(labels);
  });
  next();
}

function tokenMatches(header) {
  const expected = Buffer.from(`Bearer ${config.METRICS_TOKEN}`);
  const received = Buffer.from(header || '');
  // Comparación en tiempo constante: no deja adivinar el token carácter a carácter.
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

async function metricsHandler(req, res, next) {
  if (!config.METRICS_TOKEN) return next(); // → 404
  if (!tokenMatches(req.get('authorization'))) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token de métricas no válido' } });
  }
  res.type(register.contentType);
  res.send(await register.metrics());
}

module.exports = { register, metricsMiddleware, metricsHandler, filesUploaded };
