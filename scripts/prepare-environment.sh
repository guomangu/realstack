#!/usr/bin/env bash
# Prépare .env, les volumes locaux et le frontend (sourcé par start.sh).
set -euo pipefail

declare -F log >/dev/null 2>&1 || log() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
declare -F die >/dev/null 2>&1 || die() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 32
  else head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

create_default_env() {
  local secret
  secret="$(generate_secret)"
  cat > "$PROJECT_DIR/.env" <<EOF
NODE_ENV=development
API_PORT=3000
PORT=8081
CORS_ORIGINS=http://localhost:8081
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_password
POSTGRES_DB=universal_db
DB_PORT=5432
DATABASE_URL=postgres://postgres:postgres_password@database:5432/universal_db
REDIS_PORT=6379
REDIS_URL=redis://redis:6379
HARVESTER_PORT=3001
HARVESTER_DB_POOL=5
HARVESTER_ENABLE_EXAMPLE=0
HARVESTER_EXAMPLE_URL=
AUTH_SECRET=${secret}
EXPO_PUBLIC_API_URL=http://localhost:3000
EOF
  log "📄 Fichier .env minimal généré."
}

persist_auth_secret() {
  local env_file="$PROJECT_DIR/.env" secret
  secret="$(generate_secret)"
  export AUTH_SECRET="$secret"
  if grep -q '^AUTH_SECRET=' "$env_file"; then sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${secret}|" "$env_file"
  else printf '\nAUTH_SECRET=%s\n' "$secret" >> "$env_file"
  fi
  log "🔐 AUTH_SECRET aléatoire généré et enregistré dans .env."
}

load_env() {
  if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    else create_default_env
    fi
  fi
  chmod 600 "$PROJECT_DIR/.env" 2>/dev/null || true
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
  if [ -z "${AUTH_SECRET:-}" ] || [ "${AUTH_SECRET}" = "super_secret_changeme_for_production" ]; then
    persist_auth_secret
  fi
  mkdir -p "$PROJECT_DIR/data/postgres" "$PROJECT_DIR/data/redis"
}

prepare_frontend() {
  [ -d "$PROJECT_DIR/frontend" ] || die "Dossier frontend introuvable."
  (
    cd "$PROJECT_DIR/frontend"
    grep -E '^(EXPO_PUBLIC_[A-Za-z0-9_]+|PORT)=' "$PROJECT_DIR/.env" > .env.tmp || true
    mv .env.tmp .env

    local marker="node_modules/.package-lock.json"
    if [ ! -d node_modules ] || [ ! -x node_modules/.bin/expo ] \
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

if [ "${BASH_SOURCE[0]}" = "$0" ]; then prepare_environment; fi
