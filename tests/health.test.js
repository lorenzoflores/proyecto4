'use strict';

const request = require('supertest');
const { app, pool } = require('./helpers');

afterAll(() => pool.end());

test('GET /health responde 200 con la base de datos accesible', async () => {
  const res = await request(app).get('/health').expect(200);
  expect(res.body).toEqual({ status: 'ok', database: 'ok' });
});

test('no expone la cabecera X-Powered-By', async () => {
  const res = await request(app).get('/health');
  expect(res.headers['x-powered-by']).toBeUndefined();
});

test('una ruta inexistente responde 404 en JSON', async () => {
  const res = await request(app).get('/no-existe').expect(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});
