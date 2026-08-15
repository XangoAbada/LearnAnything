import { t, getLang, setLang, LANGS } from './i18n.js';

// Powłoka: routing po hashu, motyw, ekrany 1–3. Bez frameworka i bez szablonów —
// temat projektu i tytuły lekcji pochodzą od użytkownika i idą wyłącznie przez textContent/value.

// --- mikro-DOM --------------------------------------------------------------

const h = (tag, props = {}, kids = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key in node) node[key] = value;
    else node.setAttribute(key, value); // aria-*, data-* i reszta bez odpowiednika we właściwościach
  }
  node.append(...[].concat(kids).filter((k) => k !== null && k !== undefined && k !== false));
  return node;
};

const request = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error ?? res.statusText), { status: res.status });
  return data;
};

// Nagłówek komunikatu z tłumaczenia, treść serwera tylko jako drobny szczegół techniczny.
const errorBox = (err, key = 'app.error') =>
  h('div', { className: 'error', role: 'alert' }, [
    h('strong', { textContent: t(key) }),
    err?.message ? h('small', { className: 'muted', textContent: err.message }) : null,
  ]);

// --- motyw ------------------------------------------------------------------

const THEME_KEY = 'learnanything:theme';
const THEMES = ['jasny', 'ciemny'];

export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (THEMES.includes(saved)) return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'ciemny' : 'jasny';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function toggleTheme() {
  const next = getTheme() === 'jasny' ? 'ciemny' : 'jasny';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  render();
}

// --- stan ekranu ------------------------------------------------------------

let route = '';
let state = {};

/** Akcja użytkownika: blokada przycisku na czas czekania, błąd ląduje w stanie ekranu. */
const act = (s, fn) => {
  s.busy = true;
  render();
  return fn()
    .then(() => {
      s.error = null;
    })
    .catch((err) => {
      s.error = err;
    })
    .finally(() => {
      s.busy = false;
      render();
    });
};

const back = () => h('a', { className: 'back', href: '#/', textContent: t('app.back') });

// Zagięcia arkusza Miury idą na przemian: górskie, dolinne. Kod niesie pozycję i nic więcej.
const creaseCode = (i) => `${i % 2 ? 'V' : 'M'}-${String(i + 1).padStart(2, '0')}`;

// --- ekran 1: lista projektów ----------------------------------------------

const openHash = (p) =>
  ({ nowy: `#/p/${p.id}/interview`, wywiad: `#/p/${p.id}/interview`, plan: `#/p/${p.id}/plan` })[
    p.status
  ] ?? `#/p/${p.id}`;

async function screenProjects(_params, s) {
  s.projects ??= await request('GET', '/api/projects');
  s.form ??= { topic: '', language: getLang() };

  const create = () =>
    act(s, async () => {
      const project = await request('POST', '/api/projects', s.form);
      location.hash = `#/p/${project.id}/interview`;
    });

  const form = h(
    'form',
    {
      className: 'panel narrow',
      onsubmit: (e) => {
        e.preventDefault();
        create();
      },
    },
    [
      h('h2', { textContent: t('projects.new') }),
      h('label', { className: 'field' }, [
        h('span', { textContent: t('projects.new.topic') }),
        h('input', {
          type: 'text',
          value: s.form.topic,
          required: true, // pustego tematu pilnuje przeglądarka — bez przerysowywania na każdą literę
          placeholder: t('projects.new.topic.placeholder'),
          oninput: (e) => {
            s.form.topic = e.target.value;
          },
        }),
      ]),
      h('label', { className: 'field' }, [
        h('span', { textContent: t('projects.new.language') }),
        h(
          'select',
          {
            value: s.form.language,
            onchange: (e) => {
              s.form.language = e.target.value;
            },
          },
          LANGS.map((l) =>
            h('option', { value: l, textContent: t(`lang.${l}`), selected: l === s.form.language }),
          ),
        ),
      ]),
      h('button', {
        type: 'submit',
        className: 'primary',
        disabled: !!s.busy,
        textContent: s.busy ? t('app.thinking') : t('projects.new.submit'),
      }),
    ],
  );

  const remove = (p) => {
    if (!confirm(t('projects.delete.confirm', { topic: p.topic }))) return;
    act(s, async () => {
      await request('DELETE', `/api/projects/${p.id}`);
      s.projects = null;
    });
  };

  const card = (p, i) =>
    h('article', {
      className: `panel project deploy${i % 2 ? ' valley' : ''}`,
      style: `--i:${i}`,
    }, [
      h('span', { className: 'code', textContent: creaseCode(i) }),
      h('a', {
        className: 'title',
        href: openHash(p),
        textContent: p.topic,
        'aria-label': t('projects.open', { topic: p.topic }),
      }),
      h('dl', { className: 'spec' }, [
        h('dt', { textContent: t('spec.lessons') }),
        // Licznik pojawia się dopiero, gdy jest co liczyć — „0/0" to szum, nie postęp.
        h('dd', {
          textContent: p.progress.total ? `${p.progress.done}/${p.progress.total}` : '—',
        }),
        h('dt', { textContent: t('spec.language') }),
        h('dd', {
          textContent: p.language.toUpperCase(),
          title: t('projects.language', { lang: t(`lang.${p.language}`) }),
        }),
        h('dt', { textContent: t('spec.status') }),
        h('dd', {}, [
          h('span', {
            className: 'state',
            'data-state': p.status,
            textContent: t(`status.${p.status}`),
          }),
        ]),
      ]),
      h('div', { className: 'actions' }, [
        h('button', {
          className: 'ghost danger',
          textContent: t('projects.delete'),
          onclick: () => remove(p),
        }),
      ]),
    ]);

  return h('section', {}, [
    h('h1', { textContent: t('projects.title') }),
    s.error ? errorBox(s.error) : null,
    form,
    s.projects.length
      ? h('div', { className: 'grid' }, s.projects.map(card))
      : h('p', { className: 'muted' }, [t('projects.empty')]),
  ]);
}

// --- ekran 2: wywiad --------------------------------------------------------

const paramsList = (course) =>
  h('dl', { className: 'spec' }, [
    h('dt', { textContent: t('summary.level') }),
    h('dd', { textContent: t(`level.${course.level}`) }),
    h('dt', { textContent: t('summary.pace') }),
    h('dd', { textContent: t(`pace.${course.pace}`) }),
    h('dt', { textContent: t('summary.scope') }),
    h('dd', { textContent: t(`scope.${course.scope}`) }),
  ]);

async function screenInterview([id], s) {
  s.project ??= (await request('GET', `/api/projects/${id}`)).project;
  const project = s.project;
  const title = h('h1', {
    className: 'subject',
    textContent: t('interview.title', { topic: project.topic }),
  });

  // Wywiad zamknięty (zakończony albo pominięty) — od razu podsumowanie.
  const open = project.status === 'nowy' || project.status === 'wywiad';
  s.result ??= open ? null : { ...project.course, summary: project.interview.summary ?? '' };

  if (s.result) {
    return h('section', {}, [
      back(),
      title,
      s.error ? errorBox(s.error) : null,
      h('div', { className: 'panel narrow' }, [
        h('h2', { textContent: t('summary.title') }),
        paramsList(s.result),
        h('p', { className: 'muted', textContent: s.result.summary || t('summary.none') }),
        h('button', {
          className: 'primary',
          textContent: t('summary.plan'),
          onclick: () => {
            location.hash = `#/p/${id}/plan`;
          },
        }),
      ]),
    ]);
  }

  s.questions ??= project.interview.questions.length
    ? project.interview.questions
    : (await request('POST', `/api/projects/${id}/interview`)).questions;
  s.i ??= 0;
  s.answers ??= [];

  const q = s.questions[s.i];
  const last = s.i === s.questions.length - 1;
  const setAnswer = (value) => {
    s.answers[s.i] = { id: q.id, answer: value };
  };
  const current = s.answers[s.i]?.answer ?? '';

  const input =
    q.kind === 'wybór' && q.options?.length
      ? h(
          'div',
          { className: 'options' },
          q.options.map((option) =>
            h('label', { className: 'option' }, [
              h('input', {
                type: 'radio',
                name: `q${s.i}`,
                value: option,
                checked: current === option,
                onchange: () => setAnswer(option),
              }),
              h('span', { textContent: option }),
            ]),
          ),
        )
      : h('label', { className: 'field' }, [
          h('span', { textContent: t('interview.answer') }),
          h('textarea', {
            rows: 4,
            value: current,
            placeholder: t('interview.answer.placeholder'),
            oninput: (e) => setAnswer(e.target.value),
          }),
        ]);

  const finish = () =>
    act(s, async () => {
      const answers = s.questions.map((question, i) => ({
        id: question.id,
        answer: s.answers[i]?.answer ?? '',
      }));
      s.result = await request('POST', `/api/projects/${id}/interview/answers`, { answers });
    });

  const skip = () =>
    act(s, async () => {
      s.result = await request('POST', `/api/projects/${id}/interview/skip`);
    });

  return h('section', {}, [
    back(),
    title,
    s.error ? errorBox(s.error) : null,
    h('div', { className: 'panel narrow' }, [
      h('p', {
        className: 'muted',
        textContent: t('interview.progress', { n: s.i + 1, total: s.questions.length }),
      }),
      h('p', { className: 'question', textContent: q.text }),
      input,
      h('div', { className: 'actions' }, [
        h('button', {
          className: 'primary',
          disabled: !!s.busy,
          textContent: s.busy ? t('app.thinking') : t(last ? 'interview.finish' : 'interview.next'),
          onclick: () => {
            if (!last) {
              s.i += 1;
              render();
            } else finish();
          },
        }),
        h('button', {
          className: 'ghost',
          disabled: !!s.busy,
          textContent: t('interview.skip'),
          onclick: skip,
        }),
      ]),
    ]),
  ]);
}

// --- ekran 3: plan kursu ----------------------------------------------------

async function screenPlan([id], s) {
  s.project ??= (await request('GET', `/api/projects/${id}`)).project;
  const course = s.project.course;

  const load = (comment) =>
    act(s, async () => {
      s.plan = null;
      s.plan = await request('POST', `/api/projects/${id}/plan`, { comment });
    });

  // Pierwsze wejście: plan liczy się sam. Po błędzie czeka na „Przelicz plan”, nie kręci się w kółko.
  // Flaga busy zamyka też furtkę drugiego wywołania modelu przy przerysowaniu (motyw, język) w trakcie.
  if (!s.plan && !s.error && !s.busy) {
    s.busy = true;
    try {
      s.plan = await request('POST', `/api/projects/${id}/plan`, { comment: '' });
    } catch (err) {
      s.error = err;
    } finally {
      s.busy = false;
    }
  }

  const accept = () =>
    act(s, async () => {
      const lessons = s.plan.lessons.map((l) => ({ title: l.title, brief: l.brief }));
      await request('POST', `/api/projects/${id}/plan/accept`, { lessons });
      location.hash = `#/p/${id}`;
    });

  const row = (lesson, i) =>
    h('li', { className: 'plan-row deploy', style: `--i:${i}` }, [
      h('span', { className: 'num', textContent: creaseCode(i) }),
      h('input', {
        type: 'text',
        className: 'title',
        value: lesson.title,
        'aria-label': t('plan.lesson.title', { n: i + 1 }),
        oninput: (e) => {
          lesson.title = e.target.value;
        },
      }),
      h('span', { className: 'muted brief', textContent: lesson.brief }),
    ]);

  const [min, max] = s.plan?.range ?? [];

  return h('section', {}, [
    back(),
    h('h1', { textContent: t('plan.title') }),
    h('p', {
      className: 'muted',
      textContent: t('plan.params', {
        level: t(`level.${course.level}`),
        pace: t(`pace.${course.pace}`),
        scope: t(`scope.${course.scope}`),
      }),
    }),
    s.plan
      ? h('p', {
          className: 'muted',
          textContent: t('plan.range', { n: s.plan.lessons.length, min, max }),
        })
      : null,
    s.error ? errorBox(s.error, 'plan.error.model') : null,
    s.plan ? h('ol', { className: 'plan' }, s.plan.lessons.map(row)) : null,
    h('div', { className: 'actions' }, [
      h('button', {
        className: 'primary',
        disabled: !!s.busy || !s.plan,
        textContent: s.busy ? t('app.thinking') : t('plan.accept'),
        onclick: accept,
      }),
      h('input', {
        type: 'text',
        className: 'comment',
        value: s.comment ?? '',
        placeholder: t('plan.comment.placeholder'),
        oninput: (e) => {
          s.comment = e.target.value;
        },
      }),
      h('button', {
        className: 'ghost',
        disabled: !!s.busy,
        textContent: t('plan.recalc'),
        onclick: () => load(s.comment ?? ''),
      }),
    ]),
  ]);
}

// --- ekran 4: projekt (pełny w fazie 06) ------------------------------------

async function screenProject([id], s) {
  s.data ??= await request('GET', `/api/projects/${id}`);
  const { project, lessons } = s.data;

  // ponytail: podgląd zamiast ekranu projektu — kolejka, SSE i wejście w lekcję przychodzą w fazie 06.
  return h('section', {}, [
    back(),
    h('h1', { className: 'subject', textContent: project.topic }),
    h('dl', { className: 'spec' }, [
      h('dt', { textContent: t('spec.language') }),
      h('dd', {
        textContent: project.language.toUpperCase(),
        title: t('projects.language', { lang: t(`lang.${project.language}`) }),
      }),
      h('dt', { textContent: t('spec.status') }),
      h('dd', {}, [
        h('span', {
          className: 'state',
          'data-state': project.status,
          textContent: t(`status.${project.status}`),
        }),
      ]),
    ]),
    h('h2', { textContent: t('project.lessons') }),
    // Lista rysuje się dopiero, gdy jest co rysować — pusty <ol> zostawiał kreskę nad niczym.
    lessons.length
      ? h(
          'ol',
          { className: 'lessons' },
          lessons.map((l, i) =>
            h('li', { className: 'deploy', style: `--i:${i}` }, [
              h('span', { className: 'num', textContent: creaseCode(i) }),
              h('span', { className: 'title', textContent: l.title }),
              h('span', {
                className: 'state',
                'data-state': l.status,
                textContent: t(`status.${l.status}`),
              }),
            ]),
          ),
        )
      : null,
    h('p', { className: 'panel narrow muted', textContent: t('project.soon') }),
  ]);
}

// --- routing ----------------------------------------------------------------

const ROUTES = [
  [/^#\/$/, screenProjects],
  [/^#\/p\/([\w-]+)\/interview$/, screenInterview],
  [/^#\/p\/([\w-]+)\/plan$/, screenPlan],
  [/^#\/p\/([\w-]+)$/, screenProject],
];

// Każdy ekran to inne zagięcie tego samego arkusza — kod jest etykietą miejsca, nie danymi.
const sheetCode = (hash) =>
  hash === '#/'
    ? 'M-01'
    : hash.endsWith('/interview')
      ? 'V-02'
      : hash.endsWith('/plan')
        ? 'M-03'
        : 'V-04';

function headerNodes() {
  const other = LANGS.find((l) => l !== getLang());
  const nextTheme = getTheme() === 'jasny' ? 'ciemny' : 'jasny';
  return [
    h('div', { className: 'ident' }, [
      h('a', { className: 'brand', href: '#/', textContent: t('app.title') }),
      h('span', { className: 'code', textContent: sheetCode(location.hash || '#/') }),
    ]),
    h('div', { className: 'switches' }, [
      h('button', {
        className: 'ghost',
        textContent: t(`app.theme.${nextTheme}`),
        'aria-label': t('app.theme.toggle'),
        onclick: toggleTheme,
      }),
      h('button', {
        className: 'ghost',
        textContent: other.toUpperCase(),
        'aria-label': t('app.lang.toggle'),
        onclick: () => setLang(other),
      }),
    ]),
  ];
}

async function render() {
  const hash = location.hash || '#/';
  const fresh = hash !== route;
  if (fresh) {
    route = hash;
    state = {};
  }
  document.getElementById('header').replaceChildren(...headerNodes());

  const hit = ROUTES.map(([re, screen]) => [hash.match(re), screen]).find(([m]) => m);
  if (!hit) {
    location.hash = '#/';
    return;
  }

  const main = document.getElementById('screen');
  if (fresh) main.replaceChildren(h('p', { className: 'muted', textContent: t('app.loading') }));

  const mine = state;
  try {
    const node = await hit[1](hit[0].slice(1), mine);
    if (mine === state) main.replaceChildren(node); // ekran zmieniony w międzyczasie — wynik nieaktualny
  } catch (err) {
    if (mine === state) main.replaceChildren(errorBox(err));
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('langchange', render);

applyTheme(getTheme());
document.documentElement.lang = getLang();
render();
