'use strict';

const filesService = require('../services/files.service');

async function upload(req, res) {
  const file = await filesService.upload(req.user.id, req.file);
  res.status(201).json(file);
}

async function list(req, res) {
  const files = await filesService.list(req.user.id);
  res.json({ files });
}

async function download(req, res, next) {
  const file = await filesService.findOwned(req.user.id, req.validated.params.id);
  // Siempre como descarga (attachment) y con el tipo detectado al subirlo,
  // nunca con uno deducido del nombre: así un "x.html" no se ejecuta en el navegador.
  res.attachment(file.name);
  res.type(file.mimeType);
  res.sendFile(file.path, (err) => {
    if (err && !res.headersSent) next(err);
  });
}

async function remove(req, res) {
  await filesService.remove(req.user.id, req.validated.params.id);
  res.status(204).end();
}

// Muestra el fichero en el navegador en vez de descargarlo.
async function preview(req, res) {
  const file = await filesService.findById(req.params.id);
  res.type(file.name.split('.').pop());
  res.sendFile(file.path);
}

module.exports = { upload, list, download, preview, remove };
