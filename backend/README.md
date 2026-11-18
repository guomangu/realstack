# Backend (Hono + TypeScript + Drizzle)

L'API backend est développée avec [Hono](https://hono.dev/) et **Drizzle ORM** sur PostgreSQL 16 + PostGIS.

## Lancement

Le backend est orchestré par `compose.yaml`, compatible **Podman** (Fedora 44) et **Docker**.

```bash
# Depuis la racine : lance tout le stack (aucune option)
./start.sh
```

L'API écoute sur `http://localhost:${API_PORT}` (par défaut `3000`).

## Endpoints actuels

| Méthode | Route | Description |
| :---- | :---- | :---- |
| `GET` | `/` | Métadonnées minimales de l'API |
| `GET` | `/health` | Sonde réelle PostgreSQL + Redis (`200 ok` / `503 degraded`) |
| `GET` | `/api/locations` | Recherche locale (`q`, `source`, `lat`/`lng`/`radiusKm` PostGIS, `limit <= 200`) |
| `GET` | `/api/locations/:source/:externalId` | Détail normalisé et fraîcheur `external_api_cache` |
| `POST` | `/api/harvest/:adapter` | Enfile un job idempotent `{ externalId, parentId? }` dans Redis (`202 Accepted`) |

## Base de données & tests

- Au démarrage, `src/db/migrate.ts` applique les migrations SQL (`src/db/migrations/`) sous verrou consultatif PostgreSQL et active `postgis`.
- Le montage `./backend:/app:z` est complété par le volume nommé `backend_node_modules`.
- CORS est configuré via `CORS_ORIGINS` ; `secureHeaders()` protège les réponses HTTP.

```bash
npm run typecheck
npm run test
podman-compose logs -f backend
```
