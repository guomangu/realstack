# Lancement Automatique & Bootstrap des Dépendances

> **Statut :** Implémenté
> **Dernière mise à jour :** 2026-10-25
> **Point d'entrée :** `./start.sh` (aucune option)

## 1. Objectif

Permettre à un développeur ou à un agent IA de cloner le dossier et de lancer toute la plateforme avec **une seule commande**, sans installation manuelle préalable et sans option à mémoriser.

## 2. Portée et non-objectifs

- **Inclus :** détection et installation des dépendances système, création de `.env`, préparation des volumes, démarrage de PostgreSQL/PostGIS, de l'API Hono et d'Expo, arrêt propre.
- **Exclus :** déploiement en production, configuration d'un domaine, compilation EAS, gestion des secrets de production.

## 3. Flux d'exécution

1. **Contrôle des arguments** : `start.sh` refuse toute option (`Aucune option n'est nécessaire`).
2. **`ensure_dependencies`** : vérifie `podman`, `podman-compose`, Node.js ≥ 20, `npm`, `npx`, `curl` ; installe les manquants via `dnf`, `apt-get`, `pacman` ou `zypper`.
3. **`prepare_environment`** : crée/charge `.env`, exporte les variables, crée `data/postgres`, génère `frontend/.env` public et lance `npm ci` si nécessaire.
4. **Détection Compose** : `COMPOSE_CMD`, puis `podman-compose`, `podman compose`, `docker compose`, `docker-compose`.
5. **Démarrage** : `$COMPOSE -f compose.yaml up --build -d`.
6. **Attente de santé** : `GET http://localhost:$API_PORT/health`, 2 s d'intervalle, 300 s max par défaut (`API_HEALTH_TIMEOUT`).
7. **Frontend** : `npx expo start -c --port $PORT` au premier plan.
8. **Nettoyage** : `Ctrl-C`, `SIGTERM` ou fermeture du terminal exécute `compose down` et libère les ports.

## 4. Structures et variables

| Variable | Rôle | Défaut |
| :---- | :---- | :---- |
| `API_PORT` | Port de l'API Hono | `3000` |
| `PORT` | Port Expo / Metro | `8081` |
| `DATABASE_URL` | Connexion PostgreSQL interne | construite si absente |
| `AUTH_SECRET` | Secret de session | généré pour la session si absent |
| `COMPOSE_CMD` | Moteur Compose explicite | vide = auto-détection |
| `API_HEALTH_TIMEOUT` | Délai maximal d'attente de `/health` (s) | `300` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Identifiants PostgreSQL | valeurs de développement |
| `DB_PORT` | Port PostgreSQL exposé | `5432` |

## 5. Modules réutilisables

| Module | Rôle |
| :---- | :---- |
| `scripts/ensure-dependencies.sh` | Installation idempotente des paquets système et politique d'élévation. |
| `scripts/prepare-environment.sh` | `.env`, données locales, dépendances npm et environnement public Expo. |
| `compose.yaml` | Services backend/PostGIS, volumes, santé et commande de développement. |

## 6. Élévation de privilèges

Testée dans cet ordre, uniquement si un paquet manque :

1. `root` : exécution directe.
2. `sudo -n` : si sudo ne demande pas de mot de passe.
3. `sudo` interactif : si un terminal est disponible (le mot de passe peut être demandé une fois).
4. `pkexec` : si un environnement graphique est présent.
5. `doas` : alternative.

Si aucun mécanisme ne fonctionne, le script affiche une instruction d'élévation et/ou la liste des paquets à installer manuellement.

## 7. Erreurs et reprise

- **Paquet introuvable :** message avec la liste des paquets et le gestionnaire détecté.
- **Podman ne répond pas :** arrêt avant toute modification, avec invitation à vérifier `podman info` et les entrées `/etc/subuid` / `/etc/subgid`.
- **API non saine :** affichage de l'état des services et des 40 dernières lignes de **tous** les services (la base peut être encore en cours d'initialisation, le backend n'ayant alors aucun journal), puis arrêt et nettoyage.
- **Premier lancement :** l'initialisation de PostgreSQL/PostGIS peut dépasser 90 s ; le délai par défaut de 300 s (`API_HEALTH_TIMEOUT`) en tient compte.
- **Frontend :** `npm ci` puis repli sur `npm install` ; toute erreur npm interrompt le lancement.
- **Arrêt :** `down` est exécuté même si Expo ou l'API s'arrête brutalement (traps `EXIT INT TERM HUP`).

## 8. Performance et sécurité

- Aucun paquet installé si l'environnement est déjà complet.
- `frontend/.env` ne reçoit jamais les secrets serveur (SMTP, API privées, base de données).
- Les images sont qualifiées (`docker.io/...`) pour éviter les invites de registre.
- Le volume nommé `backend_node_modules` est créé à partir des dépendances de l'image ; une empreinte (`node_modules/.deps-hash`) permet de ne relancer `npm ci` que si `package.json`/`package-lock.json` changent, sans appel réseau à chaque démarrage.
- Podman rootless : `data/postgres` appartient à l'UID mappé du conteneur ; utiliser `podman unshare` pour l'inspecter ou le réinitialiser.

## 9. Tests

- `bash -n start.sh scripts/*.sh`.
- `bash scripts/ensure-dependencies.sh` sur une machine complète : aucune installation.
- `bash scripts/prepare-environment.sh` : `.env` et `frontend/.env` corrects.
- Lancement complet puis `SIGINT` : conteneurs supprimés, ports `3000/5432/8081` libres.
- `./start.sh --down` : doit être refusé pour garantir l'absence d'options.

## 10. Fichiers concernés

- `start.sh`
- `scripts/ensure-dependencies.sh`
- `scripts/prepare-environment.sh`
- `compose.yaml`
- `backend/Dockerfile`
- `backend/docker-entrypoint.sh`
- `backend/src/index.ts` (sonde `/health`)

## 11. Prochaines étapes

- [ ] Vérifier les prérequis rootless de Podman (`/etc/subuid`, `/etc/subgid`) avec un message dédié.
- [ ] Ajouter un test automatisé du bootstrap dans un conteneur Fedora propre.
