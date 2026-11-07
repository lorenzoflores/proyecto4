'use strict';

const pool = require('../db/pool');
const storage = require('./storage.service');
const { detectFileType } = require('./fileType');
const { AppError } = require('../errors');

const PUBLIC_COLUMNS = 'id, original_name, mime_type, size_bytes, created_at';

function toPublic(row) {
  return {
    id: row.id,
    name: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
  };
}

// Limpia el nombre original para guardarlo y devolverlo en descargas:
// sin rutas, sin caracteres de control y con longitud acotada.
function sanitizeName(name) {
  const base = String(name || 'fichero').split(/[\\/]/).pop();
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f"]/g, '').trim();
  return (clean || 'fichero').slice(0, 255);
}

async function upload(userId, file) {
  if (!file) {
    throw new AppError(400, 'Falta el fichero (campo "file")', 'VALIDATION_ERROR');
  }
  const mimeType = detectFileType(file.buffer);
  if (!mimeType) {
    throw new AppError(415, 'Tipo de fichero no permitido', 'UNSUPPORTED_FILE_TYPE');
  }

  const storageName = await storage.save(file.buffer);
  try {
    const { rows } = await pool.query(
      `INSERT INTO files (user_id, original_name, storage_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${PUBLIC_COLUMNS}`,
      [userId, sanitizeName(file.originalname), storageName, mimeType, file.size],
    );
    return toPublic(rows[0]);
  } catch (err) {
    await storage.remove(storageName);
    throw err;
  }
}

async function list(userId) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM files WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(toPublic);
}

// Busca un fichero comprobando SIEMPRE que pertenece al usuario.
// Si no es suyo respondemos 404, no 403: así no revelamos que existe (evita IDOR).
async function findOwned(userId, fileId) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, storage_name FROM files WHERE id = $1 AND user_id = $2`,
    [fileId, userId],
  );
  if (!rows[0]) {
    throw new AppError(404, 'Fichero no encontrado', 'NOT_FOUND');
  }
  return { ...toPublic(rows[0]), path: storage.pathFor(rows[0].storage_name) };
}

async function remove(userId, fileId) {
  const { rows } = await pool.query(
    'DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING storage_name',
    [fileId, userId],
  );
  if (!rows[0]) {
    throw new AppError(404, 'Fichero no encontrado', 'NOT_FOUND');
  }
  await storage.remove(rows[0].storage_name);
}

module.exports = { upload, list, findOwned, remove, sanitizeName };
