# Registre des Mauvaises Pratiques & Pièges Détectés — The Universal Stack

Ce document capitalise les erreurs majeures rencontrées au cours du développement de l'application. Il sert de mémoire technique collective pour permettre aux développeurs et agents IA d'éviter de reproduire ces écueils.

---

## 🛑 1. Dépassement de la contrainte des 100 lignes par fichier

* **Problème / Symptôme :** Fichiers géants (200-500 lignes) mélangeant contrôleurs, requêtes SQL, validation, gestion des erreurs et rendu UI.
* **Conséquences :** Fenêtre de contexte saturée pour les LLMs, risque élevé d'hallucination ou de modifications destructives non ciblées, tests unitaires complexes.
* **Mauvaise Pratique :** Implémenter un nouveau composant ou endpoint en empilant toute la logique dans un seul fichier "fourre-tout".
* **Bonne Pratique :** 
  - Découper strictement en sous-modules à responsabilité unique (SRP) : `types.ts`, `service.ts`, `controller.ts`, sous-composants UI.
  - Chaque fichier doit strictement faire **moins de 100 lignes**.

---

## 🛑 2. Oubli du polymorphisme prestataire (Utilisateur vs Équipe)

* **Problème / Symptôme :** Création de panier échouant avec erreur de clé étrangère PostgreSQL (`violates foreign key constraint users_id_fkey`) lorsqu'un panier était créé pour une vitrine d'équipe (`targetType: 'team'`).
* **Conséquences :** Blocage complet du bouton `+ Panier` sur les profils collectifs / équipes.
* **Mauvaise Pratique :** Présumer qu'un prestataire est toujours un `user` et forcer l'insertion dans un champ `target_user_id` lié à la table `users`.
* **Bonne Pratique :**
  - Utiliser un typage explicite (`provider_type: 'user' | 'team'`, `provider_id: UUID`) ou deux clés étrangères optionnelles (`user_id`, `team_id`) avec une contrainte de cohérence `CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (team_id IS NOT NULL AND user_id IS NULL))`.
  - Toujours adapter les jointures de la discussion et du panier au type de cible.

---

## 🛑 3. Création non-idempotente des discussions & paniers

* **Problème / Symptôme :** Chaque clic sur « Ajouter au panier » ou actualisation créait une nouvelle discussion et un nouveau panier brouillon orphelin en base de données.
* **Conséquences :** Multiplication des fils de discussion vides pour une même commande, confusion totale côté client et prestataire.
* **Mauvaise Pratique :** Appeler un `INSERT` aveugle sans rechercher au préalable s'il existe déjà un panier actif ou brouillon pour ce couple acheteur/prestataire.
* **Bonne Pratique :**
  - Mettre en œuvre une logique d'upsert ou de recherche idempotente : rechercher un panier `DRAFT` existant pour l'acheteur et le prestataire.
  - S'il existe, lui rattacher les nouvelles lignes de compétences de manière idempotente (ignorer les doublons via `ON CONFLICT DO NOTHING`).
  - N'activer la discussion (`status: 'ACTIVE'`) que lors de la soumission définitive.

---

## 🛑 4. Suppression en cascade naïve des comptes utilisateurs (`ON DELETE CASCADE`)

* **Problème / Symptôme :** La suppression d'un utilisateur supprimait en cascade ses discussions, ses messages et l'historique des commandes passées avec d'autres utilisateurs.
* **Conséquences :** Perte de preuves commerciales, écrans de chat brisés chez les interlocuteurs, violation de traçabilité légale.
* **Mauvaise Pratique :** Poser des contraintes `ON DELETE CASCADE` aveugles sur les tables transactionnelles (`discussions`, `messages`, `baskets`).
* **Bonne Pratique :**
  - Mettre en place un soft-delete ou une anonymisation transactionnelle : marquer `account_status = 'DELETED'`, effacer les données personnelles (avatar, bio, téléphone, mot de passe), mais conserver les messages sous l'expéditeur « Compte supprimé ».
  - Pour les paniers passés, conserver un snapshot immuable (titre, tarif, description) indépendant du profil supprimé.

---

## 🛑 5. Erreurs silencieuses et masquage des échecs (Fail Silent)

* **Problème / Symptôme :** Blocs `catch (err) { /* noop */ }` ou simples `console.error` qui masquent un échec 401 Unauthorized ou une erreur de validation 400.
* **Conséquences :** Boutons d'action UI qui restent bloqués en état de chargement sans aucun message d'explication pour l'utilisateur.
* **Mauvaise Pratique :** Masquer les erreurs API pour éviter un crash écran sans fournir de feedback ou d'état de repli.
* **Bonne Pratique :**
  - Définir une classe d'erreur structurée (`ApiError` avec code HTTP et message descriptif).
  - Fournir un retour visuel systématique (bannière rouge, toast d'erreur, message explicite) et réinitialiser l'état `loading` dans un bloc `finally`.

---

## 🛑 6. Appels externes répétés sans persistance en base de données

* **Problème / Symptôme :** Requêter l'API externe (géocodage Photon, référentiel de compétences, aperçu Open Graph) à chaque frappe de touche ou à chaque chargement de page.
* **Conséquences :** Risque de bannissement par rate-limiting des API publiques, latence réseau élevée, indisponibilité totale en cas de coupure de l'API externe.
* **Mauvaise Pratique :** Traiter les API externes comme des services de calcul direct sans mémoire locale.
* **Bonne Pratique :**
  - Mettre en cache persisté dans PostgreSQL (`external_api_cache`, `official_skills_catalog`) tout appel externe réussi.
  - Vérifier en premier lieu la base locale : si la requête ou les compétences associées sont déjà en cache, servir les données locales sans consommer de requête réseau externe.
  - Alimenter la base de données de manière incrémentale et itérative au fil des recherches.

---

## 🛑 7. Conflits de modifications unilatérales sur les devis / paniers

* **Problème / Symptôme :** Une partie modifie le contenu d'un devis déjà accepté sans le consentement de l'autre partie.
* **Conséquences :** Litiges sur le périmètre des compétences ou les tarifs négociés.
* **Mauvaise Pratique :** Permettre un `UPDATE` direct des lignes de panier dès qu'un des deux participants soumet une modification.
* **Bonne Pratique :**
  - Machine à états avec propositions de révision (`basket_changes`) : toute modification génère une proposition.
  - Le panier principal n'est actualisé que lorsque **les deux parties** (acheteur et prestataire) ont validé explicitement la révision.

---

## 🛑 8. Crashs en environnement déconnecté (Offline Unawareness)

* **Problème / Symptôme :** L'application tente des appels réseau immédiats sans vérifier la connectivité ou plante dès qu'une requête échoue sans connexion.
* **Conséquences :** Écran blanc ou perte des données saisies par le travailleur sur le terrain.
* **Mauvaise Pratique :** Dépendre exclusivement d'une connectivité permanente.
* **Bonne Pratique :**
  - Couche de persistance locale (`AsyncStorage` / cache local), détection de l'état réseau (`useNetworkState`), et mise en file d'attente des paniers et modifications jusqu'au retour de la connexion.
  - Bus d'événements réactif (`emitEntityChanged`) pour invalider et rafraîchir les vues dès la reprise réseau.

---

## 🛑 9. Formulaires géants monolithiques et absence de déclencheur contextuel

* **Problème / Symptôme :** Formulaires statiques affichant d'un bloc 8 à 15 champs obligatoires sur l'écran, effrayant et décourageant l'utilisateur (charge cognitive excessive, non TDAH-friendly).
* **Conséquences :** Taux d'abandon massif lors de l'onboarding et de la saisie de compétences ou profils.
* **Mauvaise Pratique :** Afficher un formulaire géant ouvert en permanence au milieu de la vue.
* **Bonne Pratique :**
  - Complétion progressive : un bouton contextuel (ex: `+ Ajouter`, `Compléter`) ouvre une bulle ciblée à l'endroit exact de l'information.
  - Limiter strictement à **1 ou 2 champs par interaction** (les plus importants d'abord), avec des placeholders évocateurs.

---

## 🛑 10. Coins droits anxiogènes, saturation visuelle et zones destructives au premier plan

* **Problème / Symptôme :** Éléments d'interface avec coins droits aigus (`borderRadius: 0`), contrastes extrêmes (blanc pur aveuglant ou noir complet) et boutons de suppression destructifs exposés au premier plan.
* **Conséquences :** Tension inconsciente de l'utilisateur, peur du clic, fatigue visuelle et sentiment d'interface agressive.
* **Mauvaise Pratique :** Exposer la section de suppression de compte en permanence et utiliser des angles droits sans arrondis.
* **Bonne Pratique :**
  - Respecter la charte [`bon_ux_ui.md`](./bon_ux_ui.md) : arrondis doux systématiques (12px à 24px), glassmorphisme feutré et nuancé.
  - Dissimuler les zones sensibles sous un bouton accordéon discret qui ne se déploie que sous le déclencheur sur intention explicite.

---

## 🛑 11. Hypothèse « Docker obligatoire » sur Fedora / Podman

* **Problème / Symptôme :** `start.sh` appelle directement `docker compose` ; sur Fedora 44 équipé de Podman, le script échoue avec « docker : commande introuvable ».
* **Conséquences :** Impossible de lancer le projet alors que le moteur de conteneurs est bien installé et fonctionnel.
* **Mauvaise Pratique :** Coder en dur un seul moteur de conteneurs et ignorer l'environnement de la machine.
* **Bonne Pratique :**
  - Détecter automatiquement le moteur disponible : `COMPOSE_CMD`, puis `podman-compose`, `podman compose`, `docker compose`, enfin `docker-compose`.
  - Conserver `compose.yaml` compatible avec les deux moteurs et documenter l'installation Fedora (`sudo dnf install -y podman podman-compose`).
  - Afficher un message d'erreur explicite avec la commande d'installation si aucun moteur n'est présent.

---

## 🛑 12. Bind mount qui masque `node_modules` dans le conteneur

* **Problème / Symptôme :** Le backend redémarre en boucle avec `sh: tsx: not found`, alors que l'image a bien exécuté `npm install`.
* **Conséquences :** API indisponible, boucle de redémarrage, faux diagnostic « dépendances manquantes ».
* **Mauvaise Pratique :** Monter `./backend:/app` sans volume dédié à `/app/node_modules`. Le bind du dossier hôte masque le dossier installé dans l'image.
* **Bonne Pratique :**
  - Ajouter un volume nommé `backend_node_modules:/app/node_modules` en plus du bind du code.
  - Vérifier le démarrage réel via une sonde `GET /health`, pas seulement le statut « conteneur lancé ».

---

## 🛑 13. Données centrales inventées et appels API non normalisés

* **Problème / Symptôme :** Le site crée ou complète lui-même des données centrales (lieux, compétences, organisations) et renvoie des payloads externes bruts, non typés et non persistés.
* **Conséquences :** Divergence avec les référentiels officiels, doublons, incohérences d'affichage et répétition permanente des mêmes requêtes.
* **Mauvaise Pratique :** Considérer les API externes comme des sources de calcul direct, sans normalisation ni stockage local.
* **Bonne Pratique :**
  - **Aucune donnée centrale ne peut être créée dans notre site** : uniquement assembler et stocker des données existantes.
  - Normaliser chaque réponse (identifiants `source` + `external_id`, unités, coordonnées WGS 84, libellés).
  - Persister immédiatement toute réponse externe et interroger la base avant le réseau.
  - Autoriser la création locale uniquement pour les données secondaires (comptes, discussions, messages, préférences).

---

## 🛑 14. Appels API sans hydratation des entités enfants

* **Problème / Symptôme :** Une entité est affichée partiellement ; ses sous-ressources (détails, relations, enfants) ne sont chargées qu'à la demande de l'utilisateur, souvent par de nouveaux appels répétés.
* **Conséquences :** Interface incomplète, latence perçue, multiplication des requêtes et quotas API gaspillés.
* **Mauvaise Pratique :** Ne récupérer que l'objet parent et laisser les enfants non persistés.
* **Bonne Pratique :**
  - À chaque requête sur une entité, effectuer également les requêtes de ses objets enfants pour **compléter la donnée précédente**.
  - Persister les relations parent/enfant et utiliser un upsert idempotent.
  - Servir le cache local en priorité et rafraîchir en arrière-plan (*stale-while-revalidate*).

---

## 🛑 15. Chargement asynchrone silencieux et interface inaccessible

* **Problème / Symptôme :** Zones blanches sans indicateur, boutons bloqués sans message, textes trop petits ou trop pâles, formulaires denses incompréhensibles pour une personne âgée.
* **Conséquences :** Sentiment de panne, abandon, exclusion d'une partie des utilisateurs.
* **Mauvaise Pratique :** Attendre la fin de tous les appels avant d'afficher quoi que ce soit, et concevoir uniquement pour un utilisateur expert.
* **Bonne Pratique :**
  - Afficher un **spinner local** ou un squelette sur chaque donnée en chargement, puis réordonner les résultats à l'arrivée.
  - Distinguer les états `loading`, `success`, `empty`, `error`, avec un message clair et un bouton `Réessayer`.
  - Respecter [`bon_ux_ui.md`](./bon_ux_ui.md) : texte lisible, contraste AA, cibles tactiles de 48 px, glassmorphisme bleu clair reposant et repli opaque sur appareils faibles.

---

## 🛑 16. Prérequis système implicites et installation manuelle

* **Problème / Symptôme :** Le script suppose Podman, podman-compose, Node.js et npm déjà installés ; sur une machine vierge, il s'arrête avec « commande introuvable ».
* **Conséquences :** Démarrage impossible sans intervention humaine, documentation obsolète, agents IA bloqués.
* **Mauvaise Pratique :** Documenter des prérequis sans les vérifier ni les installer, ou imposer des commandes manuelles différentes selon la distribution.
* **Bonne Pratique :**
  - Détecter chaque dépendance et installer uniquement les manquantes via `dnf`, `apt-get`, `pacman` ou `zypper`.
  - Tester l'élévation de privilèges dans l'ordre : `root`, `sudo -n`, `sudo` interactif, `pkexec`, `doas`.
  - Après installation, revérifier chaque commande et échouer avec un message précis en cas d'échec.

---

## 🛑 17. Script à options obligatoires et arrêt non nettoyé

* **Problème / Symptôme :** L'utilisateur doit retenir `--backend-only`, `--down` ou d'autres flags ; un `Ctrl-C` laisse les conteneurs et les ports occupés.
* **Conséquences :** Démarrages suivants bloqués, confusion sur l'état réel de l'infrastructure, automatisation fragile.
* **Mauvaise Pratique :** Multiplier les modes et laisser les conteneurs tourner après la fin du processus principal.
* **Bonne Pratique :**
  - Un seul point d'entrée sans option : `./start.sh`.
  - Nettoyage automatique via `trap EXIT INT TERM HUP` et `compose down` avec délai maximal.
  - Script idempotent : `up -d`, `npm ci` seulement si nécessaire, installation des paquets seulement si absents.

---

## 🛑 18. Secrets serveur chargés par le frontend

* **Problème / Symptôme :** Le `.env` racine (mots de passe PostgreSQL, SMTP, clés API) est lié ou copié dans `frontend/.env`, puis chargé par Expo.
* **Conséquences :** Risque de fuite de secrets dans les journaux, les configurations de build ou le bundle client.
* **Mauvaise Pratique :** Partager un unique `.env` entre backend et frontend sans filtrage.
* **Bonne Pratique :**
  - Générer `frontend/.env` avec uniquement `EXPO_PUBLIC_*` et `PORT`.
  - Ne jamais exposer une clé privée via une variable `EXPO_PUBLIC_*`.
  - Ajouter `frontend/.env` au `.gitignore`.

---

## 🛑 19. Documentation absente ou fourre-tout par fonctionnalité

* **Problème / Symptôme :** Les choix d'architecture (cache API, hydratation des enfants, modules UI, hors-ligne, menus) sont dispersés ou absents, obligeant les agents IA à redécouvrir le fonctionnement à chaque session.
* **Conséquences :** Incohérences, régressions, consommation excessive de contexte et de tokens.
* **Mauvaise Pratique :** Considérer qu'un commentaire de code ou un README général suffit pour une fonctionnalité complexe.
* **Bonne Pratique :**
  - Un document précis par grande fonctionnalité dans [`docs/`](./docs/README.md), basé sur [`docs/_template.md`](./docs/_template.md).
  - Mise à jour obligatoire à chaque fin de session, avec index dans `docs/README.md` et références depuis `README.md`, `stack_universelle.md` et `avancement_projet.md`.
