# **🛠 Documentation de la Stack Technique (Architecture Universelle)**

Ce document décrit l'architecture technique de référence, conçue pour être **AI-Native**, **File-Based**, modulaire et unifiée. Cette stack permet de déployer une plateforme cross-platform (Web, PWA, iOS, Android) dotée de capacités géospatiales avancées et d'une structure de données hautement polymorphique.

## **1\. Vue d'Ensemble de l'Architecture**

L'architecture s'appuie sur une séparation claire mais technologiquement alignée (Full-Stack TypeScript recommandé) :

* **Frontend Universel :** Rendu unique pour le Web, iOS et Android via un routeur basé sur le système de fichiers.  
* **Backend Conteneurisé :** API performante et légère, fortement typée.  
* **Persistance Géospatiale :** Base de données relationnelle intégrant nativement les calculs spatiaux complexes.  
* **DevOps & Déploiement :** Infrastructure as Code (Docker) et compilation mobile déportée dans le cloud.

## **2\. Frontend : Application Web & Mobile Native**

La couche présentation est unifiée pour maximiser la réutilisation du code entre les environnements Web et Mobiles.

* **Framework Core :** React Native avec **Expo**.  
* **Routage :** **Expo Router** (Routage File-Based permettant une gestion universelle des URL sur Web et des Deep Links sur Mobile).  
* **Web & SEO :** Support du *Static Rendering* / *Server-Side Rendering (SSR)* pour garantir l'indexation par les moteurs de recherche (génération automatisée de sitemaps).  
* **Développement Live :** Lancement de l'environnement de développement via la commande npx expo start \-c (exécution sur simulateurs, appareils physiques ou navigateur web).

### **Centralisation de l'Environnement API**

L'application consomme une configuration réseau stricte pour les requêtes backend :

* Les variables d'environnement sont injectées via le fichier .env (ex: EXPO\_PUBLIC\_API\_URL=https://api.votre-domaine.com).  
* Mécanisme de fallback interne dans le code (config.ts) et possibilité d'injection dynamique lors des phases de compilation CI/CD.

## **3\. Backend : API & ORM**

Le serveur applicatif est conçu pour être rapide, modulaire et synchronisé avec les types du frontend.

* **Framework API :** **Hono (TypeScript)** (ou alternative FastAPI en Python). Hono est privilégié pour maintenir une stack Full-TypeScript.  
* **ORM (Object-Relational Mapping) :** **Drizzle ORM**. Permet une modélisation déclarative des schémas (dans src/db/schema.ts) et une synchronisation absolue des types de données de la base jusqu'à l'interface utilisateur sans génération de code intermédiaire.

## **4\. Base de Données & Moteur Géospatial**

La persistance des données repose sur une base relationnelle robuste et extensible.

* **SGBD :** **PostgreSQL 16**.  
* **Extension Spatiale :** **PostGIS** (postgis/postgis:16-3.4).  
  * Apporte le typage spatial natif (ex: GEOGRAPHY(Point, 4326)).  
  * Indexation spatiale avancée (GIST).  
  * Calculs de proximité et de rayons instantanés (via ST\_DWithin, ST\_DistanceSphere).

### **Paradigmes de Modélisation de Données**

Le modèle relationnel s'appuie sur des concepts avancés pour garantir une flexibilité métier totale :

1. **Système Polymorphique EAV (Entity-Attribute-Value) :** Utilisation d'un modèle d'entités "Informations" rattachables dynamiquement à n'importe quel objet de la base via un couple (target\_type, target\_id).  
2. **Machine à États (State Pattern) :** Implémentation d'un historique immuable des statuts (Brouillon, Publié, Archivé, etc.) pour chaque objet, agissant comme un *Audit Trail* et un gestionnaire de visibilité par événement.  
3. **Structures Récursives :** Support de hiérarchies (arbres SQL avec WITH RECURSIVE) pour modéliser des catégories ou taxonomies imbriquées à l'infini (via des clés parent\_id).

## **5\. Sécurité & Authentification**

L'approche de sécurité vise à éliminer les frictions tout en garantissant la robustesse :

* **Authentification "Frictionless" :**  
  * Génération de codes PIN sécurisés ou Magic Links.  
  * Hachage cryptographique côté serveur (Argon2 ou Bcrypt).  
  * Maintien de la session via un jeton sécurisé, stocké dans un cookie HttpOnly et couplé à une empreinte IP.  
* **Résilience :**  
  * Rate-limiting strict (ex: blocage après N tentatives infructueuses par IP).  
  * Optimisation des index (notamment composites sur les tables polymorphiques) pour éviter les attaques par déni de service (DDoS) sur des requêtes lourdes.

## **6\. Pipeline de Compilation Mobile (CI/CD)**

Le projet utilise l'écosystème **EAS (Expo Application Services)** pour externaliser et simplifier la génération des binaires natifs, sans nécessiter Xcode ou Android Studio en local.

### **Compilation Cloud (EAS Build)**

Des profils de build sont configurés (ex: dans eas.json) pour l'intégration continue et la distribution :

* **Android (APK) \- Installation directe :**  
  eas build \--platform android \--profile preview  
* **Android (AAB) \- Déploiement Play Store :**  
  eas build \--platform android \--profile production  
* **iOS (Tarball) \- Simulateur :**  
  eas build \--platform ios \--profile preview-simulator  
* **iOS (IPA) \- Déploiement App Store / TestFlight :**  
  eas build \--platform ios \--profile production

### **Compilation Locale (Prebuild / Bare workflow)**

Pour des besoins spécifiques (hors cloud), la génération locale reste possible :

1. Génération des dossiers natifs : npx expo prebuild \--clean  
2. Build Android : cd android && ./gradlew assembleRelease (APK) ou ./gradlew bundleRelease (AAB).

## **7\. Infrastructure & Déploiement (DevOps)**

L'ensemble des services (API, Base de données PostgreSQL/PostGIS) est isolé et orchestré de manière "File-Based", avec un **moteur de conteneurs interchangeable**.

* **Orchestration :** **Podman 5+** en mode rootless sur **Fedora 44** (Ultramarine), avec **Docker Compose** conservé comme solution de repli sur les autres distributions.
* **Bootstrap automatique :** `start.sh` vérifie et installe les dépendances manquantes (Podman, podman-compose, Node.js 20+, npm, curl) via `dnf`, `apt-get`, `pacman` ou `zypper`. Aucun prérequis ne doit être installé à la main.
* **Élévation de privilèges :** testée dans l'ordre `root`, `sudo -n`, `sudo` interactif (si terminal), `pkexec`, `doas`. Les paquets ne sont installés que si nécessaire.
* **Détection automatique :** `start.sh` essaie dans l'ordre `COMPOSE_CMD`, `podman-compose`, `podman compose`, `docker compose`, puis `docker-compose`. Aucune hypothèse "Docker obligatoire" n'est faite.
* **Spécificités Fedora / SELinux :** les montages de bind utilisent l'option `:z` afin d'étiqueter correctement les volumes pour SELinux.
* **Volume des dépendances :** un volume nommé `backend_node_modules` est monté sur `/app/node_modules`. Le bind du code source (`./backend:/app`) ne masque donc plus les dépendances installées dans l'image.
* **Configuration :** un fichier central `compose.yaml` décrit les services, les réseaux internes et les ports exposés (`API_PORT`, `DB_PORT`).
* **Santé des services :** la base expose un `healthcheck` (`pg_isready`) et l'API une sonde `GET /health`. `start.sh` attend réellement la réponse de l'API avant d'annoncer le succès.
* **Arrêt propre :** `Ctrl-C` stoppe Expo puis exécute `compose down` (traps `EXIT INT TERM HUP`). Les ports `3000/5432/8081` sont libérés.
* **Persistance & Sauvegarde :** les données PostgreSQL résident dans `./data/postgres` (bind monté). Les sauvegardes s'effectuent par `pg_dump` compressé ou snapshot du volume. En rootless, les fichiers appartiennent à l'UID mappé du conteneur : les inspecter ou les réinitialiser avec `podman unshare` (`podman unshare rm -rf data/postgres`), jamais avec `sudo chown`.

### **Commande de lancement**

```bash
./start.sh       # Tout automatique : dépendances, base, API, Expo (w / a / i)
# Ctrl-C arrête Expo et l'infrastructure.
# Arrêt manuel : podman-compose down
```

Le script n'accepte **aucune option** : il installe ce qui manque, prépare l'environnement et démarre l'ensemble. Le lancement manuel de l'infrastructure reste possible : `podman-compose up --build -d` (Fedora) ou `docker compose up --build -d`.

## **8\. Gouvernance des Données, Normalisation & Cache API**

La qualité du produit dépend directement de la **normalisation des données reçues des API externes**. Cette normalisation est essentielle et s'applique à toutes les couches.

### **8.1 Règles de souveraineté des données**

1. **Aucune donnée centrale ne peut être créée dans notre site.** Le projet ne fait qu'**assembler, normaliser et stocker des données existantes** provenant de référentiels externes (API publiques, catalogues officiels, Open Data).
2. **Les données secondaires peuvent être créées localement :** comptes utilisateurs, discussions, messages, préférences, paniers et annotations. Elles ne remplacent jamais la donnée centrale : elles la référencent par identifiant stable.
3. **Une donnée centrale ne doit jamais être inventée ou déduite arbitrairement.** En cas d'absence, l'interface affiche un état explicite ("information indisponible") plutôt qu'une valeur fabriquée.
4. **Identifiants stables :** chaque entité distante conserve son identifiant source (`source`, `external_id`) en plus de la clé primaire locale, pour garantir l'idempotence et la réconciliation.

### **8.2 Cycle d'appel API optimisé**

Tout appel sortant suit cet ordre strict :

1. Lire l'état **serveur** et la **base de données locale** (donnée déjà connue, fraîcheur, relations).
2. Servir immédiatement la donnée locale si elle est valide.
3. Sinon, interroger l'API externe **une seule fois**.
4. **Normaliser** la réponse (types, unités, coordonnées WGS 84, libellés, langues).
5. **Persister immédiatement** le résultat en base (upsert idempotent) avant de le renvoyer.
6. **Compléter les entités enfants** : lorsqu'une requête porte sur un objet, toutes les requêtes nécessaires à ses objets enfants (détails, relations, sous-ressources) sont effectuées pour enrichir la donnée précédente.
7. Retourner au client une vue **réordonnée et adaptée à l'interface**, de manière asynchrone.

### **8.3 Persistance obligatoire des métadonnées**

* Toute réponse externe est stockée dans une table de cache (`external_api_cache` ou équivalent) avec : clé normalisée, payload, date de récupération, date d'expiration, statut et source.
* Les listes d'entités (lieux, compétences, métiers, organisations) sont persistées dans leurs tables métier dédiées, pas uniquement dans le cache brut.
* Les relations parent/enfant sont matérialisées en base pour éviter de rejouer les mêmes requêtes à chaque affichage.
* Stratégie recommandée : **stale-while-revalidate** (servir le cache, rafraîchir en arrière-plan) avec TTL par type de donnée.
* **Idempotence :** utiliser `INSERT ... ON CONFLICT DO UPDATE` (ou un upsert Drizzle/Prisma) afin qu'un retry ne duplique jamais une entité.
* **Optimisations réseau complémentaires :** `ETag` / `If-None-Match`, negative caching, filtre de Bloom et merge non destructif — détaillés dans [`architecture_syst_me_appels_api_et_sauvegarde_intelligente.md`](./architecture_syst_me_appels_api_et_sauvegarde_intelligente.md).

### **8.4 Chargement asynchrone propre**

* Chaque zone en cours de chargement affiche un **indicateur de rotation compact** (spinner) ou un squelette, localisé sur la donnée concernée.
* Les données arrivent et se réordonnent progressivement sans bloquer l'interface ; aucun écran blanc global n'est imposé.
* Les erreurs sont affichées dans la zone concernée avec un message compréhensible et une action de reprise (`Réessayer`).
* L'état de chargement est toujours réinitialisé dans un bloc `finally`, même en cas d'échec.

## **9\. Compatibilité Universelle, Accessibilité & Design "Clouds"**

**Tout le développement est nativement compatible avec la génération en application Android et iOS et single pages app Web.**

* **Une seule base de code :** les composants, styles et parcours sont partagés entre Web (SPA), Android et iOS via Expo / React Native.
* **Templates lisibles par tous :** les modèles d'écran et les styles doivent rester compréhensibles même par une **personne âgée** (typographie généreuse, libellés explicites, navigation évidente, contraste suffisant).
* **Glassmorphisme bleu clair :** les surfaces sont translucides (`.glass`), avec un flou doux, une teinte bleu clair et des superpositions inspirées des **nuages** (dégradés radiaux, bords diffus, ombres très légères) pour une atmosphère reposante.
* **Sobriété :** limiter l'empilement de couches floutées et prévoir un repli opaque (`@supports not (backdrop-filter: blur(...))`) pour les appareils peu puissants.

La charte détaillée (contrastes, arrondis, formulaires progressifs, accessibilité) est définie dans [`bon_ux_ui.md`](./bon_ux_ui.md).

## **10\. Documentation par Grande Fonctionnalité**

Chaque grande fonctionnalité possède un document dédié et précis dans [`docs/`](./docs/README.md). Ce document décrit le fonctionnement réel, les structures de données, les modules réutilisables, les états d'erreur et les tests.

| Document | Fonctionnalité |
| :---- | :---- |
| [`docs/launcher.md`](./docs/launcher.md) | Bootstrap automatique, installation des dépendances, lancement et arrêt |
| [`docs/api-cache.md`](./docs/api-cache.md) | Appels API, normalisation, sauvegarde en base, hydratation des enfants |
| [`docs/object-model.md`](./docs/object-model.md) | Structure des objets et modules d'affichage réutilisables |
| [`docs/spa-offline.md`](./docs/spa-offline.md) | SPA, menus, chargement asynchrone et mode hors-ligne |

Le modèle obligatoire (objectif, flux, structures, modules, erreurs, tests, fichiers, statut) et le cycle de mise à jour sont définis dans [`docs/README.md`](./docs/README.md). **À chaque fin de session, les documents de fonctionnalité, `stack_universelle.md` et `avancement_projet.md` doivent être synchronisés.**