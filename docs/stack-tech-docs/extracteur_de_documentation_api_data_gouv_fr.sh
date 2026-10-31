#!/usr/bin/env bash

# ==============================================================================
# Script : extracteur_de_documentation_api_data_gouv_fr.sh
# Description : Récupère l'intégralité des documentations des API (dataservices)
#               référencées sur data.gouv.fr, extrait leurs métadonnées en JSON,
#               génère une fiche Markdown par API et télécharge les schémas
#               OpenAPI / Swagger lorsqu'ils sont disponibles.
# Dépendances : curl, jq (iconv optionnel)
# Usage : ./extracteur_de_documentation_api_data_gouv_fr.sh [OPTIONS]
# ==============================================================================

# Ce script utilise des fonctionnalités bash ([[ ]], tableaux, <(...)).
# Si on le lance avec `sh script.sh` (dash sur Debian/Ubuntu), on se ré-exécute
# automatiquement avec bash pour éviter les erreurs "[[ : commande introuvable".
if [ -z "${BASH_VERSION:-}" ]; then
    exec bash "$0" "$@"
fi

set -euo pipefail

# --- Configuration par défaut ---

OUT_DIR="./data-gouv-apis"
BASE_URL="https://www.data.gouv.fr/api/1/dataservices/?page_size=100"
USER_AGENT="Documentation-Downloader/1.0 (getdocsapi.sh)"
DOWNLOAD_SPECS=true
FILTER_GOUV_ONLY=false
TIMEOUT_SPEC=10
SLEEP_MS="0.15"
MAX_PAGES=500

# --- Couleurs pour le terminal (uniquement si la sortie est un terminal) ---

if [ -t 1 ]; then
    RED=$'\033[0;31m'
    GREEN=$'\033[0;32m'
    YELLOW=$'\033[1;33m'
    BLUE=$'\033[0;34m'
    NC=$'\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# --- Affichage de l'aide ---

usage() {
    cat <<EOF
Usage: ${0##*/} [OPTIONS]

Options:
  -o, --output DIR     Répertoire de sortie (défaut: ${OUT_DIR})
      --no-specs       Ne pas télécharger les fichiers OpenAPI/Swagger distants
      --gouv-only      Filtrer uniquement les API gouvernementales
                       (.gouv.fr / ministères / agences)
  -h, --help           Afficher cette aide
EOF
    exit 0
}

# --- Analyse des arguments ---

while [ $# -gt 0 ]; do
    case "$1" in
        -o|--output)
            if [ $# -lt 2 ] || [ -z "${2:-}" ]; then
                printf '%sErreur : l'\''option %s requiert un répertoire.%s\n' "$RED" "$1" "$NC" >&2
                exit 2
            fi
            OUT_DIR="$2"
            shift 2
            ;;
        --no-specs)
            DOWNLOAD_SPECS=false
            shift
            ;;
        --gouv-only)
            FILTER_GOUV_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            printf '%sOption inconnue : %s%s\n\n' "$RED" "$1" "$NC" >&2
            usage
            ;;
    esac
done

# --- Vérification des prérequis ---

for cmd in curl jq; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        printf '%sErreur : La commande '\''%s'\'' est requise mais n'\''est pas installée.%s\n' "$RED" "$cmd" "$NC" >&2
        printf 'Installez-la avec : sudo apt install %s (Debian/Ubuntu) ou brew install %s (macOS)\n' "$cmd" "$cmd" >&2
        exit 1
    fi
done

# --- Fonction de création d'un slug propre ---

slugify() {
    local text="$1"
    local result=""

    if command -v iconv >/dev/null 2>&1; then
        result=$(printf '%s' "$text" | iconv -f UTF-8 -t ASCII//TRANSLIT 2>/dev/null || true)
    fi
    if [ -z "$result" ]; then
        result="$text"
    fi

    result=$(printf '%s' "$result" \
        | tr '[:upper:]' '[:lower:]' \
        | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
        | cut -c 1-50)

    printf '%s' "$result"
}

# --- Initialisation des répertoires ---

mkdir -p "$OUT_DIR/apis"
TMP_PAGES_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'datagouv_pages')

# Nettoyage automatique du dossier temporaire à la sortie du script
cleanup() {
    rm -rf "$TMP_PAGES_DIR"
}
trap cleanup EXIT INT TERM

printf '%s==================================================================%s\n' "$BLUE" "$NC"
printf '%s  Démarrage du scan des API (dataservices) sur data.gouv.fr...   %s\n' "$BLUE" "$NC"
printf '%s==================================================================%s\n' "$BLUE" "$NC"

# --- 1. Récupération paginée de toutes les API ---

next_url="$BASE_URL"
previous_url=""
page=1

while [ -n "$next_url" ] && [ "$next_url" != "null" ]; do
    if [ "$next_url" = "$previous_url" ]; then
        printf '%sLa pagination renvoie une URL identique, arrêt pour éviter une boucle infinie.%s\n' "$YELLOW" "$NC" >&2
        break
    fi
    if [ "$page" -gt "$MAX_PAGES" ]; then
        printf '%sLimite de %d pages atteinte, arrêt.%s\n' "$YELLOW" "$MAX_PAGES" "$NC" >&2
        break
    fi

    printf '%s[Page %2d]%s Téléchargement depuis %s...\n' "$YELLOW" "$page" "$NC" "$next_url"
    page_file="$TMP_PAGES_DIR/page_${page}.json"

    http_code=$(curl -sS -L \
        --retry 3 --retry-delay 2 --retry-connrefused \
        --max-time 120 \
        -A "$USER_AGENT" \
        -H "Accept: application/json" \
        -w '%{http_code}' \
        -o "$page_file" \
        "$next_url" 2>/dev/null </dev/null || true)

    http_code=${http_code:-000}
    case "$http_code" in
        *[!0-9]*|'') http_code=000 ;;
    esac

    if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
        printf '%sErreur HTTP %s lors de la récupération de %s%s\n' "$RED" "$http_code" "$next_url" "$NC" >&2
        rm -f "$page_file"
        break
    fi

    if ! jq -e . "$page_file" >/dev/null 2>&1; then
        printf '%sRéponse JSON invalide pour %s%s\n' "$RED" "$next_url" "$NC" >&2
        rm -f "$page_file"
        break
    fi

    # Extraire uniquement le tableau .data de cette page pour la fusion finale
    jq '.data // []' "$page_file" > "$TMP_PAGES_DIR/data_${page}.json"

    # Récupérer l'URL de la page suivante
    previous_url="$next_url"
    next_url=$(jq -r '.next_page // empty' "$page_file" 2>/dev/null || true)

    if [ -n "$next_url" ] && [ "$next_url" != "null" ]; then
        # Pause de courtoisie (150 ms) pour respecter l'infrastructure data.gouv.fr
        sleep "$SLEEP_MS" 2>/dev/null || sleep 1
    fi

    page=$((page + 1))
done

# Vérifier qu'au moins une page a été récupérée

shopt -s nullglob
data_files=("$TMP_PAGES_DIR"/data_*.json)
shopt -u nullglob

if [ "${#data_files[@]}" -eq 0 ]; then
    printf '%sAucune donnée n'\''a pu être récupérée depuis l'\''API data.gouv.fr.%s\n' "$RED" "$NC" >&2
    exit 1
fi

# --- 2. Consolidation et sauvegarde des fichiers JSON globaux ---

RAW_DUMP_FILE="$OUT_DIR/all_dataservices_dump.json"
DOCS_DUMP_FILE="$OUT_DIR/all_apis_documentation.json"

printf '\n%s[Consolidation]%s Fusion des pages JSON...\n' "$BLUE" "$NC"

if [ "$FILTER_GOUV_ONLY" = true ]; then
    printf '%s[Filtre actif]%s Conservation uniquement des API en '\''.gouv.fr'\'' ou ministérielles...\n' "$YELLOW" "$NC"
    # NB : .self_web_url pointe toujours sur data.gouv.fr, il est donc exclu
    # du filtre (sinon toutes les API seraient retenues).
    jq -s 'map(select(type == "array")) | add // [] | map(select(
        ((.base_api_url // "") | tostring | test("gouv\\.fr"; "i")) or
        ((.technical_documentation_url // "") | tostring | test("gouv\\.fr"; "i")) or
        ((.business_documentation_url // "") | tostring | test("gouv\\.fr"; "i")) or
        ((.machine_documentation_url // "") | tostring | test("gouv\\.fr"; "i")) or
        ((.organization.name? // "") | tostring | test("minist|état|direction|agence|service public|préfecture|insee|gouv"; "i")) or
        ((.organization.slug? // "") | tostring | test("minist|direction|agence|prefecture|gouv"; "i")) or
        (any((.organization.badges // [])[]?; (.kind // "") == "public-service"))
    ))' "${data_files[@]}" > "$RAW_DUMP_FILE"
else
    jq -s 'map(select(type == "array")) | add // []' "${data_files[@]}" > "$RAW_DUMP_FILE"
fi

total_services=$(jq 'length' "$RAW_DUMP_FILE")

if [ "$total_services" -eq 0 ]; then
    printf '%sAucune API ne correspond aux critères.%s\n' "$YELLOW" "$NC" >&2
    exit 0
fi

printf '%sTotal d'\''API récupérées : %s%s\n' "$GREEN" "$total_services" "$NC"

# Création d'un fichier JSON structuré dédié aux documentations et métadonnées clés

printf '%s[Extraction JSON]%s Génération du catalogue consolidé : %s\n' "$BLUE" "$NC" "$DOCS_DUMP_FILE"
jq 'map({
    id: .id,
    title: .title,
    slug: .slug,
    organization: (.organization.name? // null),
    description: (.description // "Aucune description fournie."),
    base_api_url: (.base_api_url // null),
    machine_documentation_url: (.machine_documentation_url // null),
    technical_documentation_url: (.technical_documentation_url // null),
    business_documentation_url: (.business_documentation_url // null),
    self_web_url: (.self_web_url // null),
    self_api_url: (.self_api_url // null),
    license: (.license // null),
    access_type: (.access_type // null),
    created_at: (.created_at // null),
    metadata_modified_at: (.metadata_modified_at // null),
    contact_points: (.contact_points // []),
    tags: (.tags // []),
    badges: (.badges // []),
    extras: (.extras // {})
})' "$RAW_DUMP_FILE" > "$DOCS_DUMP_FILE"

# --- 3. Extraction individuelle par API (JSON + Markdown + OpenAPI/Swagger) ---

printf '\n%s[Traitement individuel]%s Extraction des fiches JSON, Markdown et schémas OpenAPI par service...\n' "$BLUE" "$NC"

current_idx=0
errors_count=0
specs_downloaded=0
specs_skipped=0

# Lecture ligne par ligne de chaque objet API au format JSON compact (ndjson)
while IFS= read -r service_json; do
    [ -n "$service_json" ] || continue
    current_idx=$((current_idx + 1))

    # Extraction sécurisée de l'ID et du titre
    id=$(jq -r '.id // "unknown"' <<< "$service_json" 2>/dev/null || echo "unknown")
    title=$(jq -r '.title // "service"' <<< "$service_json" 2>/dev/null || echo "service")

    # Le slug du titre est tronqué, mais l'ID complet est conservé après le
    # tiret : sans lui, deux API de même titre écraseraient le même dossier.
    title_slug=$(slugify "$title")
    if [ -z "$title_slug" ]; then
        title_slug="service"
    fi
    title_slug=$(printf '%s' "${title_slug:0:40}" | sed -E 's/-+$//')
    if [ -z "$title_slug" ]; then
        title_slug="service"
    fi

    if [ -n "$id" ] && [ "$id" != "unknown" ]; then
        unique_id="$id"
    else
        unique_id="idx-$current_idx"
    fi
    slug="${title_slug}-${unique_id}"

    service_dir="$OUT_DIR/apis/$slug"
    mkdir -p "$service_dir"

    # Affichage de la progression sur une seule ligne
    printf '\r  -> Traitement [%d/%d] : %-55s' "$current_idx" "$total_services" "${slug:0:52}"

    # 3.1 Construction de la fiche JSON normalisée
    doc_json=$(jq '{
        id: .id,
        title: .title,
        slug: .slug,
        description: (.description // null),
        organization: (.organization.name? // null),
        organization_slug: (.organization.slug? // null),
        organization_url: (.organization.page? // null),
        base_api_url: (.base_api_url // null),
        machine_documentation_url: (.machine_documentation_url // null),
        technical_documentation_url: (.technical_documentation_url // null),
        business_documentation_url: (.business_documentation_url // null),
        self_web_url: (.self_web_url // null),
        self_api_url: (.self_api_url // null),
        contact_points: (.contact_points // []),
        tags: (.tags // []),
        badges: (.badges // []),
        license: (.license // null),
        access_type: (.access_type // null),
        access_type_reason: (.access_type_reason // null),
        created_at: (.created_at // null),
        metadata_modified_at: (.metadata_modified_at // null),
        extras: (.extras // {})
    }' <<< "$service_json" 2>/dev/null) || doc_json=""

    if [ -z "$doc_json" ]; then
        errors_count=$((errors_count + 1))
        continue
    fi

    printf '%s\n' "$doc_json" > "$service_dir/doc.json"

    # 3.2 Téléchargement des spécifications OpenAPI / Swagger si activé
    spec_local_files=""
    if [ "$DOWNLOAD_SPECS" = true ]; then
        spec_urls=()
        while IFS= read -r line_url; do
            if [ -n "$line_url" ] && [ "$line_url" != "null" ]; then
                spec_urls+=("$line_url")
            fi
        done < <(jq -r '
            [
                (.machine_documentation_url // empty),
                ((.technical_documentation_url // "") | tostring
                    | select(test("swagger|openapi|\\.json($|\\?)|\\.ya?ml($|\\?)|/swagger|/openapi"; "i"))),
                ((.resources? // [])[]? | .url? // empty
                    | select(test("swagger|openapi|\\.json($|\\?)|\\.ya?ml($|\\?)"; "i")))
            ]
            | map(select(. != null and . != "" and (type == "string")))
            | unique | .[]
        ' <<< "$doc_json" 2>/dev/null || true)

        spec_count=0
        for spec_url in ${spec_urls[@]+"${spec_urls[@]}"}; do
            case "$spec_url" in
                http://*|https://*) ;;
                *) continue ;;
            esac

            tmp_spec="$service_dir/.spec_tmp"
            http_code=$(curl -sS -L \
                --max-time "$TIMEOUT_SPEC" \
                -A "$USER_AGENT" \
                -w '%{http_code}' \
                -o "$tmp_spec" \
                "$spec_url" 2>/dev/null </dev/null || true)

            http_code=${http_code:-000}
            case "$http_code" in
                *[!0-9]*|'') http_code=000 ;;
            esac

            if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ] || [ ! -s "$tmp_spec" ]; then
                rm -f "$tmp_spec"
                continue
            fi

            # Détermination du format réel (JSON valide ou YAML OpenAPI/Swagger)
            if jq -e . "$tmp_spec" >/dev/null 2>&1; then
                ext="json"
            elif grep -qiE '^[[:space:]]*(openapi|swagger)[[:space:]]*:' "$tmp_spec" 2>/dev/null; then
                ext="yaml"
            else
                # Ce n'est ni du JSON ni un schéma OpenAPI/Swagger : on ignore
                rm -f "$tmp_spec"
                specs_skipped=$((specs_skipped + 1))
                continue
            fi

            spec_count=$((spec_count + 1))
            if [ "$spec_count" -eq 1 ]; then
                target_spec="$service_dir/openapi.$ext"
            else
                target_spec="$service_dir/openapi_${spec_count}.$ext"
            fi

            mv -f "$tmp_spec" "$target_spec"
            specs_downloaded=$((specs_downloaded + 1))
            spec_local_files="${spec_local_files}- $(basename "$target_spec") (source : $spec_url)"$'\n'
        done
    fi

    # 3.3 Génération de la fiche README.md à partir du JSON normalisé
    readme=$(jq -r '
            def str: tostring;
            "# " + ((.title // "API sans titre") | str) + "\n\n" +
            "- **ID** : `" + ((.id // "inconnu") | str) + "`\n" +
            (if (.organization // null) != null then "- **Organisation** : " + (.organization | str) + "\n" else "" end) +
            (if (.base_api_url // null) != null then "- **Base URL** : " + (.base_api_url | str) + "\n" else "" end) +
            (if (.technical_documentation_url // null) != null then "- **Documentation technique** : " + (.technical_documentation_url | str) + "\n" else "" end) +
            (if (.business_documentation_url // null) != null then "- **Documentation métier** : " + (.business_documentation_url | str) + "\n" else "" end) +
            (if (.machine_documentation_url // null) != null then "- **Spécification (machine)** : " + (.machine_documentation_url | str) + "\n" else "" end) +
            (if (.self_web_url // null) != null then "- **Page data.gouv.fr** : " + (.self_web_url | str) + "\n" else "" end) +
            (if (.license // null) != null then "- **Licence** : " + (.license | str) + "\n" else "" end) +
            (if (.metadata_modified_at // null) != null then "- **Dernière modification** : " + (.metadata_modified_at | str) + "\n" else "" end) +
            (if ((.tags // []) | length) > 0 then "- **Tags** : " + (.tags | map(str) | join(", ")) + "\n" else "" end) +
            "\n## Description\n\n" +
            ((.description // "Aucune description fournie.") | str) + "\n" +
            (if ((.contact_points // []) | length) > 0 then
                "\n## Contacts\n\n" +
                (.contact_points | map(
                    "- " + ((.name // "Contact") | str) +
                    (if (.email // null) != null then " — " + (.email | str) else "" end)
                ) | join("\n")) + "\n"
            else "" end) +
            "\n## Spécifications OpenAPI / Swagger\n\n" +
            ([.machine_documentation_url, .technical_documentation_url]
                | map(select(. != null and . != ""))
                | map("- " + (tostring))
                | if length > 0 then join("\n") else "Aucune URL de spécification renseignée." end) + "\n"
        ' <<< "$doc_json" 2>/dev/null) || readme=""

    if [ -z "$readme" ]; then
        readme="# $title"
    fi

    {
        printf '%s\n' "$readme"
        if [ -n "$spec_local_files" ]; then
            printf '\n## Fichiers locaux\n\n%s' "$spec_local_files"
        fi
    } > "$service_dir/README.md"

done < <(jq -c '.[]' "$RAW_DUMP_FILE")

printf '\n\n'

printf '%s  Extraction terminée avec succès !                               %s\n' "$GREEN" "$NC"
if [ "$errors_count" -gt 0 ]; then
    printf '%s  Note : %d fiche(s) présentaient des anomalies mineures.%s\n' "$YELLOW" "$errors_count" "$NC"
fi
if [ "$DOWNLOAD_SPECS" = true ]; then
    printf '%s  Schémas OpenAPI téléchargés : %d (ignorés : %d)%s\n' "$GREEN" "$specs_downloaded" "$specs_skipped" "$NC"
fi
printf '%s------------------------------------------------------------------%s\n' "$GREEN" "$NC"
printf '  - Nombre d'\''API traitées     : %s\n' "$total_services"
printf '  - Dump brut complet          : %s%s%s\n' "$BLUE" "$RAW_DUMP_FILE" "$NC"
printf '  - Documentation JSON globale : %s%s%s\n' "$BLUE" "$DOCS_DUMP_FILE" "$NC"
printf '  - Dossiers par API           : %s%s/apis/<slug>/{doc.json, README.md, openapi.*}%s\n' "$BLUE" "$OUT_DIR" "$NC"
