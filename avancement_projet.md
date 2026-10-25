# État d'Avancement — The Universal Stack

**Dernière mise à jour :** 2026-10-25
**Environnement de référence :** Fedora 44 (Ultramarine) — Podman 5.8.9, podman-compose 1.6.0, Node 22.23.1

---

## ✅ Étapes achevées

### Socle applicatif
- [x] Frontend Expo / React Native 0.86 avec **Expo Router** (`frontend/src/app`), cible Web statique/SPA, Android et iOS.
- [x] Backend **Hono + TypeScript** (`backend/src/index.ts`) exposant `GET /` et `GET /health`.
- [x] Port API configurable via `API_PORT` (cohérent entre `.env`, `compose.yaml` et le serveur).
- [x] Base **PostgreSQL 16 + PostGIS 3.4** opérationnelle avec `healthcheck` (`pg_isready`).

### Orchestration & lancement
- [x] `start.sh` **sans aucune option** : un seul `./start.sh` détecte, installe, prépare et démarre tout.
- [x] Bootstrap automatique des dépendances manquantes (Podman, podman-compose, Node.js 20+, npm, curl) via `dnf`, `apt-get`, `pacman` ou `zypper`.
- [x] Élévation de privilèges testée dans l'ordre `root` → `sudo -n` → `sudo` interactif → `pkexec` → `doas`.
- [x] Détection automatique de Compose : `COMPOSE_CMD` → `podman-compose` → `podman compose` → `docker compose` → `docker-compose`.
- [x] Attente active de `/health` (90 s max) et affichage des logs backend en cas d'échec.
- [x] Nettoyage automatique sur `Ctrl-C` / `SIGTERM` : `compose down` et libération des ports `3000/5432/8081`.
- [x] Gestion SELinux `:z` sur les bind mounts et volume nommé `backend_node_modules` (le bind du code ne masque plus les dépendances de l'image).
- [x] Création automatique de `.env` (depuis `.env.example` ou valeurs sûres), de `data/postgres` et d'un `frontend/.env` filtré (`EXPO_PUBLIC_*` uniquement, sans secrets serveur).
- [x] Installation frontend idempotente : `npm ci` seulement si `node_modules` manque ou si `package-lock.json` / `package.json` a changé.
- [x] Scripts modulaires : `scripts/ensure-dependencies.sh` et `scripts/prepare-environment.sh` (chacun < 100 lignes).

### Documentation
- [x] `README.md` : compatibilité universelle Web (SPA) / Android / iOS, lancement automatique et index documentaire.
- [x] `stack_universelle.md` : orchestration Podman/Docker, bootstrap, gouvernance des données, normalisation API, cache persistant, chargement asynchrone, design « nuages », documentation par fonctionnalité.
- [x] `bonne_pratique.md` : sections 11 à 17 (normalisation, métadonnées/enfants, asynchrone, sobriété, fiabilité, accessibilité, documentation obligatoire par fonctionnalité).
- [x] `bon_ux_ui.md` : palette glassmorphisme bleu clair, superpositions nuageuses, repli performance, accessibilité personnes âgées.
- [x] `mauvaise_pratique.md` : registre enrichi (Docker exclusif, bind `node_modules`, données centrales inventées, enfants non hydratés, asynchrone silencieux, prérequis implicites, secrets frontend, documentation fourre-tout).
- [x] `docs/` : index, modèle obligatoire et documents `launcher.md`, `api-cache.md`, `object-model.md`, `spa-offline.md`.
- [x] `architecture_syst_me_appels_api_et_sauvegarde_intelligente.md` : document de référence racine pour ETag, negative caching, filtre de Bloom et `external_mirror`.
- [x] `database/README.md`, `backend/README.md`, `frontend/README.md` et `scripts/README.md` alignés sur la stack réelle.

---

## 🧪 Validations effectuées

| Contrôle | Résultat |
| :---- | :---- |
| `bash -n start.sh scripts/*.sh` | Syntaxe valide, scripts < 100 lignes |
| `bash scripts/ensure-dependencies.sh` | Dépendances détectées, aucune installation inutile |
| `bash scripts/prepare-environment.sh` | `.env` et `frontend/.env` publics générés |
| `podman-compose -f compose.yaml config` | Configuration valide |
| `./start.sh` (sans option) | Base `healthy`, API prête, Metro/Expo démarre |
| `curl http://localhost:3000/health` | `{"status":"ok","service":"universal-stack-api",...}` |
| `SIGINT` sur `./start.sh` | `compose down` exécuté, conteneurs supprimés, ports libres |
| `./start.sh --down` | Refusé : aucune option n'est nécessaire |
| `npm ci` (frontend) | 582 paquets installés |

---

## 🔄 Prochains chantiers prioritaires

1. **Modèle de données & ORM** — Le document de stack cible **Drizzle ORM**, mais `backend/package.json` contient encore `@prisma/client` sans schéma ni migrations. Choisir et finaliser un ORM unique avant d'ajouter les tables métier.
2. **Couche de normalisation API** — Créer les schémas de normalisation, les tables `external_api_cache` et les fonctions d'upsert idempotent.
3. **Hydratation des entités enfants** — Implémenter la récupération et la persistance des sous-ressources à chaque requête parente.
4. **Authentification frictionless** — PIN / Magic Links, hachage Argon2/Bcrypt, sessions HttpOnly, rate-limiting.
5. **Design system glassmorphisme** — Tokens de couleur bleu clair, composants `Card`, `GlassSurface`, `CloudBackdrop`, états `loading/empty/error`, spinners locaux.
6. **Accessibilité** — Audit contraste AA, tailles de texte, cibles 48 px, navigation clavier et test à 200 % de zoom.
7. **Tests** — Tests unitaires (normalisation, cache), tests d'intégration `/health` et endpoints métier, test de non-régression du lancement Podman.
8. **Sécurité** — Revoir les 16 alertes `npm audit` du scaffold frontend et activer les contrôles d'entrée backend.

---

## ⚠️ Points d'attention connus

- **iOS** : le simulateur iOS nécessite macOS ; sur Fedora, utiliser **EAS Build** (`eas build --platform ios`).
- **SELinux** : conserver l'option `:z` sur tout nouveau bind mount monté dans un conteneur.
- **Podman rootless** : les fichiers de `data/postgres` appartiennent à l'UID mappé du conteneur. Pour les inspecter ou réinitialiser : `podman unshare ls -l data/postgres` et `podman unshare rm -rf data/postgres` (jamais `sudo chown`).
- **Performance UI** : limiter à deux couches floutées superposées et prévoir le repli `@supports not (backdrop-filter: blur(...))`.
- **Données** : aucune donnée centrale ne doit être créée localement ; seules les données secondaires (comptes, discussions, messages) sont créées par le site.

---

## 🚀 Commandes utiles

```bash
./start.sh                        # Tout automatique (aucune option)
# Ctrl-C : arrêt d'Expo + compose down automatique
podman-compose down               # Arrêt manuel (ou docker compose down)
podman-compose logs -f backend    # Journaux API
podman-compose logs -f database   # Journaux PostgreSQL
```
