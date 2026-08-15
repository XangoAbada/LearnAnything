# Faza 01 — Szkielet projektu i magazyn plikowy

## Cel

Postawić serwer, który wstaje i serwuje statyki, oraz `store.js` — jedyny moduł dotykający dysku. Najtrudniejsza logika całej aplikacji (numeracja `order` i reguła niezmiennej historii) powstaje tutaj i tutaj jest testowana, zanim cokolwiek zacznie od niej zależeć.

Bez Claude'a, bez UI. Po tej fazie `npm start` wstaje, a `npm test` jest zielony.

## Pliki

| Plik | Zawartość |
|---|---|
| `package.json` | `"type": "module"`, skrypty `start` / `test`, zależność `express` |
| `server/index.js` | start Express, montaż `public/` i lekcji, nasłuch na `PORT` |
| `server/config.js` | `PORT` (3000), `DATA_DIR` (`./data`), ścieżki wyliczone raz |
| `server/store.js` | całość dostępu do dysku |
| `test/store.test.js` | testy store |
| `test/order.test.js` | testy numeracji i reguły wstawiania |
| `.gitignore` | `node_modules/`, `data/` |

## Kontrakty

### `server/config.js`

```js
export const config = {
  port: Number(process.env.PORT) || 3000,
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
};
export const projectsDir = path.join(config.dataDir, 'projects');
```

### `server/store.js`

Wszystkie funkcje synchroniczne (`node:fs`) — jeden użytkownik, pliki rzędu kilobajtów, brak wyścigów wartych `async`.

```js
// projekty
listProjects()                       // -> [{ id, topic, language, status, progress: {done, total} }]
createProject({ topic, language })   // -> project ; tworzy katalog + project.json
readProject(id)                      // -> project | null
writeProject(project)                // zapis całości
deleteProject(id)                    // usuwa katalog rekurencyjnie

// indeks lekcji
readIndex(id)                        // -> lesson[] posortowane po order ; [] gdy brak pliku
writeIndex(id, lessons)              // sortuje po order przed zapisem
updateLesson(id, lessonId, patch)    // -> lesson ; scala patch, zapisuje, zwraca wynik

// numeracja i wstawianie
nextOrderAfter(lessons, afterOrder)  // -> number
minInsertOrder(lessons)              // -> number (order ostatniej ukończonej, 0 gdy brak)
canInsertAfter(lessons, afterOrder)  // -> boolean
addLesson(id, { afterOrder, title, brief, origin })  // -> lesson ; rzuca gdy zakaz

// katalogi lekcji
lessonDir(projectId, lesson)         // -> ścieżka bezwzględna
createLessonDir(projectId, lesson)   // tworzy katalog, zwraca ścieżkę
slugify(title, order)                // -> "04-czym-jest-dzwiek"
```

### Numeracja `order` — reguły

`order` jest liczbą zmiennoprzecinkową. Lekcje z planu dostają `1, 2, 3…`. Lekcja wstawiona „po lekcji N" dostaje wartość **pomiędzy N a następną istniejącą lekcją**:

| Sytuacja | Istniejące `order` | `afterOrder` | Wynik |
|---|---|---|---|
| pierwsza wstawka po lekcji 4 | 3, 4, 5 | 4 | **4.1** |
| druga wstawka po lekcji 4 | 3, 4, 4.1, 5 | 4 | **4.2** |
| wciśnięcie między 4.1 a 4.2 | 4, 4.1, 4.2 | 4.1 | **4.15** |
| dopisanie na końcu kursu | 1, 2, 3 | 3 | **4** (albo 3.1 — byle rosnąco) |

Algorytm: znajdź `next` = najmniejszy `order` większy od `afterOrder`. Brak `next` → `afterOrder + 1`. Jest `next` → kandydat `afterOrder + 0.1`; jeśli zajęty lub `>= next`, weź **średnią** `(afterOrder + next) / 2`.

**Istniejące lekcje nigdy nie są przenumerowywane.** `path` i linki muszą zostać ważne.

### Reguła niezmiennej historii

`canInsertAfter` zwraca `false`, gdy `afterOrder <` `order` **ostatniej** lekcji o statusie `ukończona`. `addLesson` przy naruszeniu rzuca błąd z polem rozpoznawalnym przez API (faza 10 zamienia go na `400`).

`minInsertOrder(lessons)` zwraca `order` ostatniej ukończonej lekcji (albo `0`) — API oddaje to UI, żeby lista „po lekcji N" od razu pokazywała tylko dozwolone pozycje.

### `project.language`

- Ustawiany przy `createProject`, wartości `"pl"` / `"en"`, walidowany (inna wartość → błąd).
- **Nigdy nie modyfikowany** — brak funkcji zmieniającej język istniejącego projektu. Lekcje są już w swoim języku.

### Identyfikatory

- `projectId`: krótki losowy string (`crypto.randomUUID().slice(0, 8)`), jednocześnie nazwa katalogu.
- `lessonId`: stabilny, niezależny od `order` (`l1`, `l2`… albo losowy) — `order` się zmienia w obrębie kursu, `lessonId` nigdy.
- `slug` katalogu: `NN-tytul-bez-ogonkow`, gdzie `NN` to `order` z kropką zamienioną na myślnik (`4.1` → `04-1`). Slug nie musi być ładny, musi być stabilny i unikalny.

## Kroki

1. `npm init -y`, ustawić `"type": "module"`, skrypty `start: node server/index.js`, `test: node --test`.
2. `npm i express`.
3. `config.js` — `DATA_DIR` rozwiązany do ścieżki bezwzględnej raz, przy imporcie.
4. `store.js` — zacząć od odczytu/zapisu JSON i tworzenia katalogów; `mkdirSync(..., {recursive:true})` przy starcie dla `projectsDir`.
5. Numeracja `order` jako **czyste funkcje** przyjmujące tablicę lekcji (nie `projectId`) — dzięki temu testują się bez dysku.
6. `index.js` — Express, `express.json()`, `express.static('public')`, statyki lekcji z `data/projects` pod `/lessons/:projectId/...`, `app.listen`. Na razie żadnych tras API.
7. Testy.

## Testy (`node --test`)

`test/order.test.js` — bez dysku, same funkcje czyste:
- pierwsza wstawka po 4 → `4.1`; druga → `4.2`; między 4.1 a 4.2 → wartość ściśle pomiędzy;
- wstawka na końcu kursu daje wartość większą od maksimum;
- żadna istniejąca lekcja nie zmienia `order` po wstawieniu (porównanie tablicy przed/po);
- sortowanie po `order` daje poprawną kolejność przy numerach ułamkowych;
- `canInsertAfter` → `false` przed ostatnią ukończoną, `true` dokładnie za nią i dalej;
- `minInsertOrder` → `0` gdy nic nie ukończone.

`test/store.test.js` — na katalogu tymczasowym (`DATA_DIR` ustawiony w teście):
- `createProject` tworzy katalog i `project.json` z `language`;
- `createProject` z językiem spoza `pl`/`en` rzuca;
- zapis i odczyt projektu zachowuje wszystkie pola (brak gubienia przy nadpisaniu);
- `readIndex` na nieistniejącym pliku → `[]`, nie wyjątek;
- `updateLesson` scala patch i nie kasuje pozostałych pól;
- `writeIndex` zapisuje posortowane;
- `deleteProject` usuwa katalog z lekcjami.

## Definition of Done

- [ ] `npm start` wstaje na `http://localhost:3000` i oddaje `public/` (choćby pustą stronę).
- [ ] `npm test` zielony, oba pliki testów przechodzą.
- [ ] Poza `store.js` żaden plik nie importuje `node:fs`.
- [ ] `data/` w `.gitignore`.

## Baza wiedzy

`30-data-model.md` (encje, reguły `order`, stany lekcji) · `40-architecture.md` (warstwy, „store to jedyne wejście do dysku") · `50-code-map.md` (układ plików) · `90-run-and-config.md` (polecenia, zmienne) · `95-testing.md` (zakres testów store i numeracji)
