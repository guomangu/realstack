FROM docker.io/node:20-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de façon reproductible et mémoriser leur empreinte
# pour que le conteneur de développement ne réinstalle pas à chaque démarrage.
RUN npm ci --no-audit --no-fund \
 && cat package.json package-lock.json | sha256sum | cut -d' ' -f1 > node_modules/.deps-hash

# Copier le reste du code
COPY . .

# Exposer le port de l'API Hono
EXPOSE 3000

# En développement, on lance le serveur de dev
CMD ["npm", "run", "dev"]
