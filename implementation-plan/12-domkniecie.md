# Faza 12 — Domknięcie: testy, audyt i18n, dokumentacja

## Cel

Sprawdzić, że aplikacja jest kompletna wobec bazy wiedzy, i zostawić ją w stanie, do którego da się wrócić za pół roku. Żadnych nowych funkcji.

## Pliki

| Plik | Zmiana |
|---|---|
| `README.md` | **nowy** — uruchomienie, konfiguracja, układ, kopia zapasowa |
| `test/*.test.js` | uzupełnienie luk |
| `public/i18n.js` | domknięcie słowników |

## 1. Macierz testów

Każda pozycja z `95-testing.md` ma mieć pokrycie. Sprawdzić i uzupełnić braki:

| Obszar | Test | Faza |
|---|---|---|
| `store` — zapis/odczyt, katalogi, brak utraty przy nadpisaniu | `store.test.js` | 01 |
| Numeracja `order` — `4.1`, `4.2`, wartość pośrednia, brak przenumerowania | `order.test.js` | 01 |
| Reguła miejsca — `400` przed ukończoną, przyjęcie za nią i na końcu | `insert-rule.test.js` | 10 |
| Kolejka — kolejność wg `order`, statusy, recovery po restarcie | `queue.test.js` | 06 |
| Walidacja planu — widełki, jedno ponowienie | `plan-validation.test.js` | 03 |
| Ocena sprawdzianu — procent, wielokrotny wybór, brak odpowiedzi | `quiz.test.js` | 05 |
| Stan lekcji — zapis, odtworzenie, „od nowa", uszkodzony wpis | `lesson-state.test.js` | 08 |
| `practiceNotes` — nadpisywanie po `exerciseId` | `practice-notes.test.js` | 09 |
| Propozycje — wyliczanie, brak samoczynnego kolejkowania | `suggestions.test.js` | 10 |
| Składanie wydruku — `<body>`, pomijanie niegotowych | `print-assembly.test.js` | 11 |
| Parser JSON z odpowiedzi modelu | `json.test.js` | 02 |
| Symetria słowników i18n | `i18n.test.js` | 04 |

Brakujące dopisać teraz. `npm test` musi być zielony **od zera** (świeży `DATA_DIR`, bez pozostałości po wcześniejszych uruchomieniach).

## 2. Audyt i18n

- [ ] `test/i18n.test.js` zielony — słowniki `pl` i `en` mają identyczny zbiór kluczy.
- [ ] Przejść `app.js` wzrokiem: **zero** stringów widocznych dla użytkownika poza `i18n.js` — łącznie z komunikatami błędów, potwierdzeniami usunięcia, `title` i `aria-label`.
- [ ] To samo w `runtime.js` względem jego własnego słownika.
- [ ] Etykiety enumów (`status.*`, `level.*`, `verdict.*`) kompletne dla wszystkich wartości z `00-README.md`.
- [ ] Przejść całą aplikację przy interfejsie `en` — żaden ekran nie pokazuje polskiego tekstu.
- [ ] Projekt `en` z interfejsem `pl`: lekcje po angielsku, powłoka po polsku, nic się nie miesza.
- [ ] Uzasadnienia propozycji (`reason.code` → `t()`) tłumaczą się przy przełączeniu języka.
- [ ] Wydruk kursu `en` jest po angielsku niezależnie od języka powłoki.

## 3. Checklista ręczna (jakość produktu)

Rzeczy, których test jednostkowy nie złapie — z `95-testing.md`:

**Treść**
- [ ] Wygenerowane lekcje są merytorycznie poprawne na 2–3 różnych tematach (jeden techniczny, jeden nietechniczny).
- [ ] Lekcje nie dublują materiału — `covers` faktycznie działa.
- [ ] Sprawdzian zawiera 20–30% pytań z wcześniejszych lekcji.
- [ ] Trafność ocen ćwiczeń przy kolejnych próbach tego samego zadania.

**Interaktywność**
- [ ] Demka faktycznie czegoś uczą — suwak zmienia coś, co ma znaczenie, a nie kolor tła.
- [ ] Edytor kodu wykonuje się w sandboxie i nie wysypuje lekcji.
- [ ] Kod z edytora nie generuje żądań sieciowych.

**Wygląd**
- [ ] Spójność wizualna lekcji między różnymi tematami.
- [ ] Oba motywy czytelne — wykresy, SVG i podświetlenia w demkach.
- [ ] Przełączenie motywu przy otwartej lekcji odświeża ją natychmiast, razem z demkami.
- [ ] Wydruk: jasna paleta, łamanie stron, rozwinięte rozwiązania, czytelne wykresy.

**Odporność**
- [ ] Restart serwera w trakcie generowania — kurs wraca do zdrowia.
- [ ] Lekcja otwarta przy zatrzymanym serwerze: działa, tylko bez zapisu wyniku i oceny praktyki.
- [ ] Wyczyszczony `localStorage` — lekcje startują od zera, postęp kursu w `index.json` nietknięty.
- [ ] Usunięcie projektu czyści katalog i klucze przeglądarki.

## 4. `README.md` aplikacji

Krótko, bez powtarzania bazy wiedzy:

- czym jest aplikacja (akapit),
- **wymaganie: zalogowane Claude Code** (`claude`), brak klucza API — i że to celowe,
- `npm install`, `npm start`, `npm test`,
- `PORT`, `DATA_DIR`,
- układ katalogów i gdzie leżą dane,
- kopia zapasowa = skopiowanie `data/`,
- dwujęzyczność: język interfejsu vs język kursu, i że język kursu jest niezmienny,
- odnośnik do `implementation-plan/` i do bazy wiedzy w Kaizen.

## 5. Sprzątanie

- [ ] Katalog `scripts/` — zostaje tylko to, co używane (`smoke-claude.js` ma wartość: weryfikuje auth po zmianie środowiska).
- [ ] Zależności produkcyjne: dokładnie `express` i `@anthropic-ai/claude-agent-sdk`. Cokolwiek więcej wymaga uzasadnienia.
- [ ] Brak martwego kodu z faz pośrednich (prowizoryczne zmienne CSS z fazy 04, placeholdery).
- [ ] `data/` w `.gitignore`; fikstury testowe **nie** w `data/`.
- [ ] Jeśli faza 02 skończyła się fallbackiem na CLI — odnotować to w `README.md` i w `00-README.md` tego katalogu.

## Definition of Done

- [ ] `npm test` zielony na świeżym `DATA_DIR`.
- [ ] Cała checklista i18n odhaczona.
- [ ] Checklista ręczna przeszła na **prawdziwym** kursie, nie na fiksturze.
- [ ] `README.md` pozwala uruchomić projekt komuś, kto nie zna bazy wiedzy.
- [ ] Każda funkcja z `20-features.md` ma odpowiednik w działającej aplikacji.

## Baza wiedzy

`95-testing.md` (cała) · `90-run-and-config.md` (README) · `20-features.md` (kontrola kompletności)
