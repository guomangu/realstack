# Scripts d'Automatisation

Ces scripts sont appelés par `start.sh`, qui reste **le seul point d'entrée** pour l'utilisateur. Ils peuvent aussi être exécutés seuls pour diagnostiquer l'environnement.

| Script | Rôle |
| :---- | :---- |
| `ensure-dependencies.sh` | Vérifie et installe automatiquement Podman, podman-compose, Node.js 20+, npm et curl. |
| `prepare-environment.sh` | Crée/charge `.env`, prépare `data/postgres`, génère `frontend/.env` (public uniquement) et installe les dépendances npm. |

## Bootstrap des dépendances

- Gestionnaires pris en charge : `dnf` (Fedora/RHEL), `apt-get` (Debian/Ubuntu), `pacman` (Arch), `zypper` (openSUSE).
- Fedora 44 : les paquets Node sont `nodejs22` / `nodejs22-npm` ; le script essaie `nodejs`, puis `nodejs22`, puis `nodejs20`.
- Élévation de privilèges testée dans l'ordre : `root`, `sudo -n` (sans mot de passe), `sudo` interactif (si terminal), `pkexec` (desktop), `doas`.
- Aucun paquet n'est installé si toutes les dépendances sont déjà présentes.
- Après installation : `hash -r` puis vérification finale de chaque commande.

## Préparation de l'environnement

- `.env` est créé depuis `.env.example` s'il manque ; sinon un `.env` minimal est généré avec des valeurs sûres.
- `DATABASE_URL` est reconstruite si elle est absente ou vide.
- `AUTH_SECRET` est généré pour la session s'il manque (à ajouter au `.env` pour le conserver).
- `frontend/.env` ne contient que `EXPO_PUBLIC_*` et `PORT` : les secrets serveur ne sont jamais transmis à Expo.
- `npm ci` n'est relancé que si `node_modules` est absent ou si `package-lock.json` est plus récent.

## Exécution directe

```bash
bash scripts/ensure-dependencies.sh
bash scripts/prepare-environment.sh
```

> Chaque script respecte la limite de 100 lignes et ne contient qu'une responsabilité.
