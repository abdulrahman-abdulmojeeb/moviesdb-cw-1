#!/bin/bash
set -e

# ── Config ──────────────────────────────────────────────────────────
TOTAL_STEPS=7
CURRENT_STEP=0
LOG="/tmp/moviesdb-setup.log"
BAR_WIDTH=30
SYNC_SERVER="${SYNC_SERVER:-https://comp22-cw.marlin.im}"

> "$LOG"  # truncate log

# ── Colors ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
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

# ── Banner ──────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}MoviesDB Setup${RESET}"
echo ""

# ── Step 1: .env ────────────────────────────────────────────────────
step "Create .env from template"
if [ ! -f .env ]; then
    cp .env.example .env >> "$LOG" 2>&1
fi
done_step

# ── Step 2: MovieLens dataset ───────────────────────────────────────
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

# ── Step 3: Build & start containers ───────────────────────────────
step "Build and start containers"
docker compose up -d --build >> "$LOG" 2>&1 || fail_step

# Wait for API health
MAX_RETRIES=30
RETRY_COUNT=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "API failed to start after $MAX_RETRIES attempts" >> "$LOG"
        fail_step
    fi
    sleep 2
done
done_step

# ── Step 4: Load MovieLens data ────────────────────────────────────
step "Load MovieLens data"
docker exec moviesdb-api python scripts/load_movielens.py --data-dir /app/data >> "$LOG" 2>&1 || fail_step
done_step

# ── Step 5: Generate personality profiles ───────────────────────────
step "Generate personality profiles"
docker exec moviesdb-api python scripts/generate_personality.py >> "$LOG" 2>&1 || fail_step
done_step

# ── Step 6: Sync enrichment data ───────────────────────────────────
step "Sync enrichment data from server"
if docker exec moviesdb-api python scripts/sync_enrichment.py --server "$SYNC_SERVER" >> "$LOG" 2>&1; then
    done_step
else
    printf "\r\033[K  ${RED}⚠${RESET}  %s ${DIM}(server unreachable – skipped)${RESET}\n" "$STEP_NAME"
fi

# ── Step 7: Create default user ────────────────────────────────────
step "Create default user"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:8000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"comp22","email":"admin@moviesdb.local","invite_token":"b89c7ef625663c6d6e7d4e76dedb6d3e"}')

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
