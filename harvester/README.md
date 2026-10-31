# Harvester — Worker d'Ingestion Asynchrone

Le harvester est le **moteur d'ingestion** de The Universal Stack. Il dépile des jobs Redis, respecte le débit de chaque fournisseur, valide les réponses avec Zod, conserve le payload brut et upserte les entités normalisées dans PostgreSQL/PostGIS.

## Démarrage

Le service est lancé automatiquement par `./start.sh` via `compose.yaml`.

```bash
# Local (Redis et PostgreSQL déjà joignables)
DATABASE_URL=postgres://postgres:postgres_password@localhost:5432/universal_db \
REDIS_URL=redis://localhost:6379 \
npm run dev
```

## Scripts

| Commande | Rôle |
| :---- | :---- |
| `npm run dev` | Démarrage avec rechargement (`tsx watch`). |
| `npm run typecheck` | Vérification TypeScript sans émission. |
| `npm run build` | Compilation dans `dist/`. |
| `npm start` | Exécution du build compilé. |

## Structure

| Chemin | Rôle |
| :---- | :---- |
| `src/index.ts` | Amorçage, sonde `/health`, arrêt propre. |
| `src/config/redis.ts` | Conversion de `REDIS_URL` en options BullMQ. |
| `src/db/client.ts` | Pool `postgres.js` + instance Drizzle. |
| `src/db/schema.ts` | Ré-export du schéma partagé (`shared-db`). |
| `src/core/base-adapter.ts` | Contrat des adaptateurs. |
| `src/core/queue-manager.ts` | Files, workers, idempotence, rate-limiting. |
| `src/core/http-client.ts` | Fetcher résilient (retry, timeout, 429). |
| `src/adapters/` | Un fichier par fournisseur. |

## Ajouter un fournisseur

1. Copier `src/adapters/example.adapter.ts`.
2. Définir un schéma Zod strict du format brut.
3. Renseigner `rateLimit` d'après la documentation du fournisseur.
4. Upserter `externalApiCache` puis l'entité métier.
5. Dispatcher les sous-ressources avec `dispatchNextJob`.
6. Enregistrer l'adaptateur dans `src/index.ts`.

## Règles

- Les jobs ne transportent que `{ externalId, parentId? }`.
- Aucun appel externe synchrone côté API : tout passe par une file.
- Un `429` gèle la file avant retry (`Retry-After`).
- Un job rejoué ne crée jamais de doublon (`ON CONFLICT DO UPDATE`).
- `SIGINT`/`SIGTERM` attendent la fin du job actif avant fermeture.

Documentation complète : [`../docs/harvester.md`](../docs/harvester.md).
