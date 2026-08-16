# LearnAnything

Aplikacja, która z jednego zdania („chcę zrozumieć transformatory") robi kurs: przeprowadza wywiad, układa plan lekcji, a potem generuje każdą lekcję jako samodzielną stronę HTML — z wizualizacjami, sprawdzianem i ocenianymi ćwiczeniami. Treść pisze Claude, aplikacja tylko trzyma ją w ryzach: numerację, kolejkę, stan nauki i wydruk. Wszystko lokalnie, jeden proces Node, dane w plikach.

## Wymaganie: zalogowane Claude Code

Aplikacja nie przyjmuje klucza API. Potrzebuje zainstalowanego i **zalogowanego** CLI `claude`:

```sh
claude          # jeśli pyta o logowanie — zaloguj się subskrypcją
```

To decyzja, nie brak funkcji. Klucz API przełącza rozliczanie na tokeny, a kurs to kilkadziesiąt wywołań modelu — serwer usuwa `ANTHROPIC_API_KEY` i `ANTHROPIC_AUTH_TOKEN` ze środowiska przekazywanego do Claude'a, nawet jeśli siedzą w systemie. `CLAUDE_CONFIG_DIR` zostaje domyślny (`~/.claude`), bo tam leżą poświadczenia subskrypcji.

Brak Claude'a wychodzi przy starcie serwera, nie w połowie generowania piętnastej lekcji. Sprawdzenie samego uwierzytelnienia, bez wstawania aplikacji:

```sh
node scripts/smoke-claude.js
```

## Uruchomienie

```sh
npm install
npm start     # http://localhost:3000
npm test      # node --test, bez frameworka
```

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `PORT` | `3000` | port serwera |
| `DATA_DIR` | `./data` | katalog danych — kursy, lekcje, ustawienia |

Testy chodzą na własnym `DATA_DIR` i nie ruszają danych roboczych.

## Układ

```
server/     Express, kolejka generowania, wywołania Claude'a, składanie wydruku
public/     powłoka SPA (bez frameworka), runtime lekcji, motyw, biblioteka komponentów
public/komponenty/   wizualizacje wielokrotnego użytku — model składa lekcję z nich, nie rysuje sam
server/prompts/      prompty w Markdownie: wywiad, plan, lekcja, ocena, komponent
test/       node --test
scripts/    smoke-claude.js (auth), seed-fixture.js (lekcja-wzorzec bez modelu),
            sprawdz-komponenty.js (galeria komponentów w przeglądarce, `npm run sprawdz`)
data/       dane — jedyny katalog, który powstaje w trakcie pracy
```

Dane jednego kursu:

```
data/settings.json                       model i wysiłek per etap
data/projects/<id>/project.json          temat, język, parametry, wywiad, plan
data/projects/<id>/index.json            lekcje: order, tytuł, status, wynik, notatki z praktyki
data/projects/<id>/lessons/<nn-slug>/    index.html, lesson.css, lesson.js — lekcja stoi sama
```

Lekcje serwowane są wprost z tego katalogu, bez kroku eksportu — `/lessons/<projectId>/<nn-slug>/index.html` otwiera lekcję poza ekranem kursu. Gdy serwer padnie przy otwartej lekcji, lekcja dalej działa: znika tylko zapis wyniku sprawdzianu i ocena ćwiczeń, obie z komunikatem.

**Kopia zapasowa = skopiowanie `data/`.** Nie ma bazy danych ani stanu poza plikami.

Postęp nauki wewnątrz lekcji (odsłonięte odpowiedzi, wpisany kod, ustawienia demek) żyje w `localStorage` przeglądarki pod kluczami `learnanything:*`. Wyczyszczenie ich cofa lekcje do stanu początkowego, ale wyniki sprawdzianów i postęp kursu z `index.json` zostają.

## Dwa języki, dwie osie

| Oś | Gdzie | Co obejmuje | Kiedy się zmienia |
|---|---|---|---|
| Język interfejsu | `localStorage: learnanything:lang` | powłoka, etykiety statusów, komunikaty | dowolnie, przełącznikiem, natychmiast |
| Język kursu | `project.language` | wywiad, plan, treść lekcji, oceny, wydruk | raz, przy zakładaniu — potem **niezmienny** |

Rozdzielone celowo: angielski kurs przy polskim interfejsie to główny przypadek użycia. Enumy w danych (`gotowa`, `poprawnie`, `pośrednia`) zostają po polsku — to format, nie tekst dla człowieka; UI mapuje je na etykiety przez `t()`.

## PDF

Nie ma generatora PDF. `/print/<projectId>` składa gotowe lekcje w jeden dokument z jasną paletą i łamaniem stron — PDF robi przeglądarka przez „Zapisz jako PDF". Lekcje jeszcze niewygenerowane zostają w spisie treści z adnotacją, żeby nie było wątpliwości, że dokument jest niekompletny.

## Dokumentacja

- `implementation-plan/` — fazy 01–13, po jednej sesji implementacyjnej na plik; `00-README.md` trzyma kontrakty (model danych, enumy, i18n, uwierzytelnienie).
- `DESIGN.md`, `PRODUCT.md` — wygląd i zakres produktu.
- Baza wiedzy („co", źródło prawdy dla decyzji produktowych): `D:\Projects\Kaizen\server\data\projects\-SX_WpozfSXO\knowledge\`.
