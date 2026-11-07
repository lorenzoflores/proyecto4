'use strict';

const filesService = require('../services/files.service');
const { filesUploaded } = require('../metrics');

async function upload(req, res) {
  const file = await filesService.upload(req.user.id, req.file);
  filesUploaded.inc();
  req.log.info({ fileId: file.id, sizeBytes: file.sizeBytes, mimeType: file.mimeType }, 'Fichero subido');
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
  const file = await filesService.findOwned(req.user.id, req.validated.params.id);
  // Algunos clientes mandan el nombre codificado (%20...): lo decodificamos para el log.
  req.log.info({ fileId: file.id, name: decodeURIComponent(file.name) }, 'Borrando fichero');
  await filesService.remove(req.user.id, file.id);
  res.status(204).end();
}

module.exports = { upload, list, download, remove };
