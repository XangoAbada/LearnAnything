---
name: LearnAnything
description: Kurs jako rozkładany arkusz Miury — papier w polu zagięć 60°, panele ze ściętym narożnikiem, złota folia na jednej akcji ekranu.
colors:
  bg: "#f1efe9"
  surface: "#fbfaf7"
  surface-2: "#e6e3da"
  text: "#0a0a0a"
  muted: "#605d56"
  border: "#ccc8bd"
  crease-m: "#b9b6ae"
  crease-v: "#a8c6e8"
  crease-hair: "rgb(120 116 106 / 16%)"
  crease-hair-2: "rgb(80 110 150 / 10%)"
  foil: "#d4af37"
  foil-lite: "#ecd07a"
  foil-deep: "#a9871f"
  on-foil: "#0a0a0a"
  accent: "#24518f"
  accent-text: "#fbfaf7"
  ok: "#2f6f4f"
  warn: "#96660f"
  danger: "#a8321e"
  done: "#7a6215"
  bg-ciemny: "#101012"
  surface-ciemny: "#191919"
  surface-2-ciemny: "#232326"
  text-ciemny: "#f0eee9"
  muted-ciemny: "#a09c93"
  border-ciemny: "#35353a"
  crease-m-ciemny: "#55555d"
  crease-v-ciemny: "#3f6084"
  crease-hair-ciemny: "rgb(255 255 255 / 7%)"
  crease-hair-2-ciemny: "rgb(150 190 240 / 6%)"
  foil-ciemny: "#d4af37"
  foil-lite-ciemny: "#f0d786"
  foil-deep-ciemny: "#8f7018"
  on-foil-ciemny: "#101012"
  accent-ciemny: "#9dc0f0"
  accent-text-ciemny: "#101012"
  ok-ciemny: "#74c096"
  warn-ciemny: "#dda63f"
  danger-ciemny: "#ef8a76"
  done-ciemny: "#e8c766"
typography:
  display:
    fontFamily: "Michroma, 'Spline Sans Mono', system-ui, sans-serif"
    fontSize: "clamp(1.3rem, 1rem + 1.4vw, 2rem)"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.04em"
  brand:
    fontFamily: "Michroma, 'Spline Sans Mono', system-ui, sans-serif"
    fontSize: "clamp(0.64rem, 0.45rem + 0.7vw, 0.82rem)"
    fontWeight: 400
    letterSpacing: "clamp(0.08em, 0.02em + 0.5vw, 0.2em)"
  subject:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "clamp(1.1rem, 0.95rem + 0.8vw, 1.45rem)"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  question:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.45
  title:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "1.02rem"
    fontWeight: 600
    lineHeight: 1.35
  section:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.8rem"
    fontWeight: 600
    letterSpacing: "0.16em"
  body:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.92rem"
    fontWeight: 400
    lineHeight: 1.65
  control:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.74rem"
    fontWeight: 400
    letterSpacing: "0.12em"
  label:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.7rem"
    fontWeight: 400
    letterSpacing: "0.14em"
  code:
    fontFamily: "'Spline Sans Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.7rem"
    fontWeight: 400
    letterSpacing: "0.14em"
    fontFeature: "tabular-nums"
rounded:
  none: "0"
  cut: "0.9rem"
  cut-control: "0.5rem"
  cut-foil-tail: "0.75rem"
spacing:
  xs: "0.35rem"
  sm: "0.6rem"
  md: "0.9rem"
  lg: "1.2rem"
  xl: "2rem"
  foot: "5rem"
components:
  button-foil:
    backgroundColor: "{colors.foil}"
    textColor: "{colors.on-foil}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0.55rem 1.5rem 0.55rem 1rem"
  button-foil-hover:
    backgroundColor: "{colors.foil-lite}"
    textColor: "{colors.on-foil}"
  button-foil-disabled:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted}"
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.85rem"
  button-default-hover:
    backgroundColor: "{colors.surface-2}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
  panel-mountain:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "1.15rem 1.2rem"
  panel-valley:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "1.15rem 1.2rem"
  panel-narrow:
    backgroundColor: "{colors.surface}"
    padding: "1.15rem 1.2rem"
    width: "34rem"
  input-field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.7rem"
  option:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.7rem"
  option-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  state-mark:
    backgroundColor: "currentcolor"
    typography: "{typography.label}"
    size: "0.5rem"
  header-rule:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    padding: "0.7rem clamp(0.8rem, 3vw, 1.4rem)"
---

# Design System: LearnAnything

## Overview

**Creative North Star: "Rozkładany arkusz"**

Świat wybrany przez użytkownika ze strony decyzyjnej: rozkładany arkusz Miury (katalog `paper-folds-pleats-deployable-miura-orbit-sheet`, seed key **b2ffe36d**, tryb `operate`). Kontrakt kierunku zapisany w `public/index.html` stawia tezę wprost: „Kurs jest arkuszem Miury — jedno pociągnięcie rozkłada pakiet w pole ponumerowanych paneli. Odrzuca siatkę jednakowych, zaokrąglonych kafelków z akcentem." Cała reszta systemu jest konsekwencją tego zdania, a nie zbiorem osobnych upodobań.

Materiałem jest papier, nie szkło i nie płaskie tło. Korpus strony niesie ziarno (`--paper-grain`, inline feTurbulence) i dwie rodziny włosowych zagięć pod 60° i −60°, powtarzanych co 5,5rem — arkusz jest widoczny, zanim cokolwiek na nim położysz. Rzeczy leżące na arkuszu mają jeden ścięty narożnik i podgięty klapek: to jedyna sylwetka w systemie. Zagięcia idą na przemian, górskie i dolinne, a ta sama parzystość rządzi trzema rzeczami naraz — kodem pozycji (`M-01`, `V-02`), stroną ścięcia i pionowym przesunięciem w siatce. Kod przy każdej pozycji nie jest ozdobą techniczną; jest etykietą miejsca w złożeniu.

Głos jest arkuszem specyfikacji, nie broszurą. Michroma wersalikami mówi tylko tam, gdzie mówi aplikacja (marka, tytuł ekranu); wszystko poza tym — łącznie z tekstem czytanym — idzie Spline Sans Mono. Złoto jest materiałem, nie kolorem: występuje jako szczotkowana folia na dokładnie jednej akcji ekranu i nigdy nie zostaje kolorem tekstu na papierze. Jeden ruch w całej powłoce ma prawo być zauważony: kaskada rozłożenia arkusza przy wejściu na ekran. Świat odrzuca zaokrąglone kafelki, dekoracyjny gradient tła i drugi akcent kolorystyczny obok folii.

**Key Characteristics:**

- Papier w polu włosowych zagięć 60°, nigdy gładkie tło
- Zero promienia narożnika w całym systemie — narożnik jest ścinany, nie zaokrąglany
- Parzystość pozycji rządzi kodem M-/V-, stroną ścięcia i przesunięciem w siatce
- Michroma wersalikami tylko dla głosu aplikacji, Spline Sans Mono dla całej reszty
- Złota folia jako materiał jednej akcji na ekran
- Dwa równorzędne motywy, `data-theme="jasny|ciemny"`, kolory wyłącznie z `theme.css`
- Jeden autorski ruch: kaskada rozłożenia, 340 ms, 45 ms opóźnienia na pozycję
- Zero media query widokowych — cały zakres niesie `clamp()`, `auto-fill` i `flex-wrap`

### Zapas świata (celowa rezerwa, nie braki)

Przegląd wykończenia nazwał sześć rzeczy, które ten świat udźwignie, a których build świadomie nie wydał. To zapas na kolejne powierzchnie, nie lista usterek:

- rysunek wzoru zagięć (crease pattern) jako element ilustracyjny,
- litera M/V wybita wewnątrz podgiętego klapka,
- adnotacja kąta 60° jako ornament,
- rysowany zestaw ikon w jednej grubości kreski,
- stan aktywny, w którym ogon złotej wstęgi wbiega w atrament,
- włosowe przekątne zagięć przecinające liternictwo Michromy.

## Colors

Paleta jest papierem: ciepła szarość arkusza, dwie rodziny zagięć (górskie szare, dolinne błękitne), złota folia jako jedyny materiał ozdobny i wąski zestaw stanów. Wartości żyją wyłącznie w `public/theme.css`, w dwóch blokach `:root[data-theme='jasny'|'ciemny']`. **Jedyny wyjątek w całym repo:** data-URI favikony w `index.html`, która nie ma jak przeczytać zmiennej CSS (atrament i folia zapisane tam jako `%23…`).

### Primary

- **Złota folia** (`{colors.foil}`, jaśniejsza `{colors.foil-lite}`, głębsza `{colors.foil-deep}`): materiał akcji głównej — jedna wstęga na ekran (Utwórz projekt / Dalej / Zaplanuj kurs / Akceptuję). Wchodzi wyłącznie jako gradient 102° z ziarnem `--foil-grain`, nigdy jako płaskie wypełnienie i nigdy jako kolor liter na papierze. Tekst na foli to `{colors.on-foil}`.

### Secondary

- **Granat interakcji** (`{colors.accent}`, w ciemnym motywie rozjaśniony do `{colors.accent-ciemny}`): tekst klikalny, pierścień focusu, `accent-color` radia, stany `gotowa` / `plan` / `wywiad`. To jedyny kolor, którym wolno pisać interakcję.

### Tertiary

- **Błękit zagięcia dolinnego** (`{colors.crease-v}`): kolor „doliny" — obrys i wypełniony trójkąt złożonego narożnika przy wybranej opcji wywiadu. Nie służy do niczego innego.

### Neutral

- **Arkusz** (`{colors.bg}`): tło strony, tło pól formularza i wierszy opcji — pole, na którym leży wszystko inne.
- **Papier uniesiony** (`{colors.surface}`): panele, linijka nagłówka, przyciski domyślne.
- **Cień papieru** (`{colors.surface-2}`): podgięty klapek narożnika i tło hoveru — jedyne miejsce, gdzie widać „drugą stronę" kartki.
- **Atrament** (`{colors.text}`) i **ołówek** (`{colors.muted}`): tekst czytany oraz etykiety i metadane. Etykiety mają wersaliki i światło, więc ołówek nie jest szeptem, tylko drugim rejestrem.
- **Krawędź** (`{colors.border}`): wszystkie ramki 1px, kreski wierszy, przekątna na klapku.
- **Zagięcie górskie** (`{colors.crease-m}`): ramka przycisku pod kursorem i pierwszy odcinek kreski nacięcia pod tytułem ekranu.
- **Włos zagięcia** (`{colors.crease-hair}`, `{colors.crease-hair-2}`): dwie siatki 60° w tle korpusu; jedyne kolory podane z kanałem alfa, bo mają znikać, nie rysować.

### Stany

- `{colors.warn}` · `{colors.danger}` · `{colors.done}`: generowanie w toku, błąd i lekcja ukończona (złoto przygaszone do wartości czytelnej jako tekst — patrz reguła niżej). To cały słownik stanów, jaki powłoka dziś maluje.
- `{colors.ok}`: zieleń powodzenia — zadeklarowana w obu motywach, w powłoce jeszcze nieużywana; czeka na werdykt oceny praktyki w warstwie lekcji. Nie należy jej rozciągać na nowe role tylko dlatego, że istnieje.

### Named Rules

**Reguła jednego źródła koloru.** Żaden plik poza `theme.css` nie zapisuje wartości koloru. Jedyny udokumentowany wyjątek to data-URI favikony w `index.html`. Nowa powierzchnia dodaje zmienną do obu motywów albo używa istniejącej — nigdy nie wpisuje heksa na miejscu.

**Reguła folii jako materiału.** Złoto jest powierzchnią, nigdy atramentem. Wolno nim wypełnić dokładnie jedną akcję na ekranie; jeśli ekran potrzebuje dwóch podświetlonych akcji, to znaczy, że jedna z nich nie jest główna. Tam, gdzie ma paść *tekst* o wydźwięku złota (stan `ukończona`), używa się `{colors.done}`, a nie `{colors.foil}`.

**Reguła podłogi kontrastu.** Ziarno papieru obniża efektywne tło, więc kontrast mierzy się na ziarnie, nie na czystym heksie. `--muted` został z tego powodu przyciemniony: wcześniejsza wartość dawała 4,36:1, obecna mierzy 5,06:1 na ziarnistym arkuszu i 6,29:1 wewnątrz paneli. Placeholder pól używa tej samej zmiennej z `opacity: 1`, bo domyślny placeholder przeglądarki schodził do ~3,5:1.

## Typography

**Display Font:** Michroma 400 (self-hosted, `latin` + `latin-ext` woff2)
**Body / Mono Font:** Spline Sans Mono, oś zmienna 300–700 (self-hosted, `latin` + `latin-ext` woff2)

**Character:** Michroma to szerokie, techniczne wersaliki — mówi nimi tylko aplikacja i tylko w dwóch miejscach. Cała reszta, łącznie z tekstem czytanym, idzie monospaced: własnym głosem tego świata jest arkusz specyfikacji, nie broszura, więc tabelaryczne cyfry i stała szerokość znaku są tu regułą, a nie akcentem dla kodu. Oba kroje są hostowane lokalnie z `public/fonts/` — aplikacja działa bez sieci i bez CDN.

### Hierarchy

- **Display** (Michroma 400, `clamp(1.3rem, 1rem + 1.4vw, 2rem)`, 1.25, `0.04em`, wersaliki): tytuł ekranu należący do aplikacji. Zawsze z kreską nacięcia pod spodem.
- **Brand** (Michroma 400, `clamp(0.64rem, 0.45rem + 0.7vw, 0.82rem)`, światło `clamp(0.08em, 0.02em + 0.5vw, 0.2em)`, wersaliki): nazwa w linijce arkusza. Światło rośnie razem z szerokością — na wąskim ekranie nazwa się nie łamie.
- **Subject** (Spline Sans Mono 600, `clamp(1.1rem, 0.95rem + 0.8vw, 1.45rem)`, 1.4, bez wersalików): tytuł ekranu niosący temat użytkownika (`h1.subject`).
- **Question** (600, `1.05rem`, 1.45, max `56ch`): pytanie wywiadu — jedyne miejsce, gdzie tekst czytany jest wytłuszczony i większy od korpusu.
- **Title** (600, `1.02rem`, 1.35): tytuł pakietu kursu w siatce; `overflow-wrap: anywhere`, bo temat pochodzi od użytkownika.
- **Section** (600, `0.8rem`, `0.16em`, wersaliki, kolor ołówka): `h2` jako etykieta sekcji, nie nagłówek treści.
- **Body** (400, `0.92rem`, 1.65, max `64ch`): tekst czytany.
- **Control** (`0.74rem`, `0.12em`, wersaliki): wszystkie przyciski.
- **Label** (`0.7rem`, `0.14em`, wersaliki, kolor ołówka): etykiety pól, `dt` w bloku spec, znaczniki stanu, link powrotu.
- **Code** (`0.7rem`, `0.14em`, `tabular-nums`): kody arkusza i pozycji (`M-01`, `V-02`) oraz liczniki.

### Named Rules

**Reguła cudzego tematu.** Tytuł, który należy do aplikacji, idzie Michromą wersalikami. Tytuł niosący temat wpisany przez użytkownika opuszcza krój display i zostaje monospaced, w normalnej wielkości liter (`h1.subject`). Powód jest zmierzony na buildzie: długi temat w szerokich wersalikach schodził na trzy linie i przestawał być tytułem.

**Reguła dwóch rejestrów.** Wersaliki ze światłem to metadane (etykieta, stan, kod, przycisk). Normalna wielkość liter to treść (tytuł kursu, pytanie, akapit, pole). Nowy element wybiera rejestr według tego, czym jest, a nie według tego, jak ma być ważny.

**Reguła zadeklarowanego zakresu znaków.** Kroje są wpięte z jawnym `unicode-range` dla `latin` i `latin-ext`; polskie znaki diakrytyczne padają w drugi plik. Znak spoza zadeklarowanego zakresu (np. strzałka `U+2190`) nie ma prawa być tekstem — grot w linku powrotnym jest rysowany dwiema krawędziami obróconymi o 45°.

## Layout

Jedna kolumna czytelna, wyśrodkowana, z twardym limitem miary: `--measure` 66rem dla całego ekranu, 34rem dla paneli formularza i podsumowania (`.panel.narrow`). Korpus dostaje `2rem` oddechu u góry, `clamp(0.9rem, 3vw, 1.4rem)` po bokach i `5rem` u dołu — arkusz kończy się pustym marginesem, nie krawędzią okna. Linijka arkusza (nagłówek) jest przyklejona do góry (`position: sticky`), z jedną kreską `1px` jako granicą.

Pakiety kursów leżą w siatce `repeat(auto-fill, minmax(18.5rem, 1fr))` z odstępem `1.1rem`. Parzyste pozycje siatki — czyli zagięcia dolinne — dostają `margin-block-start: 1.5rem`, więc arkusz zostaje rozłożony także po zakończeniu animacji, a szereg paneli ma widoczną kadencję góra-dół zamiast równego rzędu. Rzędy akcji i identyfikacji używają `flex-wrap` z bazami `flex: 1 1 14rem` / `16rem` / `20rem`, więc łamią się same, kiedy zabraknie miejsca.

Rytm odstępów jest krótki i powtarzalny: `0.35rem` wewnątrz pola, `0.6rem` między kontrolkami, `0.9rem` wokół bloku spec, `1.2rem` jako padding panelu i odstęp między panelami, `2rem` przed sekcją.

### Named Rules

**Reguła braku punktów granicznych.** W całej powłoce nie ma ani jednej widokowej media query — jedyna w pliku to `prefers-reduced-motion`. Skalowanie niesie `clamp()`, zawijanie niesie `auto-fill minmax()` i `flex-wrap`. Nowy układ, który potrzebuje `@media (max-width: …)`, jest sygnałem, że jego wewnętrzna miara jest źle dobrana.

**Reguła kadencji arkusza.** Panele w siatce nie stoją w równej linii: dolinne siadają `1.5rem` niżej niż górskie. Wyrównanie ich do jednego rzędu likwiduje złożenie i sprowadza świat do zwykłych kafelków.

## Elevation & Depth

Głębia jest cieniem realnego papieru: płytka, ciepła, obecna tylko pod rzeczami, które faktycznie leżą wyżej niż arkusz (pakiety kursów, złota wstęga). Wszystko inne jest płaskie i oddziela się kreską `1px`, nie cieniem.

Techniczna konsekwencja świata: skoro sylwetka powstaje przez `clip-path`, `box-shadow` zostaje przycięty razem z kształtem i nie ma jak paść za ścięciem narożnika. Dlatego cały cień w powłoce idzie przez `filter: drop-shadow()` — filtr obchodzi kształt, nie prostokąt.

### Shadow Vocabulary

- **`--drop`** (`drop-shadow(0 2px 3px rgb(10 10 10 / 12%))`, ciemny motyw: ta sama geometria na 55% czerni): stan spoczynku pakietu kursu i złotej wstęgi.
- **`--drop-lift`** (`drop-shadow(0 7px 14px rgb(10 10 10 / 20%))`, ciemny motyw: `0 7px 16px` na 65% czerni): hover pakietu (razem z `translateY(-2px)`) i hover wstęgi.
- **`--shadow` / `--shadow-lift`** (`box-shadow`): zadeklarowane w `theme.css` dla warstwy lekcji, która nie tnie narożników. Powłoka ich nie używa i nie powinna.

### Named Rules

**Reguła cienia za kształtem.** Element ze ściętym narożnikiem cieniuje się przez `filter: drop-shadow()`. `box-shadow` na `clip-path` jest w tym świecie zawsze błędem — zostanie obcięty dokładnie tam, gdzie cień był potrzebny.

**Reguła płaskiego arkusza.** Panel leżący na arkuszu jest płaski: ramka `1px` i klapek wystarczą. Cień dostaje tylko rzecz, którą można podnieść — pakiet kursu i akcja główna.

## Shapes

Jedna sylwetka na cały system: prostokąt ze ściętym jednym narożnikiem, z podgiętym klapkiem i linią zagięcia na tym klapku. `--radius` wynosi `0` i ma tak zostać — ten świat tnie rogi, nie zaokrągla ich. Wielkość ścięcia to `--cut` = `0.9rem` (kontrolki przełączników `0.5rem`, ogon złotej wstęgi `0.75rem`).

Ścięcie robi `clip-path: polygon(...)`. Ramka nie może być zwykłym `border`, bo `clip-path` obciąłby ją na przekątnej, więc panel rysuje cztery krawędzie jako cztery gradienty tła `1px` i dopina przekątną osobnym pseudo-elementem. Klapek jest drugim pseudo-elementem w kolorze `--surface-2` (druga strona kartki), przyciętym do trójkąta.

Zagięcie górskie (`.panel`) ścina prawy górny róg. Zagięcie dolinne (`.panel.valley`) jest jego lustrem: ścięcie, klapek i przekątna przechodzą na lewą stronę. Parzystość bierze się z indeksu pozycji — tego samego, który generuje kod `M-`/`V-`.

Złota wstęga łamie tę sylwetkę celowo w jednym miejscu: zamiast ścięcia narożnika ma pochyloną prawą krawędź (`polygon(0 0, 100% 0, calc(100% - 0.75rem) 100%, 0 100%)`) — kawałek foli ucięty ukośnie, nie kartka.

### Named Rules

**Reguła zera promienia.** Nigdzie w systemie nie pada `border-radius` inny niż `0`. Zaokrąglony narożnik jest w tym świecie obcym materiałem.

**Reguła lustra parzystości.** Pozycja parzysta jest górska (ścięcie w prawym górnym rogu, kod `M-`), nieparzysta jest dolinna (ścięcie w lewym górnym, kod `V-`). Kod, strona ścięcia i przesunięcie w siatce zawsze pochodzą z tego samego indeksu — rozjazd któregokolwiek z nich rozspójnia arkusz.

**Reguła pierścienia do środka.** `clip-path` obcina `outline`, więc pierścień focusu wchodzi do wnętrza elementu (ujemny `outline-offset`: `-4px` na przełącznikach, `-5px` na foli, `-3px` na wierszu opcji). Focus nigdy nie jest usuwany, tylko przenoszony do środka.

## Components

### Buttons

- **Kształt:** prostokąt bez promienia (`0`), tekst `0.74rem` wersalikami ze światłem `0.12em`, przejścia `180ms`.
- **Akcja główna (złota wstęga):** gradient `102°` `--foil-deep → --foil-lite → --foil` z nałożonym ziarnem `--foil-grain`, tekst `--on-foil`, bez ramki, padding `0.55rem 1.5rem 0.55rem 1rem` (prawa strona szersza, bo ukośne cięcie zjada róg), cień `--drop`.
- **Hover / Focus:** wstęga rozjaśnia gradient i podnosi się na `--drop-lift`; jej focus rysuje pierścień atramentem *wewnątrz* foli. Przycisk domyślny zmienia tło na `--surface-2` i ramkę na `--crease-m`; jego focus to pierścień `--accent` z offsetem `2px`.
- **Domyślny / Ghost / Danger:** domyślny — papier `--surface` z ramką `--border`. Ghost — przezroczyste tło, ta sama ramka. Danger — tekst `--danger`, ramka zapala się na `--danger` dopiero pod kursorem. Akcja usuwania wewnątrz pakietu kursu jest jeszcze cichsza: bez ramki, bez tła, podkreślenie i czerwień dopiero na hover.
- **Disabled:** `opacity: 0.5` dla kontrolek; wstęga zamiast tego traci folię i staje się `--surface-2` z tekstem `--muted` — złoto nie występuje w stanie nieaktywnym.

### Cards / Containers

- **Corner Style:** ścięcie `0.9rem` po stronie wynikającej z parzystości; klapek `--surface-2` z przekątną `--border`.
- **Background:** `--surface` na tle arkusza `--bg`.
- **Shadow Strategy:** `--drop` w spoczynku, `--drop-lift` + `translateY(-2px)` na hover (patrz Elevation & Depth).
- **Border:** cztery gradienty `1px` w `--border` zamiast `border`, bo `clip-path` przycina ramkę.
- **Internal Padding:** `1.15rem 1.2rem`; odstęp między panelami `1.25rem`; wariant `.narrow` zatrzymuje się na `34rem`.

### Inputs / Fields

- **Style:** tło `--bg` (pole jest wgłębieniem w papierze, nie wypukłością), ramka `1px --border`, zero promienia, padding `0.5rem 0.7rem`, etykieta nad polem w rejestrze Label.
- **Focus:** `outline: 2px solid var(--accent)` z offsetem `1px`.
- **Placeholder:** `--muted` z `opacity: 1` — domyślna przezroczystość przeglądarki schodziła poniżej progu czytelności.
- **Pole wpisane w arkusz:** tytuł lekcji w planie (`.plan-row input.title`) startuje bez tła i bez ramki, jak tekst wpisany na kartce; ramka pojawia się na hover, a tło `--bg` i ramka `--accent` dopiero przy focusie.

### Navigation

- **Linijka arkusza:** przyklejony do góry pasek `--surface` z kreską `--border` u dołu. Po lewej marka Michromą wersalikami i kod bieżącego ekranu (`M-01` lista, `V-02` wywiad, `M-03` plan, `V-04` projekt); po prawej dwa przełączniki — motyw i język — jako przyciski ghost ze ścięciem `0.5rem` i własnym klapkiem.
- **Powrót:** link w rejestrze Label z grotem rysowanym dwiema krawędziami obróconymi o 45° (nie glif), kolor `--muted` → `--text` na hover.
- **Mobile:** ten sam pasek; światło marki i padding schodzą przez `clamp()`, kod ekranu zostaje. Bez menu, bez chowania.

### Blok spec

Dwukolumnowa siatka `dl` (`auto 1fr`, odstęp `0.15rem 1rem`, `0.76rem`): `dt` wersalikami w kolorze ołówka, `dd` z `tabular-nums`. To sposób, w jaki ten świat pokazuje metadane — LEKCJE / JĘZYK / STAN pod tytułem pakietu, POZIOM / TEMPO / ZAKRES w podsumowaniu wywiadu. Licznik lekcji pokazuje półpauzę zamiast `0/0`, dopóki nie ma czego liczyć.

### Znacznik stanu

`.state[data-state]` mapuje polskie enumy danych na stany zagięcia. Znacznik to kwadrat `0.5rem` pochylony `skewX(-20deg)` przed etykietą wersalikami:

- `zaplanowana` / `nowy` — zagięcie nacięte, jeszcze nierozłożone: znacznik pusty, sam obrys (`inset` cień `1px`), kolor ołówka.
- `generowana` / `generowanie` — `--warn`, znacznik pulsuje krokowo (`steps(2, jump-none)`, 1,1s, `alternate`), czyli mruga jak wskaźnik, a nie oddycha jak animacja.
- `gotowa` / `gotowy` / `plan` / `wywiad` — `--accent`, znacznik wypełniony.
- `ukończona` — `--done` (złoto przygaszone do wartości czytelnej jako tekst).
- `błąd` — `--danger`.

### Wiersz opcji wywiadu (komponent sygnaturowy)

Cały wiersz jest klikalny (`label` z radiem w środku), tło `--bg`, ramka `--border`. Wybór jest złożeniem doliny: `:has(:checked)` przełącza tło na `--surface`, ramkę na `--crease-v` i ścina prawy górny róg, a wypełniony błękitem trójkąt klapka pokazuje, że narożnik został faktycznie zagięty. Pierścień focusu należy się całemu wierszowi (`:has(:focus-visible)`, offset `-3px`), bo klikalny jest wiersz, nie kropka.

### Blok błędu

Ta sama sylwetka co panel, ale wszystkie cztery krawędzie i przekątna są w `--danger`: złe zagięcie. Nagłówek komunikatu wersalikami w `--danger`, techniczny szczegół od serwera jako `small` w kolorze ołówka.

### Kaskada rozłożenia (jedyny autorski ruch)

Klasa `.deploy` z indeksem podanym jako `--i`: `rotateX(-74deg)` z `perspective(800px)` i `transform-origin: top center` do zera, `340ms`, `cubic-bezier(0.16, 0.84, 0.28, 1)`, opóźnienie `45ms × --i`. Panele pakietów, wiersze planu i pozycje listy lekcji rozkładają się kolejno od górnej krawędzi — jedno pociągnięcie, po którym arkusz jest rozłożony. Poza tym w systemie są tylko przejścia stanów `180ms` (`--step`). Reguła `prefers-reduced-motion: reduce` wyłącza w powłoce każdą animację i każde przejście.

### Warstwa lekcji (kontrakt otwarty — jeszcze nie zaimplementowana)

Faza 05 z `implementation-plan/` kontraktuje szablon lekcji z ustalonymi raz i niezmiennymi nazwami klas (`.pojecie`, `.diagram`, `.demko`, `.mikro-pytanie`, `.cwiczenie`, `.sprawdzian`, `.sugestie`) oraz osobnymi zmiennymi wizualizacji (`--wiz-1`…`--wiz-5`, `--wiz-siatka`, `--wiz-podswietlenie`), czytanymi przez Canvas funkcją `czytajZmienna()`. **W kodzie tego nie ma.** To zapisany kontrakt, nie komponent tego systemu — kiedy powstanie, dziedziczy sylwetkę ścięcia, dwa rejestry typograficzne i regułę jednego źródła koloru, a swoje zmienne dokłada do obu motywów w `theme.css`.

## Do's and Don'ts

### Do:

- **Do** trzymać każdą wartość koloru w `theme.css`, w obu motywach naraz; jedyny wyjątek to data-URI favikony.
- **Do** dawać nowej rzeczy leżącej na arkuszu ścięty narożnik `--cut` z klapkiem i linią zagięcia — i wybierać stronę ścięcia z parzystości pozycji, tej samej, która generuje kod `M-`/`V-`.
- **Do** cieniować przez `filter: drop-shadow()` (`--drop`, `--drop-lift`), bo `clip-path` przycina `box-shadow`.
- **Do** pisać interakcję i focus kolorem `--accent`, a stan `ukończona` kolorem `--done`.
- **Do** wpuszczać focus do środka ujemnym `outline-offset` tam, gdzie `clip-path` obcina pierścień.
- **Do** skalować przez `clamp()`, `auto-fill minmax()` i `flex-wrap` zamiast punktów granicznych.
- **Do** mierzyć kontrast tekstu na ziarnistym tle, nie na czystym heksie — ziarno obniża efektywną jasność arkusza.
- **Do** zostawiać `h1.subject` dla tytułów niosących tekst użytkownika.

### Don't:

- **Don't** używać `border-radius` innego niż `0`.
- **Don't** malować złotem tekstu na papierze ani dawać więcej niż jedną złotą wstęgę na ekran.
- **Don't** wprowadzać drugiego koloru akcentowego obok folii i `--accent`; błękit `--crease-v` należy wyłącznie do doliny.
- **Don't** dodawać widokowych media query — jedyna dopuszczona to `prefers-reduced-motion`.
- **Don't** dokładać drugiej animacji wejścia; kaskada rozłożenia jest jedynym autorskim ruchem powłoki.
- **Don't** stawiać `border` na elemencie z `clip-path` — krawędzie rysuje się gradientami tła, przekątną pseudo-elementem.
- **Don't** wyrównywać paneli siatki do jednego rzędu; przesunięcie zagięć dolinnych o `1.5rem` jest częścią świata.
- **Don't** wstawiać glifów jako ikon (grot powrotu jest rysowany krawędziami — znak spoza zadeklarowanego `unicode-range` i tak by nie padł).
- **Don't** wygładzać tła do jednolitej płaszczyzny; ziarno i włosowe zagięcia 60° są materiałem, nie ozdobą.
