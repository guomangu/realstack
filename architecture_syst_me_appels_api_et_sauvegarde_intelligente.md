# Architecture Technique — Système d'Enrichissement API Universel

Ce document définit les standards d'architecture pour l'intégration, le requêtage et la sauvegarde automatique de données issues d'API externes. L'objectif est de concevoir un système "Local-First", résilient, et ultra-économe en requêtes réseau.

## 1. Principes Fondamentaux (Les "Invariants")

1. **Local-First Absolu** : La base de données locale (ou le cache distribué) est la source de vérité primaire. Le réseau n'est sollicité que pour *compléter* ce qui manque ou rafraîchir ce qui est périmé.
2. **Tolérance aux pannes (Dégradation Gracieuse)** : Si un fournisseur externe tombe, l'application continue de fonctionner avec les données locales (même légèrement périmées). Aucune page blanche.
3. **Idempotence des écritures** : Toute donnée reçue est traitée avec une logique de `UPSERT` (Update or Insert). Rejouer 100 fois la même réponse API ne doit créer aucun doublon ni écraser les enrichissements locaux.
4. **Enrichissement Opportuniste** : Les données sont récoltées en arrière-plan en fonction de la navigation de l'utilisateur (Background Fetch), sans bloquer le rendu de l'interface.

---

## 2. Pipeline d'Appel API (Le Cycle de Vie)

Voici le flux standard pour toute requête demandant des données (ex: recherche, détails, listes) :

```mermaid
flowchart TD
    UI[Client / Frontend] --> API_Interne[API Interne / Backend]
    API_Interne --> LocalCheck[(Miroir Local / BDD)]
    
    LocalCheck -->|Données complètes et fraîches| UI
    LocalCheck -->|Données manquantes ou périmées| CacheCheck{Cache Mémoire / Redis}
    
    CacheCheck -->|HIT (Valide)| UI
    CacheCheck -->|MISS / STALE| Deduplication[Déduplication de Requête]
    
    Deduplication --> Fetch[Appel API Externe]
    Fetch -->|Erreur| Fallback[Repli sur Cache Périmé]
    Fetch -->|Succès| Normalisation[Normalisation des Données]
    
    Normalisation --> Upsert[(Sauvegarde Automatique)]
    Upsert --> UI
```

### Le mécanisme SWR (Stale-While-Revalidate)
Pour éviter les temps d'attente, si une donnée est en cache mais périmée (ex: vieille de 25h pour un TTL de 24h), le système **retourne immédiatement la donnée périmée à l'utilisateur**, puis déclenche un appel API en arrière-plan pour mettre à jour la base de données. 

---

## 3. Améliorations : Éviter la Redondance et les Requêtes Inutiles

C'est ici que le système devient intelligent pour économiser les quotas et le temps de traitement.

### A. Les Filtres d'Exclusion (Negative Caching & Stored IDs)
Avant de faire appel à l'API externe pour une recherche, le système doit dire au fournisseur ce qu'il sait *déjà*.
* **Requêtes avec exclusion (`exclude_ids`)** : Si l'API distante le supporte, envoyez les IDs des 50 derniers éléments que vous avez déjà en base locale pour que l'API ne vous retourne que la nouveauté.
* **Complétion Différentielle** : Si l'API ne supporte pas l'exclusion, votre backend télécharge la page, filtre immédiatement les identifiants déjà présents dans votre base, et ne sauvegarde/traite que les nouveaux.

### B. Requêtage par Delta (ETags et `If-Modified-Since`)
Ne téléchargez jamais un gros objet si rien n'a changé.
* Stockez le header HTTP `ETag` ou `Last-Modified` fourni par l'API externe lors de la première sauvegarde.
* À la prochaine requête, envoyez le header `If-None-Match: <ETag>`.
* Si l'API retourne un `304 Not Modified`, votre système prolonge simplement la durée de vie du cache local sans consommer de bande passante pour télécharger les données.

### C. Le Filtre de Bloom (Pour les catalogues massifs)
Si vous synchronisez des catalogues entiers (millions d'entrées) :
* Utilisez un **Filtre de Bloom** en mémoire vive (Redis par exemple). C'est une structure de données probabiliste ultra-légère.
* Lorsqu'une donnée arrive, le filtre vérifie si l'ID a déjà été traité. Si le filtre dit "Oui" (avec 99% de certitude), vous ignorez la ligne et évitez une coûteuse requête de vérification `SELECT` sur votre base SQL.

### D. Déduplication des requêtes en vol (`in-flight deduplication`)
Si 100 utilisateurs font la même recherche (ex: "Développeur web") à la même seconde, le backend ne doit faire **qu'un seul appel** à l'API externe.
* Utilisez une `Map` en mémoire côté serveur : `Map<RequestHash, Promise<Response>>`.
* Tant que la promesse du premier appel n'est pas résolue, les 99 autres requêtes attendent cette même promesse.

---

## 4. Sauvegarde Automatique & Fusion des Données (Upsert)

Chaque donnée externe doit être convertie dans un format générique avant de toucher la base.

### La règle du "Merge non destructif"
Lorsque vous recevez une mise à jour d'un fournisseur pour un objet (ex: un profil ou une offre) :
* Les champs de base (titre, nom, date de publication) sont écrasés par la nouvelle valeur (`COALESCE(new.title, old.title)`).
* Les champs enrichis localement par vos utilisateurs (ex: un commentaire privé, un tag custom) **ne doivent jamais être écrasés** par la synchronisation externe.
* Conservez toujours le payload JSON brut de l'API externe dans une colonne de type `JSONB` (ex: `external_raw_data`) pour pouvoir relancer une normalisation plus tard si vos règles métier évoluent, sans avoir à refaire l'appel API.

### Modèle de table de Miroir (Exemple PostgreSQL)

```sql
CREATE TABLE external_mirror (
    internal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    hash_signature VARCHAR(255), -- Pour détecter si le contenu a changé
    
    normalized_data JSONB NOT NULL,
    raw_payload JSONB, -- La réponse exacte de l'API (pour debug/rejeu)
    
    last_fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Calculé selon le TTL du fournisseur
    
    UNIQUE(provider_name, external_id)
);

-- Index pour accélérer les requêtes de vérification d'existence
CREATE INDEX idx_external_mirror_lookup ON external_mirror(provider_name, external_id);
```

---

## 5. Résumé des Recommandations pour le Nouveau Projet

1. **Abstrayez les fournisseurs** : Créez une interface TypeScript `IExternalProvider` avec des méthodes comme `search()`, `getById()`, `getETag()`. Votre logique métier ne doit jamais savoir quelle API elle appelle.
2. **Centralisez le cache** : Créez une fonction `cachedExternalCall(provider, endpoint, params, ttl)` qui englobe la vérification BDD, le TTL, la gestion des erreurs et la sauvegarde auto.
3. **Pensez Asynchrone** : Dès que possible, retournez un `HTTP 202 Accepted` au frontend et faites vos appels d'enrichissements API lourds via un gestionnaire de files d'attente (comme RabbitMQ ou BullMQ) pour ne pas bloquer l'expérience utilisateur.