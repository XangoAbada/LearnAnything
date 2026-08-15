# Faza 08 — Zapamiętany stan lekcji i motyw w lekcji

## Cel

Lekcja ma wracać w tym stanie, w jakim została zostawiona — także po zamknięciu przeglądarki. Odsłonięte odpowiedzi, wpisany kod, pozycje suwaków, zaznaczenia sprawdzianu.

Do tego druga rzecz z tej samej mechaniki: **zmiana motywu w powłoce działa natychmiast w otwartej lekcji**, bez przeładowania i bez `postMessage`.

Serwer o niczym z tego nie wie.

## Pliki

| Plik | Zmiana |
|---|---|
| `public/runtime.js` | zapis/odtworzenie stanu, nasłuch motywu, „Zacznij od nowa" |
| `public/app.js` | czyszczenie kluczy przy usuwaniu projektu |
| `test/lesson-state.test.js` | serializacja stanu |

## Kontrakty

### Klucz i kształt

```
localStorage: learnanything:<projectId>:<lessonId>
```

```json
{
  "chowane":    { "pojecie-1-odpowiedz": true },
  "cwiczenia":  { "c1": { "odpowiedz": "…", "ocena": { "verdict": "częściowo", "feedback": "…", "hint": "…" } } },
  "edytory":    { "kod-1": "console.log(1)" },
  "demka":      { "demko-fala": { "czest": 880, "tryb": "sinus" }, "demko-sort": { "krok": 3 } },
  "sprawdzian": { "odpowiedzi": { "q1": [0], "q2": [1,2] }, "oddany": true }
}
```

- **Podgląd edytora nie jest zapisywany** — odtwarza się po kliknięciu **Uruchom**. Zapisywanie wyrenderowanego wyniku to zapisywanie czegoś, co i tak trzeba przeliczyć.
- Ocena z Claude'a żyje **tylko tutaj**; do `index.json` idzie sam skrót w `practiceNotes` (faza 09).

### API

```js
LA.stan.wczytaj()            // -> obiekt ; {} przy braku lub uszkodzeniu
LA.stan.zapisz(sciezka, v)   // np. ('demka.demko-fala', {czest: 880})
LA.stan.wyczysc()            // usuwa klucz tej lekcji
```

- Zapis przy **każdej zmianie**, z krótkim `debounce` (~200 ms) — przeciąganie suwaka nie ma pisać do storage sto razy na sekundę.
- Odczyt raz, przy starcie lekcji, przed pierwszym renderem — inaczej widać mignięcie stanu domyślnego.
- **Uszkodzony wpis jest ignorowany** (`try/catch` wokół `JSON.parse`), lekcja startuje od zera. Nieznany klucz (lekcja przegenerowana) też jest ignorowany. Bez wersjonowania i migracji — stan to wygoda, nie źródło prawdy.
- Brak `localStorage` (tryb prywatny, lekcja z `file://`) nie może wysypać lekcji — wszystkie operacje w `try/catch`.

### Odtwarzanie

| Element | Co wraca |
|---|---|
| Chowane sekcje i mikro-pytania | które są odsłonięte |
| Rozwiązania wzorcowe ćwiczeń | odsłonięte, jeśli były |
| Ćwiczenia | wpisana odpowiedź i ostatnia ocena |
| Edytory kodu | wpisany kod (podgląd po **Uruchom**) |
| Demka | pozycje kontrolek, bieżący krok, ustawiony układ |
| Sprawdzian | zaznaczenia i to, czy został oddany (z wynikiem i uzasadnieniami) |

Odtworzenie to przejście po kluczach stanu — działa, bo elementy mają **stabilne `id`** ustalone w fazach 05 i 07.

### „Zacznij lekcję od nowa"

- Przycisk w nagłówku lekcji, z potwierdzeniem.
- Kasuje **klucz tej jednej lekcji** i przeładowuje `iframe`.
- **Wynik sprawdzianu w `index.json` zostaje nienaruszony** — historia nauki nie jest własnością przeglądarki.

### Motyw w lekcji

- Lekcja czyta `localStorage: learnanything:theme` przy starcie i ustawia `data-theme` na swoim `<html>`.
- Nasłuch zdarzenia `storage` — przeglądarka wysyła je do **innych** dokumentów tego samego origin, czyli powłoka → `iframe` działa bez `postMessage`.
- Po zmianie motywu demka **przerysowują się** (kolory z `czytajZmienna` trzeba pobrać na nowo) — wywołać `przerysuj()` każdego demka z fazy 07.
- Lekcja otwarta bez powłoki bierze motyw z tej samej wartości albo z `prefers-color-scheme`.

### Sprzątanie

- Usunięcie projektu (ekran 1) czyści **wszystkie** klucze `learnanything:<projectId>:*` — po stronie powłoki, bo tylko ona wie o usunięciu.
- Osieroconych kluczy (lekcja usunięta inaczej) nie ścigamy. Kilka bajtów w storage nikomu nie szkodzi.

## Kroki

1. `LA.stan` — wczytanie, zapis ze ścieżką, debounce, `try/catch` wszędzie.
2. Podpiąć pod chowane sekcje i sprawdzian (elementy z fazy 05).
3. Podpiąć pod demka i edytory (faza 07) — tam, gdzie faza 07 wystawiła `przyZmianie`.
4. Ćwiczenia: pole odpowiedzi i ostatnia ocena (pełne podpięcie oceny w fazie 09; tu zapamiętać treść pola).
5. Przycisk „Zacznij lekcję od nowa".
6. Motyw: odczyt przy starcie + nasłuch `storage` + przerysowanie demek.
7. Czyszczenie kluczy przy usuwaniu projektu.

## Testy (`node --test`)

Logikę serializacji trzymać w czystych funkcjach, żeby dały się testować bez DOM (`zapiszSciezke(obiekt, 'demka.x', v)`, `scalStan(zapisany, domyslny)`):
- `zapiszSciezke` tworzy brakujące poziomy i nie kasuje rodzeństwa;
- `scalStan` z pustym zapisem → stan domyślny;
- uszkodzony JSON → `{}`, bez wyjątku;
- nieznany klucz w zapisie jest ignorowany, znane wracają;
- czyszczenie usuwa **tylko** klucz tej lekcji (test na atrapie `localStorage` — zwykły obiekt z `getItem`/`setItem`/`removeItem`).

## Definition of Done

- [ ] Wypełniona lekcja po zamknięciu i otwarciu przeglądarki wraca w całości: odsłonięcia, kod, suwaki, sprawdzian.
- [ ] „Zacznij od nowa" czyści lekcję, **nie rusza** wyniku w `index.json` ani innych lekcji.
- [ ] Ręczne popsucie wpisu w DevTools → lekcja startuje od zera, bez błędu w konsoli.
- [ ] Zmiana motywu w powłoce natychmiast przestawia otwartą lekcję **razem z demkami**.
- [ ] Usunięcie projektu czyści jego klucze (sprawdzone w DevTools).
- [ ] `npm test` zielony.

## Baza wiedzy

`20-features.md` (tabela zapamiętywanego stanu, motyw) · `30-data-model.md` (klucze `localStorage`, „stan jest wygodą, nie źródłem prawdy") · `40-architecture.md` („stan lekcji należy do przeglądarki", nasłuch `storage`) · `95-testing.md` (testy stanu)
