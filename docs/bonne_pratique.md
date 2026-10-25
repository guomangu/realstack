# Bonnes Pratiques pour le Développement d'Agents IA Autonomes — The Universal Stack

Le développement d'agents IA autonomes nécessite une approche rigoureuse pour gérer le comportement non-déterministe des modèles de langage (LLM). Ce document constitue le **cœur central de référence** gouvernant l'architecture, la sécurité, l'observabilité, la résilience et les standards de conception du projet.

---

## 0. Document Cœur Central & Protocole d'Initialisation Obligatoire

> [!IMPORTANT]
> **Règle d'or de démarrage pour tout agent IA :**
> Avant d'écrire la moindre ligne de code, de concevoir une fonctionnalité ou d'exécuter un refactoring, **l'agent doit impérativement lire et intégrer les documents de référence situés à la racine du projet**. Citer `bonne_pratique.md` suffit à convoquer l'ensemble de cet écosystème documentaire obligatoire :
>
> 1. [**The Universal Stack (README)**](./README.md) : Thèse, modèle atomique, architecture AI-Native & roadmap fonctionnelle.
> 2. [**Documentation de la Stack Technique**](./stack_universelle.md) : Cartographie exacte des modules backend/frontend, schémas de données et endpoints exposés.
> 3. [**État d'Avancement du Projet**](./avancement_projet.md) : Suivi rigoureux des étapes achevées, des fonctionnalités déployées et des chantiers en cours.
> 4. [**Registre des Mauvaises Pratiques**](./mauvaise_pratique.md) : Mémoire collective des erreurs passées, pièges récurrents et anti-patterns formellement proscrits.
> 5. [**Charte d'Excellence Bon UX & UI**](./bon_ux_ui.md) : Règles strictes d'ergonomie, glassmorphisme doux, respiration TDAH-friendly, zéro angle aigu et formulaires progressifs.
> 6. [**Index de Documentation par Fonctionnalité**](./docs/README.md) : Un document précis par grande fonctionnalité (lancement, API/cache, objets/modules UI, SPA/hors-ligne) et le modèle obligatoire à respecter.

---

## 1. Architecture Orientée Composants et Modularité
*   **Fichiers de 100 lignes maximum :** Le code doit être découpé en fonctions et modules courts. La concision force une responsabilité unique par fonction (SRP), ce qui facilite les tests unitaires et la lisibilité.
*   **Réutilisabilité atomique maximale :** Chaque composant (outils, prompts, logique de contrôle) doit être conçu pour être agnostique au cas d'usage spécifique afin de pouvoir être réutilisé dans différents workflows agentiques.
*   **Documentation par dossier :** Chaque répertoire logique doit contenir un fichier `README.md` (ou équivalent) expliquant son rôle, les dépendances de ses composants et comment les instancier.
*   **Code systématiquement commenté :** Les fonctions complexes, en particulier celles gérant les appels au LLM ou le traitement des données asynchrones, doivent inclure des docstrings claires expliquant les paramètres, les retours attendus et le but de la fonction.

---

## 2. Sécurité et Contrôle d'Exécution (Agent Loop)
La boucle d'exécution (Agent Loop) est le cœur de l'agent. Sans garde-fous, un agent peut s'enfermer dans des cycles coûteux ou destructeurs.

*   **Limites de boucles (Max Iterations) :** C'est le contrôle de sécurité le plus critique. Un agent confronté à une erreur peut s'entêter et tourner en boucle infinie (ex: utiliser un outil, échouer, réessayer exactement la même chose 50 fois). Définir un nombre maximum d'étapes (steps) ou de tours (turns) par tâche pour couper le processus (ex: `max_iterations = 10`).
*   **Timeouts stricts :** Fixer des limites de temps globales pour la tâche (wall-clock timeout) et des limites spécifiques pour chaque appel d'outil ou d'API. Si un outil dépasse le délai, l'agent doit recevoir une erreur explicite plutôt que de rester bloqué.
*   **Idempotence des actions :** Puisque l'agent risque d'appeler le même outil plusieurs fois par erreur ou lors de retries, vos fonctions doivent être exécutables en boucle sans casser le système ni dupliquer des données. 
    *   *Exemple :* Utiliser des requêtes de mise à jour/upsert au lieu de simples insertions. Vérifier l'état du système (ex: "ce fichier existe-t-il déjà ?") avant d'exécuter une action.

---

## 3. Gestion des Erreurs et Robustesse
*   **Messages informatifs clairs :** Les erreurs, les états de chargement (loading) et les succès doivent générer des messages clairs et structurés. Ces messages ne sont pas seulement pour l'utilisateur, ils sont aussi le *feedback* que l'agent lit pour corriger son comportement.
*   **Contrôles d'exceptions granulaires :** Les fonctions doivent utiliser des blocs `try/catch` spécifiques. Si une API externe échoue, l'erreur renvoyée à l'agent doit être suffisamment descriptive pour qu'il comprenne *pourquoi* (ex: "Erreur 404 : L'utilisateur n'existe pas" au lieu de "Erreur système").
*   **Gestion de la mémoire et du contexte :** Le code doit inclure une stratégie pour tronquer ou résumer l'historique des actions afin d'éviter de saturer la fenêtre de contexte du modèle (Token limits) au fil des itérations.

---

## 4. Double Contrôle et Validation Front-End & Back-End (Sécurité & Fiabilité Maximale)
La robustesse d'une application distribuée repose sur la non-complaisance : aucun niveau ne doit faire aveuglément confiance à l'autre.

*   **Contrôle Front-End (UX & Immédiateté) :** 
    *   Validation en temps réel des formulaires, des types et des formats (formats PIN, coordonnées WGS 84, bornage des distances et montants positifs).
    *   Plafonnement préventif des listes (ex: `.slice(0, 200)` pour éviter tout crash mémoire ou surcharge de rendu).
    *   Feedback visuel instantané et bienveillant informant l'utilisateur avant même la soumission réseau.
*   **Contrôle Back-End (Sécurité Inviolable & Intégrité) :**
    *   Vérification stricte et indépendante de toutes les entrées (`lib/validation.ts`, Drizzle schema, rate-limiters, hachage timing-safe).
    *   Plafonnement serveur obligatoire (ex: `limit = Math.min(rawLimit, 200)` et `LIMIT 200` SQL).
    *   Même si une requête contourne l'interface cliente (script malveillant, appel API direct), le backend garantit une étanchéité totale et refuse toute donnée invalide.

---

## 5. Économie des APIs Externes & Enrichissement Perpétuel de la Base de Données
Pour préserver les quotas, éliminer les coûts récurrents et garantir une réactivité instantanée, tout appel vers un service tiers doit enrichir le patrimoine de données interne.

*   **Zéro requête externe superflue :** Tout résultat obtenu via une API externe (géocodage Photon/OpenStreetMap, référentiel officiel de compétences ESCO/ROME, extraction d'aperçus Open Graph) doit être **immédiatement persisté en base de données** (`external_api_cache`, `official_skills_catalog`, coordonnées persistées).
*   **Filtrage préalable en base locale :** Avant tout appel sortant, le système interroge d'abord la base de données locale. Si l'information est présente, elle est servie immédiatement sans solliciter le réseau externe.
*   **Enrichissement itératif continu :** Chaque recherche ou complétion utilisateur non encore répertoriée interroge le service externe, stocke le résultat propre et normalisé, transformant la base locale en un référentiel autonome de plus en plus riche et performant au fil du temps.

---

## 6. Référencement Universel (SEO) & URLs Sémantiques Lisibles par les Humains
Toute ressource publique doit être trouvable, intelligible et indexable sans ambiguïté.

*   **Référencement exhaustif de chaque page :**
    *   Toutes les pages publiques (accueil, profils utilisateurs, profils d'équipes, réalisations) doivent comporter les balises Open Graph indispensables (`og:title`, `og:description`, `og:image`, `og:url`).
    *   Balisage sémantique structuré Schema.org / JSON-LD (`Person`, `Organization`, `Service`) pour une compréhension immédiate par les moteurs de recherche.
    *   Alimentation dynamique du sitemap standardisé (`GET /api/sitemap.xml`) recensant l'intégralité des profils et compétences actives.
*   **URLs lisibles par des humains & optimisées SEO :**
    *   Bannir les URLs opaques ou exclusivement composées d'identifiants aléatoires incompréhensibles.
    *   Les adresses web doivent être descriptives, claires et signifiantes pour un visiteur humain tout en renforçant les mots-clés de référencement (ex: `/u/:id-nom-competence-ville` ou `/u/:slug`).
    *   Un utilisateur doit pouvoir deviner le contenu de la page rien qu'en lisant son URL.

---

## 7. Portabilité et Conteneurisation (Dossier Autonome)
L'environnement de travail doit être pensé comme un **dossier portable et complètement autonome**.

*   **Tout-en-un à la racine :** Tout ce qui est nécessaire pour exécuter le projet (code source, scripts de démarrage comme `start.sh`, orchestration Docker/Podman, fichiers de base de données locale) doit se trouver dans ce dossier unique. Aucun composant système global complexe ne doit être requis en dehors des moteurs de conteneurs standards.
*   **Dépendances embarquées :** Privilégier les installations locales de dépendances plutôt que globales, afin de s'assurer qu'un autre développeur (ou un agent IA) puisse cloner le dossier et lancer le projet instantanément sans conflit d'environnement.
*   **Rangement par domaine :** Le dossier de travail doit être rigoureusement organisé (ex: `frontend/`, `backend/`, `database/`) pour qu'une IA ou un humain puisse naviguer et identifier immédiatement où se trouve chaque module du système.

---

## 8. Synchronisation Documentaire & Suivi de Session
À chaque session de développement, il est **obligatoire** de maintenir à jour les documents de référence :

*   **Mise à jour de `stack_universelle.md` :** Doit impérativement être synchronisé avec l'arborescence réelle des fichiers, les nouveaux composants backend/frontend, les schémas Drizzle et les endpoints exposés.
*   **Mise à jour de `avancement_projet.md` :** Doit lister précisément les étapes et sous-fonctionnalités déjà développées ainsi que les étapes restantes à réaliser selon la roadmap du Whitepaper.
*   **Mise à jour des documents de fonctionnalité :** Chaque grande fonctionnalité possède un document dans [`docs/`](./docs/README.md). Il doit être créé avec la fonctionnalité, puis enrichi à chaque fin de session (flux, structures, modules, erreurs, tests, fichiers).

---

## 9. Capitalisation des Erreurs : Document `mauvaise_pratique.md`
Tout développement d'envergure confronte les agents IA à des pièges récurrents (conflits de schémas, cascades destructives, appels API non mis en cache, erreurs silencieuses).

*   **Tenue obligatoire du registre :** Le document [`mauvaise_pratique.md`](./mauvaise_pratique.md) à la racine recense chaque erreur majeure survenue, sa cause racine, l'anti-pattern à proscrire et la bonne pratique de remédiation adoptée.
*   **Consultation préventive :** Tout agent IA intervenant sur le projet doit consulter ce registre avant d'entamer une refonte ou d'ajouter une brique sensible (authentification, transactions, appels externes, synchronisation hors-ligne).
*   **Enrichissement systématique :** Dès qu'un bogue subtil, un goulet d'étranglement ou une régression est résolu, l'agent doit formaliser le cas dans `mauvaise_pratique.md` pour éviter sa réapparition par d'autres agents.

---

## 10. Standards d'Excellence UX et UI ("Bon UX et UI")
Tout composant ou interface conçu par un agent IA doit impérativement respecter la charte d'expérience utilisateur détaillée dans [`bon_ux_ui.md`](./bon_ux_ui.md) :

*   **Priorités spatiales strictes :** Plus un élément est prioritaire pour l'utilisateur, plus il est placé haut, devant et mis en valeur visuellement. Sans même lire, l'utilisateur doit repérer la priorité immédiate et le bouton d'action clé.
*   **Proximité des actions & Boutons "Tag" :**
    *   Boutons d'ajout, modification ou suppression **collés à la valeur cible** (effet repère immédiat).
    *   Format petit tag/pilule discret (`borderRadius: 14` à `20`), jamais d'icône orpheline ou de gros pavé perturbateur.
    *   **Regroupement cohérent :** Actions de modification et de suppression réunies dans la même bulle contextuelle pour économiser l'attention (TDAH-friendly).
*   **Glassmorphisme doux & contrastes nuancés :**
    *   Fond glassmorphe translucide avec bordures subtiles.
    *   Ni blanc pur aveuglant (`#ffffff`), ni noir complet agressif (`#000000`). Nuancer toujours les teintes vers un sombre adouci (ardoise bleutée) ou un clair feutré.
*   **Interface respirante, groupée en Cards (TDAH-friendly) :**
    *   Aérer généreusement avec du padding et des marges.
    *   Grouper impérativement les informations associées dans des **cards visuelles** pour structurer l'espace et apaiser la charge cognitive.
*   **Arrondis systématiques (Zéro angle aigu) :**
    *   Bannir les coins droits qui créent une sensation inconsciente d'insécurité (`borderRadius` systématique de 12px à 24px pour inputs, boutons et cartes).
*   **Formulaires progressifs par bulles contextuelles :**
    *   Bannir les formulaires géants intimidants.
    *   Procéder par itérations progressives : créer la donnée maîtresse en premier, puis enrichir.
    *   Pas de formulaires pré-affichés encombrants : utiliser un bouton d'action placé près de la zone concernée qui ouvre une bulle/modale de complétion ciblée.
    *   **Maximum 2 champs à la fois**, avec des placeholders évocateurs et des labels discrets ou contextuels.
*   **Dissimulation des zones destructives ou marginales :**
    *   Les blocs comme « Supprimer le compte » ne doivent jamais monopoliser l'attention.
    *   Ils doivent être dissimulés par défaut sous un bouton sobre (accordéon contextuel qui s'ouvre sous le bouton).

---

## 11. Normalisation & Souveraineté des Données

La **normalisation des données par les API est essentielle**. Aucune donnée centrale ne peut être créée dans notre site : le projet ne fait qu'**assembler et stocker des données existantes**. Seules les **données secondaires** (discussions, messages, comptes utilisateurs, préférences) peuvent être créées localement.

*   **Normalisation systématique :** toute réponse externe est convertie vers un schéma interne unique (identifiants stables `source` + `external_id`, types explicites, unités normalisées, coordonnées WGS 84, libellés nettoyés).
*   **Zéro invention :** une donnée centrale absente n'est jamais fabriquée. L'interface affiche un état explicite (« information indisponible ») et propose éventuellement une recherche externe.
*   **Séparation stricte :** les données secondaires référencent la donnée centrale par identifiant ; elles ne la dupliquent pas et ne la réécrivent pas.
*   **Traçabilité :** conserver la source, la date de récupération et la version du schéma de normalisation pour chaque entité importée.

---

## 12. Collecte Optimisée des Métadonnées & Enrichissement des Entités Enfants

Objectif : construire un **système de complétion parfait** de notre base, sans jamais répéter une requête déjà effectuée.

*   **Cache persistant obligatoire :** toute donnée appelée via une API externe est **immédiatement sauvegardée en base** avant d'être renvoyée au client (`external_api_cache`, tables métier, relations). Un redémarrage ne doit jamais provoquer un nouvel appel inutile.
*   **Lecture locale d'abord :** avant tout appel sortant, interroger le serveur et la base (fraîcheur, TTL, relations existantes). Si la donnée est valide, la servir sans réseau.
*   **Hydratation des enfants :** à chaque requête sur une entité, effectuer également les requêtes nécessaires à ses **objets enfants** (sous-ressources, détails, relations) afin d'enrichir la donnée précédente plutôt que de la laisser partielle.
*   **Upsert idempotent :** utiliser `ON CONFLICT DO UPDATE` pour qu'un retry ou un double appel ne crée jamais de doublon.
*   **Stratégie de fraîcheur :** *stale-while-revalidate* avec TTL par type de donnée ; le cache est servi immédiatement et rafraîchi en arrière-plan.
*   **Optimisation réseau :** regroupement des appels, annulation des requêtes obsolètes, déduplication en vol (*in-flight deduplication*) et limites de débit côté serveur.
*   **Optimisations avancées :** `ETag` / `If-None-Match`, negative caching, filtre de Bloom et merge non destructif — voir [Architecture d'enrichissement API](./architecture_syst_me_appels_api_et_sauvegarde_intelligente.md).

---

## 13. Chargement Asynchrone & Feedback Visuel

Les appels API doivent être pilotés par l'état du **serveur et de la base**, puis affichés de manière **réordonnée et adaptée à l'interface**, de façon asynchrone.

*   **Indicateurs locaux :** chaque donnée ou `div` en cours de chargement affiche une **petite icône de rotation** (spinner) ou un squelette, à l'endroit exact de la donnée.
*   **Progression visible :** afficher les données au fur et à mesure de leur arrivée ; ne jamais bloquer toute la page pour une sous-ressource.
*   **Tri et adaptation :** réordonner les résultats selon la pertinence métier et le contexte d'affichage, sans exposer le format brut de l'API.
*   **États explicites :** `loading`, `success`, `empty`, `error` sont quatre états distincts, avec un message clair et une action de reprise pour `error`.
*   **Nettoyage garanti :** réinitialiser les états de chargement dans `finally` ; annuler les requêtes au démontage du composant.

---

## 14. Sobriété Technique : Serveur Robuste, Interface Légère

Le développement doit rester **smart et économe en ressources**, afin de supporter de nombreux utilisateurs et de fonctionner sur des appareils peu puissants.

*   **Serveur :** pagination et plafonnement systématiques (`LIMIT`), index adaptés, requêtes agrégées, cache persistant, pas de calcul lourd dans le cycle de rendu.
*   **Client :** éviter les re-rendus inutiles, mémoriser les listes coûteuses, limiter les animations et l'empilement de flous (`backdrop-filter`).
*   **Réseau :** compression, réponses partielles, chargement paresseux des images et des sections secondaires.
*   **Mesure avant optimisation :** vérifier l'impact réel sur les temps de réponse et la mémoire avant d'ajouter de la complexité.

---

## 15. Fiabilité, Tests & Propagation Transverse des Correctifs

*   **Tests systématiques :** chaque service critique (normalisation, cache, auth, panier, machine à états) doit disposer de tests unitaires et d'un test d'intégration de son endpoint.
*   **Messages d'erreur utiles :** erreurs structurées (`ApiError` avec code HTTP), causes compréhensibles et actions de reprise affichées à l'utilisateur.
*   **Reproduction avant correction :** décrire le scénario, le reproduire, puis corriger la cause racine.
*   **Recherche d'impact :** dès qu'un défaut est corrigé, vérifier s'il peut se reproduire sur d'autres facettes du projet (autres endpoints, autres écrans, autres moteurs de conteneurs) et appliquer la même protection partout.
*   **Non-régression :** ajouter ou adapter un test qui empêche le retour du bogue.

---

## 16. Compatibilité Universelle & Accessibilité Intergénérationnelle

**Tout le développement est nativement compatible avec la génération en application Android et iOS et single pages app Web.**

*   **Une seule base de code :** Expo / React Native / Expo Router pour le Web (SPA), Android et iOS. Aucune fonctionnalité ne doit être pensée pour une seule plateforme sans repli explicite.
*   **Templates compréhensibles par une personne âgée :** vocabulaire simple, titres explicites, parcours linéaire, actions visibles, aucune dépendance à un geste caché ou à un jargon technique.
*   **Lisibilité :** taille de texte confortable, contraste suffisant, espacement généreux, cibles tactiles d'au moins 48 px.
*   **Style reposant :** glassmorphisme bleu clair inspiré des nuages, superpositions translucides douces, sans surcharge visuelle ni contrastes agressifs. Prévoir un repli lisible si le flou n'est pas supporté.
*   **Documentation continue :** commenter les fonctions du site et mettre à jour les documents de la racine à chaque fin de session, afin que les agents IA autonomes se repèrent sans consommer inutilement de contexte.

---

## 17. Documentation Obligatoire par Grande Fonctionnalité

Chaque grande fonctionnalité doit disposer d'un document dédié dans [`docs/`](./docs/README.md), et non d'une simple section dans un document fourre-tout.

*   **Un document par fonctionnalité :** par exemple `docs/api-cache.md` (appels API + sauvegarde en base), `docs/object-model.md` (structure des objets + modules réutilisables qui les affichent), `docs/spa-offline.md` (structure de la SPA + mode hors-ligne + menus).
*   **Contenu obligatoire :** objectif, portée/non-objectifs, flux de données, structures (tables, types, clés), modules réutilisables, états `loading/success/empty/error`, performance/sécurité, tests, fichiers concernés, statut et prochaines étapes.
*   **Source de vérité :** le document décrit le comportement réel et les décisions d'architecture, pas seulement une intention. Toute divergence entre le code et le document doit être corrigée dans la même session.
*   **Index central :** toute nouvelle fonctionnalité est ajoutée à [`docs/README.md`](./docs/README.md) et référencée depuis `README.md`, `stack_universelle.md` et `avancement_projet.md`.
*   **Modèle prêt à copier :** [`docs/_template.md`](./docs/_template.md).
*   **Mise à jour obligatoire :** à chaque fin de session de développement, mettre à jour les documents des fonctionnalités touchées, `stack_universelle.md` et `avancement_projet.md`.
