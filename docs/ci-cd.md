# CI/CD: cómo está montado y cómo configurarlo

## Qué se ejecuta y cuándo

| Workflow | Cuándo | Qué hace |
| --- | --- | --- |
| `ci.yml` | Lo llaman los otros tres | Lint y tests con PostgreSQL, `npm audit` de producción, búsqueda de secretos con gitleaks y `docker build`. |
| `pr.yml` | Pull request contra `develop` | `ci.yml` y además la auditoría de seguridad de Claude Code: deja un comentario en el PR y bloquea el merge si encuentra algo crítico o alto. |
| `staging.yml` | Push a `main` (al integrar la release) | `ci.yml`, despliegue automático en el entorno `staging` de Railway y comprobación de `/health`. |
| `production.yml` | Push de un tag `v*` | Comprueba que el tag apunta a un commit de `main`, `ci.yml`, despliegue en el entorno `production` de Railway (tras la aprobación manual) y comprobación de `/health`. |

Cada despliegue solo se lanza si `ci.yml` termina en verde. Staging es automático: basta con integrar en `main`. Producción es manual: solo se despliega cuando alguien crea y sube el tag de la versión, y además el entorno `production` pide aprobación.

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

En `production`, activa **Required reviewers**: el despliegue esperará a que alguien lo apruebe. En *Deployment branches and tags*, elige **Selected branches and tags** y añade la regla de tag `v*`, para que este entorno (y su token) solo se pueda usar desde un tag de versión. En `staging`, limita igual el entorno a la rama `main`.

En *Settings → Secrets and variables → Actions*, añade el secreto `ANTHROPIC_API_KEY` a nivel de repositorio. Lo usa la revisión del agente. Instala también la app de Claude en el repositorio (en Claude Code, con `/install-github-app`).

## 3. Protección de ramas

En *Settings → Rules → Rulesets*, crea una regla para `develop` y otra para `main` con estas opciones:

- **Restrict deletions** y **Block force pushes**.
- **Require a pull request before merging**, con 0 aprobaciones obligatorias si trabajas solo (GitHub no deja aprobar tu propio PR) y **Allowed merge methods: Squash y Rebase**, sin merge commit.
- **Require linear history**, para que no entre ningún commit de merge.
- **Require status checks to pass**, con **Require branches to be up to date before merging** marcado (obliga a rebasar antes de integrar) y los checks `ci / Lint y tests`, `ci / Auditoría de dependencias`, `ci / Búsqueda de secretos` y `ci / Construir imagen`.

En `main`, además, permite solo los merges que vengan de `release/*`. Esto se revisa en el PR de la release.

Añade también `Revisión de seguridad (Claude Code)` como check obligatorio en `develop`. El agente deja un comentario con sus hallazgos y escribe un veredicto: si encuentra algo crítico o alto, el job falla y el PR no se puede integrar.

Ten en cuenta sus límites:

- Puede dar falsos positivos.
- Cada ejecución cuesta dinero de la clave de API.
- Un PR malicioso podría intentar convencerle de que todo está bien (prompt injection).

Por eso complementa la revisión de una persona, pero no la sustituye.

## 4. Flujo de trabajo (Oneflow, siempre con pull requests e historia lineal)

Nadie hace push directo a `develop` ni a `main`. Todo entra por PR, con los checks en verde y la rama rebasada sobre el destino. GitHub no tiene un botón de merge *fast-forward only*. Lo más parecido es integrar con **Rebase and merge** (o **Squash and merge**) después de rebasar: la historia queda lineal, como en un fast-forward, aunque GitHub vuelve a crear los commits con otro SHA.

**Cada sesión (feature → develop)**

```bash
git fetch origin
git checkout feature/sesion2
git rebase origin/develop                    # siempre, antes de integrar
git push --force-with-lease                  # la rama feature es tuya: se puede reescribir
gh pr create --base develop --head feature/sesion2 --title "Sesión 2"
# esperar a los checks (tests, auditoría, revisión del agente) y revisar
gh pr merge --rebase                         # o --squash para dejar un solo commit
```

Después de integrar la sesión 1, `feature/sesion2` sigue apuntando a los commits antiguos de la sesión 1. Al rebasarla sobre `develop`, Git detecta que esos cambios ya están y los salta: solo quedan los de la sesión 2.

**La release (release → main y release → develop)**

```bash
git checkout -b release/1.0.0 origin/develop
npm version 1.0.0 --no-git-tag-version       # la versión que verá Sentry
git commit -am "Versión 1.0.0"
git rebase origin/main
git push -u origin release/1.0.0
gh pr create --base main --head release/1.0.0 --title "Release 1.0.0"
gh pr merge --rebase                         # → staging.yml despliega en staging (automático)

# Probar en staging. Si hay que arreglar algo: commit en release/1.0.0, push y otro PR a main.

# Producción es manual: se crea el tag sobre main cuando staging está bien.
# El tag va DESPUÉS de integrar porque el rebase de GitHub cambia los SHA.
git fetch origin && git tag -a v1.0.0 origin/main -m "Versión 1.0.0"
git push origin v1.0.0                       # → production.yml despliega en producción (tras aprobar)

git checkout release/1.0.0 && git rebase origin/develop && git push --force-with-lease
gh pr create --base develop --head release/1.0.0 --title "Release 1.0.0 a develop"
gh pr merge --rebase --delete-branch
```
