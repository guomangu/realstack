# Dossier Base de Données

Ce dossier accueille les **données persistantes de PostgreSQL 16 + PostGIS**.

- Le sous-dossier `postgres/` est monté dans le conteneur sur `/var/lib/postgresql/data`.
- L'option SELinux `:z` est appliquée dans `compose.yaml` (requis sur Fedora).
- Le moteur spatial PostGIS est activé automatiquement par l'image `docker.io/postgis/postgis:16-3.4`.

> Les anciennes mentions de SQLite/Prisma sont obsolètes : la stack de référence utilise PostgreSQL/PostGIS.

## Sauvegarde

```bash
podman-compose exec -T database \
  pg_dump -U postgres -d universal_db -Fc > universal_db.dump
```

Avec Docker : remplacer `podman-compose` par `docker compose`.

## Restauration

```bash
podman-compose exec -T database \
  pg_restore -U postgres -d universal_db --clean --if-exists < universal_db.dump
```

## Réinitialisation complète (destructive)

Avec Podman rootless, les fichiers de `data/postgres` appartiennent à l'UID mappé du conteneur. Utilisez donc `podman unshare` (et non `sudo chown`) pour les inspecter ou les supprimer :

```bash
# Ctrl-C dans ./start.sh arrête déjà l'infrastructure ; sinon :
podman-compose down
podman unshare rm -rf data/postgres
./start.sh
```

Inspection : `podman unshare ls -l data/postgres`.
