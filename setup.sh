#!/bin/bash
set -e

# ── Config ──────────────────────────────────────────────────────────
TOTAL_STEPS=10
CURRENT_STEP=0
LOG="/tmp/moviesdb-setup.log"
BAR_WIDTH=30
SYNC_SERVER="${SYNC_SERVER:-https://comp22-cw.marlin.im}"
SUB_STATUS=""

> "$LOG"  # truncate log

# ── Colors ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ── Helpers ─────────────────────────────────────────────────────────
bar() {
    local filled=$(( CURRENT_STEP * BAR_WIDTH / TOTAL_STEPS ))
    local empty=$(( BAR_WIDTH - filled ))
    printf "["
    printf "%0.s=" $(seq 1 $filled 2>/dev/null) || true
    [ $filled -lt $BAR_WIDTH ] && printf ">"
    [ $empty -gt 1 ] && printf "%0.s " $(seq 1 $(( empty - 1 )) 2>/dev/null)
    [ $empty -eq 0 ] && true  # bar full
    printf "]"
}

step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    STEP_NAME="$1"
    SUB_STATUS=""
    printf "\r\033[K  $(bar) ${DIM}%d/%d${RESET}  %s..." "$CURRENT_STEP" "$TOTAL_STEPS" "$STEP_NAME"
}

done_step() {
    printf "\r\033[K  ${GREEN}✔${RESET}  %s\n" "$STEP_NAME"
}

fail_step() {
    printf "\r\033[K  ${RED}✘${RESET}  %s\n" "$STEP_NAME"
    echo ""
    echo -e "  ${RED}Setup failed at step $CURRENT_STEP.${RESET} Check the log for details:"
    echo "  $LOG"
    echo ""
    tail -20 "$LOG" | sed 's/^/  /'
    exit 1
}

# Run a command, tee output to log, and parse progress lines to update status.
# Usage: run_with_status <pattern> <command> [args...]
#   pattern: a grep -oE regex to extract a progress token from stdout lines
#            use "" to skip progress parsing
run_with_status() {
    local pattern="$1"; shift

    if [ -z "$pattern" ]; then
        "$@" >> "$LOG" 2>&1
        return $?
    fi

    # Run command, tee to log, and parse progress lines
    "$@" 2>&1 | while IFS= read -r line; do
        echo "$line" >> "$LOG"
        # Try to extract progress info
        local match
        match=$(echo "$line" | grep -oE "$pattern" 2>/dev/null || true)
        if [ -n "$match" ]; then
            printf "\r\033[K  $(bar) ${DIM}%d/%d${RESET}  %s... ${DIM}%s${RESET}" \
                "$CURRENT_STEP" "$TOTAL_STEPS" "$STEP_NAME" "$match"
        fi
    done
    return "${PIPESTATUS[0]}"
}

# ── Banner ──────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}MoviesDB Setup${RESET}"
echo ""

# ── Pre-flight checks ──────────────────────────────────────────────
preflight_ok=true

if ! command -v docker &>/dev/null; then
    echo -e "  ${RED}✘${RESET}  Docker is required but not installed."
    echo -e "     Install it from ${BOLD}https://docs.docker.com/get-docker/${RESET}"
    preflight_ok=false
fi

if [ "$preflight_ok" = true ] && ! docker info &>/dev/null; then
    echo -e "  ${RED}✘${RESET}  Docker Desktop is not running."
    echo -e "     Please start it and re-run ${BOLD}./setup.sh${RESET}"
    preflight_ok=false
fi

if ! command -v curl &>/dev/null; then
    echo -e "  ${RED}✘${RESET}  ${BOLD}curl${RESET} is required but not found."
    preflight_ok=false
fi

if ! command -v unzip &>/dev/null; then
    echo -e "  ${RED}✘${RESET}  ${BOLD}unzip${RESET} is required but not found."
    preflight_ok=false
fi

if [ "$preflight_ok" = false ]; then
    echo ""
    exit 1
fi

# ── Step 1: .env ────────────────────────────────────────────────────
step "Create .env from template"
if [ ! -f .env ]; then
    cp .env.example .env >> "$LOG" 2>&1
fi
done_step

# ── Step 2: MovieLens dataset ──────────────────────────────────────
step "Download MovieLens dataset"
DATA_DIR="./data"
ML_DIR="$DATA_DIR/ml-latest-small"
if [ ! -d "$ML_DIR" ]; then
    mkdir -p "$DATA_DIR"
    curl -sL -o "$DATA_DIR/ml-latest-small.zip" \
        "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip" >> "$LOG" 2>&1 || fail_step
    unzip -o "$DATA_DIR/ml-latest-small.zip" -d "$DATA_DIR" >> "$LOG" 2>&1 || fail_step
    rm -f "$DATA_DIR/ml-latest-small.zip"
fi
done_step

# ── Step 3: Build images ──────────────────────────────────────────
step "Build Docker images"
run_with_status "Step [0-9]+/[0-9]+" docker compose build || fail_step
done_step

# ── Step 4: Start containers ──────────────────────────────────────
step "Start containers"
docker compose up -d >> "$LOG" 2>&1 || fail_step

# Wait for API health
MAX_RETRIES=30
RETRY_COUNT=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "API failed to start after $MAX_RETRIES attempts" >> "$LOG"
        fail_step
    fi
    printf "\r\033[K  $(bar) ${DIM}%d/%d${RESET}  %s... ${DIM}waiting for API (%d/%d)${RESET}" \
        "$CURRENT_STEP" "$TOTAL_STEPS" "$STEP_NAME" "$RETRY_COUNT" "$MAX_RETRIES"
    sleep 2
done
done_step

# ── Step 5: Load movies & genres ──────────────────────────────────
step "Load movies & genres"
run_with_status "Inserting [0-9]+ (movies|genres|movie-genre)" \
    docker exec moviesdb-api python scripts/load_movielens.py --data-dir /app/data --step movies || fail_step
done_step

# ── Step 6: Load ratings ─────────────────────────────────────────
step "Load ratings"
run_with_status "Processed [0-9]+/[0-9]+" \
    docker exec moviesdb-api python scripts/load_movielens.py --data-dir /app/data --step ratings || fail_step
done_step

# ── Step 7: Load tags, links & personality ────────────────────────
step "Load tags, links & personality"
run_with_status "Inserting [0-9]+ (tags|movie links|personality)" \
    docker exec moviesdb-api python scripts/load_movielens.py --data-dir /app/data --step extras || fail_step
done_step

# ── Step 8: Generate personality profiles ─────────────────────────
step "Generate personality profiles"
run_with_status "Processing user [0-9]+" \
    docker exec moviesdb-api python scripts/generate_personality.py || fail_step
done_step

# ── Step 9: Sync enrichment data ─────────────────────────────────
step "Sync enrichment data from server"
DUMP=$(curl -sf "$SYNC_SERVER/api/movies/export/enrichment.sql" 2>>"$LOG") && \
    echo "$DUMP" | docker exec -i moviesdb-postgres psql -U moviesdb -d moviesdb --quiet >> "$LOG" 2>&1
if [ $? -eq 0 ] && [ -n "$DUMP" ]; then
    done_step
else
    printf "\r\033[K  ${YELLOW}⚠${RESET}  %s ${DIM}(server unreachable – skipped)${RESET}\n" "$STEP_NAME"
fi

# ── Step 10: Create default user ──────────────────────────────────
step "Create default user"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:8000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"comp22","invite_token":"b89c7ef625663c6d6e7d4e76dedb6d3e"}')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "400" ]; then
    done_step
else
    echo "Register returned HTTP $HTTP_CODE" >> "$LOG"
    fail_step
fi

# ── Done ────────────────────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}${BOLD}Setup Complete${RESET}"
echo ""
echo -e "  Frontend   ${BOLD}http://localhost:5173${RESET}"
echo -e "  API Docs   ${BOLD}http://localhost:8000/docs${RESET}"
echo ""
echo -e "  Default login"
echo -e "  Username   ${BOLD}admin${RESET}"
echo -e "  Password   ${BOLD}comp22${RESET}"
echo ""
