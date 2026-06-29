#!/usr/bin/env bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nie jest zainstalowany. Zainstaluj (np. sudo apt install nodejs) i uruchom ponownie."
  exit 1
fi
echo "Uruchamiam serwer CIEKAWOŚĆ… przeglądarka otworzy się sama."
node server.js
