# LearnAnything — plan implementacji

Rozbicie bazy wiedzy na fazy. Każda faza to jedna sesja implementacyjna kończąca się stanem, który da się uruchomić i sprawdzić. Fazy idą po kolei — kolejna zakłada, że poprzednia jest zamknięta.

**Baza wiedzy (źródło prawdy dla „co"):** `D:\Projects\Kaizen\server\data\projects\-SX_WpozfSXO\knowledge\`
Ten katalog odpowiada tylko za „w jakiej kolejności" i „skąd wiadomo, że gotowe".

**Kod aplikacji:** `D:\Projects\LearnAnything\` (obecnie pusty).

## Mapa faz

| # | Plik | Co powstaje | Stan po fazie |
|---|---|---|---|
| 01 | `01-szkielet-i-store.md` | `package.json`, serwer, `store.js`, numeracja `order` | `npm start` wstaje, `npm test` zielony |
| 02 | `02-claude-i-prompty.md` | `claude.js` na Agent SDK, parser JSON, katalog promptów | smoke test dostaje JSON od Claude'a bez klucza API |
| 03 | `03-wywiad-i-plan.md` | API wywiadu i planu kursu, walidacja widełek | temat → parametry → zwalidowany plan przez `curl` |
| 04 | `04-powloka-ui-i-i18n.md` | powłoka, ekrany 1–3, motyw, i18n | klikalna ścieżka do akceptacji planu |
| 05 | `05-motyw-szablon-runtime.md` | `theme.css`, szablon lekcji, `runtime.js` cz. 1 | ręczna lekcja działa i zapisuje wynik sprawdzianu |
| 06 | `06-kolejka-i-generowanie.md` | kolejka, prompt lekcji, SSE, ekrany 4–5 | pierwsza lekcja wygenerowana przez Claude'a |
| 07 | `07-demka-i-edytor-kodu.md` | mechanika demek, edytor kodu w sandboxie | demka sterowalne, kod wykonuje się w izolacji |
| 08 | `08-stan-lekcji.md` | zapamiętywanie stanu lekcji, motyw w `iframe` | lekcja wraca tam, gdzie ją zostawiono |
| 09 | `09-praktyka-oceniana.md` | ocena ćwiczeń przez Claude'a, `practiceNotes` | ocena wraca, indeks nie puchnie |
| 10 | `10-rozbudowa-i-propozycje.md` | dodawanie lekcji, propozycje z wyników | lekcja `4.1` wstawiona, nic nie kolejkuje się samo |
| 11 | `11-eksport-pdf.md` | `print.css`, strony wydruku | „Zapisz jako PDF" daje czytelny dokument |
| 12 | `12-domkniecie.md` | komplet testów, audyt i18n, README aplikacji | projekt zamknięty wobec bazy wiedzy |

## Ustalenia nowsze niż baza wiedzy

Dwie rzeczy zostały ustalone **po** napisaniu bazy wiedzy. Gdy plan i baza wiedzy się różnią w tych punktach, **wygrywa plan**:

1. **Wyłącznie subskrypcja Claude Code, zero klucza API.** Baza wiedzy o tym wspomina, ale nie mówi, jak to wymusić — patrz sekcja niżej i faza 02.
2. **Dwa języki: polski i angielski.** Baza wiedzy zakłada tylko polski. Kontrakt i18n niżej rozszerza `project.json` o pole `language` i dokłada warstwę tłumaczeń UI.

## Uwierzytelnienie: subskrypcja, nigdy klucz API

Claude Agent SDK uruchamia pod spodem lokalnie zainstalowane Claude Code, więc zalogowane CLI `claude` w zupełności wystarcza. Warunki, których nie wolno złamać:

- **`ANTHROPIC_API_KEY` nie może trafić do procesu Claude'a.** Obecność klucza przełącza rozliczanie na tokeny — dokładnie to, czego nie chcemy. Serwer usuwa go z `env` przekazywanego do SDK, nawet jeśli siedzi w środowisku systemowym.
- **`CLAUDE_CONFIG_DIR` zostaje domyślny** (`~/.claude`) — tam leżą poświadczenia subskrypcji. Nadpisanie go odcina logowanie.
- **`settingSources: []`** — izolacja od cudzych `CLAUDE.md` i ustawień projektowych. Nie ma wpływu na poświadczenia.
- Serwer sprawdza dostępność Claude'a **przy starcie** i przy braku wypisuje czytelny błąd. Nie w połowie generowania piętnastej lekcji.

Gdyby SDK mimo to nie zadziałał na subskrypcji, jest sprawdzony fallback: Kaizen robi to samo spawnując CLI (`D:\Projects\Kaizen\server\src\agents\claudeRunner.ts:109`, `claude -p --output-format stream-json --verbose`). Cała aplikacja woła jedną funkcję `runClaude()` i nie widzi, co jest pod spodem — podmiana to jeden plik.

> Uwaga: baza wiedzy (`70-tech-stack.md:20`, `80-integrations.md:14`) twierdzi, że „Kaizen używa SDK — potwierdzone". To nieprawda: Kaizen spawnuje CLI, SDK nie ma nawet w jego `package.json`. Nie zmienia to decyzji (idziemy SDK), ale wyjaśnia, dlaczego faza 02 traktuje smoke test auth jako bramkę.

## Kontrakt i18n

Dwie **niezależne** osie językowe:

| Oś | Gdzie żyje | Co obejmuje | Kiedy się zmienia |
|---|---|---|---|
| Język interfejsu | `localStorage: learnanything:lang` | powłoka aplikacji, etykiety statusów, komunikaty | dowolnie, przełącznikiem, natychmiast |
| Język kursu | `project.language` w `project.json` | wywiad, plan, treść lekcji, oceny praktyki, teksty w lekcji, spis treści wydruku | raz, przy zakładaniu projektu; potem **niezmienny** |

- Rozdzielone celowo: nauka angielskiej terminologii przy polskim interfejsie to główny przypadek użycia. Przełączenie interfejsu nie rusza wygenerowanych lekcji.
- Wartości: `"pl"` / `"en"`. Start interfejsu z `navigator.language`, domyślnie `pl`.
- **Enumy w danych zostają po polsku** (`zaplanowana`, `gotowa`, `poprawnie`…) — dokładnie jak w `30-data-model.md`. To format danych, nie tekst dla człowieka; UI mapuje je przez `t()` na etykietę w swoim języku.
- **Lekcja jest samodzielna.** Jej teksty interfejsu idą z języka lekcji zapisanego w `<html lang>`, nie z ustawienia powłoki — lekcja otwarta prosto z dysku musi być spójna językowo.
- Reguła obowiązująca każdą fazę: **żaden string widoczny dla użytkownika nie jest wpisany w kod na sztywno.**

## Konwencje techniczne

- **Node.js, ESM, czysty JavaScript.** Bez TypeScriptu, bez bundlera, bez kroku budowania. `server/index.js`, nie `.ts`.
- **Dwie zależności produkcyjne:** `express`, `@anthropic-ai/claude-agent-sdk`. Bez `zod` (walidacja to kilka `if`-ów), bez biblioteki i18n (dwa obiekty i `t()`), bez biblioteki wykresów, bez generatora PDF.
- **Testy:** wbudowane `node --test`. Wywołania Claude'a zawsze zaślepiane.
- **Store to jedyne miejsce dotykające dysku.** Reszta kodu nie zna ścieżek.
- **Generator nie zna HTTP, serwer nie zna promptów.**
- Zapis JSON: całość naraz, po każdej zmianie. Jeden użytkownik, mały wolumen.

## Zasady, których żadna faza nie może złamać

1. **Nic nie powstaje samo z siebie.** Plan kursu i każda dodatkowa lekcja wymagają akcji użytkownika. Żadna ścieżka w kodzie nie dopisuje lekcji do kolejki z własnej inicjatywy. Bufor generowania (`store.readBuffer()`, domyślnie 3 lekcje z przodu) uzupełnia się wyłącznie na końcu żądania, które wywołał użytkownik: akceptacji planu albo oddania sprawdzianu.
2. **Historia jest niezmienna.** Nowa lekcja nie może trafić przed ostatnią lekcję o statusie `ukończona`. Istniejące lekcje nigdy nie są przenumerowywane.
3. **Spójność wymusza aplikacja, nie prompt.** Wygląd, wzorce dydaktyczne i logika sprawdzianu należą do `theme.css`, `runtime.js` i szablonu. Claude wypełnia sekcje.
4. **Bez limitu prób oceny praktyki.** Żadnego licznika, blokady ani odliczania.
5. **Kod z edytorów w lekcji nie opuszcza przeglądarki.**

## Kształt danych (referencja dla wszystkich faz)

`data/projects/<projectId>/project.json`:

```json
{
  "id": "abc123",
  "topic": "Teoria muzyki",
  "language": "pl",
  "createdAt": "2026-08-15T10:00:00.000Z",
  "interview": { "skipped": false, "questions": [], "answers": [] },
  "course": { "level": "początkujący", "pace": "normalne", "scope": "standardowy" },
  "status": "generowanie",
  "queue": ["l3", "l4"]
}
```

`data/projects/<projectId>/index.json` — tablica wpisów lekcji posortowana po `order`:

```json
[{
  "id": "l1",
  "order": 1,
  "title": "Czym jest dźwięk",
  "brief": "Fizyczna natura dźwięku i jak powstaje wysokość.",
  "origin": "plan",
  "path": "lessons/01-czym-jest-dzwiek",
  "status": "gotowa",
  "summary": "Omówiono częstotliwość, amplitudę i barwę.",
  "covers": ["częstotliwość", "amplituda", "barwa"],
  "score": null,
  "practiceNotes": [],
  "completedAt": null
}]
```

Wartości enum (zawsze po polsku, niezależnie od `language`):

- `project.status`: `nowy` · `wywiad` · `plan` · `generowanie` · `gotowy`
- `lesson.status`: `zaplanowana` · `generowana` · `gotowa` · `ukończona` · `błąd`
- `lesson.origin`: `plan` · `pośrednia` · `powtórka` · `rozwinięcie` · `nowy wątek`
- `course.level`: `początkujący` · `średni` · `zaawansowany`
- `course.pace`: `wolne` · `normalne` · `szybkie`
- `course.scope`: `podstawy` · `standardowy` · `szeroki`
- `verdict` oceny praktyki: `poprawnie` · `częściowo` · `niepoprawnie`

## Docelowy układ katalogów

```
LearnAnything/
  package.json
  server/
    index.js       config.js      store.js
    api.js         queue.js       generator.js
    claude.js      prompts/*.md
  public/
    index.html     app.js         app.css        i18n.js
    theme.css      print.css      runtime.js
    lesson-template.html
  data/projects/<id>/
  test/*.test.js
  implementation-plan/
```

## Struktura każdego pliku fazy

`Cel` · `Pliki` · `Kontrakty` · `Kroki` · `Testy` · `Definition of Done` · `Baza wiedzy`
