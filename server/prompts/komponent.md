Napisz **jeden komponent** biblioteki wizualizacji aplikacji LearnAnything.

## Zamówienie

{{spec}}

## Poprzednia kontrola w przeglądarce

{{raport}}

## Plik

Napisz narzędziem `Write` **dokładnie jeden plik** `{{nazwa}}.js` w katalogu roboczym.
Żadnych plików pomocniczych, testów ani notatek — nadmiarowy plik unieważnia komponent.

Wzór do naśladowania (możesz doczytać istniejące komponenty narzędziem `Read`
z katalogu `public/komponenty/` — **nie zmieniaj ich**):

```js
export const meta = {
  nazwa: 'karty',
  opis: 'Siatka kart z tytułem i treścią; tekst zawija się sam. Do zestawień pojęć, ról, składników.',
  dane: '{ karty: [{ tytul, tresc, akcent?: 1..5 }], kolumny?: number }',
  tryby: ['staly', 'parametry', 'kroki'],
  przyklad: "LA.komponent({ el: '#k1', nazwa: 'karty', dane: { karty: [{ tytul: 'KTO', tresc: '…' }] } })",
};

export const probki = [
  { nazwa: 'typowa', dane: { karty: [{ tytul: 'KTO', tresc: 'Hela, córka latarnika' }] } },
  { nazwa: 'wrogie dane', dane: { karty: [/* 12 pozycji, etykiety po 120 znaków */] } },
];

export const style = `
.k-karty { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.6rem; }
.k-karty > article { border: 1px solid var(--border); padding: 0.7rem; min-width: 0; }
`;

export function rysuj(cel, dane, ctx) {
  const siatka = ctx.el('div', { className: 'k-karty' });
  for (const karta of dane?.karty ?? []) {
    siatka.append(ctx.el('article', {}, [ctx.el('p', { textContent: String(karta.tresc ?? '') })]));
  }
  cel.replaceChildren(siatka);
}
```

## Twarde reguły

1. **Tekst renderuj w HTML, nigdy w SVG.** To jest powód istnienia tej biblioteki: `<text>` nie
   zawija się i przy dłuższych danych wyjeżdża poza `viewBox`. SVG wolno użyć wyłącznie do
   prawdziwej geometrii (krzywe, osie, kształty), a napisy w nim mają być krótkie — liczby,
   jedno słowo — i mieścić się w kadrze przy każdej próbce.
2. **Zero importów.** Helpery przychodzą w `ctx`: `ctx.el(tag, props, dzieci)`, `ctx.tl(klucz)`,
   `ctx.czytajZmienna('--wiz-1')`. Zależnie od trybu dochodzą `ctx.wartosci` (parametry),
   `ctx.krok` i `ctx.indeks` (kroki), `ctx.elementy` (manipulacja).
3. **`document` dotykasz wyłącznie wewnątrz `rysuj`.** Plik jest importowany także w Node,
   przy budowaniu katalogu — cokolwiek na najwyższym poziomie sięgnie po DOM, wywala serwer.
4. **Zero literałów koloru.** Żadnych `#rrggbb`, `rgb()`, `hsl()` ani nazw kolorów. Wyłącznie
   zmienne motywu: `--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--border`,
   `--accent`, `--ok`, `--warn`, `--danger` oraz `--wiz-1`…`--wiz-5`, `--wiz-siatka`,
   `--wiz-podswietlenie`. Komponent musi wyglądać poprawnie w jasnym i ciemnym motywie.
5. **Każdy selektor w `style` zaczyna się od `.k-{{nazwa}}`.** Style są wspólne dla całego
   dokumentu — selektor bez tego przedrostka psuje inne komponenty i samą lekcję.
6. **`border-radius` zawsze `0`.** Bez zaokrągleń, bez cieni w kolorze, bez media query.
7. **Układ ma ustępować, nie przycinać.** `min-width: 0`, `overflow-wrap: anywhere`, zawijanie
   siatek i wierszy. Font nie schodzi poniżej `0.75rem`. Żadnego `overflow: hidden` na tekście,
   żadnego cięcia treści przez `slice()`.
8. **Dane są niepewne.** Brak pola, pusta tablica, zero, wartości ujemne i teksty dłuższe niż
   przykład nie mają prawa wysypać komponentu ani rozwalić układu.
9. **`probki` to tablica co najmniej dwóch pozycji**, w tym obowiązkowo jedna **wroga**:
   dwanaście elementów i etykiety po sto dwadzieścia znaków. Muszą być czystym JSON-em
   (żadnych funkcji), bo przechodzą przez stronę galerii.
10. **Komponent jest ogólny.** Nazywa kształt wizualizacji, nie temat jednej lekcji.
11. **Cała treść widoczna dla użytkownika w języku `{{language}}`** — dotyczy `meta.opis`
    i danych w próbkach. Nazwy pól, kluczy i klas CSS zostają takie, jak tutaj.

## Sprawdzenie

Po zapisaniu plik trafia do prawdziwej przeglądarki: każda próbka × jasny i ciemny motyw ×
szerokość 1000 i 560 px. Automat sprawdza, czy tekst nie wychodzi poza `viewBox`, czy napisy
nie nachodzą na siebie, czy nic nie jest ucięte, czy nic nie wystaje poza pole rysunku, czy
font nie zszedł za nisko i czy konsola jest czysta. Znalezione usterki wracają do Ciebie —
dlatego wroga próbka ma być naprawdę wroga, a nie ozdobna.

## Na koniec

Po zapisaniu pliku zwróć **wyłącznie** blok ```json:

```json
{ "nazwa": "{{nazwa}}", "opis": "jedno zdanie o tym, co komponent rysuje i kiedy go użyć" }
```
