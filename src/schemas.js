'use strict';

const { z } = require('zod');

const credentials = z.object({
  email: z.email('Email no válido').max(254).transform((email) => email.toLowerCase()),
  // bcrypt solo usa los primeros 72 bytes de la contraseña
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres'),
});

const fileIdParams = z.object({
  id: z.uuid('Identificador de fichero no válido'),
});

module.exports = { credentials, fileIdParams };
