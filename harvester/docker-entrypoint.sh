#!/bin/sh
# ==============================================================================
# Démarrage du harvester en développement.
# L'image contient déjà node_modules ; le volume nommé peut être vide (premier
# lancement) ou obsolète (package.json modifié). On ne réinstalle que dans ces
# cas, puis on transmet la main au processus Node pour conserver les signaux.
# ==============================================================================
set -eu

marker="node_modules/.deps-hash"
app_hash="$(cat package.json package-lock.json 2>/dev/null | sha256sum | cut -d' ' -f1)"

if [ ! -x node_modules/.bin/tsx ] || [ "$(cat "$marker" 2>/dev/null || true)" != "$app_hash" ]; then
  echo "📦 Dépendances harvester manquantes ou obsolètes : installation…"
  npm ci --no-audit --no-fund
  printf '%s\n' "$app_hash" > "$marker"
else
  echo "✅ Dépendances harvester à jour."
fi

exec "$@"
