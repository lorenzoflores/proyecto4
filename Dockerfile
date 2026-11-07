# syntax=docker/dockerfile:1

# ---- Etapa 1: dependencias de producción ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm ci instala exactamente lo del lockfile; --omit=dev deja fuera Jest, ESLint...
RUN npm ci --omit=dev && npm cache clean --force

# ---- Etapa 2: imagen final ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/data/uploads
WORKDIR /app

# Solo lo necesario para ejecutar: dependencias y código, sin tests ni secretos.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# Carpeta de subidas (en Railway se monta un volumen encima) y fuera npm y yarn:
# en producción no se instalan paquetes, y cuanto menos haya, menos se puede atacar.
RUN mkdir -p /data/uploads && chown -R node:node /data \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
           /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

# No ejecutar como root: si alguien compromete la app, no controla el contenedor.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# node directamente (no npm start) para que reciba SIGTERM y pare ordenadamente.
CMD ["node", "src/server.js"]
