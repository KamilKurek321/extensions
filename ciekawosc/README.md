# CIEKAWOŚĆ

Autonomiczna pętla, która sama zadaje sobie naprawdę ciekawe pytania i próbuje na nie uczciwie odpowiedzieć. Zamiast czekać na prompt — drąży rzeczywistość sama.

Filozofia jak w twoim ideation loop: **pętla jest głupia, mózg jest w `CLAUDE.md`.**

## Uruchomienie

Wymaga zainstalowanego Claude Code (`claude` w PATH).

```bash
chmod +x loop.sh verify.sh

./loop.sh            # pętla bez końca (Ctrl-C kończy)
./loop.sh 20         # dokładnie 20 cykli
PRZERWA=15 ./loop.sh # 15 s przerwy między cyklami
MODEL=opus ./loop.sh # wymuś model
```

Co kilkanaście cykli puść destylację — oceni i wyłowi najmocniejsze wnioski:

```bash
./verify.sh          # tworzy/odświeża najlepsze.md
```

## Dashboard

Wizualny podgląd stanu systemu — wątki, gałęzie z napięciem, bilans epistemiczny, dziennik. Serwer bez żadnych zależności (czysty Node ≥ 18):

```bash
node server.js              # http://localhost:4711
PORT=8080 node server.js    # inny port
```

Co daje:

- **Statystyki na żywo** — liczba wątków, otwartych, cykli, maks. napięcie + pasek bilansu `[USTALONE]/[WNIOSEK]/[SPEKULACJA]/[NIEWIADOMA]`.
- **Wątki** — rozwijane karty, każdy cykl z kolorowanymi znacznikami epistemicznymi, pytaniami wynikającymi (z flagą napięcia 1–5) i samooceną.
- **Zakładki** — Najlepsze (`najlepsze.md`), Dziennik (oś czasu), Ziarna (`seed.md`).
- **Sterowanie** — przyciski „▶ Cykl" i „⚗ Destyluj" odpalają `loop.sh` / `verify.sh`, jeśli `claude` jest w PATH na maszynie serwera (inaczej dashboard działa w trybie podglądu).
- Auto-odświeżanie co 15 s — uruchom `./loop.sh` w drugim terminalu i patrz, jak baza rośnie.

Dashboard tylko **czyta** te same pliki markdown, które są źródłem prawdy — niczego nie dubluje.

## Co gdzie

| Plik | Rola |
|---|---|
| `CLAUDE.md` | konstytucja — definicja ciekawego pytania, epistemika, protokół cyklu |
| `loop.sh` | silnik powtarzający |
| `verify.sh` | destylacja: ocena wątków + `najlepsze.md` |
| `server.js` | serwer dashboardu (Node, zero zależności) — parsuje pliki, serwuje UI + API |
| `public/` | frontend dashboardu (HTML/CSS/JS, bez frameworków) |
| `seed.md` | domeny do rotacji przy nowym korzeniu |
| `indeks.md` | rejestr wątków, gałęzi i napięć (stan systemu) |
| `dziennik.md` | log iteracji |
| `wiedza/` | wątki — po jednym pliku, każdy to drzewo pytań |

## Trzy bezpieczniki jakości

1. **Epistemika** — każde twierdzenie ze znacznikiem `[USTALONE] / [WNIOSEK] / [SPEKULACJA] / [NIEWIADOMA]`. System może zgadywać, nie może udawać pewności.
2. **Ciągłość** — drąży gałąź, gdzie napięcie rośnie; porzuca wypłaszczone. Celem są głębokie żyły, nie zbiór ciekawostek.
3. **Anty-trywialność** — twardy filtr odrzuca pytania definicyjne, do-wygooglowania i fałszywie głębokie.

`wiedza/001-smoki.md` to zasiany przykład — pokazuje docelowy poziom. Możesz go usunąć i zacząć od zera.
