#!/usr/bin/env bash
set -euo pipefail

# ─── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[Stockview]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PORT=8000
FRONTEND_PORT=5173

# ─── Cleanup on exit ──────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  log "Shutting down…"
  [ -n "$BACKEND_PID"  ] && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  ok "Goodbye!"
}
trap cleanup INT TERM EXIT

# ─── Dependency checks ────────────────────────────────────────────────────────
log "Checking dependencies…"

command -v python3 &>/dev/null || die "Python 3 is required. Download from https://python.org"
command -v node    &>/dev/null || die "Node.js is required. Download from https://nodejs.org"
command -v npm     &>/dev/null || die "npm is required (comes with Node.js)."

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
NODE_VERSION=$(node --version)
ok "Python $PYTHON_VERSION  |  Node $NODE_VERSION"

# ─── Backend setup ────────────────────────────────────────────────────────────
log "Setting up backend…"
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
  log "Creating Python virtual environment…"
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

log "Installing Python dependencies (this may take a minute the first time)…"
pip install -q --upgrade pip
pip install -q -r requirements.txt
ok "Backend dependencies ready."

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  cp .env.example .env
  # Generate a random secret key
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/change-this-to-a-long-random-string-in-production/$SECRET/" .env
  else
    sed -i "s/change-this-to-a-long-random-string-in-production/$SECRET/" .env
  fi
  ok ".env created with a generated secret key."
fi

# Start backend
log "Starting backend on port ${BACKEND_PORT}..."
python main.py &
BACKEND_PID=$!

# Wait for backend to become ready
for i in $(seq 1 20); do
  if curl -sf "http://localhost:${BACKEND_PORT}/api/health" &>/dev/null; then
    ok "Backend is up!"
    break
  fi
  sleep 1
  if [ "$i" -eq 20 ]; then
    die "Backend failed to start after 20s. Check for errors above."
  fi
done

# ─── Frontend setup ───────────────────────────────────────────────────────────
log "Setting up frontend…"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  log "Installing Node.js dependencies (this may take a minute)…"
  npm install --silent
fi
ok "Frontend dependencies ready."

log "Starting frontend on port ${FRONTEND_PORT}..."
npm run dev -- --port "${FRONTEND_PORT}" &
FRONTEND_PID=$!

# Wait briefly then open browser
sleep 3
URL="http://localhost:${FRONTEND_PORT}"

log "Attempting to open browser to $URL..."
if command -v open &>/dev/null; then
  open "$URL" || python3 -m webbrowser "$URL"
else
  python3 -m webbrowser "$URL"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Stockview is running! 🚀        ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Frontend → ${BLUE}http://localhost:${FRONTEND_PORT}${NC}       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Backend  → ${BLUE}http://localhost:${BACKEND_PORT}${NC}       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  API Docs → ${BLUE}http://localhost:${BACKEND_PORT}/docs${NC}   ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop."
echo ""

wait
