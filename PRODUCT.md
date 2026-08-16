# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jedna osoba na raz, na własnej maszynie, przy biurku: uruchamia `npm start`, otwiera localhost, siada do dłuższej sesji z klawiaturą i dużym ekranem. Telefon nie jest sceną użycia — wąski ekran to higiena, nie przypadek do projektowania pod niego.

Poza właścicielem: kilka osób, którym właściciel da repo, żeby odpaliły u siebie. Interfejs musi być zrozumiały bez jego komentarza — ale nie jest to produkt dla obcego użytkownika z ulicy i nie ma potrzeby tłumaczyć, czym jest aplikacja.

Dwa języki, dwie **niezależne** osie: język interfejsu (przełączalny w każdej chwili, `localStorage: learnanything:lang`) i język kursu (`project.language`, wybierany raz przy zakładaniu projektu, potem niezmienny). Rozdzielone celowo — nauka angielskiej terminologii przy polskim interfejsie to główny przypadek użycia, nie wyjątek.

## Product Purpose

Zamienia dowolny temat w kurs: krótki wywiad ustala poziom, tempo i zakres, Claude planuje ciąg lekcji, aplikacja generuje je na żądanie. Lekcja to nie artykuł — ma teorię rozbitą na pojęcia, diagramy, sterowalne demka, edytor kodu, ćwiczenia oceniane przez Claude'a i sprawdzian, który zapisuje wynik.

Sukces ma dwa oblicza, oba potwierdzone:

- **Nauka przez robienie.** Demka, edytor kodu i oceniane ćwiczenia są sednem lekcji; sam tekst jest tłem dla nich.
- **Materiał, do którego się wraca.** Kurs zostaje trwałą referencją: eksport PDF, spis treści, powrót do konkretnej lekcji po tygodniach.

Przerobienie kursu do końca nie jest miarą sukcesu. Porzucony w połowie kurs, który dał działające demko i PDF do wracania, zadziałał.

## Positioning

Trzy rzeczy naraz, których sąsiednie narzędzia nie mają razem:

1. **Spójność wymusza aplikacja, nie prompt.** Wygląd, wzorce dydaktyczne i logika sprawdzianu należą do `theme.css`, `runtime.js` i szablonu lekcji. Claude wypełnia gniazda w stałej strukturze. Dlatego lekcje z dwóch różnych tematów wyglądają jak jeden kurs, a nie jak dwadzieścia odpowiedzi czatu.
2. **Nic nie powstaje samo z siebie.** Plan kursu i każda dodatkowa lekcja wymagają kliknięcia. Żadna ścieżka w kodzie nie dopisuje lekcji do kolejki z własnej inicjatywy. Kurs generuje się buforem — z przodu czeka kilka lekcji, reszta planu dopiero na akcję użytkownika.
3. **Rozliczanie subskrypcją Claude Code, nigdy kluczem API.** Generowanie pełnego kursu nie ma licznika tokenów po stronie użytkownika.

## Operating Context

- Aplikacja lokalna: `npm start`, serwer Express na własnej maszynie, dane na dysku pod `data/projects/<id>/`. Bez chmury, bez kont, bez logowania.
- Generowanie idzie przez lokalnie zalogowane CLI `claude` (Claude Agent SDK). Serwer sprawdza dostępność Claude'a **przy starcie**, nie w połowie generowania piętnastej lekcji. `ANTHROPIC_API_KEY` jest usuwany ze środowiska przekazywanego do SDK — jego obecność przełączyłaby rozliczanie na tokeny.
- Ścieżka użytkownika: lista projektów → wywiad (albo pominięcie) → plan kursu do akceptacji → kolejka generowania (SSE) → lekcja → sprawdzian → propozycje kolejnych lekcji.
- Lekcja jest **samodzielnym plikiem HTML** — otwarta prosto z dysku ma być spójna językowo i wizualnie. Jej teksty interfejsu idą z `<html lang>` lekcji, nie z ustawienia powłoki.
- Wygenerowany kurs żyje długo: użytkownik wraca do niego po tygodniach, przez spis treści albo PDF.

## Capabilities and Constraints

**Funkcje** (fazy 01–09 zamknięte, 10–12 zaplanowane w `implementation-plan/`): projekty i ich usuwanie, wywiad z pominięciem, plan kursu z walidacją widełek, motyw jasny/ciemny, i18n powłoki, szablon lekcji z chowanymi sekcjami, mikro-pytaniami i sprawdzianem, kolejka i generowanie przez SSE, demka i edytor kodu w sandboksie, zapamiętywanie stanu lekcji, ćwiczenia oceniane przez Claude'a ze słabymi punktami wracającymi do kolejnych lekcji. Dalej: dodawanie lekcji i propozycje, eksport PDF.

**Ograniczenia, których żadna praca nie może złamać:**

- **Historia jest niezmienna.** Nowa lekcja nie trafia przed ostatnią lekcję o statusie `ukończona`. Istniejące lekcje nigdy nie są przenumerowywane.
- **Bez limitu prób oceny praktyki.** Żadnego licznika, blokady ani odliczania.
- **Kod z edytorów w lekcji nie opuszcza przeglądarki.**
- **Żaden string widoczny dla użytkownika nie jest wpisany w kod na sztywno** — łącznie z komunikatami błędów i `aria-label`. Brakujący klucz zwraca klucz, nie pusty string.
- **Kolory wyłącznie ze zmiennych CSS** w `theme.css`; żaden inny plik nie zapisuje wartości koloru na sztywno. Canvas czyta je przez `czytajZmienna()`.
- Node.js, ESM, czysty JavaScript. Bez TypeScriptu, bez bundlera, bez kroku budowania. Dwie zależności produkcyjne: `express`, `@anthropic-ai/claude-agent-sdk`. Bez biblioteki i18n, wykresów, generatora PDF. Jedyna zależność deweloperska: `playwright-core` do kontroli wizualnej komponentów — sterujący systemową przeglądarką, bez pobierania własnej.
- Store to jedyne miejsce dotykające dysku. Generator nie zna HTTP, serwer nie zna promptów.

**Terminologia — enumy w danych są po polsku, niezależnie od języka.** To format danych, nie tekst dla człowieka; ekran mapuje je przez `t('status.' + lesson.status)`:

- `project.status`: `nowy` · `wywiad` · `plan` · `generowanie` · `gotowy`
- `lesson.status`: `zaplanowana` · `generowana` · `gotowa` · `ukończona` · `błąd`
- `lesson.origin`: `plan` · `pośrednia` · `powtórka` · `rozwinięcie` · `nowy wątek`
- `course.level`: `początkujący` · `średni` · `zaawansowany` · `pace`: `wolne` · `normalne` · `szybkie` · `scope`: `podstawy` · `standardowy` · `szeroki`
- `verdict` oceny praktyki: `poprawnie` · `częściowo` · `niepoprawnie`

Nazwy klas komponentów lekcji trafiają do promptu, więc są **ustalone raz i niezmienne**: `.pojecie`, `.diagram`, `.demko`, `.mikro-pytanie`, `.cwiczenie`, `.sprawdzian`, `.sugestie`.

**Biblioteka komponentów.** Wizualizacje lekcji nie są rysowane przez model — pochodzą z `public/komponenty/`, gdzie każdy komponent to jeden plik z `meta`, `probki`, `style` i `rysuj`. Lekcja podaje nazwę i dane (`LA.komponent`), a katalog opisów trafia do promptu. Gdy nic nie pasuje, lekcja **zamawia** nowy komponent w bloku JSON: powstaje osobnym, tańszym etapem, przechodzi kontrolę w prawdziwej przeglądarce (tekst poza kadrem, nachodzenie, ucięcia, za mały font, czysta konsola w obu motywach i przy dwóch szerokościach) i dopiero wtedy — automatycznie, bez pytania — wchodzi do biblioteki. Biblioteka rośnie z każdym kursem.

Reguły nienaruszalne biblioteki: **tekst renderuje się w HTML, nigdy w SVG** (`<text>` nie zawija i przy dłuższych danych wyjeżdża poza `viewBox` — to był realny błąd wygenerowanych lekcji); komponent nie ma żadnego `import`, helpery dostaje w `ctx`; `document` dotyka wyłącznie wewnątrz `rysuj`; każdy selektor zaczyna się od `.k-<nazwa>`; zero literałów koloru.

## Brand Commitments

- Nazwa: **LearnAnything**. Ta sama w obu językach.
- Dwujęzyczność `pl` / `en` jest zobowiązaniem produktowym, nie funkcją opcjonalną.
- Wartości motywu w danych: `jasny` / `ciemny`, klucz `learnanything:theme`. Odczytuje je też lekcja w `<iframe>` — ustalone i niezmienne.
- Poza tym brak zobowiązań identyfikacyjnych: nie ma logo, nie ma ustalonego głosu marki, nie ma narzuconych referencji wizualnych.

## Evidence on Hand

- `implementation-plan/` — 12 faz z kontraktami, testami i definicjami ukończenia; źródło prawdy dla kolejności prac i dla powyższych ograniczeń.
- Baza wiedzy produktu (źródło „co"): `D:\Projects\Kaizen\server\data\projects\-SX_WpozfSXO\knowledge\`. Gdzie plan i baza wiedzy się różnią, **wygrywa plan**.
- Działający kod: `server/` (API, store, prompty, integracja z Claude'em), `public/` (powłoka, ekrany 1–4, motyw, i18n), `test/` (`node --test`, wywołania Claude'a zaślepiane).
- **Brak wygenerowanych kursów.** `data/projects/` jest puste — nie ma prawdziwych lekcji, tytułów, wyników ani zrzutów. Przykładowe dane w planie (np. „Teoria muzyki") są ilustracją kontraktu, nie realnym kursem. Ręczne lekcje-wzorce z fazy 05 będą pierwszą prawdziwą treścią do oglądania.
- Brak użytkowników, opinii, liczb i wdrożenia. Nic z tego nie wolno wymyślić.

## Product Principles

1. **Struktura należy do aplikacji, treść do modelu.** Każda decyzja o wyglądzie, kolejności i mechanice jest zapisana w kodzie; prompt nigdy nie odpowiada za spójność.
2. **Użytkownik pociąga za każdy spust.** Żadne generowanie, kolejkowanie ani dopisywanie lekcji nie dzieje się bez akcji użytkownika. Uzupełnienie bufora po ukończeniu lekcji jest częścią tej samej akcji — oddania sprawdzianu — a nie inicjatywą aplikacji.
3. **Wytworzone rzeczy przeżywają sesję.** Lekcja jest samodzielnym plikiem, kurs wraca po tygodniach, historia jest niezmienna.
4. **Robienie przed czytaniem.** Demko, edytor i ćwiczenie mają pierwszeństwo przed akapitem; tekst obsługuje interakcję, nie odwrotnie.
5. **Dwa języki to dwie niezależne osie.** Interfejs i kurs zmieniają się osobno, zawsze.
6. **Mniej ruchomych części.** Bez frameworka, bez kroku budowania, bez zależności, której nie zastąpi kilkanaście linii.

## Accessibility & Inclusion

Nie ustalono wymogu wobec konkretnego standardu. Potwierdzone są dwie rzeczy o skutkach dostępnościowych: pełna dwujęzyczność każdego widocznego stringa (łącznie z `aria-label`) oraz motyw jasny i ciemny z kolorami wyłącznie ze zmiennych — obowiązują też lekcję otwartą z dysku.
