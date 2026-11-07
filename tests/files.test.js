'use strict';

const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, pool, resetDatabase, createUser, PNG } = require('./helpers');

beforeEach(resetDatabase);
afterAll(() => pool.end());

function uploadAs(token, buffer, filename) {
  return request(app)
    .post('/files')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', buffer, filename);
}

describe('autenticación de /files', () => {
  test('sin token responde 401', async () => {
    await request(app).get('/files').expect(401);
  });

  test('con un token firmado con otro secreto responde 401', async () => {
    const forged = jwt.sign({ sub: 'x' }, 'otro-secreto');
    await request(app).get('/files').set('Authorization', `Bearer ${forged}`).expect(401);
  });

  test('con un token sin firma (alg none) responde 401', async () => {
    const unsigned = jwt.sign({ sub: 'x' }, null, { algorithm: 'none' });
    await request(app).get('/files').set('Authorization', `Bearer ${unsigned}`).expect(401);
  });
});

describe('ciclo completo de un fichero', () => {
  test('subir, listar, descargar y eliminar', async () => {
    const { token } = await createUser();

    const uploaded = await uploadAs(token, Buffer.from('hola mundo'), 'saludo.txt').expect(201);
    expect(uploaded.body).toMatchObject({ name: 'saludo.txt', mimeType: 'text/plain', sizeBytes: 10 });

    const listed = await request(app).get('/files').set('Authorization', `Bearer ${token}`).expect(200);
    expect(listed.body.files).toHaveLength(1);

    const downloaded = await request(app)
      .get(`/files/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(downloaded.text).toBe('hola mundo');
    expect(downloaded.headers['content-disposition']).toContain('attachment');

    await request(app)
      .delete(`/files/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(app)
      .get(`/files/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});

describe('aislamiento entre usuarios (IDOR)', () => {
  test('un usuario no puede ver, descargar ni borrar ficheros de otro', async () => {
    const ana = await createUser('ana@test.dev');
    const luis = await createUser('luis@test.dev');
    const { body: file } = await uploadAs(ana.token, PNG, 'foto.png').expect(201);

    const list = await request(app).get('/files').set('Authorization', `Bearer ${luis.token}`).expect(200);
    expect(list.body.files).toHaveLength(0);
    await request(app).get(`/files/${file.id}`).set('Authorization', `Bearer ${luis.token}`).expect(404);
    await request(app).delete(`/files/${file.id}`).set('Authorization', `Bearer ${luis.token}`).expect(404);

    // El fichero de Ana sigue ahí
    await request(app).get(`/files/${file.id}`).set('Authorization', `Bearer ${ana.token}`).expect(200);
  });
});

describe('validación de subidas', () => {
  test('rechaza un fichero mayor que el máximo con 413', async () => {
    const { token } = await createUser();
    const tooBig = Buffer.alloc(1024 * 1024 + 1, 'a');
    await uploadAs(token, tooBig, 'grande.txt').expect(413);
  });

  test('rechaza un tipo no permitido aunque tenga extensión permitida', async () => {
    const { token } = await createUser();
    const executable = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // cabecera de un .exe
    await uploadAs(token, executable, 'foto.png').expect(415);
  });

  test('rechaza una subida sin fichero con 400', async () => {
    const { token } = await createUser();
    await request(app).post('/files').set('Authorization', `Bearer ${token}`).expect(400);
  });

  test('ignora rutas en el nombre y guarda en disco con un nombre generado', async () => {
    const { token } = await createUser();
    const res = await uploadAs(token, PNG, '../../etc/passwd.png').expect(201);
    expect(res.body.name).toBe('passwd.png');

    const { rows } = await pool.query('SELECT storage_name FROM files WHERE id = $1', [res.body.id]);
    expect(rows[0].storage_name).toMatch(/^[0-9a-f-]{36}$/);
    expect(fs.existsSync(path.join(process.env.UPLOAD_DIR, rows[0].storage_name))).toBe(true);
  });

  test('un id que no es UUID responde 400', async () => {
    const { token } = await createUser();
    await request(app).get('/files/../../etc').set('Authorization', `Bearer ${token}`).expect(404);
    await request(app).get('/files/no-es-uuid').set('Authorization', `Bearer ${token}`).expect(400);
  });
});
