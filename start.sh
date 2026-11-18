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

. "$SCRIPT_DIR/scripts/ensure-dependencies.sh"
ensure_dependencies
. "$SCRIPT_DIR/scripts/prepare-environment.sh"
prepare_environment

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

log "🚀 Démarrage de PostgreSQL/PostGIS, Redis, API et Harvester..."
STARTED=1
"${COMPOSE[@]}" -f "$COMPOSE_FILE" up --build -d

health_ok() {
  local body
  body="$(curl -fsS --max-time 2 "http://127.0.0.1:${API_PORT}/health" 2>/dev/null)" || return 1
  [[ "$body" =~ \"status\"[[:space:]]*:[[:space:]]*\"ok\" ]]
}

report_failure() {
  printf '\n⚠️ Service défaillant.\n\nÉtat des services :\n\n'
  "${COMPOSE[@]}" -f "$COMPOSE_FILE" ps || true
  printf '\nJournaux récents (tous les services) :\n\n'
  "${COMPOSE[@]}" -f "$COMPOSE_FILE" logs --tail 40 || true
  die "Corrigez l'erreur ci-dessus puis relancez ./start.sh."
}

HEALTH_TIMEOUT="${API_HEALTH_TIMEOUT:-300}"
HEALTH_INTERVAL=2
HEALTH_TICKS=$(( HEALTH_TIMEOUT / HEALTH_INTERVAL ))
printf '⏳ Attente de l’API sur http://127.0.0.1:%s/health (max %s s)' "$API_PORT" "$HEALTH_TIMEOUT"
for _ in $(seq 1 "$HEALTH_TICKS"); do
  health_ok && { echo ' ✔'; break; }
  printf '.'; sleep "$HEALTH_INTERVAL"
done
health_ok || report_failure
if "${COMPOSE[@]}" -f "$COMPOSE_FILE" ps 2>/dev/null | grep -i 'harvester' | grep -qiE 'exited|dead|created'; then
  report_failure
fi

log "📱 Interface universelle : w = Web (SPA), a = Android, i = iOS"
log "🛑 Ctrl-C pour arrêter Expo et l'infrastructure."
cd "$SCRIPT_DIR/frontend"
npx expo start -c --port "$PORT"
