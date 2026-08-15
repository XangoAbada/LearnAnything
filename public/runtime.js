// Wspólna logika lekcji, część 1: chowane odpowiedzi, sprawdzian, zapis wyniku.
// Demka (07) i odtwarzanie stanu (08) dochodzą później — identyfikatory są już stabilne.
//
// Moduł ESM, nie klasyczny skrypt: test w Node importuje samą ocenę sprawdzianu,
// a lesson.js dostaje API przez window.LA (moduły nie dzielą zasięgu).
//
// Po polsku są tylko nazwy z kontraktu: eksporty, kształt sprawdzianu i klasy CSS —
// prompt lekcji (faza 06) mówi nimi. Wnętrza idą po angielsku, jak reszta kodu.

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

// --- chowane odpowiedzi ------------------------------------------------------

/** Do każdego [data-chowane] dokłada przycisk. Wołane ponownie po dorysowaniu treści. */
export function initChowane(root = document) {
  const all = [...root.querySelectorAll('[data-chowane]')];
  all.forEach((target, i) => {
    if ('gotowe' in target.dataset) return;
    target.dataset.gotowe = '';
    // id z pozycji w lekcji, nigdy losowane: faza 08 odtwarza stan właśnie po nim.
    if (!target.id) target.id = `chowane-${i + 1}`;
    target.hidden = true;

    const toggle = el('button', {
      type: 'button',
      className: 'chowane-przelacz',
      textContent: tl('show'),
    });
    toggle.setAttribute('aria-controls', target.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      target.hidden = !target.hidden;
      toggle.textContent = tl(target.hidden ? 'show' : 'hide');
      toggle.setAttribute('aria-expanded', String(!target.hidden));
    });
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
    grade(pytania, form, blocks, submit, target);
  });

  target.append(el('h2', { textContent: tl('quiz') }), form);
}

function grade(pytania, form, blocks, submit, target) {
  const collected = Object.fromEntries(
    pytania.map((question) => [
      question.id,
      [...form.querySelectorAll('input:checked')]
        .filter((input) => input.name === question.id)
        .map((input) => Number(input.value)),
    ]),
  );
  const { procent, poprawne, szczegoly } = ocenSprawdzian(pytania, collected);

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
      saveNote,
    ]),
  );

  wyslijWynik(procent)
    .then(() => {
      saveNote.textContent = tl('saved');
    })
    .catch(() => {
      saveNote.dataset.stan = 'niezapisany';
      saveNote.textContent = tl('notSaved');
    });
}

// Node importuje ten moduł dla samej oceny — reszta rusza wyłącznie w przeglądarce.
if (typeof document !== 'undefined') {
  window.LA = { quiz, initChowane, czytajZmienna, tl, ocenSprawdzian, wyslijWynik };
  initChowane();
}
