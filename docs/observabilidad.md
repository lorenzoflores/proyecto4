# Observabilidad

## Logs

Los logs se escriben con pino: una línea JSON por evento. Cada petición deja una línea con `req.id` (el reqId), `route` (el patrón, como `DELETE /files/:id`), `userId`, `res.statusCode` y `responseTime` en milisegundos. El reqId también se devuelve al cliente en la cabecera `X-Request-Id`.

- Nunca se registran cuerpos, cabeceras completas, tokens ni contraseñas: `redact` los sustituye por `[REDACTADO]`.
- En local, para leerlos cómodamente: `npm run dev | npx pino-pretty`.
- En Railway, para ver todo lo que pasó en una petición, filtra en *Observability → Logs* por `@req.id:<reqId>`, o busca el reqId como texto.

## Sentry

`src/instrument.js` inicializa Sentry antes de cargar Express, y `Sentry.setupExpressErrorHandler(app)` envía los errores 5xx. Cada evento llega con esta información:

- Stack trace con fichero y línea.
- Ruta y método.
- Usuario, solo por su id (`sendDefaultPii: false`).
- `environment`, tomado de `SENTRY_ENVIRONMENT`.
- `release`: `proyecto4-api-ficheros@<versión de package.json>`. Al crear `release/x.y.z`, sube la versión con `npm version x.y.z --no-git-tag-version`. Así la release de Sentry y el tag `vx.y.z` coinciden.

Para activarlo, define `SENTRY_DSN` en cada entorno de Railway. Usa un proyecto de Sentry y pon `SENTRY_ENVIRONMENT=staging` o `production` según el entorno.

## Métricas

`GET /metrics` devuelve las métricas en formato Prometheus y exige `Authorization: Bearer <METRICS_TOKEN>`. Si no defines `METRICS_TOKEN`, la ruta responde 404.

| Métrica | Tipo | Qué cuenta |
| --- | --- | --- |
| `http_requests_total` | Contador | Peticiones por método, ruta y estado. |
| `http_request_duration_seconds` | Histograma | Duración por método y ruta. |
| `http_errors_total` | Contador | Respuestas 5xx por método y ruta. |
| `files_uploaded_total` | Contador | Ficheros subidos. |
| `storage_bytes` | Gauge | Bytes que ocupan los ficheros. Se calcula al pedir `/metrics`. |

La etiqueta `route` es el patrón de la ruta (`/files/:id`), nunca la URL real. Con la URL, cada id crearía una serie nueva.

```bash
curl -H "Authorization: Bearer $METRICS_TOKEN" https://<tu-app>/metrics
```

## El error simulado (práctica de la sesión 4)

La rama `demo/error-borrado` contiene la API de la sesión 4 con un error introducido a propósito. Esa rama **nunca se integra**: solo sirve para desplegarla en staging durante la práctica.

- **Síntoma**: borrar algunos ficheros devuelve un 500. Los demás se borran bien.
- **Cómo provocarlo**: sube un fichero llamado `informe 100%.txt` e intenta borrarlo.
- **Qué se ve**:
  - En Sentry, un `URIError: URI malformed` en `files.controller.js`, con la ruta `DELETE /files/:id` y el id del usuario.
  - En los logs, la línea de esa petición, con status 500 y el mismo reqId que devolvió `X-Request-Id`.
  - En `/metrics`, cómo sube `http_errors_total{route="/files/:id"}`.
- **Causa**: alguien añadió `decodeURIComponent(file.name)` para "arreglar" los nombres en un log. Esa función lanza una excepción con un `%` que no forma una secuencia válida.
- **Corrección**: la de `feature/sesion4`. No se decodifica nada y el log solo lleva el id. El test de regresión está en `tests/observability.test.js`.

Para desplegarla en staging:

```bash
railway up --service <api> --environment staging   # desde la rama demo/error-borrado
```
