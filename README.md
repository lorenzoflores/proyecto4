# Proyecto 4: API de gestión de ficheros

API REST en Node.js y Express para subir, listar, descargar y eliminar ficheros, construida paso a paso para llevarla a producción de forma profesional: seguridad, Docker, CI/CD y observabilidad.

Es el repositorio de referencia del curso. Cada sesión tiene su solución completa en una rama.

## Ramas (Oneflow)

| Rama | Contenido |
| --- | --- |
| `main` | Solo releases. Cada integración se despliega en staging; cada tag `vX.Y.Z` sobre `main`, en producción. |
| `develop` | Rama de desarrollo. Las sesiones se integran aquí al terminar. |
| `feature/sesion1` | API, autenticación JWT, validación, auditoría de seguridad y secretos. |
| `feature/sesion2` | Docker, docker-compose y despliegue en Railway. |
| `feature/sesion3` | Pipeline de CI/CD con auditoría automática del agente. |
| `feature/sesion4` | Logs estructurados, Sentry y métricas. |
| `release/x.y.z` | Versión candidata. Se integra en `main` (y así llega a staging) y después en `develop`. |
| `demo/vulnerabilidad` | Práctica de la sesión 3: un PR con una vulnerabilidad que el agente debe bloquear. **No se integra nunca.** |
| `demo/error-borrado` | Práctica de la sesión 4: el error simulado que se despliega en staging para diagnosticarlo. **No se integra nunca.** |

Flujo (siempre con pull request e historia lineal):

1. `feature/sesionX` sale de `develop`. Antes de integrarla, se rebasa sobre `develop` (`git rebase origin/develop`) y vuelve a `develop` con un PR, por *rebase* o *squash*.
2. Al final, de `develop` sale `release/1.0.0`. Se rebasa sobre `main` y se integra con un PR: el despliegue en staging es automático.
3. Cuando staging está bien, se crea el tag `v1.0.0` sobre `main` y se sube: eso despliega en producción (despliegue manual, con aprobación).
4. Se integra de vuelta en `develop` con otro PR.

`develop` y `main` están protegidas: no admiten push directo ni commits de merge, y todo entra por pull request.

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

## Docker

La imagen se construye en dos etapas: la primera instala solo las dependencias de producción con `npm ci --omit=dev` y la segunda copia esas dependencias y `src/`, sin tests ni secretos. La API corre con el usuario `node`, no como root, y la imagen incluye un `HEALTHCHECK` contra `/health`.

Para levantar la API y PostgreSQL en local:

```bash
cp .env.example .env        # rellena JWT_SECRET
docker compose up --build
curl localhost:3000/health
```

La base de datos no publica puertos hacia fuera: solo la ve la API, por la red interna de compose. Los ficheros subidos y los datos de PostgreSQL se guardan en volúmenes (`uploads` y `pgdata`), así que sobreviven a `docker compose down`. Para borrarlos también, usa `docker compose down -v`.

## Despliegue en Railway

`railway.json` le dice a Railway que construya con el `Dockerfile` y que espere a que `/health` responda antes de dar por bueno un despliegue.

1. Crea un proyecto en Railway desde este repositorio de GitHub.
2. Añade un servicio **PostgreSQL**.
3. En el servicio de la API, define estas variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`, una referencia a la base de datos, nunca la URL copiada a mano.
   - `JWT_SECRET`, generado con el comando de arriba y distinto para cada entorno.
   - `TRUST_PROXY` = `1`. Railway pone un proxy delante, y sin esto el rate limit trataría a todos los clientes como si fueran una sola IP.
   - `RAILWAY_RUN_UID` = `0`. Railway monta los volúmenes como root, así que esto permite escribir en el volumen.
4. Añade un **volumen** al servicio de la API montado en `/data/uploads`. Sin volumen, los ficheros se pierden en cada despliegue.
5. En *Settings → Networking*, genera un dominio público.

Las migraciones se aplican solas al arrancar.

## CI/CD

Los workflows están en `.github/workflows`. Cómo configurarlos (Railway, secretos y protección de ramas) está explicado en [docs/ci-cd.md](docs/ci-cd.md).

## Observabilidad

La API tiene logs JSON con reqId (pino), errores en Sentry y métricas en `/metrics` (prom-client, protegidas con token). Lo cuenta [docs/observabilidad.md](docs/observabilidad.md), que también explica el error simulado de la práctica.
