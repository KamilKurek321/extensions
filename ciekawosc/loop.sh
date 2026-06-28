#!/usr/bin/env bash
# ============================================================
#  System CIEKAWOŚĆ — silnik pętli
#  Pętla jest głupia. Mózg jest w CLAUDE.md.
# ============================================================

set -euo pipefail
cd "$(dirname "$0")"

# --- konfiguracja ---
MAX_CYKLI="${1:-0}"        # 0 = bez końca; albo podaj liczbę: ./loop.sh 20
PRZERWA="${PRZERWA:-5}"    # sekundy między cyklami
MODEL="${MODEL:-}"         # opcjonalnie: MODEL=opus ./loop.sh

# --- inicjalizacja plików stanu (jeśli brak) ---
[ -f indeks.md ]   || printf '# Indeks wątków\n\n| Wątek | Domena | Status | Otwarte gałęzie (napięcie) |\n|---|---|---|---|\n' > indeks.md
[ -f dziennik.md ] || printf '# Dziennik iteracji\n\n' > dziennik.md
mkdir -p wiedza

# --- flagi claude ---
FLAGI=(--dangerously-skip-permissions)
[ -n "$MODEL" ] && FLAGI+=(--model "$MODEL")

PROMPT='Wykonaj DOKŁADNIE JEDEN cykl ciekawości zgodnie z protokołem w CLAUDE.md.
Przeczytaj indeks.md, zdecyduj o wątku, postaw pytanie, przepuść je przez filtr
anty-trywialności, podrąż ze znacznikami epistemicznymi, rozgałęź, oceń sam siebie,
zapisz pliki. Nie pytaj mnie o nic. Po jednym zapisie — zakończ.'

licznik=0
echo "▶ CIEKAWOŚĆ startuje. Ctrl-C aby zatrzymać."
while true; do
  licznik=$((licznik+1))
  echo "─────────────────────────────────────────────"
  echo "● Cykl #$licznik — $(date '+%H:%M:%S')"

  if ! claude -p "$PROMPT" "${FLAGI[@]}"; then
    echo "⚠ Cykl #$licznik nie powiódł się — przerwa i próba dalej."
  fi

  if [ "$MAX_CYKLI" -gt 0 ] && [ "$licznik" -ge "$MAX_CYKLI" ]; then
    echo "■ Osiągnięto limit $MAX_CYKLI cykli. Koniec."
    break
  fi
  sleep "$PRZERWA"
done
