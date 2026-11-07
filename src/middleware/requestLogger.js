'use strict';

const crypto = require('node:crypto');
const pinoHttp = require('pino-http');
const logger = require('../logger');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Un log por petición con reqId, ruta, estado y duración.
// El reqId se devuelve en la cabecera X-Request-Id para poder buscarlo en los logs.
const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    // Si el cliente o el proxy ya mandan un ID válido, lo reutilizamos; si no, creamos uno.
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && UUID.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Solo lo que hace falta para depurar: nada de cuerpos ni de cabeceras completas.
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  customProps: (req) => ({
    userId: req.raw?.user?.id ?? req.user?.id,
    route: routeOf(req.raw ?? req),
  }),
});

// Patrón de la ruta (/files/:id), no la URL real. Se usa en logs y métricas.
// req.mountPath lo fija app.js: req.baseUrl se pierde si la petición acaba en error.
function routePattern(req) {
  if (!req.route) return undefined;
  const full = `${req.mountPath ?? req.baseUrl}${req.route.path}`;
  return full.length > 1 ? full.replace(/\/$/, '') : full;
}

function routeOf(req) {
  const pattern = routePattern(req);
  return pattern && `${req.method} ${pattern}`;
}

module.exports = { requestLogger, routeOf, routePattern };
