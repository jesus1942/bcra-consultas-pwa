#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node no esta instalado."
  echo "En Manjaro podes instalarlo con: sudo pacman -S nodejs npm"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm no esta instalado."
  echo "En Manjaro podes instalarlo con: sudo pacman -S nodejs npm"
  exit 1
fi

cd "$PROJECT_DIR"

if [ ! -d node_modules ]; then
  echo "Instalando dependencias..."
  npm install
fi

echo "Lanzando app en modo desarrollo..."
echo "URL local: http://127.0.0.1:5173"
echo "URL en red local: http://0.0.0.0:5173"

exec npm run dev -- --host 0.0.0.0
