'use strict';

// Guarda los bytes de los ficheros en disco. El nombre en disco lo genera
// el servidor (UUID): nunca se usa el nombre que manda el cliente, para
// evitar path traversal (../../etc/passwd) y colisiones.

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../config');

const uploadRoot = path.resolve(config.UPLOAD_DIR);

async function ensureUploadDir() {
  await fs.mkdir(uploadRoot, { recursive: true });
}

function pathFor(storageName) {
  const fullPath = path.resolve(uploadRoot, storageName);
  // Defensa en profundidad: la ruta final debe quedar dentro de UPLOAD_DIR.
  if (path.dirname(fullPath) !== uploadRoot) {
    throw new Error('Nombre de almacenamiento no válido');
  }
  return fullPath;
}

async function save(buffer) {
  const storageName = crypto.randomUUID();
  await fs.writeFile(pathFor(storageName), buffer, { flag: 'wx' });
  return storageName;
}

async function remove(storageName) {
  await fs.rm(pathFor(storageName), { force: true });
}

module.exports = { ensureUploadDir, pathFor, save, remove, uploadRoot };
