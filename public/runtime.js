// Wspólna logika lekcji: chowane odpowiedzi, sprawdzian, demka, stan lekcji i motyw.
// Odtwarzanie stanu stoi na stabilnych id — z pozycji w lekcji (chowane) albo z lekcji (demka).
//
// Moduł ESM, nie klasyczny skrypt: test w Node importuje samą ocenę sprawdzianu,
// a lesson.js dostaje API przez window.LA (moduły nie dzielą zasięgu).
//
// Po polsku są tylko nazwy z kontraktu: eksporty, kształt sprawdzianu i klasy CSS —
// prompt lekcji (faza 06) mówi nimi. Wnętrza idą po angielsku, jak reszta kodu.

import { confirmDialog } from './confirm.js';

// Lekcja ma własny słownik zamiast i18n.js powłoki: kilkanaście przycisków jest tańsze
// niż zależność, a język lekcji siedzi w <body data-lang>, nie w ustawieniu powłoki.
const texts = {
  pl: {
    show: 'Pokaż odpowiedź',
    hide: 'Ukryj odpowiedź',
    quiz: 'Sprawdzian',
    submit: 'Oddaj odpowiedzi',
    optionTrue: 'Prawda',
    optionFalse: 'Fałsz',
    correct: 'Poprawnie',
    incorrect: 'Niepoprawnie',
    why: 'Uzasadnienie',
    count: 'Poprawnych: {n} z {total}',
    saved: 'Wynik zapisany',
    notSaved: 'Wynik niezapisany',
    back: 'Wstecz',
    next: 'Dalej',
    play: 'Odtwórz',
    stop: 'Zatrzymaj',
    step: 'Krok {n} z {total}',
    resetLayout: 'Reset układu',
    run: 'Uruchom',
    restore: 'Przywróć kod startowy',
    output: 'Wynik',
    noOutput: '(brak wyniku)',
    preview: 'Podgląd kodu',
    practice: 'Praktyka',
    exercise: 'Ćwiczenie {n}',
    answer: 'Twoja odpowiedź',
    grade: 'Oceń odpowiedź',
    grading: 'Oceniam…',
    hint: 'Wskazówka',
    solution: 'Rozwiązanie wzorcowe',
    gradeError: 'Ocena niedostępna — uruchom aplikację i spróbuj ponownie.',
    poprawnie: 'Poprawnie',
    'częściowo': 'Częściowo',
    niepoprawnie: 'Niepoprawnie',
    restart: 'Zacznij od nowa',
    restartPytanie:
      'Zacząć tę lekcję od nowa? Odsłonięte odpowiedzi, wpisany kod i sprawdzian znikną. Wynik sprawdzianu w kursie zostaje.',
    anuluj: 'Anuluj',
    bladKomponentu: 'Nie udało się wczytać wizualizacji „{nazwa}”.',
  },
  en: {
    show: 'Show answer',
    hide: 'Hide answer',
    quiz: 'Quiz',
    submit: 'Submit answers',
    optionTrue: 'True',
    optionFalse: 'False',
    correct: 'Correct',
    incorrect: 'Incorrect',
    why: 'Why',
    count: 'Correct: {n} of {total}',
    saved: 'Score saved',
    notSaved: 'Score not saved',
    back: 'Back',
    next: 'Next',
    play: 'Play',
    stop: 'Stop',
    step: 'Step {n} of {total}',
    resetLayout: 'Reset layout',
    run: 'Run',
    restore: 'Restore starting code',
    output: 'Output',
    noOutput: '(no output)',
    preview: 'Code preview',
    practice: 'Practice',
    exercise: 'Exercise {n}',
    answer: 'Your answer',
    grade: 'Grade my answer',
    grading: 'Grading…',
    hint: 'Hint',
    solution: 'Model solution',
    gradeError: 'Grading unavailable — start the app and try again.',
    poprawnie: 'Correct',
    'częściowo': 'Partly correct',
    niepoprawnie: 'Incorrect',
    restart: 'Start over',
    restartPytanie:
      'Start this lesson over? Revealed answers, typed code and the quiz will be gone. The saved course score stays.',
    anuluj: 'Cancel',
    bladKomponentu: 'Could not load the “{nazwa}” visualisation.',
  },
};

/** Język lekcji, nie powłoki: <body data-lang>. */
export function tl(key, vars) {
  const lang = document.body.dataset.lang === 'en' ? 'en' : 'pl';
  const text = texts[lang][key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : text;
}

/** Kolor motywu dla Canvas — Canvas nie dziedziczy zmiennych CSS. */
export const czytajZmienna = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const el = (tag, props = {}, kids = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...[].concat(kids).filter(Boolean));
  return node;
};

// --- stan lekcji -------------------------------------------------------------
// Stan należy do przeglądarki: jeden klucz na lekcję, serwer o nim nie wie. To wygoda,
// nie źródło prawdy — uszkodzony albo nieznany wpis jest ignorowany, bez migracji.

/** Zapis w głąb obiektu: dokłada brakujące poziomy, nie rusza rodzeństwa. */
export function zapiszSciezke(obiekt, sciezka, wartosc) {
  const klucze = String(sciezka).split('.');
  const ostatni = klucze.pop();
  let poziom = obiekt;
  for (const klucz of klucze) {
    if (typeof poziom[klucz] !== 'object' || poziom[klucz] === null) poziom[klucz] = {};
    poziom = poziom[klucz];
  }
  poziom[ostatni] = wartosc;
  return obiekt;
}

/** Zapisane wartości na domyślnych. Klucz spoza domyślnych odpada — lekcja mogła się zmienić. */
export const scalStan = (zapisany, domyslny) =>
  Object.fromEntries(
    Object.entries(domyslny).map(([klucz, wartosc]) => [
      klucz,
      zapisany && typeof zapisany === 'object' && klucz in zapisany ? zapisany[klucz] : wartosc,
    ]),
  );

/**
 * Stan lekcji pod jednym kluczem magazynu. Fabryka, bo test podstawia atrapę `localStorage`,
 * a lekcja w trybie prywatnym albo z `file://` dostaje `null` i cicho przestaje zapisywać.
 */
export function stanLekcji(klucz, magazyn, zwloka = 200) {
  let pamiec = null;
  let timer = null;

  const wczytaj = () => {
    if (pamiec) return pamiec;
    try {
      const surowe = JSON.parse(magazyn?.getItem(klucz) ?? 'null');
      pamiec = surowe && typeof surowe === 'object' ? surowe : {};
    } catch {
      pamiec = {}; // popsuty wpis to brak wpisu — nie ma czego ratować
    }
    return pamiec;
  };

  const spisz = () => {
    clearTimeout(timer);
    const dane = wczytaj();
    try {
      // Pusty stan to brak wpisu, nie wpis "{}" — inaczej „zacznij od nowa" zostawia śmiecia.
      if (Object.keys(dane).length) magazyn?.setItem(klucz, JSON.stringify(dane));
      else magazyn?.removeItem(klucz);
    } catch {} // pełny albo zablokowany magazyn nie może wysypać lekcji
  };

  return {
    wczytaj,
    czytaj: (sciezka) =>
      String(sciezka)
        .split('.')
        .reduce((poziom, klucz) => poziom?.[klucz], wczytaj()),
    // Debounce: przeciągany suwak nie ma pisać do magazynu sto razy na sekundę.
    zapisz(sciezka, wartosc) {
      zapiszSciezke(wczytaj(), sciezka, wartosc);
      clearTimeout(timer);
      timer = setTimeout(spisz, zwloka);
    },
    spisz,
    wyczysc() {
      pamiec = {};
      clearTimeout(timer);
      try {
        magazyn?.removeItem(klucz);
      } catch {}
    },
  };
}

// Ustawiany przy starcie lekcji; w Node zostaje null i każde `stan?.` jest niczym.
let stan = null;
const zapiszDemko = (klucz, wartosc) => stan?.zapisz(`demka.${klucz}`, wartosc);

// --- motyw -------------------------------------------------------------------

const MOTYW_KLUCZ = 'learnanything:theme';
const MOTYWY = ['jasny', 'ciemny'];

/** Motyw powłoki, a bez niej systemowy — lekcja otwarta sama też ma wyglądać jak trzeba. */
function ustawMotyw() {
  let zapisany = null;
  try {
    zapisany = localStorage.getItem(MOTYW_KLUCZ);
  } catch {}
  document.documentElement.dataset.theme = MOTYWY.includes(zapisany)
    ? zapisany
    : matchMedia('(prefers-color-scheme: dark)').matches
      ? 'ciemny'
      : 'jasny';
}

// --- chowane odpowiedzi ------------------------------------------------------

/** Do każdego [data-chowane] dokłada przycisk. Wołane ponownie po dorysowaniu treści. */
export function initChowane(root = document) {
  const all = [...root.querySelectorAll('[data-chowane]')];
  all.forEach((target, i) => {
    if ('gotowe' in target.dataset) return;
    target.dataset.gotowe = '';
    // id z pozycji w lekcji, nigdy losowane: faza 08 odtwarza stan właśnie po nim.
    if (!target.id) target.id = `chowane-${i + 1}`;
    const toggle = el('button', { type: 'button', className: 'chowane-przelacz' });
    toggle.setAttribute('aria-controls', target.id);
    const pokaz = (widoczne) => {
      target.hidden = !widoczne;
      toggle.textContent = tl(widoczne ? 'hide' : 'show');
      toggle.setAttribute('aria-expanded', String(widoczne));
    };
    toggle.addEventListener('click', () => {
      pokaz(target.hidden);
      stan?.zapisz(`chowane.${target.id}`, !target.hidden);
    });
    pokaz(stan?.czytaj(`chowane.${target.id}`) === true);
    target.before(toggle);
  });
}

// --- sprawdzian --------------------------------------------------------------

const sameSet = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const sorted = (list) => [...list].sort((x, y) => x - y);

/**
 * Ocena w przeglądarce, natychmiast. Jedna reguła dla wszystkich typów: punkt za komplet.
 * Wielokrotny wybór nie ma punktów cząstkowych, brak odpowiedzi to zero bez wyjątku.
 */
export function ocenSprawdzian(pytania, odpowiedzi = {}) {
  const szczegoly = pytania.map((question) => {
    const chosen = sorted(odpowiedzi[question.id] ?? []);
    const expected = sorted(question.poprawne ?? []);
    return {
      id: question.id,
      trafione: sameSet(chosen, expected),
      wybrane: chosen,
      poprawne: expected,
      uzasadnienie: question.uzasadnienie ?? '',
    };
  });
  const poprawne = szczegoly.filter((detail) => detail.trafione).length;
  return {
    procent: pytania.length ? Math.round((poprawne / pytania.length) * 100) : 0,
    poprawne,
    szczegoly,
  };
}

/** Lekcja nie jest zakładnikiem serwera: błąd zapisu nie blokuje oceny. */
export async function wyslijWynik(percent) {
  const { project, lesson } = document.body.dataset;
  const res = await fetch(`/api/projects/${project}/lessons/${lesson}/result`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ score: percent }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Zaznaczenia formularza w kształcie odpowiedzi sprawdzianu. */
const zebrane = (pytania, form) =>
  Object.fromEntries(
    pytania.map((question) => [
      question.id,
      [...form.querySelectorAll('input:checked')]
        .filter((input) => input.name === question.id)
        .map((input) => Number(input.value)),
    ]),
  );

/** API dla lesson.js: rysuje sprawdzian, ocenia po oddaniu i wysyła wynik. */
export function quiz(pytania, target = document.getElementById('sprawdzian')) {
  const blocks = new Map();
  const form = el('form', { className: 'pytania' });

  for (const question of pytania) {
    const multi = question.typ === 'wielokrotny';
    const options =
      question.opcje ??
      (question.typ === 'prawda-falsz' ? [tl('optionTrue'), tl('optionFalse')] : []);
    const block = el('div', { className: 'pytanie' }, [
      el('p', { className: 'tresc', textContent: question.tekst }),
      el(
        'div',
        { className: 'opcje' },
        options.map((label, i) =>
          el('label', { className: 'opcja', htmlFor: `${question.id}-o${i}` }, [
            el('input', {
              type: multi ? 'checkbox' : 'radio',
              name: question.id,
              value: String(i),
              id: `${question.id}-o${i}`,
            }),
            el('span', { textContent: label }),
          ]),
        ),
      ),
    ]);
    blocks.set(question.id, block);
    form.append(block);
  }

  const submit = el('button', { type: 'submit', className: 'primary', textContent: tl('submit') });
  form.append(submit);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    grade(pytania, form, blocks, submit, target, true);
  });

  target.append(el('h2', { textContent: tl('quiz') }), form);

  // Odtworzenie: zaznaczenia wracają zawsze, ocena tylko wtedy, gdy sprawdzian był oddany.
  const zapisany = stan?.czytaj('sprawdzian') ?? {};
  const odpowiedzi = zapisany.odpowiedzi ?? {};
  form.querySelectorAll('input').forEach((input) => {
    if (odpowiedzi[input.name]?.includes(Number(input.value))) input.checked = true;
  });
  form.addEventListener('change', () =>
    stan?.zapisz('sprawdzian.odpowiedzi', zebrane(pytania, form)),
  );
  if (zapisany.oddany) grade(pytania, form, blocks, submit, target, false);
}

// `wyslij` na false znaczy „odtwarzam oddany sprawdzian" — wynik poszedł już przy oddaniu.
function grade(pytania, form, blocks, submit, target, wyslij) {
  const { procent, poprawne, szczegoly } = ocenSprawdzian(pytania, zebrane(pytania, form));
  if (wyslij) stan?.zapisz('sprawdzian.oddany', true);

  for (const detail of szczegoly) {
    const block = blocks.get(detail.id);
    block.dataset.ocena = detail.trafione ? 'poprawnie' : 'niepoprawnie';
    block.append(
      el('p', {
        className: 'werdykt',
        textContent: tl(detail.trafione ? 'correct' : 'incorrect'),
      }),
      // Uzasadnienie przy każdym pytaniu, także trafionym — po to jest sprawdzian.
      detail.uzasadnienie
        ? el('p', {
            className: 'uzasadnienie',
            textContent: `${tl('why')}: ${detail.uzasadnienie}`,
          })
        : null,
    );
  }

  form.querySelectorAll('input').forEach((input) => (input.disabled = true));
  submit.disabled = true;

  const saveNote = el('span', { className: 'zapis' });
  target.append(
    el('p', { className: 'wynik' }, [
      el('span', { className: 'procent', textContent: `${procent}%` }),
      el('span', {
        className: 'liczba',
        textContent: tl('count', { n: poprawne, total: pytania.length }),
      }),
      wyslij ? saveNote : null,
    ]),
  );
  if (!wyslij) return;

  wyslijWynik(procent)
    .then(() => {
      saveNote.textContent = tl('saved');
    })
    .catch(() => {
      saveNote.dataset.stan = 'niezapisany';
      saveNote.textContent = tl('notSaved');
    });
}

// --- praktyka oceniana -------------------------------------------------------
// Ćwiczenia z otwartą odpowiedzią ocenia model po stronie serwera, na żądanie i bez limitu
// prób: żadnego licznika, żadnej blokady po n-tej próbie. Rozwiązanie wzorcowe odsłania się
// po pierwszej ocenie — także nieudanej, żeby zatrzymany serwer nie zamykał ćwiczenia.

/** Lekcja nie jest zakładnikiem serwera: błąd oceny odsłania rozwiązanie, nie blokuje lekcji. */
export async function ocenPraktyke(exerciseId, task, answer) {
  const { project, lesson } = document.body.dataset;
  const res = await fetch(`/api/projects/${project}/lessons/${lesson}/practice`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ exerciseId, task, answer }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** `verdict` zostaje enumem w danych — na ekran idzie przez tl(), jak statusy w powłoce. */
function pokazOcene(host, ocena) {
  host.dataset.werdykt = ocena.verdict;
  host.replaceChildren(
    ...[
      el('p', { className: 'werdykt', textContent: tl(ocena.verdict) }),
      ocena.feedback && el('p', { className: 'uzasadnienie', textContent: ocena.feedback }),
      ocena.hint && el('p', { className: 'wskazowka', textContent: `${tl('hint')}: ${ocena.hint}` }),
    ].filter(Boolean),
  );
}

function cwiczenie({ id, tresc, rozwiazanie = '', demko = '' }, numer) {
  const zapisany = stan?.czytaj(`praktyka.${id}`) ?? {};
  const pole = el('textarea', {
    className: 'odpowiedz',
    id: `odpowiedz-${id}`,
    rows: 4,
    placeholder: tl('answer'),
    value: zapisany.odpowiedz ?? '',
  });
  const przycisk = el('button', { type: 'button', className: 'primary', textContent: tl('grade') });
  const ocena = el('div', { className: 'ocena' });
  const blad = el('p', { className: 'blad-oceny', hidden: true });
  // id rozwiązania z id ćwiczenia, nie z licznika w initChowane — inaczej zderzyłoby się
  // ze stanem chowanych z teorii.
  const wzorzec =
    rozwiazanie &&
    el('div', { className: 'rozwiazanie', hidden: true }, [
      el('h4', { textContent: tl('solution') }),
      el('div', { 'data-chowane': '', id: `rozwiazanie-${id}` }, [
        el('p', { textContent: rozwiazanie }),
      ]),
    ]);
  const odslon = () => {
    if (!wzorzec || !wzorzec.hidden) return;
    wzorzec.hidden = false;
    initChowane(wzorzec); // przycisk „Pokaż odpowiedź" dokłada runtime, jak wszędzie indziej
  };

  pole.addEventListener('input', () => stan?.zapisz(`praktyka.${id}.odpowiedz`, pole.value));
  przycisk.addEventListener('click', async () => {
    const odpowiedz = pole.value.trim();
    if (!odpowiedz) return;
    przycisk.disabled = true;
    przycisk.textContent = tl('grading');
    try {
      const wynik = await ocenPraktyke(id, tresc, odpowiedz);
      blad.hidden = true;
      pokazOcene(ocena, wynik);
      stan?.zapisz(`praktyka.${id}`, { odpowiedz, ocena: wynik });
    } catch {
      ocena.replaceChildren();
      delete ocena.dataset.werdykt;
      blad.textContent = tl('gradeError');
      blad.hidden = false;
    } finally {
      // Bez limitu prób: przycisk wraca zawsze i wygląda tak samo jak za pierwszym razem.
      przycisk.disabled = false;
      przycisk.textContent = tl('grade');
      odslon();
    }
  });

  if (zapisany.ocena) {
    pokazOcene(ocena, zapisany.ocena);
    odslon();
  }

  return el('section', { className: 'cwiczenie', id: `cwiczenie-${id}` }, [
    el('h3', { textContent: tl('exercise', { n: numer }) }),
    el('p', { className: 'tresc', textContent: tresc }),
    demko && el('section', { className: 'demko', id: demko }),
    pole,
    przycisk,
    blad,
    ocena,
    wzorzec,
  ]);
}

/** API dla lesson.js: rysuje ćwiczenia praktyki i podpina ocenę modelu. */
export function cwiczenia(lista, target = document.getElementById('praktyka')) {
  target.append(
    el('h2', { textContent: tl('practice') }),
    ...lista.map((cw, i) => cwiczenie(cw, i + 1)),
  );
}

// --- demka -------------------------------------------------------------------
// Cztery poziomy interaktywności. Lekcja daje dane i funkcję rysującą, nigdy własnych
// suwaków ani przycisków — panel sterowania należy do aplikacji, żeby suwak w lekcji
// o muzyce działał tak samo jak w lekcji o sieciach.
//
// Rejestr po id: faza 08 czyta stąd stan i woła przerysuj() po zmianie motywu,
// faza 11 woła reset() przed wydrukiem. id pochodzi z lekcji, nigdy z licznika renderu.
export const demka = new Map();

/** Wartość w zakresie. Osobno, bo to jeden z dwóch kawałków demek testowalnych bez DOM-u. */
export const przytnij = (wartosc, min, max) => Math.min(Math.max(wartosc, min), max);

/** Indeks kroku po ruchu: na krańcach stoi, nie zawija — „dalej" na końcu nie wraca na start. */
export const krokIndeks = (indeks, ruch, ile) => przytnij(indeks + ruch, 0, Math.max(ile - 1, 0));

function ramka(cel, id, typ) {
  const host = typeof cel === 'string' ? document.querySelector(cel) : cel;
  if (!host) throw new Error(`demko: nie ma elementu ${cel}`);
  const klucz = id || host.id;
  if (!klucz) throw new Error('demko: brak stabilnego id');
  host.id = klucz;
  host.classList.add('demko');
  host.dataset.demko = typ;
  return { host, klucz };
}

function zarejestruj(klucz, wpis) {
  demka.set(klucz, wpis);
  const zapisany = stan?.czytaj(`demka.${klucz}`);
  // Kształt spoza tej wersji lekcji ma być zignorowany, a nie wysadzić demko.
  if (zapisany !== undefined) {
    try {
      wpis.przywroc(zapisany);
    } catch {}
  }
  return wpis;
}
const plotno = () => el('figure', { className: 'diagram' });
const panelSterowania = () => el('div', { className: 'sterowanie' });
const opisDemka = (tekst) => tekst && el('p', { className: 'opis-demka', textContent: tekst });
const dolacz = (host, kids) => host.append(...kids.filter(Boolean));

// --- 1. sterowanie parametrami -----------------------------------------------

/** Jedna kontrolka panelu. Typ z pola `typ`, a gdy go nie ma — z kształtu opisu. */
function kontrolka(opis, zmiana) {
  const typ =
    opis.typ ??
    (opis.opcje ? 'opcje' : typeof opis.wartosc === 'boolean' ? 'przelacznik' : 'zakres');

  if (typ === 'opcje') {
    const pole = el(
      'select',
      {},
      opis.opcje.map((o) => el('option', { value: String(o), textContent: String(o) })),
    );
    pole.value = String(opis.wartosc ?? opis.opcje[0]);
    pole.addEventListener('change', () => zmiana(pole.value));
    return { typ, pole, ustaw: (v) => (pole.value = String(v)) };
  }

  if (typ === 'przelacznik') {
    const pole = el('input', { type: 'checkbox', checked: Boolean(opis.wartosc) });
    pole.addEventListener('change', () => zmiana(pole.checked));
    return { typ, pole, ustaw: (v) => (pole.checked = Boolean(v)) };
  }

  const min = Number(opis.min ?? 0);
  const max = Number(opis.max ?? 100);
  const pole = el('input', {
    type: typ === 'liczba' ? 'number' : 'range',
    min: String(min),
    max: String(max),
    step: String(opis.krok ?? 1),
    value: String(przytnij(Number(opis.wartosc ?? min), min, max)),
  });
  // 'input', nie 'change': wizualizacja ma nadążać za przeciąganiem, nie czekać na puszczenie.
  // Przycięcie mimo natywnych min/max — pole liczbowe wpuszcza wpisaną z klawiatury bzdurę.
  pole.addEventListener('input', () => zmiana(przytnij(Number(pole.value), min, max)));
  return { typ, pole, ustaw: (v) => (pole.value = String(v)) };
}

/** Poziom domyślny: suwaki i przełączniki, przy każdej zmianie lekcja rysuje od nowa. */
export function demoParametry({ el: cel, id, kontrolki = [], rysuj, opis }) {
  const { host, klucz } = ramka(cel, id, 'parametry');
  const rysunek = plotno();
  const panel = panelSterowania();
  const start = Object.fromEntries(kontrolki.map((k) => [k.id, k.wartosc]));
  const wartosci = { ...start };
  const przerysuj = () => rysuj(rysunek, wartosci);
  const ustawKontrolki = new Map();

  for (const k of kontrolki) {
    const odczyt = el('output', { className: 'wartosc', textContent: String(k.wartosc ?? '') });
    const { typ, pole, ustaw } = kontrolka(k, (v) => {
      wartosci[k.id] = v;
      odczyt.textContent = String(v);
      przerysuj();
      zapiszDemko(klucz, { ...wartosci });
    });
    ustawKontrolki.set(k.id, (v) => {
      ustaw(v);
      odczyt.textContent = String(v);
    });
    panel.append(
      el('label', { className: 'kontrolka' }, [
        el('span', { className: 'etykieta', textContent: k.etykieta ?? k.id }),
        pole,
        typ === 'zakres' || typ === 'liczba' ? odczyt : null,
      ]),
    );
  }

  dolacz(host, [opisDemka(opis), rysunek, panel]);
  przerysuj();

  const przywroc = (zapisany) => {
    Object.assign(wartosci, scalStan(zapisany, start));
    for (const [pole, ustaw] of ustawKontrolki) ustaw(wartosci[pole]);
    przerysuj();
  };
  const reset = () => {
    przywroc(start);
    zapiszDemko(klucz, { ...wartosci });
  };
  return zarejestruj(klucz, {
    typ: 'parametry',
    przerysuj,
    reset,
    przywroc,
    stan: () => ({ ...wartosci }),
  });
}

// --- 2. krok po kroku ---------------------------------------------------------

/** Procesy i algorytmy: wstecz / dalej / odtwórz, jeden krok naraz. */
export function demoKroki({ el: cel, id, kroki = [], rysuj, opis, tempoMs = 1400 }) {
  const { host, klucz } = ramka(cel, id, 'kroki');
  const rysunek = plotno();
  const panel = panelSterowania();
  const opisKroku = el('p', { className: 'opis-kroku' });
  const wskaznik = el('span', { className: 'wskaznik' });
  const wstecz = el('button', { type: 'button', textContent: tl('back') });
  const dalej = el('button', { type: 'button', textContent: tl('next') });
  const graj = el('button', { type: 'button', textContent: tl('play') });
  let indeks = 0;
  let timer = null;

  const przerysuj = () => {
    rysuj(rysunek, kroki[indeks], indeks);
    opisKroku.textContent = kroki[indeks]?.opis ?? '';
    wskaznik.textContent = tl('step', { n: indeks + 1, total: kroki.length });
    wstecz.disabled = indeks === 0;
    dalej.disabled = indeks >= kroki.length - 1;
  };
  const idz = (ruch) => {
    indeks = krokIndeks(indeks, ruch, kroki.length);
    przerysuj();
    zapiszDemko(klucz, { krok: indeks });
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
    graj.textContent = tl('play');
  };

  wstecz.addEventListener('click', () => (stop(), idz(-1)));
  dalej.addEventListener('click', () => (stop(), idz(1)));
  graj.addEventListener('click', () => {
    if (timer) return stop();
    // Odtwarzanie z ostatniego kroku nie ma czego pokazać — wraca na początek.
    if (indeks >= kroki.length - 1) idz(-kroki.length);
    graj.textContent = tl('stop');
    timer = setInterval(() => (indeks >= kroki.length - 1 ? stop() : idz(1)), tempoMs);
  });

  panel.append(wstecz, dalej, graj, wskaznik);
  dolacz(host, [opisDemka(opis), rysunek, opisKroku, panel]);
  przerysuj();

  const przywroc = (zapisany) => {
    indeks = krokIndeks(0, Number(zapisany?.krok) || 0, kroki.length);
    przerysuj();
  };
  const reset = () => {
    stop();
    przywroc({ krok: 0 });
    zapiszDemko(klucz, { krok: 0 });
  };
  return zarejestruj(klucz, {
    typ: 'kroki',
    przerysuj,
    reset,
    przywroc,
    stan: () => ({ krok: indeks }),
  });
}

// --- 3. manipulacja bezpośrednia ---------------------------------------------

/** Punkt zdarzenia w układzie rysunku: SVG przez macierz ekranu, Canvas przez skalę pikseli. */
function wspolrzedne(rysunek, ev) {
  const svg = rysunek.querySelector('svg');
  const ctm = svg?.getScreenCTM?.();
  if (ctm) return new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
  const canvas = rysunek.querySelector('canvas');
  if (!canvas) return null;
  const box = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - box.left) * canvas.width) / box.width,
    y: ((ev.clientY - box.top) * canvas.height) / box.height,
  };
}

/** Rozmiar układu współrzędnych — z niego bierze się próg chwytania. */
function rozmiar(rysunek) {
  const pole = rysunek.querySelector('svg')?.viewBox?.baseVal;
  if (pole?.width) return Math.max(pole.width, pole.height);
  const canvas = rysunek.querySelector('canvas');
  return canvas ? Math.max(canvas.width, canvas.height) : 100;
}

/** Struktury i geometria: elementy przeciągane wskaźnikiem — mysz i dotyk jednym kodem. */
export function demoManipulacja({
  el: cel,
  id,
  elementy = [],
  przeciagalne = true,
  rysuj,
  przyZmianie,
  opis,
}) {
  const { host, klucz } = ramka(cel, id, 'manipulacja');
  const rysunek = plotno();
  const panel = panelSterowania();
  const start = elementy.map((e) => ({ ...e }));
  let biezace = start.map((e) => ({ ...e }));
  const przerysuj = () => rysuj(rysunek, biezace);
  const przywroc = (zapisany) => {
    // Inna liczba elementów to inna lekcja pod tym samym id — zapis idzie do kosza.
    if (!Array.isArray(zapisany) || zapisany.length !== start.length) return;
    biezace = start.map((e, i) => scalStan(zapisany[i], e));
    przerysuj();
    przyZmianie?.(biezace);
  };
  const reset = () => {
    biezace = start.map((e) => ({ ...e }));
    przerysuj();
    przyZmianie?.(biezace);
    zapiszDemko(klucz, biezace);
  };

  const przywrocUklad = el('button', { type: 'button', textContent: tl('resetLayout') });
  przywrocUklad.addEventListener('click', () => reset());
  panel.append(przywrocUklad);
  dolacz(host, [opisDemka(opis), rysunek, panel]);
  przerysuj();

  if (przeciagalne) {
    let ciagniety = null;
    let uchwyt = { x: 0, y: 0 };

    rysunek.addEventListener('pointerdown', (ev) => {
      const p = wspolrzedne(rysunek, ev);
      if (!p) return;
      // Chwytamy tylko to, co blisko: inaczej kliknięcie w pustkę porywa najdalszy element.
      const prog = rozmiar(rysunek) * 0.12;
      ciagniety =
        biezace
          .map((e) => ({ e, d: Math.hypot(e.x - p.x, e.y - p.y) }))
          .filter((k) => k.d <= prog)
          .sort((a, b) => a.d - b.d)[0]?.e ?? null;
      if (!ciagniety) return;
      // Przesunięcie względne — element nie przeskakuje pod kursor przy chwyceniu za brzeg.
      uchwyt = { x: ciagniety.x - p.x, y: ciagniety.y - p.y };
      rysunek.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });

    rysunek.addEventListener('pointermove', (ev) => {
      if (!ciagniety) return;
      const p = wspolrzedne(rysunek, ev);
      if (!p) return;
      ciagniety.x = p.x + uchwyt.x;
      ciagniety.y = p.y + uchwyt.y;
      przerysuj();
      przyZmianie?.(biezace);
      zapiszDemko(klucz, biezace);
    });

    for (const nazwa of ['pointerup', 'pointercancel'])
      rysunek.addEventListener(nazwa, () => (ciagniety = null));
  }

  return zarejestruj(klucz, {
    typ: 'manipulacja',
    przerysuj,
    reset,
    przywroc,
    stan: () => biezace.map((e) => ({ ...e })),
  });
}

// --- 4. edytor kodu z podglądem ----------------------------------------------

// Most z sandboxa do lekcji: console i błędy lecą do rodzica przez postMessage.
// Klasyczny skrypt, nie moduł — ma działać w dokumencie bez originu.
const MOST_SANDBOXA = `
var __opisz = function (v) { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); } };
var __slij = function (typ, tekst) { parent.postMessage({ la: 1, typ: typ, tekst: tekst }, '*'); };
['log', 'info', 'warn', 'error'].forEach(function (nazwa) {
  console[nazwa] = function () {
    __slij(nazwa === 'error' ? 'blad' : 'log', [].map.call(arguments, __opisz).join(' '));
  };
});
window.onerror = function (tresc, plik, linia) {
  __slij('blad', tresc + (linia ? ' (' + linia + ')' : ''));
  return true;
};
window.addEventListener('unhandledrejection', function (e) { __slij('blad', String(e.reason)); });
`;

function dokumentSandboxa(jezyk, kod, podglad) {
  // Kod użytkownika nie może zamknąć znacznika, w którym siedzi.
  const kodJs = jezyk === 'js' ? kod.replaceAll('</script', '<\\/script') : '';
  return [
    '<!doctype html><meta charset="utf-8">',
    // ponytail: sandbox nie widzi zmiennych motywu lekcji (inny dokument, brak originu) —
    // schemat systemowy wystarcza; przekazanie palety przez postMessage, gdyby uwierało.
    '<style>html{color-scheme:light dark}body{margin:0;padding:.6rem;font:14px/1.55 ui-monospace,monospace}</style>',
    jezyk === 'css' ? `<style>${kod}</style>` : '',
    `<script>${MOST_SANDBOXA}</script>`,
    jezyk === 'html' ? kod : jezyk === 'css' ? podglad : '',
    kodJs ? `<script>${kodJs}</script>` : '',
  ].join('');
}

/**
 * Tematy programistyczne: textarea, przycisk i wynik. Wykonanie w `iframe` bez
 * `allow-same-origin` — kod użytkownika nie ma dostępu do storage ani do sesji lekcji
 * i nie opuszcza przeglądarki. `podglad` to markup dla języka `css`.
 */
export function demoKod({ el: cel, id, jezyk = 'js', kodStartowy = '', opis = '', podglad = '' }) {
  const { host, klucz } = ramka(cel, id, 'kod');
  const edytor = el('textarea', {
    className: 'edytor',
    spellcheck: false,
    rows: przytnij(kodStartowy.split('\n').length + 1, 6, 20),
    value: kodStartowy,
  });
  edytor.setAttribute('aria-label', opis || tl('run'));
  edytor.addEventListener('input', () => zapiszDemko(klucz, { kod: edytor.value }));

  const konsola = el('div', { className: 'konsola' });
  konsola.setAttribute('role', 'log');
  konsola.setAttribute('aria-live', 'polite');

  const nowaRamka = (srcdoc) =>
    el('iframe', {
      className: 'podglad-kodu',
      title: tl('preview'),
      sandbox: 'allow-scripts',
      hidden: !srcdoc || jezyk === 'js',
      srcdoc,
    });
  let sandbox = nowaRamka('');

  const wyczysc = () => {
    konsola.dataset.stan = 'pusto';
    konsola.replaceChildren(el('p', { className: 'linia', textContent: tl('noOutput') }));
  };
  const dopisz = (typ, tekst) => {
    if (konsola.dataset.stan === 'pusto') {
      delete konsola.dataset.stan;
      konsola.replaceChildren();
    }
    konsola.append(el('p', { className: 'linia', 'data-typ': typ, textContent: tekst }));
  };

  const wykonaj = () => {
    wyczysc();
    // Nowy iframe zamiast podmiany srcdoc: nieskończona pętla wiesza swój dokument, nie lekcję,
    // a wymiana ramki wyrzuca go razem z pętlą. Ratunek dla użytkownika to ponowne „Uruchom".
    const nowa = nowaRamka(dokumentSandboxa(jezyk, edytor.value, podglad));
    sandbox.replaceWith(nowa);
    sandbox = nowa;
  };

  // Brak allow-same-origin: origin sandboxa to 'null', więc liczy się okno nadawcy, nie origin.
  window.addEventListener('message', (ev) => {
    if (ev.source !== sandbox.contentWindow) return;
    if (ev.data?.la !== 1) return;
    dopisz(ev.data.typ, String(ev.data.tekst));
  });

  const uruchom = el('button', { type: 'button', className: 'primary', textContent: tl('run') });
  const przywrocKod = el('button', { type: 'button', textContent: tl('restore') });
  uruchom.addEventListener('click', wykonaj);
  przywrocKod.addEventListener('click', () => {
    edytor.value = kodStartowy;
    zapiszDemko(klucz, { kod: kodStartowy });
    wykonaj();
  });
  const panel = panelSterowania();
  panel.append(uruchom, przywrocKod);

  dolacz(host, [
    opisDemka(opis),
    edytor,
    panel,
    el('p', { className: 'etykieta-wyniku', textContent: tl('output') }),
    konsola,
    sandbox,
  ]);
  wyczysc();

  const reset = () => {
    edytor.value = kodStartowy;
    zapiszDemko(klucz, { kod: kodStartowy });
    wyczysc();
    const pusta = nowaRamka('');
    sandbox.replaceWith(pusta);
    sandbox = pusta;
  };
  // Zmiana motywu nic tu nie rusza — wygląd niesie CSS lekcji, nie rysowanie.
  return zarejestruj(klucz, {
    typ: 'kod',
    przerysuj: () => {},
    reset,
    // Podgląd nie wraca sam — wyrenderowany wynik i tak trzeba przeliczyć „Uruchom".
    przywroc: (zapisany) => {
      if (typeof zapisany?.kod === 'string') edytor.value = zapisany.kod;
    },
    stan: () => ({ kod: edytor.value }),
  });
}

// --- 5. rejestr komponentów ---------------------------------------------------
// Biblioteka rysunków w public/komponenty/. Lekcja podaje nazwę i dane, nigdy własny SVG:
// tekst na sztywnych współrzędnych wyjeżdża poza viewBox, gdy dane są dłuższe niż w przykładzie.
// Powłoki wyżej (parametry/kroki/manipulacja/kod) zostają — komponent dostarcza samo rysowanie.

const STALY = 'staly';
const NAZWA_KOMPONENTU = /^[a-z][a-z0-9-]{2,31}$/;
const moduly = new Map();

/**
 * Komponent ładowany dopiero przy użyciu. Manifest z góry kosztowałby tyle żądań,
 * ile jest komponentów w bibliotece — a lekcja używa kilku.
 */
function zaladujKomponent(nazwa) {
  if (!NAZWA_KOMPONENTU.test(nazwa)) return Promise.reject(new Error(`komponent: zła nazwa ${nazwa}`));
  if (!moduly.has(nazwa)) moduly.set(nazwa, import(`/komponenty/${nazwa}.js`));
  return moduly.get(nazwa);
}

/** Style komponentu wjeżdżają raz na dokument — plik komponentu jest jeden, więc CSS jedzie w nim. */
function wstrzyknijStyl(nazwa, tresc) {
  if (!tresc || document.querySelector(`style[data-k="${nazwa}"]`)) return;
  document.head.append(el('style', { textContent: tresc, 'data-k': nazwa }));
}

/** Tryb z kształtu opcji — lekcja podaje go jawnie tylko wtedy, gdy chce czegoś innego. */
const wykryjTryb = (o) =>
  o.kontrolki ? 'parametry'
  : o.kroki ? 'kroki'
  : o.elementy ? 'manipulacja'
  : o.jezyk || o.kodStartowy ? 'kod'
  : STALY;

/** Statyczny widok: bez panelu, ale z rejestracją — przerysowanie po zmianie motywu za darmo. */
function demoStaly({ el: cel, id, rysuj, opis }) {
  const { host, klucz } = ramka(cel, id, STALY);
  const rysunek = plotno();
  const przerysuj = () => rysuj(rysunek);
  dolacz(host, [opisDemka(opis), rysunek]);
  przerysuj();
  return zarejestruj(klucz, { typ: STALY, przerysuj, reset: () => {}, przywroc: () => {}, stan: () => ({}) });
}

const powloki = {
  [STALY]: demoStaly,
  parametry: demoParametry,
  kroki: demoKroki,
  manipulacja: demoManipulacja,
  kod: demoKod,
};

/**
 * Dane dla komponentu przy bieżącym stanie panelu. Funkcja, gdy lekcja przelicza stan na dane
 * (suwaki); płytkie scalenie, gdy stan sam niesie pola komponentu (kroki).
 */
const daneZ = (dane, stan) =>
  typeof dane === 'function' ? (dane(stan) ?? {}) : { ...dane, ...stan };

// Każda powłoka woła `rysuj` z innym drugim argumentem; komponent zawsze dostaje (cel, dane, ctx).
const adaptery = {
  [STALY]: (r, dane) => (cel) => r(cel, daneZ(dane), kontekst({})),
  parametry: (r, dane) => (cel, wartosci) => r(cel, daneZ(dane, wartosci), kontekst({ wartosci })),
  kroki: (r, dane) => (cel, krok, indeks) => r(cel, daneZ(dane, krok), kontekst({ krok, indeks })),
  manipulacja: (r, dane) => (cel, elementy) => r(cel, daneZ(dane, { elementy }), kontekst({ elementy })),
};

// Helpery wstrzykiwane, nie importowane: komponent z `import '../runtime.js'` dostałby
// drugą instancję modułu (inny URL = inny moduł), czyli drugie window.LA i podwójny initChowane.
const kontekst = (dodatki) => ({ tl, czytajZmienna, el, ...dodatki });

/**
 * Jedyne wejście lekcji do wizualizacji: `LA.komponent({ el, id, nazwa, dane, tryb, … })`.
 * Zwraca Promise wpisu rejestru. Bez `nazwa` (lekcje sprzed biblioteki) montuje synchronicznie.
 */
export function komponent(opcje = {}) {
  const tryb = opcje.tryb ?? wykryjTryb(opcje);
  const powloka = powloki[tryb];
  if (!powloka) return Promise.reject(new Error(`komponent: nieznany tryb ${tryb}`));
  if (!opcje.nazwa) return Promise.resolve(powloka(opcje));

  return zaladujKomponent(opcje.nazwa).then(
    (modul) => {
      wstrzyknijStyl(opcje.nazwa, modul.style);
      const adapter = adaptery[tryb];
      const rysuj = adapter ? adapter(modul.rysuj, opcje.dane ?? {}) : opcje.rysuj;
      return powloka({ ...opcje, rysuj });
    },
    (err) => bladKomponentu(opcje, err),
  );
}

/** Brakujący albo popsuty komponent zostawia ślad w lekcji i nigdy nie rzuca — reszta ma działać. */
function bladKomponentu(opcje, err) {
  console.error('komponent', opcje.nazwa, err);
  const host = typeof opcje.el === 'string' ? document.querySelector(opcje.el) : opcje.el;
  host?.append(el('p', { className: 'blad-komponentu', textContent: tl('bladKomponentu', { nazwa: opcje.nazwa }) }));
  return null;
}

/** „Zacznij od nowa": czyści stan tej jednej lekcji. Wynik w index.json zostaje nietknięty. */
function dodajRestart() {
  const naglowek = document.querySelector('.lekcja-naglowek');
  if (!naglowek) return;
  const przycisk = el('button', {
    type: 'button',
    className: 'restart',
    textContent: tl('restart'),
  });
  przycisk.addEventListener('click', async () => {
    const tak = await confirmDialog(tl('restartPytanie'), {
      ok: tl('restart'),
      cancel: tl('anuluj'),
      danger: true,
    });
    if (!tak) return;
    stan.wyczysc();
    location.reload();
  });
  naglowek.append(przycisk);
}

// Node importuje ten moduł dla samej oceny — reszta rusza wyłącznie w przeglądarce.
if (typeof document !== 'undefined') {
  const { project, lesson } = document.body.dataset;
  // Sam dostęp do localStorage potrafi rzucić (tryb prywatny, dokument bez originu).
  let magazyn = null;
  try {
    magazyn = localStorage;
  } catch {}
  stan = stanLekcji(`learnanything:${project}:${lesson}`, magazyn);
  // Karta zamknięta w trakcie debounce'u nie może zjeść ostatniej zmiany.
  addEventListener('pagehide', stan.spisz);

  ustawMotyw();
  // Powłoka pisze motyw do localStorage, a przeglądarka rozsyła 'storage' do pozostałych
  // dokumentów tego origin — iframe łapie zmianę bez postMessage i bez przeładowania.
  addEventListener('storage', (ev) => {
    if (ev.key !== MOTYW_KLUCZ) return;
    ustawMotyw();
    for (const demko of demka.values()) demko.przerysuj(); // Canvas nie widzi zmiennych CSS
  });

  window.LA = {
    quiz,
    cwiczenia,
    initChowane,
    czytajZmienna,
    tl,
    ocenSprawdzian,
    wyslijWynik,
    komponent,
    // ponytail: aliasy dla lekcji sprzed biblioteki — usunąć, gdy stare kursy znikną.
    demoParametry: (o) => komponent({ ...o, tryb: 'parametry' }),
    demoKroki: (o) => komponent({ ...o, tryb: 'kroki' }),
    demoManipulacja: (o) => komponent({ ...o, tryb: 'manipulacja' }),
    demoKod: (o) => komponent({ ...o, tryb: 'kod' }),
    demka,
    stan,
  };
  initChowane();
  dodajRestart();
}
