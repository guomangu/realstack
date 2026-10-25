#!/usr/bin/env bash
# Bootstrap automatique des dépendances système (sourcé par start.sh).
set -euo pipefail

declare -F log >/dev/null 2>&1 || log() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
declare -F die >/dev/null 2>&1 || die() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# Élévation testée : root, sudo -n, sudo interactif, pkexec, doas.
run_root() {
  if [ "$(id -u)" -eq 0 ]; then "$@"
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then sudo -n "$@"
  elif command -v sudo >/dev/null 2>&1 && [ -t 0 ]; then
    log "🔐 Droits administrateur requis pour installer les paquets manquants."
    if sudo "$@"; then return 0; fi
    if command -v pkexec >/dev/null 2>&1 && { [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; }; then pkexec "$@"; else return 1; fi
  elif command -v pkexec >/dev/null 2>&1 && { [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; }; then pkexec "$@"
  elif command -v doas >/dev/null 2>&1; then doas "$@"
  else die "Droits administrateur indisponibles. Relancez avec sudo ./start.sh ou installez manuellement les paquets requis."
  fi
}

node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  [ "${major:-0}" -ge 20 ] 2>/dev/null
}

compose_ok() {
  command -v podman-compose >/dev/null 2>&1 && podman-compose version >/dev/null 2>&1 && return 0
  command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1
}

install_packages() {
  local pkgs=("$@")
  if command -v dnf >/dev/null 2>&1; then run_root dnf install -y "${pkgs[@]}"
  elif command -v apt-get >/dev/null 2>&1; then
    run_root env DEBIAN_FRONTEND=noninteractive apt-get update -y
    run_root env DEBIAN_FRONTEND=noninteractive apt-get install -y "${pkgs[@]}"
  elif command -v pacman >/dev/null 2>&1; then run_root pacman -S --needed --noconfirm "${pkgs[@]}"
  elif command -v zypper >/dev/null 2>&1; then run_root zypper --non-interactive install -y "${pkgs[@]}"
  else die "Gestionnaire de paquets non reconnu. Installez manuellement : ${pkgs[*]}"
  fi
}

# Fedora 44 utilise nodejs22 ; les autres distributions utilisent nodejs.
install_node() {
  if command -v dnf >/dev/null 2>&1; then
    run_root dnf install -y nodejs npm >/dev/null 2>&1 && return 0
    run_root dnf install -y nodejs22 nodejs22-npm >/dev/null 2>&1 && return 0
    run_root dnf install -y nodejs20 nodejs20-npm
  else
    install_packages nodejs npm
  fi
}

ensure_dependencies() {
  local missing=() pkgs=()
  local -A seen=()
  local item need_node=0

  command -v curl >/dev/null 2>&1 || missing+=(curl)
  command -v podman >/dev/null 2>&1 || missing+=(podman)
  compose_ok || missing+=(podman-compose)
  node_ok || need_node=1
  { command -v npm && command -v npx; } >/dev/null 2>&1 || need_node=1

  if [ "${#missing[@]}" -eq 0 ] && [ "$need_node" -eq 0 ]; then
    log "✅ Dépendances système présentes (Podman, Node 20+, npm, curl)."
    return 0
  fi

  log "⚙️ Installation automatique des dépendances manquantes..."
  if [ "$need_node" -eq 1 ]; then install_node || die "Échec de l'installation de Node.js 20+."; fi
  for item in "${missing[@]}"; do
    [ -n "${seen[$item]:-}" ] || { seen[$item]=1; pkgs+=("$item"); }
  done
  if [ "${#pkgs[@]}" -gt 0 ]; then install_packages "${pkgs[@]}" || die "Installez manuellement : ${pkgs[*]}"; fi
  hash -r
  command -v podman >/dev/null 2>&1 || die "Podman introuvable après installation."
  compose_ok || die "podman-compose introuvable après installation."
  node_ok || die "Node.js 20+ requis (Debian/Ubuntu : utilisez NodeSource ou nvm)."
  { command -v npm && command -v npx; } >/dev/null 2>&1 || die "npm/npx introuvable après installation."
  command -v curl >/dev/null 2>&1 || die "curl introuvable après installation."
  log "✅ Dépendances système installées et vérifiées."
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then ensure_dependencies; fi
