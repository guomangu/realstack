# **🌾 Spécification Technique : Conteneur Harvester (API Worker)**

## **1\. Rôle et Raison d'Être**

Dans l'architecture universelle de la plateforme, le conteneur **harvester** agit comme un **moteur d'ingestion asynchrone et une couche d'anti-corruption (ACL)**.  
Conformément aux principes de souveraineté énoncés dans la **Section 8** de la documentation technique :

> * Aucune donnée centrale n'est fabriquée localement : tout provient de référentiels distants.  
> * Le backend applicatif (**Hono**) ne doit **jamais** effectuer d'appels bloquants ou synchrones vers des API tierces lors d'une requête utilisateur.  
> * L'application doit dialoguer avec des dizaines d'API externes hétérogènes soumises à des quotas stricts (ex. 1 requête toutes les 2 secondes, 5 requêtes par seconde, etc.).

Le conteneur **harvester** prend en charge la totalité de ce cycle : **file d'attente résiliente**, **lissage du débit (Rate-Limiting)**, **scraping continu**, **mise en cache brute**, **validation/normalisation typée**, **upsert idempotent en base PostgreSQL/PostGIS** et **hydratation récursive des sous-ressources enfants**.

## **2\. Emplacement dans l'Architecture Système**

`┌─────────────────────────────────────────────────────────────┐`  
`│                 Client Universel (Expo / Web)               │`  
`└──────────────────────────────┬──────────────────────────────┘`  
                               `│ HTTP GET /ressource`  
                               `▼`  
`┌─────────────────────────────────────────────────────────────┐`  
`│                      Backend API (Hono)                     │`  
`│  - Vérifie la donnée locale en DB                           │`  
`│  - Si absente/expirée : Pousse un Job et renvoie HTTP 202   │`  
`└──────────────┬──────────────────────────────┬───────────────┘`  
               `│ Push Job                     │ Lecture DB`  
               `▼                              │`  
`┌──────────────────────────────┐              │`  
`│      Redis / Valkey          │              │`  
`│  - Queues par fournisseur    │              │`  
`│  - Gestion des verrous/débits│              │`  
`└──────────────┬───────────────┘              │`  
               `│ Pop Job (rythme régulé)      │`  
               `▼                              │`  
`┌──────────────────────────────────────────┐  │`  
`│        Conteneur HARVESTER (Worker)      │  │`  
`│  ├── 1. Rate Limiter (Token Bucket)      │  │`  
`│  ├── 2. Fetcher HTTP résilient (Retries) │  │`  
`│  ├── 3. Cache brut (external_api_cache)  │  │`  
`│  ├── 4. Normaliseur Zod -> Modèle canonique │`  
`│  └── 5. Dispatch sous-tâches enfants     │  │`  
`└──────────────────────┬───────────────────┘  │`  
                       `│ Upsert Idempotent    │`  
                       `▼                      ▼`  
`┌─────────────────────────────────────────────────────────────┐`  
`│          PostgreSQL 16 + PostGIS (Drizzle ORM)              │`  
`│  - Tables Métier (items, taxonomies, coordonnées WGS 84)    │`  
`│  - Table Cache Brut (external_api_cache)                    │`  
`└─────────────────────────────────────────────────────────────┘`

## **3\. Les Responsabilités Clés du Harvester**

### **A. Lissage de Charge & Rate-Limiting Décentralisé**

Chaque API externe possède ses contraintes de bande passante et de requêtes par seconde (RPS). Le harvester instancie des sous-files d'attente isolées pilotées par BullMQ et Redis :

> * **API A (stricte) :** 1 requête toutes les 2 000 ms.  
> * **API B (moyenne) :** 5 requêtes par seconde.  
> * **API C (scraping de masse toléré) :** 20 requêtes simultanées.

Le conteneur dépile les tâches sans jamais déclencher d'erreurs 429 Too Many Requests. En cas de 429 inattendu, il lit l'en-tête Retry-After et gèle temporairement la file dédiée.

### **B. Couche Anti-Corruption (ACL) & Typage Strict (Zod)**

Les formats renvoyés par des dizaines de fournisseurs sont hétérogènes (JSON imbriqué, XML, clés non standard, encodages variables).

> * Le harvester applique un parseur **Zod** pour valider et assainir la structure reçue.  
> * Les coordonnées géographiques sont automatiquement converties au standard spatial **WGS 84 (SRID 4326\)** pour injection directe dans les colonnes GEOGRAPHY(Point, 4326\) de PostGIS.

### **C. Persistance Obligatoire des Métadonnées & Idempotence**

Conformément aux règles 8.1 et 8.3 :

> 1. **Cache brut immuable :** Le payload non transformé est consigné dans external\_api\_cache avec son empreinte, sa date de récupération et sa durée de vie (TTL).  
> 2. **Entité métier stable :** La donnée normalisée est injectée dans sa table finale avec un identifiant composite stable (source, external\_id).  
> 3. **Idempotence :** Tout enregistrement passe par INSERT ... ON CONFLICT (source, external\_id) DO UPDATE via Drizzle ORM. Une tâche rejouée à l'identique ne crée aucun doublon.

### **D. Hydratation Automatique des Entités Enfants (Deep Crawl)**

Lorsqu'un objet maître est moissonné (ex. une entreprise, un site touristique, un événement), le harvester extrait les identifiants de ses ressources filles (avis, horaires, sous-sections, médias) et reprogramme automatiquement des jobs dépendants dans les files secondaires appropriées.

## **4\. Structure des Dossiers du Service**

Le conteneur partage les schémas Drizzle du backend pour éliminer toute duplication de code de base de données :  
`harvester/`  
`├── Dockerfile`  
`├── package.json`  
`├── tsconfig.json`  
`└── src/`  
    `├── index.ts                # Point d'entrée : amorçage des files et supervision`  
    `├── config/`  
    `│   └── redis.ts            # Connexion Redis/Valkey`  
    `├── db/`  
    `│   ├── client.ts           # Instance Drizzle ORM connectée à PostGIS`  
    `│   └── schema.ts           # Montage ou lien symbolique vers backend/src/db/schema.ts`  
    `├── core/`  
    `│   ├── base-adapter.ts     # Contrat d'interface TypeScript pour les adaptateurs`  
    `│   ├── queue-manager.ts    # Usine de workers avec cadenceurs dynamiques`  
    `│   └── http-client.ts      # Fetcher avec retry, backoff exponentiel et user-agent rotatif`  
    `└── adapters/               # Répertoire extensible des connecteurs (1 fichier par source)`  
        `├── sirene.adapter.ts`  
        `├── open-data-sncf.adapter.ts`  
        `├── osm-overpass.adapter.ts`  
        `└── custom-partner.adapter.ts`

## **5\. Spécification d'un Adaptateur Type**

Chaque API ajoutée au projet implémente un contrat standardisé :  
`import { z } from 'zod';`  
`import { BaseAdapter, JobPayload } from '../core/base-adapter';`  
`import { db } from '../db/client';`  
`import { externalApiCache, locations } from '../db/schema';`  
`import { dispatchNextJob } from '../core/queue-manager';`

`// 1. Schéma du format externe brut`  
`const RawExternalSchema = z.object({`  
  `id_externe: z.string(),`  
  `label: z.string(),`  
  `latitude: z.number(),`  
  `longitude: z.number(),`  
  `photos_ids: z.array(z.string()).default([]),`  
`});`

`export const PartnerAdapter: BaseAdapter = {`  
  `name: 'api-partner',`  
  `// Définition de la cadence autorisée`  
  `rateLimit: {`  
    `max: 1,`  
    `durationMs: 2000, // 1 appel toutes les 2 secondes`  
  `},`

  `async execute(payload: JobPayload) {`  
    ``const url = `https://api.partenaire.fr/v1/items/${payload.externalId}`;``  
    ``const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.PARTNER_KEY}` } });``

    `if (res.status === 429) {`  
      `throw new Error('RATE_LIMIT_HIT'); // Déclenche le backoff automatique de BullMQ`  
    `}`

    `const rawJson = await res.json();`  
    `const cleanData = RawExternalSchema.parse(rawJson);`

    `// 2. Persistance dans le cache brut (Règle 8.3)`  
    `await db.insert(externalApiCache).values({`  
      `source: 'partner',`  
      ``cacheKey: `partner:${cleanData.id_externe}`,``  
      `payload: cleanData,`  
      `fetchedAt: new Date(),`  
      `expiresAt: new Date(Date.now() + 86400000), // TTL 24h`  
      `status: 'success',`  
    `}).onConflictDoUpdate({`  
      `target: externalApiCache.cacheKey,`  
      `set: { payload: cleanData, fetchedAt: new Date() },`  
    `});`

    `// 3. Normalisation et Upsert PostGIS (Règles 8.1 & 8.2)`  
    `await db.insert(locations).values({`  
      `source: 'partner',`  
      `externalId: cleanData.id_externe,`  
      `title: cleanData.label,`  
      `// Conversion directe vers WGS 84`  
      ``geom: `SRID=4326;POINT(${cleanData.longitude} ${cleanData.latitude})`,``  
      `updatedAt: new Date(),`  
    `}).onConflictDoUpdate({`  
      `target: [locations.source, locations.externalId],`  
      `set: { title: cleanData.label, updatedAt: new Date() },`  
    `});`

    `// 4. Hydratation automatique des sous-entités`  
    `for (const photoId of cleanData.photos_ids) {`  
      `await dispatchNextJob('api-partner-photos', { externalId: photoId, parentId: cleanData.id_externe });`  
    `}`  
  `},`  
`};`

## **6\. Intégration DevOps (start.sh, Podman rootless & SELinux)**

Le conteneur harvester respecte l'environnement d'exécution de la stack (Fedora / Podman 5+ / rootless) :

> 1. **Volume partagé pour Drizzle :** Le schéma de base de données (backend/src/db/schema.ts) est monté en lecture seule (:ro,z) dans le conteneur du harvester, évitant toute discordance de typage ou duplication manuelle.  
> 2. **Gestion des volumes de dépendances :** Un volume nommé harvester\_node\_modules est configuré sur /app/node\_modules pour empêcher le montage du code source local d'écraser les packages compilés dans l'image.  
> 3. **Persistance de l'état de file (Redis) :** Les données Redis résident dans ./data/redis avec l'option :z pour garantir la compatibilité SELinux en mode rootless sans manipulation manuelle de droits.  
> 4. **Cycle d'arrêt propre (Traps) :** À la réception d'un signal SIGINT ou SIGTERM émis par start.sh, le harvester termine le traitement du job en cours avant de se déconnecter proprement des files, évitant ainsi l'abandon de requêtes en cours de traitement.