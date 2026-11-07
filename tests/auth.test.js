'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, pool, resetDatabase } = require('./helpers');

beforeEach(resetDatabase);
afterAll(() => pool.end());

const credentials = { email: 'Ana@Test.dev', password: 'contraseña-segura' };

describe('POST /auth/register', () => {
  test('crea un usuario y no devuelve la contraseña', async () => {
    const res = await request(app).post('/auth/register').send(credentials).expect(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: 'ana@test.dev',
      createdAt: expect.any(String),
    });
    const { rows } = await pool.query('SELECT password_hash FROM users');
    expect(rows[0].password_hash).not.toContain(credentials.password);
  });

  test('rechaza un email repetido con 409', async () => {
    await request(app).post('/auth/register').send(credentials).expect(201);
    await request(app).post('/auth/register').send(credentials).expect(409);
  });

  test('rechaza datos no válidos con 400', async () => {
    await request(app).post('/auth/register').send({ email: 'no-es-email', password: '123' }).expect(400);
  });

  test('rechaza JSON mal formado con 400', async () => {
    await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(() => request(app).post('/auth/register').send(credentials).expect(201));

  test('devuelve un JWT con credenciales correctas', async () => {
    const res = await request(app).post('/auth/login').send(credentials).expect(200);
    const payload = jwt.decode(res.body.token);
    expect(payload.sub).toEqual(expect.any(String));
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test('responde igual a contraseña incorrecta y a email inexistente', async () => {
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ ...credentials, password: 'otra-contraseña' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ ...credentials, email: 'nadie@test.dev' })
      .expect(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});
