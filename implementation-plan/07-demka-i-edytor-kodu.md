# Faza 07 — Interaktywne demka i edytor kodu

## Cel

To, co odróżnia LearnAnything od ściany tekstu. Wspólna mechanika demek trafia do `runtime.js`, żeby każda lekcja nie pisała jej od nowa i żeby suwaki w lekcji o muzyce działały tak samo jak w lekcji o sieciach.

Zasada: **statyczny obrazek to ostateczność.** Domyślnie każde kluczowe pojęcie dostaje coś, czym da się poruszyć i zobaczyć skutek.

## Pliki

| Plik | Zmiana |
|---|---|
| `public/runtime.js` | mechanika demek + edytor kodu |
| `public/theme.css` | style panelu sterowania, edytora, panelu wyniku |
| `server/prompts/lesson.md` | reguły interaktywności (rozszerzenie reguł z fazy 06) |
| `test/fixtures/lesson-pl/` | dołożyć po jednym demku każdego typu |

## Kontrakty

Cztery poziomy interaktywności, cztery wejścia w `runtime.js`. `lesson.js` dostarcza **dane i funkcję rysującą**, nigdy własnych przycisków — wygląd należy do aplikacji.

### 1. Sterowanie parametrami (domyślne minimum)

```js
LA.demoParametry({
  el: '#demko-fala',
  kontrolki: [
    { id: 'czest', etykieta: '…', min: 20, max: 2000, krok: 10, wartosc: 440 },
    { id: 'tryb', etykieta: '…', opcje: ['sinus', 'prostokąt'], wartosc: 'sinus' },
  ],
  rysuj: (ctx, wartosci) => { /* SVG lub Canvas */ },
});
```

`runtime.js` rysuje panel, podpina zdarzenia, woła `rysuj` przy każdej zmianie i wystawia stan do zapamiętania (faza 08). Typy kontrolek: `zakres` (suwak), `liczba`, `przelacznik`, `opcje`.

### 2. Krok po kroku (procesy, algorytmy)

```js
LA.demoKroki({
  el: '#demko-sort',
  kroki: [ { opis: '…', stan: {...} }, … ],
  rysuj: (ctx, krok, indeks) => {},
});
```

Przyciski **wstecz / dalej / odtwórz**, wskaźnik `krok 3 z 7`, podświetlenie bieżącego kroku. Odtwarzanie zatrzymywalne. Etykiety przycisków z `tl()` — język lekcji.

### 3. Manipulacja bezpośrednia (struktury, geometria)

```js
LA.demoManipulacja({
  el: '#demko-graf',
  elementy: [ { id: 'a', x: 10, y: 20 }, … ],
  przeciagalne: true,
  rysuj: (ctx, elementy) => {},
  przyZmianie: (elementy) => {},
});
```

Przeciąganie **wskaźnikiem** (`pointerdown`/`move`/`up` — obsługuje mysz i dotyk jednym kodem). Przycisk **Reset układu**.

### 4. Edytor kodu z podglądem (tematy programistyczne)

```js
LA.demoKod({
  el: '#demko-kod',
  jezyk: 'js' | 'html' | 'css',
  kodStartowy: '…',
  opis: '…',
});
```

- `<textarea>` + przycisk **Uruchom** + panel wyniku. Bez Monaco i CodeMirror.
- Wykonanie w **sandboxowanym `iframe`**: `sandbox="allow-scripts"` (bez `allow-same-origin` — inaczej kod dostaje się do `localStorage` lekcji i do sesji), treść przez `srcdoc`.
- `console.log` z sandboxa przechwycony i pokazany w panelu wyniku (nadpisany `console` w `srcdoc` + `postMessage` do rodzica).
- Błąd wykonania ląduje w panelu wyniku, **nie wysypuje lekcji** (`window.onerror` w sandboxie).
- Przycisk **Przywróć kod startowy**.
- **Kod nigdy nie opuszcza przeglądarki.** Zero `fetch` na serwer.

### Wspólne wymagania

- Każde demko ma **stabilne `id`** — faza 08 zapamiętuje po nim stan. `id` pochodzi z lekcji, nie z licznika renderu.
- Kolory z `czytajZmienna('--wiz-*')` — demka muszą być czytelne w obu motywach.
- Przy zmianie motywu demka **przerysowują się** (faza 08 podpina nasłuch; tu wystarczy wystawić `przerysuj()`).
- Etykiety i komunikaty z `tl()`.
- **Wydruk**: demko drukuje się w stanie początkowym, panel sterowania ukryty (faza 11 to realizuje; tu zadbać, żeby stan początkowy dało się odtworzyć bez przeładowania).
- Klawiatura: suwaki i przyciski są natywnymi kontrolkami, fokus działa domyślnie. Nie zastępować ich `<div>`-ami.

## Reguły dopisane do `prompts/lesson.md`

11. **Każde kluczowe pojęcie ma sterowalne demko.** Statyczny SVG dopuszczalny tylko, gdy sterowanie nie ma sensu (np. oś czasu wydarzeń historycznych) — i wymaga jednozdaniowego uzasadnienia w komentarzu.
12. Dobór poziomu: parametry → domyślnie; krok po kroku → procesy i algorytmy; manipulacja → struktury i geometria; edytor kodu → tematy programistyczne.
13. Demka wołaj **wyłącznie** przez `LA.demoParametry` / `LA.demoKroki` / `LA.demoManipulacja` / `LA.demoKod`. Nie pisz własnych suwaków ani przycisków.
14. Każde demko dostaje stabilne `id`.
15. Kolory wizualizacji z `LA.czytajZmienna('--wiz-N')`, nigdy na sztywno.

Do promptu dołączyć **działający przykład każdego typu** (wzięty z lekcji-wzorca). Przykład działa lepiej niż opis.

## Kroki

1. `LA.demoParametry` — najczęstszy przypadek, wzorzec dla reszty.
2. Style panelu sterowania w `theme.css`; sprawdzić oba motywy.
3. `LA.demoKroki`, `LA.demoManipulacja`.
4. `LA.demoKod` + sandbox. Sprawdzić: nieskończona pętla w kodzie użytkownika nie wiesza lekcji (osobny `iframe` — wiesza tylko siebie; udokumentować, że ratunkiem jest **Uruchom** ponownie, które podmienia `srcdoc`).
5. Dołożyć po jednym demku każdego typu do lekcji-wzorca.
6. Rozszerzyć `prompts/lesson.md` i wygenerować lekcję na temacie programistycznym — sprawdzić, czy edytor faktycznie się pojawia.

## Testy

Automatycznie: funkcje **czyste** wyciągnięte z demek, jeśli takie powstaną (np. przycinanie wartości suwaka do zakresu, indeks kroku przy „dalej" na końcu). Nie naciągać — reszta jest DOM-owa.

Ręczna checklista:
- [ ] Suwak przerysowuje wizualizację płynnie, także przy szybkim przeciąganiu.
- [ ] Krok po kroku: dalej/wstecz na krańcach nie wychodzi poza zakres; odtwarzanie da się zatrzymać.
- [ ] Przeciąganie działa myszą i dotykiem; reset przywraca układ.
- [ ] `console.log` w edytorze pojawia się w panelu wyniku.
- [ ] Błąd składni w edytorze pokazuje komunikat i **nie psuje** lekcji.
- [ ] Kod z edytora nie generuje **żadnego** żądania sieciowego (zakładka Network).
- [ ] Sandbox nie ma dostępu do `localStorage` lekcji (próba w edytorze rzuca).
- [ ] Wszystkie demka czytelne w ciemnym motywie.
- [ ] Etykiety demek w lekcji `en` są po angielsku.

## Definition of Done

- [ ] Cztery typy demek działają w lekcji-wzorcu w obu językach i motywach.
- [ ] Wygenerowana lekcja na temacie **nieprogramistycznym** ma sterowalne demka (nie same obrazki).
- [ ] Wygenerowana lekcja na temacie **programistycznym** ma edytor kodu z działającym podglądem.
- [ ] Sandbox potwierdzony: brak `allow-same-origin`, brak dostępu do storage, błędy izolowane.

## Baza wiedzy

`20-features.md` (tabela poziomów interaktywności, „nauka przez działanie") · `40-architecture.md` („wizualizacje należą do lekcji", sandbox) · `70-tech-stack.md` (textarea + iframe zamiast Monaco) · `50-code-map.md` (mechanika demek w `runtime.js`)
