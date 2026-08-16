# Faza 13 — Biblioteka komponentów, samorozwijająca się

## Cel

Odebrać modelowi rysowanie. W wygenerowanych lekcjach tekst wyjeżdżał poza pole i elementy nachodziły na siebie, bo model pisał `<text>` na sztywnych współrzędnych i ciął treść przez `slice(0, 92)`. Wizualizacje mają pochodzić z biblioteki gotowych komponentów, a gdy żaden nie pasuje — lekcja **zamawia** nowy, ten przechodzi kontrolę w prawdziwej przeglądarce i automatycznie wchodzi do biblioteki. Każdy kurs zostawia po sobie więcej klocków niż zastał.

## Pliki

| Plik | Zmiana |
|---|---|
| `public/komponenty/*.js` | **nowe** — jeden plik na komponent (`meta`, `probki`, `style`, `rysuj`) |
| `public/galeria.html` | **nowa** — podgląd biblioteki i harness kontroli |
| `server/komponenty.js` | **nowy** — `katalog()`, `katalogTekst()`, `meta()` |
| `server/prompts/komponent.md` | **nowy** — pisanie i naprawa komponentu |
| `server/prompts/lesson-poprawka.md` | **nowy** — łatanie lekcji po nieudanej kontroli |
| `scripts/sprawdz-komponenty.js` | **nowy** — `npm run sprawdz`, reguły wizualne |
| `test/komponenty.test.js` | **nowy** — kontrakt plików bez DOM |
| `public/runtime.js` | rejestr, `LA.komponent`, tryb `staly`, aliasy `LA.demo*` |
| `server/generator.js` | katalog w promptcie, uszczelka, pipeline zamówień, kontrola lekcji |
| `server/prompts/lesson.md` | sekcja „Komponenty" zamiast czterech przykładów demek |
| `server/store.js` | etap `komponent`, `komponentySnapshot`, `zapiszKomponent` |
| `server/claude.js` | `additionalDirectories` w opcjach SDK |
| `server/api.js` | `GET /api/komponenty` |
| `public/i18n.js`, `public/theme.css` | etap `komponent`, `.blad-komponentu` |

## Kontrakty

**Plik komponentu.** `meta` (`nazwa` = nazwa pliku, `opis`, `dane`, `tryby`, `przyklad`), `probki` (≥ 2, w tym wroga: 12 pozycji i etykiety po 120 znaków, serializowalne do JSON), `style` (string, każdy selektor od `.k-<nazwa>`), `rysuj(cel, dane, ctx)`. Zero importów — helpery przychodzą w `ctx` (`el`, `tl`, `czytajZmienna` plus `wartosci` / `krok` / `elementy` zależnie od trybu). Import względny dałby drugą instancję `runtime.js` (inny URL = inny moduł), czyli drugie `window.LA`.

**Wywołanie z lekcji.** `LA.komponent({ el, id, nazwa, dane, tryb, … })`. Tryb wynika z pól: `kontrolki` → `parametry`, `kroki` → `kroki`, `elementy` → `manipulacja`, `jezyk`/`kodStartowy` → `kod`, inaczej `staly`. W trybach interaktywnych `dane` jest funkcją stanu; przy `kroki` pola kroku scalają się z `dane` same.

**Ładowanie.** Dynamiczny `import('/komponenty/<nazwa>.js')`, bez manifestu — lekcja płaci za tyle żądań, ilu komponentów użyła. Nieznany komponent renderuje `.blad-komponentu` i nigdy nie rzuca.

**Zamówienie.** Pole `komponenty` w bloku JSON lekcji: `{ nazwa, opis, dane, probki }`. Maksymalnie 3 na lekcję, nazwa `/^[a-z][a-z0-9-]{2,31}$/`, duplikaty i istniejące odpadają.

## Kroki

1. **Rejestr w runtime.** `LA.komponent`, tryb `staly`, cztery dotychczasowe demka jako wewnętrzne powłoki, aliasy `LA.demoParametry` i reszta — żeby kursy sprzed biblioteki działały bez zmiany bajtu.
2. **Startowa szóstka.** `karty`, `slupki`, `os-czasu`, `tabela`, `przeplyw`, `wykres-xy` — każdy odpowiada kształtowi, który model rysował już ręcznie. Plus `galeria.html` i `GET /api/komponenty`.
3. **Kontrola wizualna.** `playwright-core` + systemowa przeglądarka (`chrome` → `msedge` → `chromium`). Macierz: komponent × próbka × 2 motywy × 2 szerokości (1000 i 560 px). Test akceptacyjny: celowo zepsuty komponent musi zostać złapany.
4. **Katalog w promptcie.** `server/komponenty.js` + przepisanie `lesson.md`. **Po tym kroku pierwotny błąd jest naprawiony** — model nie pisze już SVG.
5. **Etap `komponent`.** Sonnet, `maxTurns` 12, 5 min. Pierwsze podejście + 2 rundy naprawcze z raportem błędów. Sukces → `store.zapiszKomponent`.
6. **Kontrola lekcji i łatanie.** Twarde usterki (`blad-konsoli`, `tekst-poza-kadrem`, `pusty-render`, nieznany komponent) uruchamiają jedno tanie łatanie `lesson.js`; dopiero jego porażka oddaje lekcję kolejce.
7. **Uszczelka.** Biblioteka jest w `additionalDirectories`, żeby model doczytał źródło — SDK nie zna katalogu tylko do odczytu, więc `komponentySnapshot()` przed i po etapie `lekcja` unieważnia lekcję, która tam napisała.

## Testy

| Obszar | Test |
|---|---|
| Kontrakt plików: import w Node, `meta`, `probki`, selektory, zero literałów koloru | `komponenty.test.js` |
| Katalog dla promptu: linia na komponent, budżet znaków | `komponenty.test.js` |
| Katalog w promptcie lekcji, `additionalDirectories` | `lesson-generation.test.js` |
| Uszczelka: lekcja pisząca po bibliotece jest unieważniona | `lesson-generation.test.js` |
| Zamówienie uruchamia etap `komponent` i wchodzi do biblioteki | `lesson-generation.test.js` |
| Rundy naprawcze i jedno łatanie lekcji | `lesson-generation.test.js` |
| Filtr zamówień: duplikaty, złe nazwy, nadmiar ponad trzy | `lesson-generation.test.js` |

Playwright **nie wchodzi** do `npm test` — testy jednostkowe mają chodzić w sekundach i bez przeglądarki. Kontrola to `npm run sprawdz` i wywołanie z generatora.

## Definition of Done

- [ ] `npm test` zielone, bez startowania przeglądarki.
- [ ] `npm run sprawdz` — cała biblioteka bez zastrzeżeń w obu motywach i przy obu szerokościach.
- [ ] `node scripts/sprawdz-komponenty.js --lekcja <katalog>` przechodzi na świeżo wygenerowanej lekcji.
- [ ] Kurs sprzed biblioteki (fixture) nadal się renderuje — aliasy działają.
- [ ] `/galeria.html` pokazuje wszystkie komponenty z próbkami.
- [ ] Lekcja, która zamówiła komponent, zostawia go w `public/komponenty/`.

## Baza wiedzy

Powód istnienia fazy jest empiryczny, nie teoretyczny: sześć lekcji w `data/projects/` miało po 15–37 elementów `<text>`, ręczne łamanie przez `slice()` i `font-size: 9.5px`. Reguła promptu tego nie powstrzymała — dlatego kontrola jest kodem uruchamianym w przeglądarce, a nie zdaniem w instrukcji.
