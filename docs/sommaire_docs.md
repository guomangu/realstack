# Sommaire de la Documentation — The Universal Stack

> **Index de lecture** de tous les documents du projet.
> **Dernière mise à jour :** 2026-11-01
> **Règle :** tout nouveau document doit être ajouté ici et dans [`docs/README.md`](./README.md).

## 1. Par où commencer ?

### Parcours « je découvre le projet »

1. [`sommaire_projet.md`](./sommaire_projet.md) — vision, architecture, démarrage rapide.
2. [`stack_universelle.md`](./stack_universelle.md) — stack technique complète.
3. [`launcher.md`](./launcher.md) — lancement automatique et dépannage.
4. [`sommaire_docs.md`](./sommaire_docs.md) — le présent index.

### Parcours « je vais coder »

1. [`bonne_pratique.md`](./bonne_pratique.md) — règles obligatoires de développement.
2. [`mauvaise_pratique.md`](./mauvaise_pratique.md) — pièges déjà rencontrés, à ne pas reproduire.
3. [`object-model.md`](./object-model.md) — structures canoniques et machine à états.
4. [`api-cache.md`](./api-cache.md) — pipeline d'ingestion des données externes.
5. [`harvester.md`](./harvester.md) — fonctionnement réel du worker asynchrone.
6. [`spa-offline.md`](./spa-offline.md) — navigation, chargement et hors-ligne.

### Parcours « je branche une nouvelle API »

1. [`architecture_syst_me_appels_api_et_sauvegarde_intelligente.md`](./architecture_syst_me_appels_api_et_sauvegarde_intelligente.md) — invariants réseau.
2. [`api-cache.md`](./api-cache.md) — normalisation, cache et idempotence.
3. [`harvester.md`](./harvester.md) — contrat d'adaptateur et files.
4. [`Spécification Technique du Conteneur Harvester.md`](./Spécification%20Technique%20du%20Conteneur%20Harvester.md) — spécification d'origine.

## 2. Index complet

### 2.1 Navigation et pilotage

| Document | Rôle | Statut | À lire quand |
| :---- | :---- | :---- | :---- |
| [`sommaire_projet.md`](./sommaire_projet.md) | Vue d'ensemble, composants, variables, état | Vivant | Première lecture |
| [`sommaire_docs.md`](./sommaire_docs.md) | Index et parcours de lecture | Vivant | Pour retrouver un document |
| [`avancement_projet.md`](./avancement_projet.md) | Étapes réalisées et chantiers restants | Vivant | Avant de planifier |
| [`README.md`](./README.md) (docs) | Index de référence par fonctionnalité | Vivant | Avant d'ajouter un document |

### 2.2 Architecture et référence

| Document | Rôle | Statut |
| :---- | :---- | :---- |
| [`stack_universelle.md`](./stack_universelle.md) | Architecture de référence : frontend, backend, données, sécurité, DevOps | Référence |
| [`architecture_syst_me_appels_api_et_sauvegarde_intelligente.md`](./architecture_syst_me_appels_api_et_sauvegarde_intelligente.md) | Invariants API : local-first, SWR, ETag, Bloom, déduplication, merge non destructif | Référence |
| [`Spécification Technique du Conteneur Harvester.md`](./Spécification%20Technique%20du%20Conteneur%20Harvester.md) | Spécification d'origine du worker d'ingestion | Spécification |
| [`object-model.md`](./object-model.md) | Objets canoniques, EAV polymorphique, machine à états, hiérarchies récursives | Spécification |

### 2.3 Fonctionnalités

| Document | Fonctionnalité | Statut |
| :---- | :---- | :---- |
| [`launcher.md`](./launcher.md) | Bootstrap, installation des dépendances, lancement et arrêt propre | Implémenté |
| [`api-cache.md`](./api-cache.md) | Appels API, normalisation, sauvegarde, hydratation des enfants | Spécification |
| [`harvester.md`](./harvester.md) | Conteneur d'ingestion asynchrone : files, rate-limit, ACL, adaptateurs | Socle implémenté |
| [`spa-offline.md`](./spa-offline.md) | SPA, menus, chargement asynchrone, mode hors-ligne | Spécification |

### 2.4 Qualité, UX et sécurité

| Document | Rôle | Statut |
| :---- | :---- | :---- |
| [`bonne_pratique.md`](./bonne_pratique.md) | Règles de développement pour agents IA et humains | Obligatoire |
| [`mauvaise_pratique.md`](./mauvaise_pratique.md) | Registre des erreurs, anti-patterns et remédiations | Obligatoire |
| [`bon_ux_ui.md`](./bon_ux_ui.md) | Charte UX/UI : glassmorphisme doux, accessibilité, sobriété | Obligatoire |
| [`_template.md`](./_template.md) | Modèle prêt à copier pour un nouveau document de fonctionnalité | Modèle |

### 2.5 Veille technique

Le dossier [`stack-tech-docs/`](./stack-tech-docs/) accueille les notes de veille par technologie. Chaque sous-dossier est un espace de travail, pas une source de vérité : la référence reste [`stack_universelle.md`](./stack_universelle.md).

| Dossier | Sujet |
| :---- | :---- |
| [`stack-tech-docs/drizzle-docs/`](./stack-tech-docs/drizzle-docs/) | Drizzle ORM, migrations, PostGIS |
| [`stack-tech-docs/expo-docs/`](./stack-tech-docs/expo-docs/) | Expo, EAS, rendu universel |
| [`stack-tech-docs/harvester-docs/`](./stack-tech-docs/harvester-docs/) | Documentation officielle Harvester HCI (SUSE), distincte de notre worker [`harvester.md`](./harvester.md) |
| [`stack-tech-docs/hono-docs/`](./stack-tech-docs/hono-docs/) | Hono, middlewares, validation |
| [`stack-tech-docs/podman-docs/`](./stack-tech-docs/podman-docs/) | Podman rootless, SELinux, Compose |
| [`stack-tech-docs/react-native-docs/`](./stack-tech-docs/react-native-docs/) | Composants, performance mobile |
| [`stack-tech-docs/extracteur_de_documentation_api_data_gouv_fr.sh`](./stack-tech-docs/extracteur_de_documentation_api_data_gouv_fr.sh) | Extraction de la documentation data.gouv.fr |

## 3. Modèle obligatoire d'un document de fonctionnalité

Chaque document de fonctionnalité contient, dans cet ordre :

1. Objectif
2. Portée / non-objectifs
3. Flux de données
4. Structures (schémas, tables, types, clés)
5. Modules réutilisables
6. États et erreurs
7. Performance et sécurité
8. Tests
9. Fichiers concernés
10. Statut et prochaines étapes

Le modèle prêt à copier est [`_template.md`](./_template.md).

## 4. Cycle de vie documentaire

| Moment | Action |
| :---- | :---- |
| Avant ou pendant l'implémentation | Créer le document de fonctionnalité depuis `_template.md`. |
| À chaque fin de session | Mettre à jour le document, `stack_universelle.md`, `avancement_projet.md`, `sommaire_projet.md` et le présent index. |
| Après une correction transverse | Vérifier les documents impactés et synchroniser les liens. |
| Après une erreur marquante | Ajouter une entrée dans `mauvaise_pratique.md`. |
| Ajout d'un document | L'inscrire dans `docs/README.md`, `sommaire_docs.md` et, si utile, dans la carte documentaire de `sommaire_projet.md`. |

## 5. Conventions de rédaction

- Français par défaut, vocabulaire technique précis, phrases courtes.
- Toujours dater la dernière mise à jour et indiquer le statut : **Implémenté**, **Socle implémenté**, **Spécification**, **Référence**, **Vivant**.
- Les chemins de fichiers sont relatifs à la racine du projet et cliquables.
- Les schémas utilisent Mermaid (flowcharts, séquences), jamais d'images binaires pour l'architecture.
- Aucune donnée, clé ou secret réel dans les exemples.
- Un document = une fonctionnalité ou une responsabilité claire.
