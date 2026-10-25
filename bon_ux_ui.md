# Charte d'Excellence "Bon UX et UI" — The Universal Stack

Ce document constitue le standard de conception d'expérience utilisateur (UX) et d'interface visuelle (UI) que **tout agent IA ou développeur doit obligatoirement respecter** lors de la création ou modification de composants et d'écrans.

---

## 1. Hiérarchie Visuelle & Alignement sur les Priorités Utilisateur

* **Règle d'or de la priorité spatiale :** Plus un élément est important pour l'utilisateur, plus il doit être situé haut, devant et mis en valeur visuellement (contraste, taille, élévation).
* **Compréhension instantanée sans lecture exhaustive :** Même sans lire le texte dans son intégralité, l'utilisateur doit immédiatement percevoir :
  1. Où il se trouve.
  2. Ce qui est le plus important sur la page.
  3. L'action principale à effectuer (Call to Action saillant).
* **Relégation des actions destructives ou rares :** Les zones à risque (ex: suppression de compte) ou les options secondaires ne doivent jamais encombrer le premier plan. Elles sont dissimulées par défaut sous un déclencheur sobre et se déploient contextuellement sous le bouton d'activation.

---

## 2. Proximité Immédiate des Actions & Boutons "Tag"

* **Collés à la valeur cible :** Les boutons de modification, de suppression ou d'ajout doivent être positionnés **au plus près de la valeur ou donnée cible** qu'ils concernent, pour que l'utilisateur se repère immédiatement sans quitter la donnée des yeux.
* **Format visuel en petit tag / pilule :**
  - Adopter une apparence discrète et élégante semblable à un tag ou badge arrondi (`borderRadius: 14` à `20`, padding compact).
  - Bannir les icônes orphelines éparpillées ou les blocs géants qui écrasent la donnée métier.
* **Regroupement cohérent (Économie cognitive & TDAH-Friendly) :**
  - Pour minimiser l'énergie demandée à l'utilisateur pour comprendre ce qu'il voit, rassembler les actions associées au sein d'une **même bulle ou modale contextuelle**.
  - *Exemple :* Grouper les formulaires de modification et la confirmation de suppression dans la même bulle ouverte au clic sur le tag d'action, au lieu de disperser de multiples boutons concurrents sur la ligne.

---

## 3. Style Visuel : Glassmorphisme Bleu Clair & Inspiration "Nuages"

### 3.1 Palette de référence

| Rôle | Valeur | Usage |
| :---- | :---- | :---- |
| Ciel très pâle | `#f3f9ff` | Fond général, respiration |
| Brume bleue | `#e3f2ff` | Fonds de sections |
| Nuage bleu | `#cfe8ff` | Survols, séparateurs doux |
| Accent ciel | `#5aa9e6` | Actions principales, focus |
| Accent profond | `#3b82c4` | Texte d'accent, liens |
| Texte clair | `#1f3a56` | Texte principal en mode clair |
| Texte sombre | `#e8f3ff` | Texte principal en mode sombre |
| Verre blanc | `rgba(255,255,255,0.58)` | Surface glass principale |
| Verre bleuté | `rgba(214,236,255,0.38)` | Seconde couche translucide |

> **Contraste :** ne jamais utiliser un bleu très pâle pour du texte. Le texte reste toujours dans un bleu-ardoise profond (`#1f3a56`) ou un blanc bleuté très clair, avec un ratio d'au moins **4,5:1**.

### 3.2 Surfaces translucides

* **Recette de base :** dégradé diagonal blanc/bleu très doux, flou d'arrière-plan modéré (`backdrop-filter: blur(12px) saturate(115%)`), bordure fine semi-transparente et ombre diffuse bleutée.
* **Arrondis :** `borderRadius` de `16px` à `24px` pour toutes les surfaces glass.
* **Profondeur :** privilégier une ombre large et faible (`0 10px 30px rgba(74,159,232,0.12)`) plutôt qu'une ombre noire dure.

```css
.glass {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.58), rgba(214, 236, 255, 0.38));
  backdrop-filter: blur(14px) saturate(115%);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(74, 159, 232, 0.12);
}
```

### 3.3 Superpositions inspirées des nuages

* Les couches translucides ne doivent pas former un damier froid ou mécanique : elles s'inspirent de **nuages superposés** (formes douces, bords diffus, variations très légères de bleu et de blanc).
* Utiliser de grands **dégradés radiaux** (`radial-gradient`) très peu contrastés comme arrière-plans décoratifs, avec `pointer-events: none`.
* **Maximum deux couches floutées superposées** dans une même zone. Les couches plus profondes utilisent un simple fond translucide sans flou additionnel.
* Éviter les motifs chargés, les néons et les ombres multiples : l'atmosphère doit rester **calme, aérée et reposante**.

### 3.4 Repli et performance

* Prévoir un fond opaque bleu très clair si `backdrop-filter` n'est pas supporté :
  ```css
  @supports not (backdrop-filter: blur(14px)) {
    .glass { background: #eef6ff; }
  }
  ```
* Respecter `prefers-reduced-transparency: reduce` en remplaçant le verre par une surface opaque douce.
* Sur appareils peu puissants, réduire le flou à `6px`–`8px` ou le désactiver ; ne jamais animer un `backdrop-filter`.

### 3.5 Éviter les extrêmes

* **Ni trop sombre, ni trop clair (Éviter les extrêmes) :**
  - **Mode clair nuancé :** Ne pas utiliser de blanc pur agressif (`#ffffff` en fond d'écran plein). Préférer des tons doux comme le gris ardoise pâle (`#f1f5f9` / `#f8fafc`).
  - **Mode sombre nuancé :** Ne pas utiliser de noir absolu (`#000000` pur). Préférer des tons bleutés profonds et reposants (`#0f172a` / `#1e293b`).
  - Le contraste doit être doux pour les yeux, reposant lors d'utilisations prolongées.

---

## 4. Aération, Respiration & Design "TDAH-Friendly"

* **Interface aérée :** Espacements généreux (`Spacing.three`, `Spacing.four`), marges respiratoires entre les sections. L'interface ne doit jamais paraître étouffante ou saturée d'informations.
* **Regroupement systématique en Cards :**
  - Les informations connexes doivent être encapsulées dans des cartes visuelles unitaires.
  - La card optimise l'espace, délimite clairement le contexte mental et évite la dispersion cognitive.
* **Anti-surcharge cognitive (TDAH-Friendly) :**
  - Une seule intention principale par carte ou section.
  - Découpage visuel clair réduisant la fatigue décisionnelle.
  - Feedback immédiat et visible pour chaque interaction (loaders, coches vertes, micro-animations).

---

## 5. Règle Fondamentale des Arrondis (Zéro Coin Aigu)

* **Arrondis systématiques :** Les coins droits et pointus génèrent instinctivement de la tension et de l'inconfort visuel.
* **Standards de rayon de courbure (Border Radius) :**
  - **Cards & Conteneurs :** Arrondis doux de `16px` à `24px` (`borderRadius: 16` ou `20`).
  - **Boutons, Tags & Badges :** Arrondis généreux ou pilules (`borderRadius: 12` à `20`, ou `9999px` pour les pilules).
  - **Champs de saisie (Inputs) :** Arrondis confortables de `12px` à `16px`.
* **Interdiction stricte :** Aucun élément cliquable ou conteneur ne doit avoir des angles vifs à `0px` ou des découpes agressives (`4px` - `6px`).

---

## 6. Formulaires Progressifs & Bulles Contextuelles

* **Interdiction des formulaires géants et intimidants :** Ne jamais imposer un formulaire monolithique de 10 champs qui décourage l'utilisateur.
* **Complétion itérative par petites étapes :**
  - Procéder par mini-formulaires successifs ou par ajout progressif de blocs de données.
  - Créer **la donnée la plus importante en premier** (ex: le titre ou la compétence principale), puis proposer d'enrichir le reste si désiré.
* **Bouton contextuel ouvrant une bulle / modale locale :**
  - Au lieu d'afficher des formulaires vides en permanence sur la page, afficher un bouton sobre d'action en tag (ex: `+ Compléter`, `+ Ajouter`) directement dans la zone concernée.
  - Ce bouton ouvre une bulle contextuelle ou une modale ciblée à l'endroit précis où la donnée prendra place, permettant à l'utilisateur de rester parfaitement repéré dans l'espace.
* **Règle des 2 champs maximum :**
  - Un mini-formulaire unitaire ne doit pas demander plus de **1 à 2 champs à la fois** (ex: Titre + Valeur, ou Compétence + Niveau).
  - Les labels doivent être concis ou optionnels si le placeholder est clair et évocateur.
  - Chaque champ doit posséder un **placeholder cohérent et contextuel** guidant immédiatement la saisie (ex: `"Ex: Développeur React Native"`, `"Ex: 45 €/h"`).

---

## 7. Synthèse des Règles pour les Agents IA

1. **Priorités :** Élément crucial = en haut, contrasté et premier au focus.
2. **Proximité & Tags :** Boutons d'action collés à la valeur cible, look « petit tag », actions connexes regroupées dans la même bulle.
3. **Atmosphère :** Glassmorphisme doux, mode sombre/clair nuancé (pas d'extrêmes aveuglants).
4. **Respiration :** Espacements généreux, regrouper en cards, zéro encombrement mental.
5. **Formes :** Arrondis partout (`12px` - `24px`), proscrire absolument les angles droits et micro-arrondis raides (< 10px).
6. **Formulaires :** Déclencheurs contextuels près de la zone, max 2 champs par étape, placeholders évocateurs.
7. **Actions destructives :** Dissimulées par défaut sous un bouton dédié avec accordéon inférieur.
8. **Accessibilité :** lisibilité grand âge, contraste AA, cibles tactiles de 48 px, vocabulaire simple (voir section 8).
9. **Sobriété :** flou modéré, couches limitées, repli opaque sur appareils faibles (voir section 9).

---

## 8. Accessibilité Intergénérationnelle (Personnes Âgées)

Les templates et styles du site doivent être **facilement compréhensibles même par une personne âgée**, sans apprentissage préalable.

* **Typographie :** texte courant d'au moins `17px`–`18px`, titres de `24px` à `32px`, interligne de `1.5` à `1.6`.
* **Contraste :** respecter WCAG AA (`4.5:1` pour le texte courant, `3:1` pour les grands titres). Le bleu clair reste décoratif, jamais support unique d'une information.
* **Cibles tactiles :** minimum `48 × 48 px`, avec au moins `8px` d'espacement entre deux actions.
* **Langage :** phrases courtes, vocabulaire courant, pas d'acronymes ni de jargon. Les libellés sont explicites (`Enregistrer mes informations` plutôt que `OK`).
* **Navigation :** repère constant, bouton retour visible, fil d'Ariane sur les parcours longs, une seule action principale par écran.
* **Feedback :** chaque action produit une confirmation textuelle ou une erreur explicite ; ne jamais signaler un état uniquement par la couleur.
* **Formulaires :** labels toujours visibles, placeholders évocateurs, correction guidée, aucune action chronométrée, sauvegarde progressive.
* **Focus clavier :** contour visible et contrasté sur tous les éléments interactifs.
* **Zoom :** l'interface reste utilisable à `200%` de zoom sans perte de contenu ni chevauchement.
* **Densité :** préférer des cards courtes à des tableaux denses ; une idée principale par bloc.

---

## 9. Sobriété Visuelle & Performance sur Appareils Modestes

L'interface doit rester normalement utilisable sur des appareils peu puissants, y compris avec de nombreux utilisateurs côté serveur.

* **Flou maîtrisé :** `backdrop-filter` entre `8px` et `16px`, jamais sur des listes virtualisées entières.
* **Animations :** privilégier `opacity` et `transform` ; éviter d'animer les ombres, les flous ou les dimensions coûteuses.
* **Chargement :** squelettes et spinners locaux, chargement paresseux des images, listes virtualisées au-delà de 50 éléments.
* **Mode économie :** respecter `prefers-reduced-motion` et `prefers-reduced-transparency`.
* **Dégradation gracieuse :** sans flou ni animation, l'interface conserve sa hiérarchie, ses contrastes et sa lisibilité.
