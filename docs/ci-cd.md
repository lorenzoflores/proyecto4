# CI/CD: cómo está montado y cómo configurarlo

## Qué se ejecuta y cuándo

| Workflow | Cuándo | Qué hace |
| --- | --- | --- |
| `ci.yml` | Lo llaman los otros tres | Lint y tests con PostgreSQL, `npm audit` de producción, búsqueda de secretos con gitleaks y `docker build`. |
| `pr.yml` | Pull request contra `develop` | `ci.yml` y además la auditoría de seguridad de Claude Code: deja un comentario en el PR y bloquea el merge si encuentra algo crítico o alto. |
| `staging.yml` | Push a `release/**` | `ci.yml`, despliegue en el entorno `staging` de Railway y comprobación de `/health`. |
| `production.yml` | Push a `main` | `ci.yml`, despliegue en el entorno `production` de Railway y comprobación de `/health`. |

Cada despliegue solo se lanza si `ci.yml` termina en verde.

## 1. Railway

1. En el proyecto de Railway, crea dos entornos: `staging` y `production`. Cada uno lleva su propio PostgreSQL, su volumen y sus variables. Las variables están explicadas en el README.
2. En el servicio de la API, ve a *Settings → Source* y **desactiva el despliegue automático**. Si no lo haces, Railway desplegaría por su cuenta y se saltaría los tests.
3. Crea un **token de proyecto** para cada entorno (*Project Settings → Tokens*). Un token de proyecto solo puede desplegar en su entorno, así que si se filtra el de staging, producción no corre peligro.

## 2. GitHub: entornos, secretos y variables

En *Settings → Environments*, crea `staging` y `production`. En cada uno, añade:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| Secreto | `RAILWAY_TOKEN` | El token de proyecto de ese entorno. |
| Variable | `RAILWAY_SERVICE` | El nombre del servicio de la API en Railway. |
| Variable | `APP_URL` | La URL pública, por ejemplo `https://proyecto4-staging.up.railway.app`. |

En `production`, activa **Required reviewers**: el despliegue esperará a que alguien lo apruebe.

En *Settings → Secrets and variables → Actions*, añade el secreto `ANTHROPIC_API_KEY` a nivel de repositorio. Lo usa la revisión del agente. Instala también la app de Claude en el repositorio (en Claude Code, con `/install-github-app`).

## 3. Protección de ramas

En *Settings → Rules → Rulesets*, crea una regla para `develop` y otra para `main` con estas opciones:

- **Require a pull request before merging**.
- **Require status checks to pass**, con `ci / Lint y tests`, `ci / Auditoría de dependencias`, `ci / Búsqueda de secretos` y `ci / Construir imagen`.
- **Block force pushes**.

En `main`, además, permite solo los merges que vengan de `release/*`. Esto se revisa en el PR de la release.

Añade también `Revisión de seguridad (Claude Code)` como check obligatorio en `develop`. El agente deja un comentario con sus hallazgos y escribe un veredicto: si encuentra algo crítico o alto, el job falla y el PR no se puede integrar.

Ten en cuenta sus límites:

- Puede dar falsos positivos.
- Cada ejecución cuesta dinero de la clave de API.
- Un PR malicioso podría intentar convencerle de que todo está bien (prompt injection).

Por eso complementa la revisión de una persona, pero no la sustituye.

## 4. Flujo de una release (Oneflow)

```bash
git checkout -b release/1.0.0 develop
git push -u origin release/1.0.0        # → staging.yml despliega en staging
# probar en staging; si hay que arreglar algo, commit en release/1.0.0
git tag -a v1.0.0 -m "Versión 1.0.0"
git push origin v1.0.0
git checkout main && git merge --ff-only v1.0.0 && git push   # → production.yml
git checkout develop && git merge --no-ff v1.0.0 && git push
git push origin --delete release/1.0.0
```
