# Structure des Objets & Modules d'Affichage Réutilisables

> **Statut :** Spécification — à implémenter
> **Dernière mise à jour :** 2026-10-25

## 1. Objectif

Définir une enveloppe d'objet unique, stable et normalisée, puis les modules d'affichage réutilisables qui la consomment sur Web, Android et iOS.

## 2. Portée et non-objectifs

- **Inclus :** entités centrales normalisées, relations, données secondaires, composants de présentation et états asynchrones.
- **Exclus :** logique métier spécifique à un fournisseur, qui reste dans le service de normalisation.

## 3. Enveloppe canonique

| Champ | Rôle |
| :---- | :---- |
| `id` | Identifiant local stable |
| `source` | Fournisseur d'origine (`osm`, `esco`, `rome`, …) |
| `external_id` | Identifiant chez le fournisseur |
| `type` | Type métier normalisé (`place`, `skill`, `organization`, …) |
| `label` | Libellé principal lisible |
| `summary` | Description courte normalisée |
| `normalized` | Attributs typés et validés |
| `relations` | Références vers les entités liées |
| `metadata` | Source, langue, fraîcheur, licence |
| `completeness` | `complete`, `partial` ou `stale` |
| `updated_at` | Dernière mise à jour locale |

## 4. Données secondaires

| Objet | Création locale | Référence |
| :---- | :---- | :---- |
| Compte utilisateur | Oui | Entités centrales par identifiant |
| Discussion | Oui | Participants et objet concerné |
| Message | Oui | Discussion, auteur, horodatage |
| Préférence / annotation | Oui | Utilisateur et entité |

Une donnée secondaire ne duplique jamais une donnée centrale : elle la référence.

## 5. Polymorphisme et machine à états

- **Polymorphisme :** `target_type` + `target_id` pour rattacher des informations à tout objet.
- **Prestataire :** `provider_type` (`user` / `team`) + `provider_id`, jamais un seul champ `user_id`.
- **Machine à états :** historique immuable (`DRAFT`, `PUBLISHED`, `ARCHIVED`, …) avec audit trail.
- **Hiérarchies :** `parent_id` et requêtes récursives pour les taxonomies.

## 6. Modules d'affichage réutilisables

| Module | Responsabilité |
| :---- | :---- |
| `GlassSurface` | Surface translucide bleu clair, arrondie, avec repli opaque. |
| `EntityCard` | Carte unitaire d'une entité : titre, résumé, actions proches. |
| `EntityHeader` | En-tête prioritaire : identité, statut, action principale. |
| `RelationList` | Liste d'enfants/relations avec chargement local et complétude. |
| `AsyncSection` | Enveloppe `loading / partial / success / empty / error`. |
| `LoadingSpinner` | Petit indicateur de rotation local, non bloquant. |
| `ErrorState` | Message lisible + action `Réessayer`. |
| `ActionTag` | Petit bouton pilule collé à la valeur cible. |
| `ProgressiveForm` | Bulle contextuelle de 1 à 2 champs maximum. |

## 7. Règles de présentation

- Une seule intention principale par card.
- Actions de modification/suppression regroupées dans la même bulle, près de la valeur.
- Zones destructives masquées derrière un déclencheur discret.
- Aucun angle aigu : rayons de `12px` à `24px`.
- Textes lisibles par une personne âgée : taille, contraste, libellés explicites.
- Glassmorphisme bleu clair inspiré des nuages, sans surcharge visuelle.

## 8. États asynchrones

- Chaque module reçoit un objet `AsyncState<T>` : `loading`, `data`, `error`, `isEmpty`.
- Les enfants peuvent être `partial` sans bloquer l'affichage du parent.
- Les spinners restent locaux à la donnée concernée.
- Les erreurs ne remplacent jamais les données déjà affichées.

## 9. Accessibilité et performance

- Cibles tactiles ≥ `48px`, focus clavier visible, contraste AA.
- Maximum deux couches floutées superposées.
- Repli `@supports not (backdrop-filter: blur(...))`.
- Respect de `prefers-reduced-motion` et `prefers-reduced-transparency`.

## 10. Tests

- Rendu de `EntityCard` avec données complètes, partielles, vides et en erreur.
- Vérification des actions proches de la valeur cible.
- Test de contraste et de navigation clavier.
- Test de rendu sans `backdrop-filter`.
- Non-régression : aucun spinner infini après erreur (`finally`).

## 11. Fichiers concernés (cible)

- `frontend/src/components/entity/*`
- `frontend/src/components/async-section.tsx`
- `frontend/src/components/glass-surface.tsx`
- `frontend/src/constants/theme.ts`

## 12. Prochaines étapes

- [ ] Créer les types partagés de l'enveloppe canonique.
- [ ] Implémenter `AsyncSection` et les états associés.
- [ ] Créer les composants `EntityCard`, `RelationList`, `ActionTag`.
- [ ] Ajouter les tests d'accessibilité et de rendu.
