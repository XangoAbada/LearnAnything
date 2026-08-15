# Faza 05 — Motyw, szablon lekcji i runtime (część 1)

## Cel

Zbudować **fundament, który Claude tylko wypełnia**: wspólny motyw, stałą strukturę lekcji i logikę wspólną dla wszystkich lekcji. To ta faza decyduje, czy lekcje z różnych tematów będą wyglądać jak jeden kurs.

Zakres runtime w tej fazie: chowane sekcje, mikro-pytania, sprawdzian i zapis wyniku. Demka (07) i zapamiętywanie stanu (08) dochodzą później — ale **identyfikatory elementów projektujemy już teraz**, bo faza 08 odtwarza stan właśnie po nich.

Weryfikacja bez modelu: **ręcznie napisana lekcja-wzorzec**, która zostaje w repo jako fikstura.

## Pliki

| Plik | Zawartość |
|---|---|
| `public/theme.css` | zmienne obu motywów + klasy komponentów lekcji |
| `public/lesson-template.html` | stała struktura lekcji |
| `public/runtime.js` | wspólna logika lekcji, część 1 |
| `test/fixtures/lesson-pl/`, `test/fixtures/lesson-en/` | ręczne lekcje-wzorce |
| `test/quiz.test.js` | ocena sprawdzianu |

## Kontrakty

### `theme.css`

Dwa warianty jako zmienne CSS, przełączane atrybutem na `<html>`:

```css
:root { --tlo: #fff; --tekst: #1a1a1a; --akcent: #2563eb; … }
:root[data-theme="ciemny"] { --tlo: #14171c; --tekst: #e8e8e8; … }
```

Minimalny zestaw zmiennych: tło, tło uniesione, tekst, tekst przygaszony, akcent, obramowanie, sukces, ostrzeżenie, błąd, tło kodu. Do tego **osobne zmienne dla wizualizacji** (`--wiz-1`…`--wiz-5`, `--wiz-siatka`, `--wiz-podswietlenie`) — SVG i Canvas w lekcjach biorą kolory wyłącznie stąd, inaczej wykresy zginą w ciemnym motywie.

Klasy komponentów (nazwy trafiają do promptu lekcji, więc **ustalone raz i niezmienne**):

| Klasa | Rola |
|---|---|
| `.pojecie` | sekcja teorii = jedno pojęcie |
| `.diagram` | pojemnik na SVG/Canvas |
| `.demko` | pojemnik interaktywny + panel sterowania |
| `.mikro-pytanie` | pytanie z chowaną odpowiedzią |
| `.cwiczenie` | ćwiczenie praktyczne |
| `.sprawdzian` | sekcja pytań zamkniętych |
| `.sugestie` | podsumowanie na końcu |

Canvas nie dziedziczy zmiennych CSS — `runtime.js` udostępnia `czytajZmienna('--wiz-1')` (przez `getComputedStyle`), żeby lekcje nie sięgały po kolory na sztywno.

### `lesson-template.html`

Stały szkielet z gniazdami do wypełnienia. Kolejność sekcji **niezmienna**: teoria → praktyka → sprawdzian → sugestie.

```html
<!doctype html>
<html lang="{{language}}" data-theme="jasny">
<head>
  <meta charset="utf-8">
  <title>{{title}}</title>
  <link rel="stylesheet" href="/theme.css">
  <link rel="stylesheet" href="/print.css" media="print">
  <link rel="stylesheet" href="lesson.css">
</head>
<body data-project="{{projectId}}" data-lesson="{{lessonId}}" data-lang="{{language}}">
  <header class="lekcja-naglowek"><h1>{{title}}</h1></header>
  <section id="teoria">    <!-- .pojecie × N -->        </section>
  <section id="praktyka">  <!-- .cwiczenie × 2–5 -->     </section>
  <section id="sprawdzian" class="sprawdzian"></section>
  <section id="sugestie" class="sugestie"></section>
  <script src="/runtime.js"></script>
  <script src="lesson.js"></script>
</body>
</html>
```

- `data-project` / `data-lesson` — runtime wie, dokąd wysłać wynik i pod jakim kluczem trzymać stan (faza 08).
- `data-lang` — **język lekcji**, źródło tekstów interfejsu lekcji. Nie ustawienie powłoki.
- `print.css` linkowany z `media="print"` — faza 11 tylko wypełnia plik.

### `runtime.js` — zakres części 1

```js
// teksty interfejsu lekcji — własny mały słownik, niezależny od i18n powłoki
const teksty = { pl: {…}, en: {…} };
function tl(klucz)                     // czyta document.body.dataset.lang

// chowane sekcje i mikro-pytania
initChowane()                          // [data-chowane] + przycisk „Pokaż odpowiedź"

// sprawdzian
LA.quiz(pytania)                       // API dla lesson.js — rysuje sprawdzian
ocenSprawdzian(pytania, odpowiedzi)    // -> { procent, poprawne, szczegoly[] }
wyslijWynik(procent, odpowiedzi)       // POST /api/projects/:p/lessons/:l/result

// pomocnicze
czytajZmienna(nazwa)                   // kolor motywu dla Canvas
```

**Dlaczego lekcja ma własny słownik zamiast importu `i18n.js`:** lekcja musi działać otwarta prosto z dysku, bez serwera i bez powłoki. Słownik jest krótki (kilkanaście przycisków) — duplikacja jest tańsza niż zależność.

### Kształt danych sprawdzianu (kontrakt z `lesson.js`)

```js
LA.quiz([
  { id: 'q1', typ: 'jednokrotny', tekst: '…',
    opcje: ['A','B','C'], poprawne: [1], uzasadnienie: 'bo…' },
  { id: 'q2', typ: 'wielokrotny', poprawne: [0, 2], … },
  { id: 'q3', typ: 'prawda-falsz', poprawne: [0], … },
]);
```

Ocena **w przeglądarce, natychmiast**:
- `jednokrotny` / `prawda-falsz`: punkt za trafienie;
- `wielokrotny`: punkt **tylko za komplet** — bez punktów cząstkowych. Prosto i przewidywalnie;
- brak odpowiedzi = zero punktów, bez blokowania oddania;
- `procent = round(poprawne / wszystkie * 100)`;
- po oddaniu: uzasadnienie przy **każdym** pytaniu, także trafionym;
- wynik idzie automatycznie na serwer (`POST /result`), lekcja dostaje status `ukończona` **niezależnie od wyniku**;
- serwer nieosiągalny → komunikat „wynik niezapisany", sprawdzian nadal pokazuje ocenę. Lekcja nie jest zakładnikiem serwera.

### Mikro-pytania i wygaszanie wsparcia

- Każda sekcja `.pojecie` kończy się `.mikro-pytanie` z chowaną odpowiedzią — **przed** dalszym czytaniem. To wymóg dydaktyczny, nie ozdoba: `runtime.js` obsługuje mechanikę, prompt (faza 06) wymusza obecność.
- Elementy chowane: `[data-chowane]` + przycisk. **Stabilne `id`** — faza 08 odtwarza po nich stan, więc identyfikator musi być wyprowadzony z pozycji w lekcji (`pojecie-3-odpowiedz`), a nie losowany przy renderze.

### Lekcja-wzorzec (fikstura)

Ręcznie napisana lekcja pokazująca **wszystkie** elementy: 3 sekcje teorii z mikro-pytaniami, statyczny SVG, 3 ćwiczenia z ukrytymi rozwiązaniami, sprawdzian z trzema typami pytań, sugestie. Dwie wersje: `pl` i `en`.

Trzy role:
1. weryfikacja fazy bez czekania na model,
2. **wzorzec dla promptu lekcji** w fazie 06 — prompt może dostać jej fragmenty jako przykład,
3. stała fikstura do testów druku (11) i stanu (08).

## Kroki

1. `theme.css` — zmienne obu motywów, potem klasy komponentów. Sprawdzać oba warianty na bieżąco.
2. `lesson-template.html`.
3. `runtime.js`: `tl()`, `czytajZmienna()`, `initChowane()`, potem sprawdzian.
4. Lekcja-wzorzec `pl`, sprawdzić w obu motywach.
5. `LA.quiz` + ocena + `POST /result` (endpoint dopisać w `api.js`: zapis `score`, `status: "ukończona"`, `completedAt`).
6. Lekcja-wzorzec `en` — kopia z przetłumaczoną treścią; sprawdzić, że przyciski runtime też są po angielsku.

## Testy (`node --test`)

`test/quiz.test.js` — funkcję oceniającą wyeksportować tak, żeby dała się zaimportować w Node (osobny mały moduł albo `export` obok przypięcia do `window`):
- komplet poprawnych → 100%;
- wielokrotny wybór częściowo trafiony → 0 punktów za to pytanie;
- brak odpowiedzi → 0 punktów, bez wyjątku;
- zaokrąglanie: 2/3 → 67%;
- `szczegoly[]` zawiera uzasadnienie dla każdego pytania, także trafionego.

Reszta ręcznie — patrz Definition of Done.

## Definition of Done

- [ ] Lekcja-wzorzec `pl` i `en` otwiera się pod `/lessons/...`, wygląda spójnie w obu motywach.
- [ ] Sprawdzian ocenia się natychmiast, wynik ląduje w `index.json`, lekcja dostaje `ukończona`.
- [ ] Przy zatrzymanym serwerze lekcja nadal się otwiera i ocenia sprawdzian (komunikat o niezapisanym wyniku).
- [ ] Teksty przycisków lekcji `en` są po angielsku **przy polskiej powłoce**.
- [ ] Chowane odpowiedzi mają stabilne `id` (podgląd w DevTools — te same po przeładowaniu).
- [ ] `npm test` zielony.

## Baza wiedzy

`20-features.md` (struktura lekcji, wzorce dydaktyczne, tabela wzorców) · `30-data-model.md` (pliki lekcji) · `40-architecture.md` („lekcje są głupie i samodzielne", „spójność wymusza aplikacja") · `50-code-map.md` (odpowiedzialności `theme.css` i `runtime.js`)
