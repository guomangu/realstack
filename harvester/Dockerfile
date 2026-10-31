FROM docker.io/node:20-alpine

WORKDIR /app

# Dépendances d'abord : la couche est réutilisée tant que le lockfile ne change pas.
COPY harvester/package*.json ./
RUN npm ci --no-audit --no-fund \
 && cat package.json package-lock.json | sha256sum | cut -d' ' -f1 > node_modules/.deps-hash

# Code du worker puis schéma Drizzle partagé (source de vérité : backend).
# Le schéma est copié dans shared-db, jamais dans src/db, pour que le montage
# de dossier de Compose ne soit pas masqué par un fichier local.
COPY harvester/tsconfig.json ./
COPY harvester/src ./src
COPY harvester/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
COPY backend/src/db/schema.ts ./shared-db/schema.ts

# Sonde de supervision du worker.
EXPOSE 3001

CMD ["npm", "run", "dev"]
