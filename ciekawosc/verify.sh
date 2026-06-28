#!/usr/bin/env bash
# ============================================================
#  System CIEKAWOŚĆ — verify / destylacja
#  Uruchamiaj okresowo (np. co 10 cykli) albo ręcznie.
#  Nie generuje nowych pytań — porządkuje i ocenia to, co jest.
# ============================================================

set -euo pipefail
cd "$(dirname "$0")"

FLAGI=(--dangerously-skip-permissions)
[ -n "${MODEL:-}" ] && FLAGI+=(--model "$MODEL")

PROMPT='Tryb DESTYLACJI (nie generuj nowych pytań). Wykonaj:
1. Przejrzyj wszystkie pliki w wiedza/ oraz indeks.md.
2. Każdy wątek oceń bezwzględnie: czy faktycznie coś przesunął, czy to wypełniacz.
   Wątki wypełniaczowe oznacz [SŁABY] w indeks.md z jednozdaniowym uzasadnieniem.
3. Wątki, których wszystkie gałęzie mają napięcie <= 2, oznacz [WYCZERPANY].
4. Wyłów 3–7 NAJMOCNIEJSZYCH pojedynczych wniosków z całej bazy — takich, które
   realnie zmieniają percepcję — i zapisz/zaktualizuj plik najlepsze.md:
   każdy wniosek = pytanie + jedno-akapitowa esencja + znacznik epistemiczny.
5. Jeśli widzisz dwa wątki, które się nieoczekiwanie zazębiają, dopisz w
   najlepsze.md sekcję "Mosty" z jednym zdaniem o tym połączeniu.
Bądź surowy. Lepiej mniej, ale mocnych.'

echo "▶ Destylacja bazy wiedzy…"
claude -p "$PROMPT" "${FLAGI[@]}"
echo "■ Gotowe. Zobacz najlepsze.md"
