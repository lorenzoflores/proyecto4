'use strict';

// Configuración de los tests. Se usa una base de datos propia para no tocar la de desarrollo.
const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ficheros_test';
process.env.JWT_SECRET = 'secreto-solo-para-tests-con-mas-de-32-caracteres';
process.env.JWT_EXPIRES_IN = '1h';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'proyecto4-test-uploads');
process.env.MAX_FILE_SIZE_BYTES = String(1024 * 1024); // 1 MB en tests
process.env.AUTH_RATE_LIMIT_MAX = '1000';
