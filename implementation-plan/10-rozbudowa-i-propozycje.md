# Faza 10 — Rozbudowa kursu i propozycje aplikacji

## Cel

Kurs przestaje być zamrożony. Użytkownik może dołożyć lekcję pośrednią, pogłębić wątek albo dopisać całkiem nowy — a aplikacja **proponuje** dodatkowe lekcje na podstawie wyników.

Dwie reguły trzymają to w ryzach:
- **nic nie powstaje bez kliknięcia** — propozycja to sugestia, nie zlecenie;
- **historia jest niezmienna** — nic nie wskakuje przed lekcję już przerobioną.

## Pliki

| Plik | Zmiana |
|---|---|
| `server/api.js` | `POST /lessons`, `suggestions[]` w `GET /projects/:id` |
| `server/suggestions.js` | **nowy** — wyliczanie propozycji z indeksu |
| `server/generator.js` | `extendCourse(...)` — treść nowej lekcji |
| `server/prompts/lesson-extend.md` | prompt rozbudowy |
| `public/app.js` | karta propozycji, dialogi „Dodaj lekcję pośrednią" i „Rozwiń temat" |
| `test/insert-rule.test.js`, `test/suggestions.test.js` | reguła miejsca i wyliczanie propozycji |

## Kontrakty

### Dodanie lekcji — jedyna droga

```
POST /api/projects/:id/lessons
  { afterOrder, brief, mode: "pośrednia" | "rozwinięcie" | "powtórka" | "nowy wątek" }
-> wpis lekcji z wyliczonym order, dopisany do kolejki
```

**Tą samą trasą idzie akceptacja propozycji.** Nie ma drugiego endpointu dla sugestii — dzięki temu reguła miejsca i kolejkowanie mają jedno miejsce w kodzie.

Zachowanie:
- `order` z `store.nextOrderAfter` (faza 01): `4` → `4.1` → `4.2`, między `4.1` a `4.2` → `4.15`;
- `afterOrder` **mniejszy** niż `order` ostatniej lekcji `ukończona` → **`400`** z komunikatem, że materiał przerobiony jest zamknięty;
- `afterOrder` równy `order` ostatniej lekcji kursu = dopisanie na końcu (typowe dla nowego wątku);
- `origin` = `mode`, `status: "zaplanowana"`, dopisanie do `project.queue`, **start kolejki**;
- lekcja wchodzi do generowania przed dalszymi lekcjami z planu (kolejność po `order` z fazy 06), ale **nie przerywa** bieżącej.

### Reguła miejsca w UI

`GET /api/projects/:id` zwraca `minInsertOrder` (`order` ostatniej ukończonej, `0` gdy brak). UI buduje listę „po lekcji N" **wyłącznie** z lekcji o `order >= minInsertOrder`. Serwer i tak sprawdza — UI ma tylko nie pokazywać niemożliwego.

### Propozycje

Wyliczane **przy każdym odczycie projektu**, nigdzie nie zapisywane. Nie są encją.

```js
computeSuggestions(project, lessons)  // -> Suggestion[]
```

```json
{ "kind": "powtórka",
  "afterOrder": 4,
  "lessonId": "l4",
  "brief": "utrwalenie: rekurencja, stos wywołań",
  "reason": { "code": "niski-wynik", "score": 40, "concepts": ["rekurencja", "stos wywołań"] } }
```

| Propozycja | Wyzwalacz | Co powstaje |
|---|---|---|
| **powtórka** | sprawdzian `< 60%` albo powtarzające się słabe punkty w `practiceNotes` | lekcja utrwalająca konkretne pojęcia, zaraz za lekcją źródłową |
| **rozwinięcie** | lekcja ukończona z dobrym wynikiem, temat ma naturalne pogłębienie | lekcja pogłębiająca, za lekcją źródłową |
| **nowy wątek** | kurs pokrywa temat, ale obok jest sąsiedni wątek nietknięty | lekcja (lub kilka) na końcu kursu |

- Propozycja narusza regułę miejsca (lekcja źródłowa przed ostatnią ukończoną) → **przesuwa się** za ostatnią ukończoną, nie znika.
- Propozycja dublująca istniejącą lekcję o tym samym `origin` i `afterOrder` nie jest pokazywana drugi raz.
- `reason` jest **strukturalny** (`code` + dane), nie gotowym zdaniem — UI składa tekst przez `t()`, więc uzasadnienie mówi w języku interfejsu, nie kursu.
- **Propozycja nigdy nie trafia do kolejki sama.** Karta ma jeden przycisk **Utwórz lekcję**, który woła `POST /lessons`.

Kody `reason`: `niski-wynik`, `powtarzajace-braki`, `dobry-wynik`, `brak-watku`.

Wykrycie „nowego wątku" i „naturalnego pogłębienia" wymaga wiedzy o temacie, więc **jedno wywołanie modelu przy odczycie projektu byłoby kosztowne i wolne**. Rozwiązanie: sugestie `powtórka` i `rozwinięcie` liczy czysta funkcja z indeksu (deterministycznie, bez modelu), a `nowy wątek` jest generowany **na żądanie** — przycisk „Zaproponuj nowy wątek" na ekranie projektu woła model raz. Ekran projektu nie może czekać na Claude'a przy każdym odświeżeniu.

### Prompt rozbudowy (`lesson-extend.md`)

Dostaje **cały indeks** (`title`, `summary`, `covers` wszystkich lekcji), tryb, miejsce wstawienia, `brief` od użytkownika i język projektu.

Reguły:
- **nie powtarzaj** tego, co jest w `covers` innych lekcji — odwołuj się do tego;
- `pośrednia`: wypełnij lukę między lekcją N a N+1, nic więcej;
- `powtórka`: skup się na wskazanych pojęciach, inne ujęcie niż lekcja źródłowa (nie ta sama treść od nowa);
- `rozwinięcie`: pogłęb wątek lekcji źródłowej;
- `nowy wątek`: wolno wprowadzić materiał spoza pierwotnego planu — nadal bez dublowania `covers`.

Treść lekcji generuje ten sam kod co faza 06 (`generateLesson`), tylko z dodatkowym kontekstem rozbudowy. Prompt lekcji zostaje jeden — nie dublować go dla rozbudowy.

### UI

**Karta propozycji** nad listą lekcji: rodzaj, czego dotyczy, **dlaczego się pojawiła** (np. „sprawdzian 40% — pojęcia: rekurencja, stos wywołań"), przycisk **Utwórz lekcję**.

**Dodaj lekcję pośrednią**: wybór „po lekcji N" (tylko dozwolone pozycje) + krótki opis, czego brakuje.

**Rozwiń temat**: wybór lekcji do pogłębienia **albo** „nowy wątek" z opisem.

Nowa lekcja pojawia się w liście z numerem ułamkowym, w miejscu wstawienia, ze statusem `zaplanowana`.

## Kroki

1. `store.addLesson` + walidacja reguły (faza 01) → endpoint `POST /lessons`, mapowanie błędu na `400`.
2. `suggestions.js` — czyste funkcje dla `powtórka` i `rozwinięcie`.
3. `suggestions` w `GET /projects/:id` + `minInsertOrder`.
4. `lesson-extend.md` i podpięcie kontekstu do `generateLesson`.
5. UI: karta propozycji, dwa dialogi, lista dozwolonych pozycji.
6. „Zaproponuj nowy wątek" — osobny przycisk, osobne wywołanie modelu.
7. Sprawdzić na kursie z ukończonymi lekcjami: wstawienie `4.1`, próba wstawienia przed ukończoną, propozycja po słabym sprawdzianie.

## Testy (`node --test`)

`test/insert-rule.test.js`:
- `afterOrder` przed ostatnią ukończoną → `400`;
- dokładnie za ostatnią ukończoną → przyjęte;
- na końcu kursu → przyjęte;
- wstawka dostaje `4.1`, kolejna `4.2`, między nie → wartość pośrednia;
- **żadna istniejąca lekcja nie zmienia `order` ani `path`**;
- nowa lekcja ląduje w `queue` z poprawnym `origin`.

`test/suggestions.test.js`:
- `score: 40` → propozycja `powtórka` z `reason.code: "niski-wynik"` i listą pojęć;
- `score: 90` → propozycja `rozwinięcie`, **nie** powtórka;
- powtarzające się `practiceNotes` bez niskiego wyniku → `powtarzajace-braki`;
- propozycja dla lekcji przed ostatnią ukończoną **przesuwa się** za nią;
- **`computeSuggestions` nie ma dostępu do kolejki** — asercja, że wywołanie niczego nie dopisuje;
- brak wyników → pusta lista, bez wyjątku.

## Definition of Done

- [ ] Lekcja pośrednia wstawiona jako `4.1` generuje się przed dalszymi lekcjami z planu.
- [ ] Próba wstawienia przed ukończoną lekcją odrzucona z `400`, a UI takiej pozycji w ogóle nie pokazuje.
- [ ] Po sprawdzianie `< 60%` pojawia się propozycja powtórki z czytelnym uzasadnieniem.
- [ ] Propozycja bez kliknięcia **nic** nie generuje (odświeżanie projektu przez minutę — kolejka pusta).
- [ ] Uzasadnienie propozycji tłumaczy się przy zmianie języka interfejsu.
- [ ] Nowa lekcja nie dubluje `covers` istniejących (sprawdzić treść).
- [ ] `npm test` zielony.

## Baza wiedzy

`20-features.md` (propozycje, rozbudowa kursu, reguła miejsca) · `10-screens.md` (karta propozycji, ograniczony wybór miejsca) · `60-api-surface.md` (`POST /lessons`, `400`) · `30-data-model.md` (reguły `order`) · `95-testing.md` (reguła wstawienia, propozycje)
