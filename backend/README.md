# Backend (Hono + TypeScript)

L'API backend est développée avec [Hono](https://hono.dev/) en TypeScript.

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
| `GET` | `/` | Message de vérification |
| `GET` | `/health` | Sonde de disponibilité (utilisée par `start.sh`) |

## Notes techniques

- Le port est lu depuis `process.env.API_PORT` et doit rester aligné avec `compose.yaml` et `.env`.
- Le montage `./backend:/app` est complété par le volume nommé `backend_node_modules` : les dépendances installées dans l'image ne sont jamais masquées.
- En développement, `tsx watch` redémarre automatiquement à chaque modification.

```bash
podman-compose logs -f backend
```
