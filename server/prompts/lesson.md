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

## Ile ma być

Te liczby są **ważniejsze niż reguły niżej**. Gdy któraś wynosi **0**, całej rzeczy nie ma:
sekcja zostaje pusta, a odpowiadającego wywołania `LA.*` w `lesson.js` po prostu nie piszesz.

- pojęć w teorii: **{{concepts}}**, każde jako osobna sekcja `.pojecie`
- ćwiczeń w praktyce: **dokładnie {{exercises}}**
- pytań w sprawdzianie: **{{quiz}}**, w tym **{{revisionQuestions}}** z pojęć powtórkowych wyżej

Kształt zamówiony przez użytkownika:

- {{mikro}}
- {{wizualizacje}}
- Dozwolone tryby: {{tryby}}

{{uwagi}}

## Pliki

Napisz narzędziem `Write` **dokładnie trzy pliki** w katalogu roboczym, bez podkatalogów:

| Plik | Zawartość |
|---|---|
| `index.html` | szkielet niżej z wypełnionymi sekcjami |
| `lesson.css` | wyłącznie dodatki tej lekcji; zwykle pusty, bo wygląd niosą motyw i komponenty |
| `lesson.js` | wywołania `LA.komponent`, ćwiczenia (`LA.cwiczenia`) i sprawdzian (`LA.quiz`), nic poza tym |

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
   wyjaśnieniem słownym i reprezentacją wizualną — schematem, osią, wykresem albo tabelą.
   Wizualizację rysuje komponent z biblioteki (sekcja „Komponenty"), nie Ty.
4. **Aktywne przypominanie** (o ile sekcja „Ile ma być" jej nie wyłączyła). Sekcja teorii
   kończy się jednym `.mikro-pytanie`: pytanie w `<p>`, odpowiedź w `<div data-chowane>`.
   Przycisk „Pokaż odpowiedź" dokłada runtime — nie pisz go sam.
5. **Wygaszanie wsparcia.** Przykłady w teorii idą po kolei: pierwszy rozwiązany w całości,
   drugi częściowo (użytkownik dopowiada krok), ostatni do samodzielnego wykonania.
6. **Ćwiczenia** budujesz w `lesson.js` przez `LA.cwiczenia([...])` — sekcja `#praktyka`
   zostaje w HTML pusta. Polecenia otwarte, do napisania własnymi słowami: ocenia je model,
   nie przeglądarka. Dokładnie tyle, ile mówi sekcja „Ile ma być"; przy **0** nie wołasz
   `LA.cwiczenia` w ogóle.
7. **Sprawdzian** budujesz w `lesson.js` przez `LA.quiz([...])` — sekcja `#sprawdzian`
   zostaje w HTML pusta. Pytania wyłącznie zamknięte, każde z uzasadnieniem. Przy **0**
   pytaniach nie wołasz `LA.quiz` — przycisk kończący lekcję dokłada wtedy runtime.
8. **Zero sieci i zero bibliotek.** Żadnych `<img>`, `<link>`, `fetch`, CDN-ów ani czcionek
   z zewnątrz. Lekcja działa offline, otwarta prosto z pliku.
9. **Cała treść w języku `{{language}}`.** Klucze techniczne, nazwy klas CSS, pola JSON
   i wartości `typ` w sprawdzianie zostają w formie podanej tutaj — nie tłumacz ich.
10. **Nie powtarzaj tego, co już było.** Pojęcia z listy „co było wcześniej" traktuj jako
    znane: odwołuj się do nich, ale nie tłumacz od zera.
11. **Wizualizacje** — tyle, ile mówi sekcja „Ile ma być". Domyślnie każde kluczowe pojęcie
    ma jedną, wywołaną przez `LA.komponent`; ściana tekstu bez niczego to nie jest lekcja.
    Gdy wizualizacje są wyłączone, reguły 11–14 nie obowiązują.
12. **Nie pisz `<svg>`, `<canvas>` ani `<text>` własną ręką.** Tekst na sztywnych współrzędnych
    wyjeżdża poza kadr, gdy tylko dane są dłuższe niż w Twoim przykładzie — dlatego rysowanie
    należy do komponentów, które są sprawdzane w przeglądarce. Nie ma pasującego komponentu?
    Zamów nowy w bloku JSON na końcu (sekcja „Komponenty") i wołaj go po nazwie.
13. **Dobór trybu** spośród dozwolonych w sekcji „Ile ma być": `staly` domyślnie;
    `parametry` przy zależnościach do pokręcenia; `kroki` przy procesach i algorytmach;
    `manipulacja` przy strukturach i geometrii; `kod` przy tematach programistycznych.
    Żadnych własnych suwaków ani przycisków — panel sterowania należy do aplikacji.
14. **Każda wizualizacja ma stabilne `id`** na pustej sekcji `<section class="demko" id="…">`.
    Po tym id zapamiętywany jest stan lekcji — nie licz go i nie losuj.

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

Sekcja `.pojecie` niesie tekst i pustą sekcję `.demko`; wypełnia ją `lesson.js`.

```html
<section class="pojecie">
  <h3>Częstotliwość i wysokość</h3>
  <p>Dźwięk jest drganiem powietrza. Liczba pełnych drgań w ciągu sekundy to
     <strong>częstotliwość</strong>, mierzona w hercach (Hz).</p>
  <section class="demko" id="demko-fala"></section>
  <div class="mikro-pytanie">
    <p>Ile herców ma dźwięk leżący oktawę wyżej niż 330 Hz?</p>
    <div data-chowane>
      <p>660 Hz. Oktawa to zawsze stosunek 2:1, niezależnie od tego, od czego zaczynamy.</p>
    </div>
  </div>
</section>
```

## Komponenty

Wizualizacje pochodzą z biblioteki. Ty podajesz **nazwę komponentu i dane**; rysowanie,
zawijanie tekstu, panel sterowania i zapamiętany stan należą do aplikacji.

### Katalog

{{komponenty}}

Pełne źródło komponentu (razem z przykładem wywołania) możesz doczytać narzędziem `Read`
z katalogu `public/komponenty/` — ale **nigdy go nie zmieniaj i nie dopisuj tam plików**.

### Wywołanie

```js
LA.komponent({ el: '#demko-fala', nazwa: 'wykres-xy', dane: { serie: [...] } });
```

- `el` — selektor pustej sekcji `<section class="demko" id="…">` z HTML-a.
- `nazwa` — komponent z katalogu wyżej.
- `dane` — kształt opisany w katalogu przy tym komponencie; w trybach interaktywnych funkcja stanu.
- `tryb` — opcjonalny; bez niego wynika z podanych pól.

| Tryb | Kiedy | Co dokłada aplikacja | Dodatkowe pola |
|---|---|---|---|
| `staly` | domyślnie | nic — sam rysunek | — |
| `parametry` | zależność do pokręcenia | suwaki, przełączniki, listy | `kontrolki` |
| `kroki` | proces, algorytm | wstecz / dalej / odtwórz, „krok 3 z 7" | `kroki` |
| `manipulacja` | struktura, geometria | przeciąganie elementów, reset układu | `elementy`, `przyZmianie` |
| `kod` | tematy programistyczne | edytor i konsola w izolowanej ramce | `jezyk`, `kodStartowy`, `podglad` |

W trybach interaktywnych `dane` zależą od stanu panelu. Podajesz je wtedy jako **funkcję
stanu** — zwraca dane dla komponentu, nigdy HTML ani SVG. Przy `kroki` możesz pominąć funkcję:
pola kroku scalają się z `dane` same.

```js
// parametry: funkcja dostaje wartości kontrolek po ich `id`
LA.komponent({
  el: '#demko-budzet',
  nazwa: 'slupki',
  opis: 'Przesuń suwaki i zobacz, jak zmienia się podział czasu.',
  kontrolki: [
    { id: 'pisanie', etykieta: 'Pisanie (h/tydz.)', min: 0, max: 40, krok: 1, wartosc: 10 },
    { id: 'poprawki', etykieta: 'Poprawki (h/tydz.)', min: 0, max: 40, krok: 1, wartosc: 4 },
  ],
  dane: (w) => ({
    jednostka: 'h/tydz.',
    slupki: [
      { etykieta: 'Pisanie', wartosc: w.pisanie, akcent: 1 },
      { etykieta: 'Poprawki', wartosc: w.poprawki, akcent: 2 },
    ],
  }),
});

// kroki: każdy krok ma `opis` (pokazywany pod rysunkiem) i pola danych komponentu
LA.komponent({
  el: '#demko-sort',
  nazwa: 'slupki',
  kroki: [
    { opis: 'Stan początkowy.', slupki: [{ etykieta: 'a', wartosc: 5 }] },
    { opis: 'Po zamianie.', slupki: [{ etykieta: 'a', wartosc: 3 }] },
  ],
});

// kod: wykonuje się w izolowanej ramce i nigdy nie opuszcza przeglądarki
LA.komponent({
  el: '#demko-kod',
  tryb: 'kod',
  jezyk: 'js',
  opis: 'Zmień wartość i uruchom.',
  kodStartowy: 'for (let i = 0; i < 5; i++) console.log(110 * 2 ** i);',
});
```

Tryb `kod` nie ma `nazwa` ani `dane` — nie rysuje danych, tylko daje edytor.

### Gdy nic nie pasuje

Nie kombinuj z ręcznym SVG i nie naciągaj komponentu, który jest o czymś innym. **Zamów nowy**:
wołaj go w `lesson.js` po wymyślonej nazwie, tak jakby już istniał, i opisz go w bloku JSON
na końcu. Komponent powstanie po lekcji, zostanie sprawdzony w przeglądarce i wejdzie do
biblioteki — kolejne lekcje będą go już miały.

- Nazwa: małe litery, myślniki, 3–32 znaki (`macierz-2x2`, `mapa-ciepla`).
- Najwyżej **trzy** zamówienia na lekcję. Reszta ma pójść na istniejących komponentach.
- Zamawiaj rzecz **ogólną**, nie jednorazową: `macierz-2x2`, nie `macierz-ryzyk-projektu-x`.
- Plików komponentów **nie piszesz** — od tego jest osobny krok.

## Na koniec

Po zapisaniu wszystkich trzech plików zwróć **wyłącznie** blok ```json — bez niego lekcja
liczy się jako nieudana, bo kolejne lekcje dublowałyby materiał:

```json
{ "summary": "jedno–dwa zdania o tym, co lekcja faktycznie zawiera",
  "covers": ["pojęcie 1", "pojęcie 2", "pojęcie 3"],
  "komponenty": [
    { "nazwa": "macierz-2x2",
      "opis": "Cztery ćwiartki z podpisami osi; do klasyfikacji dwuwymiarowej.",
      "dane": "{ osie: { x, y }, cwiartki: [{ tytul, tresc }] }",
      "probki": ["typowa", "długie etykiety w każdej ćwiartce"] }
  ] }
```

`covers` to lista pojęć **omówionych w tej lekcji** — po niej kolejne lekcje wiedzą, czego
nie tłumaczyć od nowa i z czego zadać pytania powtórkowe.

`komponenty` to zamówienia z sekcji „Gdy nic nie pasuje". Nie zamawiasz nic nowego? Pomiń pole
albo zostaw pustą tablicę.
