# Faza 11 — Eksport do PDF

## Cel

Wydrukować pojedynczą lekcję albo cały kurs, korzystając z eksportu wbudowanego w przeglądarkę. Zero zależności: `print.css` plus strona sklejona z istniejących plików lekcji.

Wydruk **nie tworzy nowej treści** — zmienia tylko arkusz stylów i skleja to, co już jest.

## Pliki

| Plik | Zmiana |
|---|---|
| `public/print.css` | arkusz wydruku (dotąd pusty placeholder z fazy 05) |
| `server/api.js` | `GET /print/:projectId`, `GET /print/:projectId/:lessonId` |
| `public/app.js` | przyciski eksportu na ekranie projektu i lekcji |
| `public/runtime.js` | przygotowanie lekcji do druku |
| `test/print-assembly.test.js` | sklejanie dokumentu |

## Kontrakty

### Strony wydruku

| Ścieżka | Zawartość |
|---|---|
| `GET /print/:projectId` | spis treści + wszystkie **gotowe** lekcje po kolei |
| `GET /print/:projectId/:lessonId` | jedna lekcja |

Serwer składa dokument tak:
1. czyta `index.json`, bierze lekcje `gotowa` i `ukończona` w kolejności `order`;
2. dla każdej czyta jej `index.html` i **wycina zawartość `<body>`**;
3. skleja w jeden dokument ze wspólnym `theme.css`, `print.css` oraz `lesson.css` i `lesson.js` każdej lekcji;
4. na górze spis treści: numer + tytuł, a **lekcje niegotowe wymienione z adnotacją**, że ich brakuje (użytkownik ma wiedzieć, że PDF nie jest kompletny).

Wszystkie lekcje pochodzą z jednego szablonu, więc wystarczy wyciąć między `<body...>` a `</body>` — **bez parsera HTML**. Jeśli któraś lekcja nie pasuje do wzorca, pomijamy ją z adnotacją zamiast wysypywać całość.

**Kolizje `id` między lekcjami** (każda ma `#teoria`, `#praktyka`…): opakować każdą lekcję w `<article class="lekcja-druk" data-lesson="…">` i w `print.css` stylować przez ten kontener, nie przez `#id`. Skrypty lekcji w dokumencie zbiorczym mogą trafić na cudze `id` — dlatego (patrz niżej) demka w wydruku nie potrzebują JS.

Strona otwiera się w **nowej karcie** i sama woła `window.print()` po `load`. PDF robi przeglądarka („Zapisz jako PDF").

### `print.css`

- **Jasna paleta wymuszona** — nadpisanie zmiennych motywu w `@media print`, niezależnie od `data-theme`. Ciemny motyw na papierze to zmarnowany toner i nieczytelny wykres.
- Ukryte: nawigacja powłoki, przyciski (**Oceń odpowiedź**, **Uruchom**, **Zacznij od nowa**, przełączniki), panele sterowania demek.
- **Rozwinięte wszystko chowane**: rozwiązania wzorcowe ćwiczeń, odpowiedzi na mikro-pytania, uzasadnienia sprawdzianu. Wydruk ma być kompletnym materiałem, nie zestawem zagadek.
- Łamanie stron: `break-before: page` przed każdą lekcją w wydruku zbiorczym, `break-inside: avoid` na `.pojecie`, `.diagram`, `.cwiczenie`, żeby wykres nie pękał w pół.
- Zachowane kolory tła etykiet werdyktów (`print-color-adjust: exact`) — bez tego etykiety znikają.
- Marginesy i rozmiar czcionki pod A4.
- Linki: bez podkreśleń i bez rozwijania URL-i — kurs jest offline'owy, adresy nic nie wnoszą.

### Demka w wydruku

**Stan początkowy**, nie zapamiętany.

Powód: wydruk ma być powtarzalny — ten sam kurs wydrukowany przez dwie osoby (albo dwa razy przez jedną) ma dać ten sam dokument. Suwak przestawiony w trakcie nauki nie jest częścią materiału.

Realizacja: strona wydruku **nie ładuje stanu z `localStorage`** — `runtime.js` sprawdza flagę na `<body data-druk="1">` i pomija odtworzenie stanu. Demka rysują się raz, w stanie domyślnym, panel sterowania ukrywa `print.css`.

Edytory kodu drukują się jako **kod startowy** w bloku `<pre>`, bez pola i bez panelu wyniku.

### Język wydruku

Spis treści i wszystkie etykiety generowane przez serwer są w **języku projektu** (treść lekcji też — inaczej dokument byłby dwujęzyczny). Interfejs powłoki tu nie sięga.

### Przyciski

- **Eksportuj do PDF** w widoku lekcji → `/print/:projectId/:lessonId` w nowej karcie.
- **Eksportuj kurs do PDF** na ekranie projektu → `/print/:projectId`.
- Kurs bez gotowych lekcji → przycisk nieaktywny z podpowiedzią.

## Kroki

1. `print.css` — zacząć od wymuszenia jasnej palety i ukrycia interfejsu, sprawdzać w podglądzie wydruku na lekcji-wzorcu.
2. Rozwinięcie chowanych sekcji, potem łamanie stron.
3. `GET /print/:projectId/:lessonId` — pojedyncza lekcja, prościej złapać błędy.
4. `GET /print/:projectId` — sklejanie, spis treści, adnotacje o brakach.
5. Flaga `data-druk` w `runtime.js` — pominięcie stanu i ukrycie kontrolek.
6. Przyciski w UI.
7. Wydrukować **cały prawdziwy kurs** i przejrzeć PDF stronę po stronie. Tu wychodzą wszystkie błędy łamania.

## Testy (`node --test`)

`test/print-assembly.test.js` — na fiksturach lekcji z fazy 05:
- z pliku lekcji wycięta zostaje zawartość `<body>`, bez tagów `<html>`/`<head>`;
- dwie lekcje sklejają się w jeden dokument, każda w swoim `<article>`;
- lekcje `zaplanowana` / `generowana` / `błąd` **pomijane**, ale wymienione w spisie treści z adnotacją;
- kolejność wynika z `order`, także przy numerach ułamkowych;
- lekcja niepasująca do szablonu jest pomijana z adnotacją, a nie wywala składania;
- pusty kurs → dokument ze spisem treści i informacją o braku gotowych lekcji, nie `500`.

## Definition of Done

- [ ] Pojedyncza lekcja drukuje się czytelnie, w jasnej palecie, przy **ciemnym** motywie na ekranie.
- [ ] Cały kurs: spis treści, każda lekcja od nowej strony, wykresy nie pękają między stronami.
- [ ] Rozwiązania ćwiczeń i uzasadnienia sprawdzianu **widoczne** w PDF.
- [ ] Przyciski i panele sterowania niewidoczne w PDF.
- [ ] Demka wydrukowane w stanie początkowym mimo pozmienianych suwaków na ekranie.
- [ ] Kurs `en` drukuje się w całości po angielsku.
- [ ] `npm test` zielony.

## Baza wiedzy

`20-features.md` (eksport do PDF) · `10-screens.md` (widok wydruku) · `50-code-map.md` (składanie strony w `api.js`, „sklejanie nie wymaga parsera HTML") · `70-tech-stack.md` (`window.print()` zamiast generatora PDF) · `95-testing.md` (składanie wydruku)
