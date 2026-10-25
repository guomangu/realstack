#!/usr/bin/env bash
# ==============================================================================
# Lancement automatique de The Universal Stack.
# Aucune option : dépendances, environnement, conteneurs et Expo sont gérés.
# Ctrl-C arrête Expo et l'infrastructure.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/compose.yaml"
cd "$SCRIPT_DIR"

log() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$#" -eq 0 ] || die "Aucune option n'est nécessaire : lancez simplement ./start.sh"

# 1. Dépendances système : installation automatique si nécessaire.
# shellcheck source=scripts/ensure-dependencies.sh
. "$SCRIPT_DIR/scripts/ensure-dependencies.sh"
ensure_dependencies

# 2. Environnement, .env, données et dépendances frontend.
# shellcheck source=scripts/prepare-environment.sh
. "$SCRIPT_DIR/scripts/prepare-environment.sh"
prepare_environment

# 3. Détection du moteur Compose.
detect_compose() {
  if [ -n "${COMPOSE_CMD:-}" ]; then
    read -r -a COMPOSE <<< "$COMPOSE_CMD"
    [ "${#COMPOSE[@]}" -gt 0 ] || die "COMPOSE_CMD est vide ou invalide."
  elif command -v podman-compose >/dev/null 2>&1; then
    COMPOSE=(podman-compose)
  elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
    COMPOSE=(podman compose)
  elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    die "Aucun moteur Compose disponible."
  fi
  log "🐳 Moteur de conteneurs : ${COMPOSE[*]}"
}

detect_compose

# 4. Infrastructure et nettoyage automatique à l'arrêt.
STARTED=0
CLEANED=0
cleanup() {
  trap '' INT TERM HUP
  [ "$CLEANED" -eq 1 ] && return 0
  CLEANED=1
  if [ "$STARTED" -eq 1 ]; then
    log "🧹 Arrêt de l'infrastructure..."
    ( cd "$SCRIPT_DIR" && timeout 30s "${COMPOSE[@]}" -f "$COMPOSE_FILE" down ) >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM HUP

if [ "${COMPOSE[0]}" = "podman" ] || [ "${COMPOSE[0]}" = "podman-compose" ]; then
  podman info >/dev/null 2>&1 || die "Podman ne répond pas. Vérifiez 'podman info' ; en rootless, assurez-vous que /etc/subuid et /etc/subgid contiennent votre utilisateur."
fi

log "🚀 Démarrage de PostgreSQL/PostGIS et de l'API..."
STARTED=1
"${COMPOSE[@]}" -f "$COMPOSE_FILE" up --build -d

# 5. Attente de la santé de l'API (réponse JSON validée).
health_ok() {
  local body
  body="$(curl -fsS "http://localhost:${API_PORT}/health" 2>/dev/null)" || return 1
  [[ "$body" == *'"status":"ok"'* ]]
}
printf '⏳ Attente de l’API sur http://localhost:%s/health' "$API_PORT"
for _ in $(seq 1 45); do
  health_ok && { echo ' ✔'; break; }
  printf '.'; sleep 2
done
if ! health_ok; then
  printf '\n⚠️ API indisponible après 90 s. Journaux récents :\n'
  "${COMPOSE[@]}" -f "$COMPOSE_FILE" logs --tail 25 backend || true
  die "Corrigez l'erreur ci-dessus puis relancez ./start.sh."
fi

# 6. Frontend Expo au premier plan.
log "📱 Interface universelle : w = Web (SPA), a = Android, i = iOS"
log "🛑 Ctrl-C pour arrêter Expo et l'infrastructure."
cd "$SCRIPT_DIR/frontend"
npx expo start -c --port "$PORT"
