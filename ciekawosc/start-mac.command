#!/usr/bin/env bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nie jest zainstalowany. Pobierz z https://nodejs.org (LTS) i uruchom ponownie."
  read -p "Naciśnij Enter, aby zamknąć…"
  exit 1
fi
echo "Uruchamiam serwer CIEKAWOŚĆ… przeglądarka otworzy się sama."
node server.js
