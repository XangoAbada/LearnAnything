Napisz kompletną lekcję kursu na temat: **{{topic}}**.

## Ta lekcja

- tytuł: **{{title}}**
- co ma wnieść: {{brief}}
- numer w kursie: {{order}}

{{extend}}
## Kurs

- poziom: `{{level}}` · tempo: `{{pace}}` · zakres: `{{scope}}`
- co użytkownik już umie: {{courseSummary}}

## Co było wcześniej

{{previous}}

## Słabe punkty z wcześniejszych lekcji

{{weak}}

## Pojęcia do powtórki (`covers` wcześniejszych lekcji)

{{revision}}

## Ile ma być (z tempa `{{pace}}`)

- pojęć w teorii: **{{concepts}}**, każde jako osobna sekcja `.pojecie`
- ćwiczeń w praktyce: **dokładnie {{exercises}}**
- pytań w sprawdzianie: **{{quiz}}**, w tym **{{revisionQuestions}}** z pojęć powtórkowych wyżej

## Pliki

Napisz narzędziem `Write` **dokładnie trzy pliki** w katalogu roboczym, bez podkatalogów:

| Plik | Zawartość |
|---|---|
| `index.html` | szkielet niżej z wypełnionymi sekcjami |
| `lesson.css` | wyłącznie dodatki tej lekcji (klasy SVG/Canvas, układ diagramów) |
| `lesson.js` | wywołania demek (`LA.demo*`), ćwiczenia (`LA.cwiczenia`) i sprawdzian (`LA.quiz`), nic poza tym |

Nie twórz, nie czytaj i nie zmieniaj niczego poza katalogiem roboczym. Żadnych plików
pomocniczych, kopii ani notatek — nadmiarowy plik unieważnia lekcję.

### Szkielet `index.html`

Skopiuj go **dokładnie** i wypełnij sekcje. Nie zmieniaj `<head>`, `<body>`, atrybutów
`data-*` ani znaczników `<script>`. Kolejność sekcji jest niezmienna: teoria → praktyka →
sprawdzian → sugestie.

```html
{{skeleton}}
```

## Twarde reguły

1. **Struktura zostaje.** Wypełniasz sekcje, nie przestawiasz ich i nie dodajesz nowych.
2. **Kolory wyłącznie ze zmiennych motywu** — zero wartości `#rrggbb`, `rgb()` i nazw kolorów
   w HTML, CSS i JS. Lekcja musi wyglądać poprawnie w jasnym i ciemnym motywie.
   Dostępne: `--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--border`, `--accent`,
   `--ok`, `--warn`, `--danger` oraz do wizualizacji `--wiz-1`…`--wiz-5`, `--wiz-siatka`,
   `--wiz-podswietlenie`. W SVG: `stroke="var(--wiz-1)"`. W Canvas: `LA.czytajZmienna('--wiz-1')`
   — Canvas nie dziedziczy zmiennych CSS.
3. **Podwójne kodowanie.** Każde pojęcie to `<section class="pojecie">` z nagłówkiem `<h3>`,
   wyjaśnieniem słownym i reprezentacją wizualną w `<figure class="diagram">` — schemat, oś,
   wykres, tabela zależności. Rysowane w SVG, Canvas albo CSS.
4. **Aktywne przypominanie.** Każda sekcja teorii kończy się jednym `.mikro-pytanie`:
   pytanie w `<p>`, odpowiedź w `<div data-chowane>`. Przycisk „Pokaż odpowiedź" dokłada
   runtime — nie pisz go sam.
5. **Wygaszanie wsparcia.** Przykłady w teorii idą po kolei: pierwszy rozwiązany w całości,
   drugi częściowo (użytkownik dopowiada krok), ostatni do samodzielnego wykonania.
6. **Ćwiczenia** budujesz w `lesson.js` przez `LA.cwiczenia([...])` — sekcja `#praktyka`
   zostaje w HTML pusta. Polecenia otwarte, do napisania własnymi słowami: ocenia je model,
   nie przeglądarka. Dokładnie tyle, ile mówi tempo.
7. **Sprawdzian** budujesz w `lesson.js` przez `LA.quiz([...])` — sekcja `#sprawdzian`
   zostaje w HTML pusta. Pytania wyłącznie zamknięte, każde z uzasadnieniem.
8. **Zero sieci i zero bibliotek.** Żadnych `<img>`, `<link>`, `fetch`, CDN-ów ani czcionek
   z zewnątrz. Lekcja działa offline, otwarta prosto z pliku.
9. **Cała treść w języku `{{language}}`.** Klucze techniczne, nazwy klas CSS, pola JSON
   i wartości `typ` w sprawdzianie zostają w formie podanej tutaj — nie tłumacz ich.
10. **Nie powtarzaj tego, co już było.** Pojęcia z listy „co było wcześniej" traktuj jako
    znane: odwołuj się do nich, ale nie tłumacz od zera.
11. **Każde kluczowe pojęcie ma sterowalne demko.** Statyczny SVG dopuszczalny wyłącznie tam,
    gdzie sterowanie nie ma sensu (np. oś czasu wydarzeń) — i wymaga jednozdaniowego
    uzasadnienia w komentarzu HTML nad diagramem. Ściana tekstu z obrazkami to nie jest lekcja.
12. **Dobór poziomu:** parametry → domyślnie; krok po kroku → procesy i algorytmy;
    manipulacja → struktury i geometria; edytor kodu → tematy programistyczne.
13. **Demka wołaj wyłącznie** przez `LA.demoParametry` / `LA.demoKroki` / `LA.demoManipulacja` /
    `LA.demoKod`. Żadnych własnych suwaków, przycisków ani obsługi zdarzeń — panel sterowania
    należy do aplikacji.
14. **Każde demko ma stabilne `id`** na pustej sekcji `<section class="demko" id="…">`.
    Po tym id zapamiętywany jest stan lekcji — nie licz go i nie losuj.
15. **Kolory wizualizacji** wyłącznie ze zmiennych `--wiz-*` (reguła 2 łamie się właśnie tutaj):
    w SVG `stroke="var(--wiz-1)"`, w Canvas `LA.czytajZmienna('--wiz-1')`.

## Sekcja `#sugestie`

Krótka lista `<ul>`: co użytkownik już opanował, co warto powtórzyć, co dalej. Bez linków.

## Kształt ćwiczeń w `lesson.js`

Ćwiczenie ma **otwartą odpowiedź** — użytkownik pisze ją własnymi słowami, a ocenia Claude.
Pole odpowiedzi, przycisk oceny i odsłanianie rozwiązania dokłada runtime; nie pisz ich sam.

- `id` — stabilne, po nim zapamiętywany jest stan i notatki kursu (`c1`, `c2`, …).
- `tresc` — polecenie. Nie zadawaj pytań zamkniętych („czy…", „które z poniższych") — od tego
  jest sprawdzian. Ćwiczenie ma kazać wyjaśnić, porównać, zaprojektować albo policzyć.
- `rozwiazanie` — rozwiązanie wzorcowe. Runtime odsłania je dopiero po pierwszej ocenie.
- `demko` — opcjonalne `id` demka wewnątrz ćwiczenia (np. edytor kodu). Element rysuje
  `LA.cwiczenia`, więc wywołanie `LA.demo*` na to `id` musi stać **po** `LA.cwiczenia`.

```js
LA.cwiczenia([
  {
    id: 'c1',
    tresc: 'Wyjaśnij własnymi słowami, dlaczego podwojenie częstotliwości daje oktawę.',
    rozwiazanie: 'Ucho słyszy stosunki częstotliwości, nie różnice…',
  },
  { id: 'c2', tresc: '…', rozwiazanie: '…', demko: 'demko-kod' },
]);
```

## Kształt sprawdzianu w `lesson.js`

`poprawne` to **indeksy** opcji (od zera). `prawda-falsz` nie podaje `opcje` — runtime
wstawia własne etykiety, gdzie indeks 0 to prawda.

```js
LA.quiz([
  {
    id: 'q1',
    typ: 'jednokrotny',
    tekst: 'Co decyduje o wysokości dźwięku?',
    opcje: ['Amplituda', 'Częstotliwość', 'Barwa'],
    poprawne: [1],
    uzasadnienie: 'Wysokość to liczba drgań na sekundę, czyli częstotliwość.',
  },
  { id: 'q2', typ: 'wielokrotny', tekst: '…', opcje: ['…', '…', '…'], poprawne: [0, 2], uzasadnienie: '…' },
  { id: 'q3', typ: 'prawda-falsz', tekst: '…', poprawne: [0], uzasadnienie: '…' },
]);
```

`lesson.js` nie jest modułem: żadnych `import` ani `export`. `LA` jest już globalne.

## Wzór sekcji teorii

```html
<section class="pojecie">
  <h3>Częstotliwość i wysokość</h3>
  <p>Dźwięk jest drganiem powietrza. Liczba pełnych drgań w ciągu sekundy to
     <strong>częstotliwość</strong>, mierzona w hercach (Hz).</p>
  <figure class="diagram">
    <svg viewBox="0 0 472 200" role="img" aria-label="Dwie fale: 220 Hz i 440 Hz">
      <line class="os" x1="20" y1="55" x2="452" y2="55" />
      <path class="fala" stroke="var(--wiz-1)" d="M20 55 c19.4-46.5 34.6-46.5 54 0" />
      <text class="opis" x="20" y="22">220 Hz — A</text>
    </svg>
    <figcaption>Ta sama amplituda, dwie częstotliwości</figcaption>
  </figure>
  <div class="mikro-pytanie">
    <p>Ile herców ma dźwięk leżący oktawę wyżej niż 330 Hz?</p>
    <div data-chowane>
      <p>660 Hz. Oktawa to zawsze stosunek 2:1, niezależnie od tego, od czego zaczynamy.</p>
    </div>
  </div>
</section>
```

Odpowiadające `lesson.css` — tylko to, czego nie ma we wspólnym motywie:

```css
.fala { fill: none; stroke-width: 2; }
.os { stroke: var(--wiz-siatka); stroke-width: 1; }
.opis { font-size: 11px; fill: var(--wiz-5); }
```

## Demka — interaktywność

Demko to pusta sekcja w HTML, którą wypełnia runtime:

```html
<section class="demko" id="demko-fala"></section>
```

Wnętrze (panel sterowania, przyciski, wskaźniki) rysuje aplikacja. Ty podajesz w `lesson.js`
**dane i funkcję rysującą**. Funkcja dostaje element `<figure class="diagram">` — wstaw do niego
SVG przez `innerHTML` albo dorysuj Canvas. Etykiety przycisków są już przetłumaczone.

### 1. Sterowanie parametrami — poziom domyślny

Typy kontrolek: `zakres` (suwak, domyślny), `liczba`, `przelacznik` (`wartosc: true/false`),
`opcje` (lista wartości).

```js
LA.demoParametry({
  el: '#demko-fala',
  opis: 'Przesuń suwaki i zobacz, co się zmienia.',
  kontrolki: [
    { id: 'czestotliwosc', etykieta: 'Częstotliwość (Hz)', min: 110, max: 880, krok: 10, wartosc: 220 },
    { id: 'ksztalt', etykieta: 'Kształt', opcje: ['sinus', 'prostokąt'], wartosc: 'sinus' },
  ],
  rysuj: (cel, w) => {
    const okresy = w.czestotliwosc / 110;
    const punkty = [];
    for (let i = 0; i <= 240; i++) {
      const t = i / 240;
      const faza = Math.sin(2 * Math.PI * okresy * t);
      const v = w.ksztalt === 'prostokąt' ? Math.sign(faza) : faza;
      punkty.push(`${(t * 460).toFixed(1)} ${(75 - v * 63).toFixed(1)}`);
    }
    cel.innerHTML = `
      <svg viewBox="0 0 460 150" role="img" aria-label="Kształt drgania">
        <line class="os" x1="0" y1="75" x2="460" y2="75" />
        <path class="fala" stroke="var(--wiz-1)" d="M${punkty.join(' L')}" />
      </svg>`;
  },
});
```

### 2. Krok po kroku — procesy i algorytmy

Runtime dokłada przyciski wstecz / dalej / odtwórz i wskaźnik „krok 3 z 7". Każdy krok ma `opis`
(wyświetlany pod rysunkiem) i dowolne własne pola ze stanem.

```js
LA.demoKroki({
  el: '#demko-sort',
  kroki: [
    { opis: 'Stan początkowy.', tablica: [5, 3, 8, 1] },
    { opis: 'Zamieniamy pierwszą parę.', tablica: [3, 5, 8, 1] },
    { opis: 'Najmniejszy element trafia na początek.', tablica: [1, 3, 5, 8] },
  ],
  rysuj: (cel, krok) => {
    cel.innerHTML = `
      <svg viewBox="0 0 460 120" role="img" aria-label="Stan tablicy">
        ${krok.tablica
          .map((v, i) => `<rect x="${20 + i * 110}" y="${110 - v * 12}" width="80" height="${v * 12}"
             fill="var(--wiz-3)" />`)
          .join('')}
      </svg>`;
  },
});
```

### 3. Manipulacja bezpośrednia — struktury i geometria

Elementy mają `id`, `x`, `y` i są przeciągane wskaźnikiem (mysz i dotyk). Runtime dokłada przycisk
„Reset układu". Ograniczenia (np. ruch tylko w pionie, przycięcie do zakresu) nakładasz w `rysuj`,
poprawiając współrzędne przed narysowaniem.

```js
LA.demoManipulacja({
  el: '#demko-graf',
  opis: 'Przeciągnij węzły — długości krawędzi liczą się na bieżąco.',
  elementy: [
    { id: 'a', x: 90, y: 60 },
    { id: 'b', x: 300, y: 140 },
  ],
  rysuj: (cel, wezly) => {
    const [a, b] = wezly;
    cel.innerHTML = `
      <svg viewBox="0 0 460 220" role="img" aria-label="Dwa węzły i krawędź">
        <line class="os" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />
        ${wezly.map((w) => `<circle cx="${w.x}" cy="${w.y}" r="12" fill="var(--wiz-2)" />`).join('')}
        <text class="opis" x="10" y="20">${Math.round(Math.hypot(b.x - a.x, b.y - a.y))} px</text>
      </svg>`;
  },
  przyZmianie: (wezly) => {},
});
```

### 4. Edytor kodu — wyłącznie tematy programistyczne

`jezyk`: `js`, `html` albo `css`. Kod wykonuje się w izolowanej ramce i **nigdy nie opuszcza
przeglądarki**; `console.log` i błędy trafiają do panelu wyniku. Dla `css` podaj markup do
ostylowania w polu `podglad`.

```js
LA.demoKod({
  el: '#demko-kod',
  jezyk: 'js',
  opis: 'Zmień wartość i uruchom.',
  kodStartowy: [
    'const start = 110;',
    '',
    'for (let i = 0; i < 5; i++) {',
    '  console.log(`Oktawa ${i}: ${start * 2 ** i} Hz`);',
    '}',
  ].join('\n'),
});
```

## Na koniec

Po zapisaniu wszystkich trzech plików zwróć **wyłącznie** blok ```json — bez niego lekcja
liczy się jako nieudana, bo kolejne lekcje dublowałyby materiał:

```json
{ "summary": "jedno–dwa zdania o tym, co lekcja faktycznie zawiera",
  "covers": ["pojęcie 1", "pojęcie 2", "pojęcie 3"] }
```

`covers` to lista pojęć **omówionych w tej lekcji** — po niej kolejne lekcje wiedzą, czego
nie tłumaczyć od nowa i z czego zadać pytania powtórkowe.
