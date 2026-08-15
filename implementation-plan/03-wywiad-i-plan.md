# Faza 03 — Wywiad wstępny i plan kursu

## Cel

Domknąć backendową ścieżkę od tematu do zaakceptowanego planu: pytania wywiadu → ocena odpowiedzi → parametry kursu → plan lekcji zwalidowany względem widełek → zapis do `index.json` i kolejki. Wszystko sprawdzalne `curl`-em, bez UI.

Kolejka jeszcze nie rusza (faza 06) — akceptacja planu na razie tylko zapisuje `project.queue`.

## Pliki

| Plik | Zmiana |
|---|---|
| `server/api.js` | **nowy** — trasy REST projektów, wywiadu, planu |
| `server/generator.js` | **nowy** — budowa promptów i walidacja wyników |
| `server/index.js` | montaż `api.js` |
| `server/prompts/interview-questions.md` | wypełnić |
| `server/prompts/interview-assess.md` | wypełnić |
| `server/prompts/course-plan.md` | wypełnić |
| `test/plan-validation.test.js` | widełki i ponowienie |

## Kontrakty

### Endpointy

| Metoda | Ścieżka | Wejście | Wyjście |
|---|---|---|---|
| `GET` | `/api/projects` | — | `[{ id, topic, language, status, progress:{done,total} }]` |
| `POST` | `/api/projects` | `{ topic, language }` | projekt, `status: "nowy"` |
| `GET` | `/api/projects/:id` | — | `{ project, lessons, suggestions: [], minInsertOrder }` |
| `DELETE` | `/api/projects/:id` | — | `204` |
| `POST` | `/api/projects/:id/interview` | — | `{ questions: [...] }`, `status → "wywiad"` |
| `POST` | `/api/projects/:id/interview/answers` | `{ answers: [...] }` | `{ level, pace, scope, summary }`, `status → "plan"` |
| `POST` | `/api/projects/:id/interview/skip` | — | domyślne parametry, `status → "plan"` |
| `POST` | `/api/projects/:id/plan` | `{ comment? }` | `{ lessons: [{order,title,brief}] }` |
| `POST` | `/api/projects/:id/plan/accept` | `{ lessons: [...] }` | zapis `index.json` + `queue`, `status → "generowanie"` |

`suggestions` i pełna logika `minInsertOrder` przychodzą w fazie 10 — na razie `[]` i wartość ze `store.minInsertOrder`.

### Wywiad

Pytania: **jeden zestaw ~6**, miks otwartych („co już wiesz", „po co ci to") i **sprawdzających wiedzę**. Kształt:

```json
{ "questions": [
  { "id": "q1", "text": "…", "kind": "otwarte" },
  { "id": "q2", "text": "…", "kind": "wybór", "options": ["…","…"] }
]}
```

Ocena — **jedno wywołanie** na komplet odpowiedzi:

```json
{ "level": "początkujący", "pace": "normalne", "scope": "standardowy",
  "summary": "zdanie–dwa o tym, co użytkownik już umie" }
```

Walidacja: `level`/`pace`/`scope` muszą należeć do enumów (patrz `00-README.md`). Wartość spoza zbioru → wartość domyślna + wpis do logu; nie warto ponawiać całego wywiadu z powodu jednego pola.

`interview/skip` — dostępny **w każdym momencie**, także po części odpowiedzi. Ustawia `interview.skipped = true` i domyślne `początkujący / normalne / standardowy`. Bez wywołania modelu.

Odpowiedzi i pytania lądują w `project.interview` (kontekst dla późniejszych promptów).

### Plan kursu i widełki

| Zakres | Liczba lekcji |
|---|---|
| `podstawy` | 5–8 |
| `standardowy` | 10–15 |
| `szeroki` | 18–25 |

Tempo **nie zmienia liczby lekcji** — steruje gęstością jednej lekcji (2–3 / 4–5 / 6–8 pojęć, 2 / 3 / 5 ćwiczeń). To wchodzi do promptu lekcji w fazie 06; tu trafia do promptu planu tylko jako kontekst.

Walidacja serwera:

```js
validatePlan(lessons, scope)   // -> true | throw
```

Poza widełkami → **jedno ponowienie promptu** z dopiskiem: *„Poprzedni plan miał N lekcji. Wymagane: X–Y. Zwróć plan mieszczący się w widełkach."* Druga porażka → `502` z czytelnym komunikatem (nie cichy przycinacz listy — użytkownik ma wiedzieć, że model nie posłuchał).

`POST /plan` z `comment` („więcej praktyki", „krócej") dokłada komentarz do promptu i przelicza plan od zera. Plan **nie jest zapisywany** przed akceptacją — żyje w odpowiedzi HTTP.

### Akceptacja planu

Przyjmuje listę lekcji **z ewentualnie poprawionymi tytułami** (edycja w miejscu w UI). Serwer:
1. waliduje widełki ponownie (klient mógł namieszać),
2. nadaje `lessonId`, `order` = `1..n`, `origin: "plan"`, `status: "zaplanowana"`, `path` ze `slugify`,
3. zapisuje `index.json`,
4. wypełnia `project.queue` identyfikatorami w kolejności `order`,
5. `status → "generowanie"`,
6. **nie startuje kolejki** (faza 06).

Ponowna akceptacja na projekcie, który ma już lekcje → `409`. Plan akceptuje się raz; dokładanie idzie ścieżką z fazy 10.

### Język

Każdy prompt tej fazy dostaje `{{language}}` z `project.language`. Pytania wywiadu, `summary`, tytuły i `brief` lekcji powstają w języku projektu. Enumy zostają po polsku — prompt to jawnie zastrzega (faza 02).

## Kroki

1. `api.js` — router Express, `express.json()`, obsługa błędów: brak projektu → `404`, zły kształt wejścia → `400`, błąd modelu → `502`.
2. `generator.js` — po jednej funkcji na zadanie: `interviewQuestions(project)`, `assessInterview(project, answers)`, `planCourse(project, comment)`. Każda składa prompt z `prompts.js` i woła `runClaudeJson` z walidatorem.
3. `validatePlan` + logika jednego ponowienia **w generatorze**, nie w API.
4. Napisać trzy prompty. Zaznaczyć w nich twardo: liczba lekcji, format wyjścia, język, zakaz tłumaczenia enumów.
5. Przejść ścieżkę `curl`-em dla projektu `pl` i projektu `en`.

## Testy (`node --test`)

`test/plan-validation.test.js` — z zaślepionym `runClaude`:
- 5, 8 lekcji przy `podstawy` → przechodzi; 4 i 9 → ponowienie;
- ponowienie zwracające poprawny plan → sukces, dokładnie **dwa** wywołania modelu;
- drugie niepowodzenie → błąd, **nie** przycięcie listy;
- ocena wywiadu z `level: "ekspert"` (spoza enumu) → wartość domyślna, brak wyjątku;
- `skip` ustawia domyślne parametry i `skipped: true` bez wołania modelu;
- akceptacja planu nadaje `order` `1..n`, statusy `zaplanowana` i wypełnia `queue` w kolejności;
- druga akceptacja → `409`.

## Definition of Done

- [ ] `curl` przechodzi całą ścieżkę: utworzenie → wywiad → odpowiedzi → plan → akceptacja; `index.json` i `queue` wyglądają poprawnie.
- [ ] Ta sama ścieżka dla projektu `language: "en"` daje pytania i tytuły po angielsku, a enumy po polsku.
- [ ] „Pomiń wywiad" działa na świeżym projekcie i w połowie wywiadu.
- [ ] Plan poza widełkami ponawiany dokładnie raz.
- [ ] `npm test` zielony.

## Baza wiedzy

`20-features.md` (wywiad, planowanie, widełki, tempo) · `60-api-surface.md` (endpointy) · `80-integrations.md` (zadania modelu) · `95-testing.md` (walidacja planu)
