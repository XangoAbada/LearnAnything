# Faza 09 — Praktyka oceniana przez Claude'a

## Cel

Ćwiczenia z otwartą odpowiedzią, oceniane na żądanie przez Claude'a, **bez limitu prób**. Wnioski z ocen wracają do kursu jako `practiceNotes` i trafiają do promptu kolejnych lekcji.

Kluczowa różnica wobec sprawdzianu: sprawdzian ocenia przeglądarka natychmiast i zamyka lekcję; praktyka to rozmowa z modelem, którą można powtarzać do skutku.

## Pliki

| Plik | Zmiana |
|---|---|
| `server/api.js` | `POST /api/projects/:id/lessons/:lessonId/practice` |
| `server/generator.js` | `gradePractice(project, lesson, exercise, answer)` |
| `server/prompts/practice-grade.md` | prompt oceny |
| `public/runtime.js` | `LA.cwiczenia()` — pole, przycisk, wyświetlenie oceny |
| `test/practice-notes.test.js` | nadpisywanie notatek |

## Kontrakty

### Endpoint

```
POST /api/projects/:id/lessons/:lessonId/practice
  { exerciseId, task, answer }
->{ verdict: "poprawnie" | "częściowo" | "niepoprawnie", feedback, hint }
```

- **Bezstanowy.** Żadnego licznika prób, żadnej blokady, żadnego odliczania — subskrypcja nie rozlicza się per token, więc nie ma czego oszczędzać.
- **Poza kolejką** — krótkie wywołanie na żądanie, nie może czekać za generowaniem lekcji.
- `task` przychodzi od lekcji (jest w `lesson.js`), więc serwer nie musi czytać plików lekcji.
- Kontekst do promptu: temat projektu, tytuł i `covers` lekcji, treść ćwiczenia, odpowiedź, **język projektu**.
- Model niedostępny → `502`; lekcja pokazuje komunikat i pozwala odsłonić rozwiązanie wzorcowe. Nic trwałego się nie psuje.

### `practiceNotes`

Po każdej ocenie serwer aktualizuje wpis lekcji:

```json
"practiceNotes": [ { "exerciseId": "c2", "note": "myli rekurencję z iteracją" } ]
```

- **Jeden wpis na ćwiczenie.** Kolejna ocena tego samego `exerciseId` **nadpisuje** poprzedni. Bez limitu prób lista puchłaby w nieskończoność.
- Sam skrót słabego punktu — **nie zapisujemy treści odpowiedzi użytkownika**.
- Ocena `poprawnie` **usuwa** wpis dla tego ćwiczenia. Notatki mają opisywać aktualne braki, nie historię.
- Notatka powstaje razem z oceną (osobne pole w JSON od modelu), a nie z drugiego wywołania.
- `note` powstaje w języku projektu — trafia do promptów, które i tak są w tym języku.

### Prompt oceny (`practice-grade.md`)

Wyjście:

```json
{ "verdict": "częściowo",
  "feedback": "1–3 zdania: co dobrze, co nie",
  "hint": "jedna konkretna wskazówka, bez podawania rozwiązania",
  "note": "krótki opis słabego punktu do notatek kursu (pusty, gdy poprawnie)" }
```

Reguły w prompcie:
- `verdict` **wyłącznie** jedna z trzech wartości, **nietłumaczona** niezależnie od języka;
- `feedback` i `hint` w języku `{{language}}`;
- `hint` prowadzi do rozwiązania, **nie podaje go** — użytkownik ma poprawiać, nie przepisywać;
- ocena dotyczy **zrozumienia**, nie stylu i ortografii;
- odpowiedź częściowo trafna dostaje `częściowo`, nie `niepoprawnie` — inaczej użytkownik nie widzi postępu między próbami.

Zły `verdict` (poza enumem) → jedno ponowienie przez `runClaudeJson` (faza 02), potem `502`.

### Interfejs ćwiczenia (`runtime.js`)

```js
LA.cwiczenia([
  { id: 'c1', tresc: '…', rozwiazanie: '…' },
  …
]);
```

Zachowanie:
1. Treść, pole odpowiedzi (`<textarea>`), przycisk **Oceń odpowiedź**.
2. Kliknięcie → `POST /practice`, przycisk w stanie „oceniam", zablokowany na czas żądania.
3. Odpowiedź: `verdict` jako **kolorowa etykieta** (kolory ze zmiennych motywu: sukces / ostrzeżenie / błąd), pod nią `feedback` i `hint`.
4. **Po pierwszej ocenie** odsłania się rozwiązanie wzorcowe (chowany blok, dostępny od tej chwili na stałe).
5. Poprawienie odpowiedzi i ponowna ocena — **dowolną liczbę razy**. Bez licznika na ekranie, bez zmiany wyglądu przycisku po n-tej próbie.
6. Ostatnia ocena i treść odpowiedzi lądują w stanie lekcji (faza 08).
7. Brak serwera: komunikat „ocena niedostępna" + przycisk **Pokaż rozwiązanie**. Ćwiczenie nadal da się zrobić samodzielnie.

Liczba ćwiczeń wynika z tempa kursu i jest wymuszona w prompcie lekcji (faza 06): `wolne` 2, `normalne` 3, `szybkie` 5. Runtime rysuje tyle, ile dostanie.

## Kroki

1. `practice-grade.md`.
2. `gradePractice` w generatorze + walidator `verdict`.
3. Endpoint + aktualizacja `practiceNotes` w store (nadpisanie po `exerciseId`, usunięcie przy `poprawnie`).
4. `LA.cwiczenia` w runtime; podpiąć zapis stanu z fazy 08.
5. Style etykiet werdyktu w `theme.css` — sprawdzić kontrast w obu motywach.
6. Sprawdzić na żywo: odpowiedź zła → poprawiona → dobra, i czy `practiceNotes` po drodze się nie mnożą.
7. Potwierdzić, że `practiceNotes` faktycznie trafiają do promptu **następnej** lekcji (faza 06 już to czyta).

## Testy (`node --test`)

`test/practice-notes.test.js` — z zaślepionym modelem:
- dwie oceny tego samego `exerciseId` → **jeden** wpis, nowszy;
- oceny różnych ćwiczeń → osobne wpisy;
- `verdict: "poprawnie"` usuwa wpis;
- w `practiceNotes` **nie ma** treści odpowiedzi użytkownika (asercja na brak fragmentu z odpowiedzi);
- `verdict` spoza enumu → ponowienie, potem błąd;
- dziesięć ocen z rzędu przechodzi bez blokady i bez licznika w danych.

## Definition of Done

- [ ] Ocena wraca w kilka sekund i pokazuje werdykt, uzasadnienie i wskazówkę.
- [ ] Ta sama odpowiedź oceniona dziesięć razy — bez blokady, bez licznika, `practiceNotes` z jednym wpisem.
- [ ] Rozwiązanie wzorcowe odsłania się dopiero po pierwszej ocenie.
- [ ] Zatrzymany serwer: komunikat + dostęp do rozwiązania, lekcja działa dalej.
- [ ] Kurs `en` dostaje oceny po angielsku, a `verdict` w `index.json` po polsku.
- [ ] Słabe punkty widoczne w prompcie kolejnej lekcji (podejrzeć zbudowany prompt).
- [ ] `npm test` zielony.

## Baza wiedzy

`20-features.md` (praktyka oceniana, tabela liczby ćwiczeń, bez limitu prób) · `60-api-surface.md` (endpoint practice) · `30-data-model.md` (`practiceNotes`, dane nietrwałe) · `95-testing.md` (nadpisywanie notatek)
