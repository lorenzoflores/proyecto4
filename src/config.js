'use strict';

// Carga y valida la configuración desde variables de entorno.
// Si falta una variable obligatoria o tiene un valor inválido, la aplicación
// no arranca: es mejor fallar al inicio que en mitad de una petición.

require('dotenv').config({ quiet: true });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  // Número de proxies delante de la API (Railway pone 1). Sin esto, detrás de
  // un proxy todas las peticiones parecen venir de la misma IP y el rate limit
  // bloquearía a todos a la vez. 0 = sin proxy (local).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // No usamos un logger todavía (llega en la sesión 4).
  console.error(`Configuración inválida:\n${problems}`);
  process.exit(1);
}

module.exports = Object.freeze(parsed.data);
