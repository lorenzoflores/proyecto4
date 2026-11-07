'use strict';

const multer = require('multer');
const { AppError } = require('../errors');

// Ruta no encontrada
function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } });
}

// Manejador central de errores. Nunca devuelve el stack trace al cliente:
// los detalles internos se quedan en el servidor.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({ error: { code: 'FILE_TOO_LARGE', message: 'El fichero supera el tamaño máximo' } });
    }
    return res.status(400).json({ error: { code: 'INVALID_UPLOAD', message: 'Subida no válida' } });
  }

  // JSON mal formado en el cuerpo de la petición
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON no válido' } });
  }
  if (err.type === 'entity.too.large') {
    return res
      .status(413)
      .json({ error: { code: 'BODY_TOO_LARGE', message: 'Cuerpo de la petición demasiado grande' } });
  }

  // pino-http ya registra la petición como error; aquí añadimos el detalle.
  req.log.error({ err }, 'Error no controlado');
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor' } });
}

module.exports = { notFound, errorHandler };
