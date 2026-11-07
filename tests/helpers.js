'use strict';

const request = require('supertest');
const createApp = require('../src/app');
const pool = require('../src/db/pool');
const storage = require('../src/services/storage.service');

const app = createApp();

async function resetDatabase() {
  await pool.query('TRUNCATE files, users CASCADE');
  await storage.ensureUploadDir();
}

// Registra un usuario y devuelve su token.
async function createUser(email = `user${Date.now()}${Math.random()}@test.dev`) {
  const password = 'contraseña-segura';
  await request(app).post('/auth/register').send({ email, password }).expect(201);
  const res = await request(app).post('/auth/login').send({ email, password }).expect(200);
  return { email, token: res.body.token };
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

module.exports = { app, pool, resetDatabase, createUser, PNG };
