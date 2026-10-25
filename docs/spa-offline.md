# Structure de la SPA, Menus, Chargement Asynchrone & Mode Hors-Ligne

> **Statut :** Spécification — à implémenter
> **Dernière mise à jour :** 2026-10-25

## 1. Objectif

Définir l'architecture de la **single page application Web** (et de son équivalent natif) : routes, menus, chargement asynchrone propre et fonctionnement hors-ligne.

## 2. Portée et non-objectifs

- **Inclus :** navigation Web/Android/iOS, routes Expo Router, cache local, file d'attente hors-ligne, synchronisation et feedback visuel.
- **Exclus :** logique de normalisation serveur, qui est décrite dans [`api-cache.md`](./api-cache.md).

## 3. Structure actuelle

```text
frontend/src/app/
├── _layout.tsx      # Layout racine Expo Router
├── index.tsx        # Écran d'accueil
└── explore.tsx      # Écran d'exploration
```

### Structure cible

```text
frontend/src/app/
├── _layout.tsx          # Providers, thème, réseau, cache
├── (tabs)/              # Menu principal persistant
│   ├── index.tsx        # Accueil
│   ├── search.tsx       # Recherche
│   └── account.tsx      # Compte
├── entity/[type]/[slug].tsx
└── discussion/[id].tsx
```

## 4. Menus et navigation

- Menu principal persistant : accueil, recherche, compte.
- URLs lisibles et sémantiques (`/entity/place/...`, `/u/slug`).
- Retour visible, fil d'Ariane sur les parcours longs.
- Une seule action principale par écran, placée en haut et mise en valeur.
- Libellés explicites, icônes accompagnées de texte.
- Adaptation mobile : zones sûres, cibles ≥ `48px`, pas de geste caché indispensable.

## 5. Couches de données

1. **État serveur** : la source de vérité.
2. **Cache local persistant** : réponse normalisée + date de fraîcheur.
3. **Cache mémoire** : déduplication et rendu immédiat.
4. **File d'attente** : mutations hors-ligne rejouées à la reconnexion.

Règle : afficher le cache local immédiatement, puis revalider en arrière-plan.

## 6. Mode hors-ligne

- Détection réseau via un hook dédié (`useNetworkState`).
- Lecture hors-ligne : servir le cache persistant, avec un bandeau « hors-ligne » discret.
- Écriture hors-ligne : stocker la mutation dans une file avec identifiant idempotent.
- Reconnexion : rejouer la file dans l'ordre, avec backoff et plafond de tentatives.
- Conflits : conserver la version serveur, proposer la version locale et journaliser.
- Les données sensibles ne sont pas stockées en clair dans le cache local.

## 7. Chargement asynchrone

| État | Rendu |
| :---- | :---- |
| `loading` | Squelette ou spinner local sur la donnée concernée |
| `partial` | Données visibles + spinner sur les enfants |
| `success` | Contenu complet, réordonné selon le contexte |
| `empty` | Message explicite et action pertinente |
| `error` | Message lisible + `Réessayer`, données existantes conservées |
| `offline` | Bandeau discret + données en cache |

- Jamais d'écran blanc global pour une sous-ressource.
- Toujours réinitialiser `loading` dans `finally`.
- Annuler les requêtes au démontage du composant.

## 8. Performance sur appareils modestes

- Listes virtualisées au-delà de 50 éléments.
- Chargement paresseux des images et des sections secondaires.
- Animations limitées à `opacity` et `transform`.
- Flou modéré (`8px`–`16px`), jamais animé.
- Repli opaque si `backdrop-filter` n'est pas supporté.

## 9. SEO et partage

- Chaque page publique possède `og:title`, `og:description`, `og:image`, `og:url`.
- Données structurées Schema.org / JSON-LD.
- Sitemap alimenté dynamiquement.
- URL lisible par un humain, sans identifiant opaque seul.

## 10. Tests

- Navigation entre les routes principales sur Web, Android et iOS.
- Lecture d'une page en mode avion (cache local).
- Mutation hors-ligne puis reconnexion : une seule application côté serveur.
- Spinner local visible pendant un chargement lent.
- Erreur réseau : message + `Réessayer` + données existantes conservées.
- Test à 200 % de zoom et navigation clavier.

## 11. Fichiers concernés (cible)

- `frontend/src/app/_layout.tsx`
- `frontend/src/app/(tabs)/*`
- `frontend/src/hooks/use-network-state.ts`
- `frontend/src/hooks/use-offline-queue.ts`
- `frontend/src/services/local-cache.ts`
- `frontend/src/components/async-section.tsx`

## 12. Prochaines étapes

- [ ] Créer le groupe de routes `(tabs)` et les écrans principaux.
- [ ] Implémenter le cache local et la file d'attente.
- [ ] Ajouter le bandeau hors-ligne et les indicateurs locaux.
- [ ] Ajouter les métadonnées SEO par page.
