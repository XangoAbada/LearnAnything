# Faza 04 — Powłoka aplikacji, motyw i dwujęzyczność

## Cel

Postawić powłokę: routing między ekranami, przełącznik motywu, przełącznik języka i ekrany 1–3 (lista projektów, wywiad, plan kursu). Po tej fazie całą ścieżkę z fazy 03 przechodzi się klikaniem, a nie `curl`-em.

Warstwa i18n powstaje **tutaj** i obowiązuje wszystkie kolejne fazy.

## Pliki

| Plik | Zawartość |
|---|---|
| `public/index.html` | powłoka: nagłówek z przełącznikami + kontener ekranu |
| `public/app.js` | routing, ekrany 1–3, `fetch`, motyw |
| `public/app.css` | styl powłoki (osobno od `theme.css` lekcji) |
| `public/i18n.js` | słowniki `pl` / `en` i `t()` |

## Kontrakty

### i18n

```js
// public/i18n.js
export const dict = {
  pl: { 'app.title': 'LearnAnything', 'projects.new': 'Nowy projekt', … },
  en: { 'app.title': 'LearnAnything', 'projects.new': 'New project', … },
};
export function getLang()            // localStorage 'learnanything:lang' → navigator.language → 'pl'
export function setLang(lang)        // zapis + <html lang> + przerysowanie ekranu
export function t(key, vars)         // 'lesson.count' z {n: 5}; brak klucza → sam klucz + console.warn
```

- Brakujący klucz zwraca **klucz**, nie pusty string — braki widać od razu, zamiast znikać z ekranu.
- Zmiana języka **nie przeładowuje strony** — przerysowanie bieżącego ekranu wystarczy.
- **Etykiety enumów żyją w słowniku**: `status.zaplanowana`, `status.gotowa`, `level.początkujący`, `verdict.poprawnie`… Dane trzymają polskie enumy, ekran pokazuje `t('status.' + lesson.status)`.
- Zero stringów wpisanych w kod — także w komunikatach błędów i `aria-label`.

### Motyw

```js
applyTheme(theme)   // 'jasny' | 'ciemny' → <html data-theme="...">
getTheme()          // localStorage 'learnanything:theme' → prefers-color-scheme → 'jasny'
toggleTheme()
```

- Zapis w `localStorage: learnanything:theme`. Brak wpisu → `prefers-color-scheme`.
- Atrybut na `<html>` — kolory wyłącznie ze zmiennych CSS.
- Wybór motywu odczytuje też lekcja w `<iframe>` (faza 08) — dlatego klucz i wartości muszą być ustalone tu i już nie zmieniane.

### Routing

Bez routera i bez frameworka. Hash + jedna funkcja:

```
#/                      lista projektów
#/p/:id/interview       wywiad
#/p/:id/plan            plan kursu
#/p/:id                 projekt (faza 06)
#/p/:id/l/:lessonId     lekcja  (faza 06)
```

```js
function render()   // czyta location.hash, czyści kontener, rysuje ekran
window.addEventListener('hashchange', render);
```

Każdy ekran to funkcja `renderX(container, params)` zwracająca DOM. Bez szablonów, bez `innerHTML` z danymi użytkownika — `textContent` i `createElement` (temat projektu pochodzi od użytkownika i trafia w wiele miejsc).

### Ekran 1 — Lista projektów

- Kafelki: temat, postęp `ukończone / wszystkie`, status, **znacznik języka kursu** (`PL` / `EN` — inaczej po tygodniu nie wiadomo, w czym jest który kurs).
- „Nowy projekt": pole na temat + **wybór języka kursu** (domyślnie język interfejsu) → `POST /api/projects` → przejście do wywiadu.
- Usunięcie projektu: potwierdzenie, `DELETE`, odświeżenie listy. Czyszczenie kluczy `localStorage` tego projektu dochodzi w fazie 08.

### Ekran 2 — Wywiad

- Nagłówek z tematem, pytania **po jednym**, pole tekstowe albo lista opcji zależnie od `kind`.
- Przyciski **Dalej**, **Pomiń wywiad** (widoczny **przez cały czas**), **Zakończ** na ostatnim pytaniu.
- Po zakończeniu: podsumowanie (poziom / tempo / zakres + `summary`) i przycisk **Zaplanuj kurs**.
- Odpowiedzi zbierane w pamięci i wysyłane **jednym** `POST /interview/answers`.
- Czekanie na model: stan „myślę" na przycisku, blokada podwójnego kliknięcia.

### Ekran 3 — Plan kursu

- Nagłówek: poziom / tempo / zakres + **widełki liczby lekcji dla zakresu** (użytkownik ma widzieć, czemu lekcji jest tyle).
- Lista: numer, tytuł **edytowalny w miejscu** (`contenteditable` albo `input`), `brief`.
- **Akceptuję** → `POST /plan/accept` z listą (z poprawionymi tytułami) → przejście na ekran projektu.
- **Przelicz plan** + pole na komentarz → `POST /plan` z `comment`, lista podmieniana.
- Błąd walidacji widełek z serwera → komunikat z sugestią przeliczenia, nie surowy błąd.

## Kroki

1. `index.html`: nagłówek (tytuł, przełącznik motywu, przełącznik języka), `<main id="screen">`, import `app.js` jako moduł.
2. `i18n.js` — słowniki z kompletem kluczy dla ekranów 1–3 plus etykiety enumów. Wprowadzić konwencję nazw kluczy (`obszar.element`) i trzymać się jej do końca projektu.
3. `app.css` — powłoka. Kolory **ze zmiennych z `theme.css`**, choć sam `theme.css` powstaje w fazie 05: zdefiniować zmienne prowizorycznie tutaj i przenieść je w 05, albo napisać `theme.css` już teraz i tylko dopełnić w 05. Druga droga jest czystsza.
4. Motyw i język — najpierw, przed ekranami; obie funkcje są używane przez każdy ekran.
5. Ekrany 1–3.
6. Przejść ścieżkę myszą, w obu językach interfejsu, w obu motywach.

## Testy

Automatów nie ma (brak DOM w `node --test`, a przeciąganie jsdom to zależność większa niż testowany kod).

Ręczna checklista:
- [ ] Przełącznik języka zmienia całą powłokę bez przeładowania; wybór przeżywa restart przeglądarki.
- [ ] Przełącznik motywu działa natychmiast; wybór przeżywa restart.
- [ ] Pierwsze uruchomienie w czystej przeglądarce bierze motyw z systemu, a język z przeglądarki.
- [ ] Projekt `en` i projekt `pl` widoczne na liście z poprawnym znacznikiem języka.
- [ ] „Pomiń wywiad" działa na pierwszym i na ostatnim pytaniu.
- [ ] Edycja tytułu w planie trafia do `index.json` po akceptacji.
- [ ] Żaden ekran nie pokazuje surowego enumu (`zaplanowana` zamiast etykiety).

Jedyny test automatyczny: `test/i18n.test.js` — **oba słowniki mają identyczny zbiór kluczy**. Import `dict` działa w `node --test`, bo to czysty ESM bez DOM. Ten test wyłapie pominięte tłumaczenie taniej niż klikanie.

## Definition of Done

- [ ] Cała ścieżka temat → wywiad → plan → akceptacja przechodzi myszą.
- [ ] `test/i18n.test.js` zielony — słowniki symetryczne.
- [ ] Zero stringów widocznych dla użytkownika poza `i18n.js` (przejrzeć `app.js` wzrokiem).
- [ ] Wygląd nie sypie się w żadnej z czterech kombinacji język × motyw.

## Baza wiedzy

`10-screens.md` (ekrany 1–3, elementy wspólne, mapa przejść) · `20-features.md` (motyw jasny/ciemny) · `70-tech-stack.md` (frontend bez frameworka, zmienne CSS) · `00-README.md` tego katalogu (kontrakt i18n)
