# Documentation par Grande Fonctionnalité — The Universal Stack

**Règle obligatoire :** chaque grande fonctionnalité du projet possède un document dédié dans `docs/`, décrivant précisément son fonctionnement, ses structures de données, ses modules réutilisables, ses erreurs et ses tests.

Ce document est l'index de référence. Il doit être mis à jour à chaque fin de session de développement.

## Commencer ici

- [`sommaire_projet.md`](./sommaire_projet.md) — vision, architecture, composants, démarrage rapide.
- [`sommaire_docs.md`](./sommaire_docs.md) — index complet et parcours de lecture.

## Index

| Document | Fonctionnalité | Statut |
| :---- | :---- | :---- |
| [`launcher.md`](./launcher.md) | Bootstrap automatique, installation des dépendances, lancement et arrêt propre | Implémenté |
| [`api-cache.md`](./api-cache.md) | Appels aux API externes, normalisation, sauvegarde en base, hydratation des enfants | Spécification |
| [`harvester.md`](./harvester.md) | Worker asynchrone : files, rate-limiting, ACL, cache brut, upsert PostGIS | Socle implémenté |
| [`object-model.md`](./object-model.md) | Structure canonique des objets, EAV, machine à états et hiérarchies | Spécification |
| [`spa-offline.md`](./spa-offline.md) | Structure de la SPA, menus, chargement asynchrone et mode hors-ligne | Spécification |
| [`bon_ux_ui.md`](./bon_ux_ui.md) | Charte UX/UI, accessibilité et sobriété visuelle | Obligatoire |
| [`bonne_pratique.md`](./bonne_pratique.md) | Règles de développement pour agents IA et humains | Obligatoire |
| [`mauvaise_pratique.md`](./mauvaise_pratique.md) | Registre des erreurs et anti-patterns | Obligatoire |
| [`Spécification Technique du Conteneur Harvester.md`](./Spécification%20Technique%20du%20Conteneur%20Harvester.md) | Spécification d'origine du worker | Référence |
| [`architecture_syst_me_appels_api_et_sauvegarde_intelligente.md`](./architecture_syst_me_appels_api_et_sauvegarde_intelligente.md) | Optimisations avancées : ETag / `If-None-Match`, negative caching, filtre de Bloom, merge non destructif, `external_mirror` | Référence |
| [`stack_universelle.md`](./stack_universelle.md) | Architecture technique de référence | Référence |
| [`avancement_projet.md`](./avancement_projet.md) | Étapes réalisées et chantiers restants | Vivant |

> `api-cache.md` et le document d'architecture API sont complémentaires : le premier décrit le pipeline applicatif, le second les optimisations réseau et le modèle de miroir local. En cas de divergence, aligner les deux documents dans la même session.

## Modèle obligatoire d'un document de fonctionnalité

Chaque document doit contenir, dans cet ordre :

1. **Objectif** — le problème résolu et la valeur pour l'utilisateur.
2. **Portée / non-objectifs** — ce qui est inclus et ce qui ne l'est pas.
3. **Flux de données** — entrées, transformations, stockage, sorties.
4. **Structures** — schémas, tables, types, clés et relations.
5. **Modules réutilisables** — composants UI, services, hooks et leur responsabilité.
6. **États & erreurs** — `loading`, `success`, `empty`, `error`, reprise et messages.
7. **Performance & sécurité** — limites, cache, droits, données sensibles.
8. **Tests** — cas unitaires, intégration et non-régression.
9. **Fichiers concernés** — chemins réels du projet.
10. **Statut & prochaines étapes** — ce qui est implémenté, ce qui reste à faire.

Un modèle prêt à copier est disponible dans [`_template.md`](./_template.md).

## Cycle de vie documentaire

- **Avant ou pendant l'implémentation :** créer le document de la fonctionnalité.
- **À chaque fin de session :** mettre à jour le document, `stack_universelle.md` et `avancement_projet.md`.
- **À chaque correction transverse :** vérifier si les autres fonctionnalités sont concernées et mettre à jour leurs documents.
- **Liens :** toute nouvelle fonctionnalité doit être ajoutée à l'index ci-dessus et référencée depuis le [`README.md`](../README.md).

## Fonctionnalités à documenter dès qu'elles apparaissent

- Authentification frictionless (PIN / Magic Links, sessions, rate-limiting).
- Machine à états et historique des objets.
- Modèle polymorphique EAV et structures récursives.
- Recherche géospatiale et calculs de proximité.
- Discussions, messages et paniers.
- Synchronisation hors-ligne et file d'attente.
- Référencement SEO, sitemap et données structurées.
