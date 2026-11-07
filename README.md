# Proyecto 4: API de gestión de ficheros

API REST en Node.js y Express para subir, listar, descargar y eliminar ficheros, construida paso a paso para llevarla a producción de forma profesional: seguridad, Docker, CI/CD y observabilidad.

Es el repositorio de referencia del curso. Cada sesión tiene su solución completa en una rama.

## Ramas (Oneflow)

| Rama | Contenido |
| --- | --- |
| `main` | Solo versiones publicadas. Es lo que está en producción. |
| `develop` | Rama de desarrollo. Las sesiones se integran aquí al terminar. |
| `feature/sesion1` | API, autenticación JWT, validación, auditoría de seguridad y secretos. |
| `feature/sesion2` | Docker, docker-compose y despliegue en Railway. |
| `feature/sesion3` | Pipeline de CI/CD con auditoría automática del agente. |
| `feature/sesion4` | Logs estructurados, Sentry y métricas. |
| `release/x.y.z` | Versión candidata. Se despliega en staging, se etiqueta y se integra en `main`. |

Flujo: `feature/sesionX` sale de `develop` y vuelve a `develop`. Al final, de `develop` sale `release/1.0.0`; se prueba en staging, se etiqueta `v1.0.0` y se integra en `main` (producción) y de vuelta en `develop`.

Referencia: [Oneflow, a Git branching model and workflow](https://www.endoflineblog.com/oneflow-a-git-branching-model-and-workflow).

## API

Todas las rutas de `/files` necesitan la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Estado de la API y de la base de datos. |
| `POST` | `/auth/register` | Crea un usuario (`email`, `password`). |
| `POST` | `/auth/login` | Devuelve un JWT. |
| `POST` | `/files` | Sube un fichero (multipart, campo `file`). |
| `GET` | `/files` | Lista tus ficheros. |
| `GET` | `/files/:id` | Descarga uno de tus ficheros. |
| `DELETE` | `/files/:id` | Elimina uno de tus ficheros. |

Tipos permitidos: PNG, JPEG, PDF y texto plano, detectados por su contenido (no por la extensión).

## Arrancar en local

Necesitas Node 22 o superior y PostgreSQL.

```bash
npm install
cp .env.example .env        # y rellena DATABASE_URL y JWT_SECRET
npm run migrate
npm run dev
```

Para generar un `JWT_SECRET`: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.

## Tests

Los tests usan una base de datos PostgreSQL real (por defecto `postgres://postgres:postgres@localhost:5432/ficheros_test`, o la que indiques en `TEST_DATABASE_URL`). Ojo: la vacían en cada test.

```bash
npm test
npm run lint
```
