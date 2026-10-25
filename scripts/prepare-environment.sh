#!/usr/bin/env bash
# ==============================================================================
# Prépare .env, les volumes locaux et l'environnement du frontend.
# Sourcé par start.sh, ou exécutable : bash scripts/prepare-environment.sh
# ==============================================================================
set -euo pipefail

declare -F log >/dev/null 2>&1 || log() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
declare -F die >/dev/null 2>&1 || die() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

create_default_env() {
  local secret
  secret="$(generate_secret)"
  cat > "$PROJECT_DIR/.env" <<EOF
NODE_ENV=development
API_PORT=3000
PORT=8081
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_password
POSTGRES_DB=universal_db
DB_PORT=5432
DATABASE_URL=postgres://postgres:postgres_password@database:5432/universal_db
AUTH_SECRET=${secret}
EXPO_PUBLIC_API_URL=http://localhost:3000
EOF
  log "📄 Fichier .env minimal généré."
}

load_env() {
  if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
      cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    else
      create_default_env
    fi
  fi
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env"
  set +a

  API_PORT="${API_PORT:-3000}"
  PORT="${PORT:-8081}"
  export API_PORT PORT
  if [ -z "${DATABASE_URL:-}" ]; then
    export DATABASE_URL="postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres_password}@database:5432/${POSTGRES_DB:-universal_db}"
  fi
  if [ -z "${AUTH_SECRET:-}" ]; then
    export AUTH_SECRET="$(generate_secret)"
    log "🔐 AUTH_SECRET généré pour cette session (ajoutez-le au .env pour le conserver)."
  fi
  mkdir -p "$PROJECT_DIR/data/postgres"
}

prepare_frontend() {
  [ -d "$PROJECT_DIR/frontend" ] || die "Dossier frontend introuvable."
  (
    cd "$PROJECT_DIR/frontend"
    # Seules les variables publiques sont transmises au processus Expo.
    grep -E '^(EXPO_PUBLIC_[A-Za-z0-9_]+|PORT)=' "$PROJECT_DIR/.env" > .env.tmp || true
    mv .env.tmp .env

    local marker="node_modules/.package-lock.json"
    if [ ! -d node_modules ] \
      || { [ -f package-lock.json ] && [ package-lock.json -nt "$marker" ]; } \
      || [ package.json -nt "$marker" ]; then
      log "📦 Installation des dépendances frontend (npm ci)..."
      npm ci --no-audit --no-fund || npm install --no-audit --no-fund
    fi
  )
}

prepare_environment() {
  load_env
  prepare_frontend
  log "✅ Environnement prêt (API=${API_PORT}, Expo=${PORT})."
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  prepare_environment
fi
