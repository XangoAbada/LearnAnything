# Faza 06 — Kolejka, generowanie lekcji i ekrany 4–5

## Cel

Serce aplikacji: kolejka generuje lekcje w tle po jednej, Claude pisze pliki lekcji według szablonu z fazy 05, postęp idzie na żywo do UI przez SSE, a użytkownik ogląda gotową lekcję w `<iframe>`.

Po tej fazie aplikacja **działa end-to-end**: temat → wywiad → plan → wygenerowana lekcja → sprawdzian → wynik.

## Pliki

| Plik | Zmiana |
|---|---|
| `server/queue.js` | **nowy** — kolejka w pamięci, stan w `project.queue` |
| `server/generator.js` | dopisać `generateLesson(project, lesson, index)` |
| `server/api.js` | SSE `/events`, `POST /lessons/:id/retry` |
| `server/index.js` | odtworzenie kolejki po restarcie |
| `server/prompts/lesson.md` | najważniejszy prompt w projekcie |
| `public/app.js` | ekran 4 (projekt) i ekran 5 (lekcja) |
| `test/queue.test.js` | kolejność, statusy, recovery |

## Kontrakty

### Kolejka

```js
export function enqueue(projectId, lessonId)
export function enqueueNext(projectId)     // -> lesson|null ; jedna kolejna z planu
export function topUp(projectId)          // -> number ; dociąga do bufora z ustawień
export function startWorker()            // odpala pętlę, jeśli nie chodzi
export function recoverOnBoot()          // po restarcie: 'generowana' → 'zaplanowana'
export function queueState(projectId)    // -> { running: lessonId|null, waiting: [...] }
```

Zasady:
- **jedna lekcja naraz** w całym procesie — nie jedna na projekt;
- następna do wzięcia to **czekająca lekcja o najniższym `order`**, nie najstarsza w kolejce. Lekcja wstawiona w środek kursu (faza 10) wyprzedza dalsze, ale **nie przerywa** bieżącej;
- stan trwały w `project.queue`; kolejka w pamięci to tylko pętla;
- **pierwsza lekcja ma priorytet** — wynika z sortowania po `order`, nie z osobnego mechanizmu;
- porażka → `status: "błąd"`, `error` w wpisie lekcji, **kolejka idzie dalej**;
- kolejka rusza **wyłącznie** z akcji użytkownika: akceptacja planu (03), oddanie sprawdzianu, „Generuj następną” albo dodanie lekcji (10). Żadnego samoczynnego dokładania;
- kurs **nie idzie do kolejki w całości**: `topUp(projectId)` dokłada lekcje, aż zapas (gotowe + czekające, bez lekcji z `błąd`) sięgnie bufora z ustawień; `enqueueNext(projectId)` dokłada jedną z ręki użytkownika i zwraca `null`, gdy nie ma już `zaplanowanych`;
- `status: "gotowy"` należy się projektowi dopiero, gdy kolejka jest pusta **i** nie została żadna lekcja `zaplanowana`.

Recovery po restarcie: każda lekcja `generowana` wraca do `zaplanowana` i do kolejki (proces zginął w połowie — pliki mogą być niekompletne, generujemy od nowa).

### Zdarzenia SSE

`GET /api/projects/:id/events`, `Content-Type: text/event-stream`:

| Zdarzenie | Dane |
|---|---|
| `lesson-started` | `{ lessonId, title }` |
| `lesson-ready` | `{ lessonId, title, order }` |
| `lesson-failed` | `{ lessonId, error }` |
| `queue-empty` | `{}` |

Odpięcie klienta przy `close`. Heartbeat co ~30 s (komentarz `:\n\n`), żeby połączenie nie umarło po cichu.

### Generowanie lekcji

```js
generateLesson(project, lesson, index)   // -> { summary, covers[] }
```

Do promptu trafia:

| Wejście | Skąd |
|---|---|
| temat | `project.topic` |
| język | `project.language` |
| poziom / tempo / zakres | `project.course` |
| tytuł i `brief` | wpis lekcji |
| **indeks poprzednich lekcji** | `title` + `summary` + `covers` lekcji o niższym `order` |
| **słabe punkty** | `practiceNotes` i niskie `score` z wcześniejszych lekcji |
| **pojęcia do powtórki** | `covers` z wcześniejszych lekcji (20–30% sprawdzianu) |
| liczba pojęć i ćwiczeń | z tempa: `wolne` 2–3 pojęcia / 2 ćwiczenia, `normalne` 4–5 / 3, `szybkie` 6–8 / 5 |
| szablon i klasy CSS | `lesson-template.html` + lista klas z fazy 05 |

Claude **pisze pliki na dysk**: `index.html`, `lesson.js`, `lesson.css` w katalogu lekcji. Wywołanie `runClaude` dostaje:
- `cwd` = katalog lekcji,
- `allowedTools: ['Write', 'Read']`,
- `permissionMode: 'acceptEdits'`,
- `maxTurns` z zapasem (kilkanaście — pisze kilka plików),
- `timeoutMs` liczony w minutach, nie sekundach.

**Zapis wyłącznie w katalogu tej lekcji.** `cwd` ustawiony na katalog lekcji plus brak `additionalDirectories` to podstawowa granica; po zakończeniu weryfikacja, że powstały dokładnie trzy oczekiwane pliki i nic poza nimi.

Na koniec Claude zwraca blok JSON:

```json
{ "summary": "co lekcja faktycznie zawiera",
  "covers": ["pojęcie 1", "pojęcie 2"] }
```

Store zapisuje to we wpisie lekcji i ustawia `status: "gotowa"`. Brak `summary`/`covers` → lekcja liczy się jako `błąd` (bez nich kolejne lekcje będą dublować materiał — cichy zapis pustych pól psuje kurs kilka lekcji później).

### Reguły w `prompts/lesson.md` (twarde, nie sugestie)

1. Wypełnij szablon — **nie zmieniaj struktury sekcji ani kolejności**.
2. Kolory **wyłącznie** ze zmiennych motywu (lista zmiennych w prompcie). Zero wartości `#rrggbb`.
3. Każde kluczowe pojęcie: `.pojecie` z reprezentacją wizualną w `.diagram`.
4. Po każdej sekcji teorii **jedno** `.mikro-pytanie` z chowaną odpowiedzią.
5. Przykłady z **wygaszaniem wsparcia**: pierwszy rozwiązany w całości, kolejny częściowo, ostatni samodzielnie.
6. Ćwiczeń dokładnie tyle, ile mówi tempo, każde z **rozwiązaniem wzorcowym** w `lesson.js`.
7. Sprawdzian: pytania **zamknięte**, każde z uzasadnieniem; **20–30% pytań z `covers` wcześniejszych lekcji**.
8. Zero zasobów z sieci, zero plików graficznych, zero bibliotek. SVG / Canvas / CSS.
9. Cała treść w języku `{{language}}`; enumy i klucze techniczne bez tłumaczenia.
10. Nie powtarzaj tego, co jest w `covers` poprzednich lekcji — odwołuj się do tego.

Reguły demek (edytor kodu, sterowanie) dochodzą w fazie 07.

### Ekran 4 — Projekt

- Lista lekcji w kolejności `order`: numer (ułamkowy widoczny jako `4.1`), tytuł, status jako etykieta z `t()`, wynik sprawdzianu.
- **Pasek postępu generowania na żywo** — `EventSource` na `/events`, aktualizacja bez przeładowania.
- Otwarcie lekcji dostępne przy `gotowa` i `ukończona`.
- Lekcja `błąd` → przycisk **Ponów**.
- Karta propozycji i przyciski rozbudowy dochodzą w fazie 10; eksport PDF w 11.
- Powrót do listy projektów.

### Ekran 5 — Widok lekcji

- `<iframe src="/lessons/:projectId/:slug/index.html">`, ten sam origin (potrzebne w fazie 08 do motywu i stanu).
- Powłoka wokół: tytuł, numer, **Poprzednia** / **Następna** (po `order`), powrót do projektu.
- `<iframe>` bez atrybutu `sandbox` — to nasze zaufane pliki. Sandbox jest **wewnątrz** lekcji, wokół kodu użytkownika (faza 07).

## Kroki

1. `queue.js` — pętla, wybór po `order`, przejścia statusów, `recoverOnBoot`.
2. SSE w `api.js` — rejestr klientów per projekt, emisja ze zdarzeń kolejki.
3. `prompts/lesson.md`. Zainwestować tu czas: to prompt decydujący o jakości produktu. Wkleić do niego fragmenty lekcji-wzorca z fazy 05 jako przykład.
4. `generateLesson` — budowa kontekstu z indeksu, wywołanie, weryfikacja plików, zapis `summary`/`covers`.
5. Podpiąć start kolejki do `plan/accept`.
6. `recoverOnBoot()` w `index.js`.
7. Ekran 4 z SSE, ekran 5 z `<iframe>`.
8. Wygenerować pełny kurs na prawdziwym temacie, w obu językach. Przeczytać wyniki.

## Testy (`node --test`)

`test/queue.test.js` — z zaślepionym `generateLesson`:
- kolejność: lekcje `1, 2, 3` idą po kolei;
- lekcja wstawiona jako `1.5`, gdy czeka `2` i `3`, wchodzi **przed `2`**;
- lekcja wstawiona w trakcie generowania `1` **nie przerywa** `1`;
- porażka → `status: "błąd"`, następna lekcja rusza mimo to;
- `retry` wraca do `zaplanowana` i do kolejki;
- `recoverOnBoot` przestawia `generowana` → `zaplanowana`;
- jednocześnie generowana jest **maksymalnie jedna** lekcja;
- kolejka **nie startuje sama** — bez `enqueue` worker nic nie robi.

## Definition of Done

- [ ] Pełny kurs generuje się od akceptacji planu do `queue-empty`, jedna lekcja naraz.
- [ ] Pierwsza lekcja otwiera się, gdy reszta jeszcze się generuje.
- [ ] Pasek postępu rusza się na żywo, bez odświeżania.
- [ ] Wygenerowana lekcja ma wszystkie sekcje, mikro-pytania i wizualizacje; wygląda spójnie w obu motywach.
- [ ] Sprawdzian zawiera pytania z wcześniejszych lekcji.
- [ ] Kurs `en` jest po angielsku w całości, a `index.json` ma polskie enumy.
- [ ] Restart serwera w trakcie generowania: lekcja wraca do `zaplanowana` i generuje się od nowa.
- [ ] `npm test` zielony.

## Baza wiedzy

`20-features.md` (generowanie, struktura lekcji, wzorce dydaktyczne) · `40-architecture.md` (przepływ, kolejka, odporność) · `60-api-surface.md` (SSE, retry) · `80-integrations.md` (prompt lekcji) · `95-testing.md` (testy kolejki)
