#!/bin/bash
# ============================================================
#  MedSage — Unified Project Startup Script
#  Usage:  ./start.sh          (starts both backend + frontend)
#          ./start.sh backend  (starts only backend)
#          ./start.sh frontend (starts only frontend)
#          ./start.sh stop     (kills both servers)
# ============================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
VENV_DIR="$BACKEND_DIR/venv"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}  ⚕  MedSage — AI Doctor Agent${NC}"
  echo -e "${CYAN}  ─────────────────────────────────${NC}"
  echo ""
}

stop_servers() {
  echo -e "${BLUE}▸ Stopping existing servers...${NC}"
  lsof -ti :8000 | xargs kill -9 2>/dev/null && echo "  ✓ Backend (port 8000) stopped" || echo "  · Backend not running"
  lsof -ti :3000 | xargs kill -9 2>/dev/null && echo "  ✓ Frontend (port 3000) stopped" || echo "  · Frontend not running"
}

check_env() {
  if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}✗ Missing .env file in project root${NC}"
    exit 1
  fi
  if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "${RED}✗ Missing .env.local in frontend/${NC}"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Environment files found${NC}"
}

start_backend() {
  echo -e "${BLUE}▸ Starting Backend...${NC}"

  # Activate virtual environment
  if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
    echo -e "${GREEN}  ✓ Virtual environment activated ($(python --version))${NC}"
  else
    echo -e "${RED}  ✗ No venv found at $VENV_DIR${NC}"
    echo -e "${RED}    Run: python3 -m venv $VENV_DIR && pip install -r $BACKEND_DIR/requirements.txt${NC}"
    exit 1
  fi

  # Quick dep check — install any missing packages silently
  pip install -r "$BACKEND_DIR/requirements.txt" --quiet 2>/dev/null &

  cd "$BACKEND_DIR"
  uvicorn app.main:app --reload --port 8000 &
  BACKEND_PID=$!
  echo -e "${GREEN}  ✓ Backend running on http://localhost:8000 (PID: $BACKEND_PID)${NC}"
}

start_frontend() {
  echo -e "${BLUE}▸ Starting Frontend...${NC}"
  cd "$FRONTEND_DIR"

  # Quick dep check
  if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}  ▸ Installing npm packages...${NC}"
    npm install --silent
  fi

  npm run dev &
  FRONTEND_PID=$!
  echo -e "${GREEN}  ✓ Frontend running on http://localhost:3000 (PID: $FRONTEND_PID)${NC}"
}

# ── Main ──────────────────────────────────────────────────

banner

case "${1:-all}" in
  stop)
    stop_servers
    echo -e "\n${GREEN}${BOLD}All servers stopped.${NC}\n"
    exit 0
    ;;
  backend)
    stop_servers
    check_env
    start_backend
    echo -e "\n${GREEN}${BOLD}Backend is ready!${NC}\n"
    wait
    ;;
  frontend)
    start_frontend
    echo -e "\n${GREEN}${BOLD}Frontend is ready!${NC}\n"
    wait
    ;;
  all|"")
    stop_servers
    sleep 1
    check_env
    start_backend
    start_frontend
    echo ""
    echo -e "${GREEN}${BOLD}  ✅ MedSage is fully running!${NC}"
    echo -e "  ${CYAN}Backend:  ${NC}http://localhost:8000"
    echo -e "  ${CYAN}Frontend: ${NC}http://localhost:3000"
    echo -e "  ${CYAN}API Docs: ${NC}http://localhost:8000/docs"
    echo ""
    echo -e "  Press ${BOLD}Ctrl+C${NC} to stop all servers."
    echo ""
    wait
    ;;
  *)
    echo "Usage: ./start.sh [backend|frontend|stop|all]"
    exit 1
    ;;
esac
