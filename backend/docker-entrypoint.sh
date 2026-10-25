#!/bin/sh
# ==============================================================================
# Démarrage du backend en développement.
# L'image contient déjà node_modules ; le volume nommé peut toutefois être vide
# (premier lancement) ou obsolète (package.json modifié). On ne réinstalle que
# dans ces cas, au lieu de lancer npm install à chaque démarrage.
# ==============================================================================
set -eu

marker="node_modules/.deps-hash"
app_hash="$(cat package.json package-lock.json 2>/dev/null | sha256sum | cut -d' ' -f1)"

if [ ! -x node_modules/.bin/tsx ] || [ "$(cat "$marker" 2>/dev/null || true)" != "$app_hash" ]; then
  echo "📦 Dépendances backend manquantes ou obsolètes : installation…"
  npm ci --no-audit --no-fund
  printf '%s\n' "$app_hash" > "$marker"
else
  echo "✅ Dépendances backend à jour."
fi

exec "$@"
