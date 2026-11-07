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
