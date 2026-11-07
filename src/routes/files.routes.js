'use strict';

const { Router } = require('express');
const multer = require('multer');
const config = require('../config');
const requireAuth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { fileIdParams } = require('../schemas');
const controller = require('../controllers/files.controller');

const router = Router();

// En memoria para poder comprobar el tipo real antes de escribir en disco.
// El límite de tamaño corta la subida en cuanto se supera (responde 413).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_FILE_SIZE_BYTES, files: 1, fields: 0 },
});

router.use(requireAuth);

router.post('/', upload.single('file'), controller.upload);
router.get('/', controller.list);
router.get('/:id/preview', controller.preview);
router.get('/:id', validate(fileIdParams, 'params'), controller.download);
router.delete('/:id', validate(fileIdParams, 'params'), controller.remove);

module.exports = router;
