'use strict';

const request = require('supertest');
const { app, pool, resetDatabase, createUser, PNG } = require('./helpers');

beforeEach(resetDatabase);
afterAll(() => pool.end());

const METRICS_AUTH = `Bearer ${process.env.METRICS_TOKEN}`;

describe('ID de petición', () => {
  test('cada respuesta lleva un X-Request-Id nuevo', async () => {
    const a = await request(app).get('/health');
    const b = await request(app).get('/health');
    expect(a.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
  });

  test('reutiliza un X-Request-Id válido y descarta uno que no lo es', async () => {
    const id = '7c1e6a0e-3f0b-4b8e-9a51-2f3c4d5e6f70';
    const reused = await request(app).get('/health').set('X-Request-Id', id);
    expect(reused.headers['x-request-id']).toBe(id);

    const injected = await request(app).get('/health').set('X-Request-Id', 'fatal-no-es-uuid');
    expect(injected.headers['x-request-id']).not.toContain('fatal');
  });
});

describe('/metrics', () => {
  test('sin token responde 401', async () => {
    await request(app).get('/metrics').expect(401);
    await request(app).get('/metrics').set('Authorization', 'Bearer otro-token-cualquiera').expect(401);
  });

  test('con token devuelve las métricas de uso con la ruta como patrón', async () => {
    const { token } = await createUser();
    const { body: file } = await request(app)
      .post('/files')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG, 'foto.png')
      .expect(201);
    await request(app).get(`/files/${file.id}`).set('Authorization', `Bearer ${token}`).expect(200);

    const res = await request(app).get('/metrics').set('Authorization', METRICS_AUTH).expect(200);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('route="/files/:id"');
    expect(res.text).not.toContain(file.id);
    expect(res.text).toMatch(/files_uploaded_total \d+/);
    expect(res.text).toContain(`storage_bytes ${PNG.length}`);
  });
});

describe('borrado de ficheros con nombres poco habituales', () => {
  // Regresión del error simulado de la sesión 4: el borrado fallaba con un 500
  // cuando el nombre original contenía "%" (decodeURIComponent lanzaba URIError).
  test.each(['informe 100%.txt', 'año 2025 – versión «final».txt', '%E0%A4%A.txt'])(
    'se puede borrar "%s"',
    async (name) => {
      const { token } = await createUser();
      const { body: file } = await request(app)
        .post('/files')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('contenido'), name)
        .expect(201);
      await request(app).delete(`/files/${file.id}`).set('Authorization', `Bearer ${token}`).expect(204);
    },
  );
});
