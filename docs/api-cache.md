# Appels API, Normalisation, Sauvegarde & Hydratation des Enfants

> **Statut :** Spécification — à implémenter
> **Dernière mise à jour :** 2026-10-25
> **Objectif :** zéro appel externe superflu, zéro donnée centrale inventée.
> **Voir aussi :** [Architecture d'enrichissement API](../architecture_syst_me_appels_api_et_sauvegarde_intelligente.md) pour les optimisations ETag / `If-None-Match`, negative caching, filtre de Bloom, déduplication en vol et merge non destructif.

## 1. Objectif

Décrire le pipeline unique par lequel toute donnée externe entre dans la plateforme : normalisation, persistance immédiate, enrichissement des entités enfants et restitution asynchrone à l'interface.

## 2. Portée et non-objectifs

- **Inclus :** API publiques, référentiels officiels, Open Data, géocodage, aperçus Open Graph, sous-ressources et relations.
- **Exclus :** les données secondaires créées par les utilisateurs (comptes, discussions, messages) qui suivent leur propre cycle de vie.

## 3. Règles de souveraineté

1. **Aucune donnée centrale n'est créée par le site.** Le site assemble et stocke des données existantes.
2. Les **données secondaires** (comptes, discussions, messages, préférences) peuvent être créées localement.
3. Une donnée centrale absente est affichée comme indisponible, jamais inventée.
4. Chaque entité conserve `source` et `external_id` en plus de sa clé locale.

## 4. Flux de données

1. **Lecture serveur/base** : vérifier si l'entité et ses relations existent déjà.
2. **Fraîcheur** : comparer `fetched_at` et `expires_at` (TTL par type).
3. **Cache local valide** : servir immédiatement, sans réseau.
4. **Appel externe** : une seule requête réseau, dédupliquée si plusieurs composants demandent la même clé.
5. **Normalisation** : types, unités, langues, coordonnées WGS 84, libellés, identifiants.
6. **Persistance** : upsert idempotent avant toute réponse.
7. **Hydratation des enfants** : requêter et persister les sous-ressources, détails et relations.
8. **Réponse UI** : vue réordonnée, adaptée à l'interface, transmise de façon asynchrone.

## 5. Structures proposées

| Structure | Rôle | Champs clés |
| :---- | :---- | :---- |
| `external_api_cache` | Cache brut normalisé d'un appel | `cache_key`, `source`, `payload`, `fetched_at`, `expires_at`, `status` |
| Entités métier | Données centrales normalisées | `id`, `source`, `external_id`, `type`, `normalized`, `updated_at` |
| `entity_relations` | Relations parent/enfant | `parent_type`, `parent_id`, `child_type`, `child_id`, `relation` |
| `provider_sync_state` | État de synchronisation par source | `source`, `last_sync_at`, `cursor`, `error` |

> Les noms sont indicatifs. Le document racine d'architecture propose notamment `external_mirror` (`provider_name`, `external_id`, `raw_payload`, `hash_signature`, `expires_at`) ; aligner l'ORM et les migrations sur ce modèle avant implémentation.

## 6. Cache et idempotence

- **Clé normalisée** : `source + endpoint + paramètres triés + langue`.
- **TTL différencié** : référentiels stables (long), géocodage (moyen), aperçus (court).
- **Stale-while-revalidate** : servir le cache expiré, rafraîchir en arrière-plan.
- **Déduplication en vol** : une seule requête pour plusieurs demandes simultanées de la même clé.
- **Optimisations réseau complémentaires** : `ETag` / `If-None-Match`, `If-Modified-Since`, negative caching, filtre de Bloom pour les catalogues massifs — voir le [document d'architecture API](../architecture_syst_me_appels_api_et_sauvegarde_intelligente.md).
- **Upsert** : `INSERT ... ON CONFLICT DO UPDATE` pour les entités et les relations.

## 7. Hydratation des enfants

À chaque requête sur un parent, le service doit :

1. Charger le parent depuis la base.
2. Identifier les enfants manquants ou expirés.
3. Effectuer les appels nécessaires (avec limite et timeout).
4. Persister chaque enfant et sa relation.
5. Retourner le parent avec un indicateur de complétude (`complete`, `partial`, `stale`).

## 8. Contrat avec l'interface

| État | Affichage |
| :---- | :---- |
| `loading` | Spinner local ou squelette sur la donnée concernée |
| `partial` | Données disponibles + spinner sur les enfants en cours |
| `success` | Données complètes, réordonnées selon le contexte |
| `empty` | Message explicite « information indisponible » |
| `error` | Message lisible + bouton `Réessayer`, sans masquer l'existant |

## 9. Performance et sécurité

- Plafonner les appels externes (`limit`, timeout, retries avec backoff).
- Ne jamais exposer une clé API privée au frontend.
- Ne pas journaliser les payloads contenant des données personnelles.
- Prévoir un mode dégradé si l'API externe est indisponible (servir le cache local).

## 10. Tests

- **Unitaire :** normalisation, clé de cache, TTL, upsert idempotent.
- **Intégration :** deux appels successifs ne doivent produire qu'une requête externe.
- **Enfants :** une requête parente hydrate et persiste ses enfants.
- **Panne externe :** le cache local continue de répondre.
- **Non-régression :** aucun doublon après retry.

## 11. Fichiers concernés (cible)

- `backend/src/services/normalization/*`
- `backend/src/services/external-api/*`
- `backend/src/db/schema.ts`
- `frontend/src/hooks/use-entity.ts`
- `frontend/src/components/async-section.tsx`

## 12. Prochaines étapes

- [ ] Choisir et finaliser l'ORM unique.
- [ ] Créer les tables de cache et de relations.
- [ ] Implémenter le service de normalisation et l'upsert.
- [ ] Ajouter les indicateurs de complétude et les spinners locaux.
