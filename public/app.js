import { t, getLang, setLang, LANGS } from './i18n.js';
import { confirmDialog } from './confirm.js';

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
  // Tylko nagłówek, nie cały ekran: pełne przerysowanie ładuje <iframe> lekcji od nowa,
  // a lekcja ma złapać motyw w locie — zdarzeniem 'storage', bez przeładowania.
  document.getElementById('header').replaceChildren(...headerNodes());
}

/** Odpowiedzi wywiadu w toku: ulotny stan formularza, nie wynik — zostaje w przeglądarce.
    Plan i podsumowanie idą na serwer, bo są wejściem kolejnego kroku. */
const interviewKey = (projectId) => `learnanything:${projectId}:interview`;

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    localStorage.removeItem(key); // uszkodzony wpis nie może zablokować ekranu
    return null;
  }
};

/** Stan lekcji należy do przeglądarki, więc tylko ona wie, kiedy go posprzątać. */
function forgetLessons(projectId) {
  const prefix = `learnanything:${projectId}:`;
  for (const key of Object.keys(localStorage))
    if (key.startsWith(prefix)) localStorage.removeItem(key);
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

/** Pasek pokrycia: ta sama linia co przy kursie, wypełniana ułamkiem `--done`. */
const progressBar = (done, total, label, aria) =>
  h(
    'div',
    {
      className: 'progress',
      role: 'progressbar',
      'aria-label': aria,
      'aria-valuemin': '0',
      'aria-valuemax': String(total),
      'aria-valuenow': String(done),
      style: `--done:${total ? done / total : 0}`,
    },
    [h('span', { className: 'bar' }), h('span', { className: 'label', textContent: label })],
  );

// --- ekran 1: lista projektów ----------------------------------------------

// Kafelek wraca tam, gdzie kreator przerwał: wywiad, podsumowanie albo gotowy plan.
const openHash = (p) =>
  ({
    wywiad: `#/p/${p.id}/interview`,
    podsumowanie: `#/p/${p.id}/interview`,
    plan: `#/p/${p.id}/plan`,
  })[p.step] ?? `#/p/${p.id}`;

/**
 * Postęp wszystkich projektów jednym strumieniem — pulpit ma pokazywać stan na teraz, a nie
 * z chwili wejścia. Postęp pojedynczej lekcji tu nie dociera (serwer go nie wysyła na '*').
 */
function listenAll(s) {
  const es = new EventSource('/api/events');
  const refresh = () =>
    request('GET', '/api/projects')
      .then((projects) => {
        s.projects = projects;
        render();
      })
      .catch(() => {}); // zerwane połączenie odbudowuje EventSource, nie my
  for (const type of ['lesson-started', 'lesson-ready', 'lesson-failed', 'queue-empty']) {
    es.addEventListener(type, refresh);
  }
  return es;
}

async function screenProjects(_params, s) {
  s.projects ??= await request('GET', '/api/projects');
  s.es ??= listenAll(s);
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

  const remove = async (p) => {
    const yes = await confirmDialog(t('projects.delete.confirm', { topic: p.topic }), {
      ok: t('projects.delete'),
      cancel: t('app.cancel'),
      danger: true,
    });
    if (!yes) return;
    act(s, async () => {
      await request('DELETE', `/api/projects/${p.id}`);
      forgetLessons(p.id);
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
      // Ile kursu już stoi na dysku. Licznik wyżej mówi o nauce, ten pasek o generowaniu.
      p.progress.total
        ? progressBar(
            p.progress.ready,
            p.progress.total,
            t('projects.generated', { ready: p.progress.ready, total: p.progress.total }),
            t('project.progress.label'),
          )
        : null,
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

// Opcje treści lekcji: te same wartości co `CONTENT` w generatorze — enumy zostają po polsku.
const CONTENT_OPTIONS = {
  mikroPytania: ['tak', 'brak'],
  sprawdzian: ['pełny', 'krótki', 'brak'],
  praktyka: ['pełna', 'krótka', 'brak'],
  wizualizacje: ['pełne', 'oszczędne', 'brak'],
  tryby: ['pełne', 'bez-kodu', 'statyczne'],
};

const CONTENT_DEFAULT = {
  mikroPytania: 'tak',
  sprawdzian: 'pełny',
  praktyka: 'pełna',
  wizualizacje: 'pełne',
  tryby: 'pełne',
  uwagi: '',
};

/**
 * Czym mają być wypełnione kolejne lekcje. Ten sam panel na ekranie planu (przed akceptacją)
 * i na ekranie projektu (dla lekcji jeszcze niewygenerowanych) — dlatego jest funkcją, nie ekranem.
 */
function contentPanel(project, save, naglowek = true) {
  const content = { ...CONTENT_DEFAULT, ...(project.content ?? {}) };
  const set = (key, value) => {
    content[key] = value;
    save({ ...content });
  };

  const pole = (key) =>
    h('label', { className: 'field' }, [
      h('span', { textContent: t(`content.${key}`) }),
      h(
        'select',
        { value: content[key], onchange: (e) => set(key, e.target.value) },
        CONTENT_OPTIONS[key].map((value) =>
          h('option', {
            value,
            textContent: t(`content.val.${value}`),
            selected: value === content[key],
          }),
        ),
      ),
    ]);

  return h('div', { className: 'panel opcje' }, [
    naglowek ? h('h2', { textContent: t('content.title') }) : null,
    h('p', { className: 'muted', textContent: t('content.hint') }),
    h('div', { className: 'opcje-siatka' }, Object.keys(CONTENT_OPTIONS).map(pole)),
    h('label', { className: 'field' }, [
      h('span', { textContent: t('content.uwagi') }),
      h('textarea', {
        rows: 2,
        maxLength: 300,
        value: content.uwagi,
        placeholder: t('content.uwagi.placeholder'),
        oninput: (e) => {
          content.uwagi = e.target.value; // zapis dopiero na blur — nie PATCH na każdą literę
        },
        onchange: (e) => set('uwagi', e.target.value),
      }),
    ]),
  ]);
}

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
  // Wywiad przerwany wyjściem na pulpit wraca z odpowiedziami — pytania i tak są w projekcie.
  const draft = s.draft ??= readJson(interviewKey(id)) ?? {};
  s.i ??= Math.min(draft.i ?? 0, s.questions.length - 1);
  s.answers ??= Array.isArray(draft.answers) ? draft.answers : [];

  const q = s.questions[s.i];
  const last = s.i === s.questions.length - 1;
  const remember = () =>
    localStorage.setItem(interviewKey(id), JSON.stringify({ i: s.i, answers: s.answers }));
  const setAnswer = (value) => {
    s.answers[s.i] = { id: q.id, answer: value };
    remember();
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
      localStorage.removeItem(interviewKey(id));
    });

  const skip = () =>
    act(s, async () => {
      s.result = await request('POST', `/api/projects/${id}/interview/skip`);
      localStorage.removeItem(interviewKey(id));
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
              remember();
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
  if (!s.project) {
    const data = await request('GET', `/api/projects/${id}`);
    // Plan już zaakceptowany — ekran planu nie ma tu nic do roboty (i nie ma po co wołać modelu).
    if (data.lessons.length) {
      location.hash = `#/p/${id}`;
      return h('p', { className: 'muted', textContent: t('app.loading') });
    }
    s.project = data.project;
  }
  const course = s.project.course;
  // Szkic planu żyje w projekcie — wyjście na pulpit nie kosztuje kolejnego wywołania modelu.
  s.plan ??= s.project.plan ?? null;

  const load = (comment) =>
    act(s, async () => {
      s.errorKey = 'plan.error.model';
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
      s.errorKey = 'app.error';
      const lessons = s.plan.lessons.map((l) => ({ title: l.title, brief: l.brief }));
      await request('POST', `/api/projects/${id}/plan/accept`, { lessons });
      location.hash = `#/p/${id}`;
    });

  // Zapis szkicu bez modelu: poprawiony tytuł i opcje treści mają przeżyć wyjście z ekranu.
  const patch = (body) =>
    request('PATCH', `/api/projects/${id}`, body).catch((err) => {
      s.error = err;
      render();
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
        onchange: () => patch({ plan: { lessons: s.plan.lessons } }),
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
    // Podsumowanie wywiadu zostaje w zasięgu wzroku — to na jego podstawie powstał ten plan.
    s.project.interview?.summary
      ? h('p', { className: 'muted', textContent: s.project.interview.summary })
      : null,
    s.plan
      ? h('p', {
          className: 'muted',
          textContent: t('plan.range', { n: s.plan.lessons.length, min, max }),
        })
      : null,
    s.error ? errorBox(s.error, s.errorKey ?? 'plan.error.model') : null,
    contentPanel(s.project, (content) => {
      s.project.content = content;
      patch({ content });
    }),
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

// --- ekran 4: projekt -------------------------------------------------------

// Lekcja otwiera się dopiero, gdy jest co otwierać.
const otwarta = (lesson) => lesson.status === 'gotowa' || lesson.status === 'ukończona';

// Numer lekcji jest kodem zagięcia: wstawka z fazy 10 zostaje widoczna jako 04.1.
const lessonCode = (lesson, i) => {
  const [whole, frac] = String(lesson.order).split('.');
  return `${i % 2 ? 'V' : 'M'}-${whole.padStart(2, '0')}${frac ? `.${frac}` : ''}`;
};

const lessonHref = (projectId, lesson) => `#/p/${projectId}/l/${lesson.id}`;

/** Postęp z serwera: każde zdarzenie kolejki dociąga świeży stan projektu. */
function listen(id, s) {
  const es = new EventSource(`/api/projects/${id}/events`);
  const refresh = () =>
    request('GET', `/api/projects/${id}`)
      .then((data) => {
        s.data = data;
        render();
      })
      .catch(() => {}); // zerwane połączenie odbudowuje EventSource, nie my
  for (const type of ['lesson-started', 'lesson-ready', 'lesson-failed', 'queue-empty']) {
    es.addEventListener(type, (e) => {
      s.gen = null; // postęp dotyczył lekcji, która właśnie się zaczęła albo skończyła
      refresh(e);
    });
  }
  // Postęp lekcji leci kilkanaście razy na lekcję — rysujemy go z samego zdarzenia,
  // bez odpytywania serwera o cały projekt.
  es.addEventListener('lesson-progress', (e) => {
    s.gen = JSON.parse(e.data);
    render();
  });
  return es;
}

// Tryby dodania lekcji — te same wartości co `origin` po stronie serwera, bez „plan”.
const MODES = ['pośrednia', 'rozwinięcie', 'powtórka', 'nowy wątek'];

async function screenProject([id], s) {
  s.data ??= await request('GET', `/api/projects/${id}`);
  s.es ??= listen(id, s);
  const { project, lessons, queue, suggestions, minInsertOrder } = s.data;
  const ready = lessons.filter(otwarta).length;

  // Lekcja z planu, której nikt jeszcze nie zakolejkował — kurs generuje się buforem,
  // więc dalsza część planu czeka nietknięta.
  const wKolejce = (l) => queue.running === l.id || queue.waiting.includes(l.id);
  const czeka = (l) => l.status === 'zaplanowana' && !wKolejce(l);
  // Lekcja po nieudanym podejściu wraca do „zaplanowana”, ale nadal siedzi w kolejce —
  // etykieta ma o tym mówić, zamiast udawać, że nic się nie stało.
  const ponawiana = (l) => l.status === 'zaplanowana' && (l.attempts ?? 0) > 0 && wKolejce(l);
  const etykieta = (l) =>
    (czeka(l) && 'status.niewygenerowana') || (ponawiana(l) && 'status.ponawiana') || `status.${l.status}`;

  const retry = (lesson) =>
    act(s, async () => {
      await request('POST', `/api/projects/${id}/lessons/${lesson.id}/retry`);
      s.data = await request('GET', `/api/projects/${id}`);
    });

  const generateNext = () =>
    act(s, async () => {
      await request('POST', `/api/projects/${id}/lessons/next`);
      s.data = await request('GET', `/api/projects/${id}`);
    });

  // Jedyna droga do nowej lekcji — ręczne dodanie i akceptacja propozycji idą tym samym
  // żądaniem. Propozycja sama z siebie nie kolejkuje niczego.
  const dodaj = (payload) =>
    act(s, async () => {
      await request('POST', `/api/projects/${id}/lessons`, payload);
      s.add = null;
      s.data = await request('GET', `/api/projects/${id}`);
    });

  // Propozycje `powtórka` i `rozwinięcie` przychodzą z odczytu projektu. „Nowy wątek”
  // wymaga modelu, więc czeka na osobne kliknięcie i żyje tylko w stanie ekranu.
  const proponujWatek = () =>
    act(s, async () => {
      s.threads = (await request('POST', `/api/projects/${id}/suggestions/thread`)).suggestions;
    });

  const propozycja = (sg, i) =>
    h('li', { className: 'suggestion deploy', style: `--i:${i}` }, [
      h('strong', { className: 'kind', textContent: t(`origin.${sg.kind}`) }),
      h('span', {
        className: 'why muted',
        textContent: t(`suggest.reason.${sg.reason.code}`, {
          score: sg.reason.score,
          concepts: (sg.reason.concepts ?? []).join(', '),
          topic: sg.reason.topic,
        }),
      }),
      sg.lessonId
        ? h('span', {
            className: 'src muted',
            textContent: t('suggest.source', {
              title: lessons.find((l) => l.id === sg.lessonId)?.title ?? '',
            }),
          })
        : null,
      h('button', {
        className: 'primary',
        disabled: !!s.busy,
        textContent: t('suggest.create'),
        onclick: () =>
          dodaj({ afterOrder: sg.afterOrder, mode: sg.kind, brief: sg.brief, title: sg.title }),
      }),
    ]);

  // Reguła miejsca w UI: lista „po lekcji N” bierze wyłącznie pozycje, które serwer przyjmie.
  const dozwolone = lessons.filter((l) => l.order >= minInsertOrder);
  const otworz = (mode) => {
    s.add = { mode, afterOrder: dozwolone.at(-1)?.order ?? 0, brief: '' };
    render();
  };

  const formularz = () => {
    const a = s.add;
    const naKoniec = a.mode === 'nowy wątek'; // nowy wątek dokleja się na końcu kursu
    return h(
      'form',
      {
        className: 'panel narrow add-lesson',
        onsubmit: (e) => {
          e.preventDefault();
          dodaj({
            afterOrder: naKoniec ? (lessons.at(-1)?.order ?? 0) : a.afterOrder,
            mode: a.mode,
            brief: a.brief,
          });
        },
      },
      [
        h('h3', { textContent: t('add.title') }),
        h('label', { className: 'field' }, [
          h('span', { textContent: t('add.mode') }),
          h(
            'select',
            {
              onchange: (e) => {
                a.mode = e.target.value;
                render();
              },
            },
            MODES.map((m) => option(m, t(`origin.${m}`), a.mode)),
          ),
        ]),
        h('label', { className: 'field' }, [
          h('span', { textContent: t('add.after') }),
          naKoniec
            ? h('input', { type: 'text', disabled: true, value: t('add.after.end') })
            : h(
                'select',
                {
                  onchange: (e) => {
                    a.afterOrder = Number(e.target.value);
                  },
                },
                dozwolone.map((l) => option(String(l.order), `${l.order} · ${l.title}`, String(a.afterOrder))),
              ),
        ]),
        !naKoniec && dozwolone.length < lessons.length
          ? h('p', { className: 'muted', textContent: t('add.after.locked') })
          : null,
        h('label', { className: 'field' }, [
          h('span', { textContent: t('add.brief') }),
          h('textarea', {
            rows: 2,
            value: a.brief,
            placeholder: t('add.brief.placeholder'),
            oninput: (e) => {
              a.brief = e.target.value;
            },
          }),
        ]),
        h('div', { className: 'actions' }, [
          h('button', {
            className: 'primary',
            type: 'submit',
            disabled: !!s.busy,
            textContent: t('add.submit'),
          }),
          h('button', {
            className: 'ghost',
            type: 'button',
            textContent: t('add.cancel'),
            onclick: () => {
              s.add = null;
              render();
            },
          }),
        ]),
      ],
    );
  };

  const row = (lesson, i) =>
    h('li', { className: 'deploy', style: `--i:${i}` }, [
      h('span', { className: 'num', textContent: lessonCode(lesson, i) }),
      otwarta(lesson)
        ? h('a', {
            className: 'title',
            href: lessonHref(id, lesson),
            textContent: lesson.title,
            'aria-label': t('project.open', { title: lesson.title }),
          })
        : h('span', { className: 'title', textContent: lesson.title }),
      lesson.score === null
        ? null
        : h('span', {
            className: 'score',
            textContent: `${lesson.score}%`,
            title: t('project.score', { score: lesson.score }),
          }),
      // Postęp pokazujemy tylko przy tej lekcji, która właśnie się generuje.
      lesson.status === 'generowana' && s.gen?.lessonId === lesson.id
        ? progressBar(
            s.gen.files.length,
            s.gen.total,
            t('project.lesson.progress', {
              done: s.gen.files.length,
              total: s.gen.total,
              turn: s.gen.turn,
            }),
            t('project.lesson.progress.label'),
          )
        : null,
      h('span', {
        className: 'state',
        'data-state': lesson.status,
        textContent: t(etykieta(lesson)),
        // Treść błędu z serwera tylko jako podpowiedź — na ekranie zostaje etykieta stanu.
        title: lesson.error ?? '',
      }),
      lesson.status === 'błąd'
        ? h('button', {
            className: 'ghost',
            disabled: !!s.busy,
            textContent: t('project.retry'),
            'aria-label': t('project.retry.for', { title: lesson.title }),
            onclick: () => retry(lesson),
          })
        : null,
    ]);

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
    s.error ? errorBox(s.error, 'add.error') : null,
    // Opcje treści zostają dostępne po akceptacji planu — dotyczą lekcji jeszcze
    // niewygenerowanych, więc chowają się w <details>, żeby nie przykrywać kursu.
    h('details', { className: 'opcje-zwijane' }, [
      h('summary', { textContent: t('content.title') }),
      contentPanel(
        project,
        (content) => {
          project.content = content;
          request('PATCH', `/api/projects/${id}`, { content }).catch((err) => {
            s.error = err;
            render();
          });
        },
        false, // nagłówek niesie już <summary>
      ),
    ]),
    // Karta propozycji nad listą: rodzaj, czego dotyczy i dlaczego się pojawiła.
    // Jeden przycisk, żadnego automatu — bez kliknięcia nic się nie generuje.
    [...suggestions, ...(s.threads ?? [])].length
      ? h('section', { className: 'suggestions' }, [
          h('h2', { textContent: t('suggest.title') }),
          h('ul', {}, [...suggestions, ...(s.threads ?? [])].map(propozycja)),
        ])
      : null,
    s.threads?.length === 0
      ? h('p', { className: 'muted', role: 'status', textContent: t('suggest.thread.none') })
      : null,
    h('h2', { textContent: t('project.lessons') }),
    // Lista rysuje się dopiero, gdy jest co rysować — pusty <ol> zostawiał kreskę nad niczym.
    lessons.length
      ? progressBar(
          ready,
          lessons.length,
          t('project.progress', { done: ready, total: lessons.length }),
          t('project.progress.label'),
        )
      : null,
    lessons.length
      ? h('ol', { className: 'lessons' }, lessons.map(row))
      : h('p', { className: 'muted', textContent: t('project.empty') }),
    s.add ? formularz() : null,
    lessons.length
      ? h('div', { className: 'actions' }, [
          // Wyprzedzenie bufora: jeden przycisk dokłada kolejną lekcję z planu.
          lessons.some(czeka)
            ? h('button', {
                className: 'ghost',
                disabled: !!s.busy,
                textContent: t('project.generateNext'),
                onclick: generateNext,
              })
            : null,
          h('button', {
            className: 'ghost',
            disabled: !!s.busy,
            textContent: t('add.open'),
            onclick: () => otworz('pośrednia'),
          }),
          h('button', {
            className: 'ghost',
            disabled: !!s.busy,
            textContent: t('add.extend'),
            onclick: () => otworz('rozwinięcie'),
          }),
          h('button', {
            className: 'ghost',
            disabled: !!s.busy,
            textContent: t('suggest.thread'),
            onclick: proponujWatek,
          }),
        ])
      : null,
  ]);
}

// --- ekran 5: widok lekcji --------------------------------------------------

// Lekcja siedzi w <iframe> bez atrybutu sandbox — to nasze pliki z tego samego origin
// (faza 08 sięga do nich po motyw i stan). Sandbox jest wewnątrz lekcji, wokół kodu
// użytkownika (faza 07).
async function screenLesson([id, lessonId], s) {
  // Bez nasłuchu postępu: każde przerysowanie ładuje <iframe> od nowa, a lekcja jest
  // czytana, nie oglądana. Postęp kursu widać na ekranie projektu.
  s.data ??= await request('GET', `/api/projects/${id}`);
  const { project, lessons } = s.data;

  const open = lessons.filter(otwarta);
  const lesson = open.find((l) => l.id === lessonId);
  const home = h('a', { className: 'back', href: `#/p/${id}`, textContent: t('lesson.project') });
  if (!lesson) return h('section', {}, [home, errorBox(null, 'lesson.missing')]);

  const i = open.indexOf(lesson);
  // Sąsiedztwo liczone po `order` wśród lekcji otwieralnych — do niegotowej nie ma dokąd iść.
  const step = (delta, key) => {
    const target = open[i + delta];
    return target
      ? h('a', { className: 'ghost', href: lessonHref(id, target), textContent: t(key), title: target.title })
      : h('span', { className: 'ghost disabled', textContent: t(key), 'aria-disabled': 'true' });
  };

  return h('section', { className: 'lesson-view' }, [
    h('div', { className: 'lesson-bar' }, [
      home,
      h('span', { className: 'num', textContent: lessonCode(lesson, lessons.indexOf(lesson)) }),
      h('span', { className: 'title', textContent: lesson.title }),
      step(-1, 'lesson.prev'),
      step(1, 'lesson.next'),
    ]),
    h('iframe', {
      className: 'lesson-frame',
      src: `/lessons/${project.id}/${lesson.path.replace(/^lessons\//, '')}/index.html`,
      title: t('lesson.frame', { title: lesson.title }),
    }),
  ]);
}

// --- ekran ustawień ---------------------------------------------------------

// Pierwsza pozycja obu list to „domyślny” — wartość pusta, czyli pole nie trafia do wywołania.
const option = (value, label, selected) =>
  h('option', { value, textContent: label, selected: selected === value });

async function screenSettings(_params, s) {
  if (!s.data) {
    s.data = await request('GET', '/api/settings');
    // Wiersz „default” z CLI byłby drugim „domyślnym” obok naszego — jeden wystarczy.
    s.data.models = s.data.models.filter((m) => m.value !== 'default');
  }
  const { settings, models, efforts } = s.data;

  const modelInfo = (value) => models.find((m) => m.value === value);
  // Haiku nie ma w swoim wierszu ani supportsEffort, ani listy poziomów — brak informacji
  // znaczy „nie przyjmuje”, nie „przyjmuje wszystkie”. Stąd kolejność: lista, flaga, nic.
  const levelsFor = (value) => {
    const info = modelInfo(value);
    if (!info) return efforts; // brak modelu albo nazwa spoza listy: pokazujemy wszystkie
    if (info.supportedEffortLevels?.length) return info.supportedEffortLevels;
    return info.supportsEffort ? efforts : [];
  };

  const save = () =>
    act(s, async () => {
      s.saved = false;
      await request('PUT', '/api/settings', { settings, bufor: s.data.bufor, naraz: s.data.naraz });
      s.saved = true;
    });

  // Przywraca i od razu zapisuje. Sam reset formularza wyglądał jak zrobiony, a po wyjściu
  // z ekranu przepadał — przycisk ma zostawiać ustawienia domyślne, nie tylko je pokazać.
  const reset = () =>
    act(s, async () => {
      s.saved = false;
      for (const stage of Object.keys(settings)) settings[stage] = { ...s.data.defaults[stage] };
      s.data.bufor = s.data.buforDefault;
      s.data.naraz = s.data.narazDefault;
      await request('PUT', '/api/settings', { settings, bufor: s.data.bufor, naraz: s.data.naraz });
      s.saved = true;
    });

  const row = (stage, i) => {
    const current = settings[stage];
    const levels = levelsFor(current.model);
    // Model zapisany wcześniej, a dziś nieznany CLI, musi zostać widoczny — inaczej select
    // pokazałby pierwszą pozycję i cicho podmienił ustawienie przy zapisie.
    const unknown = current.model && !modelInfo(current.model);

    return h('li', { className: 'stage-row deploy', style: `--i:${i}` }, [
      h('span', { className: 'num', textContent: creaseCode(i) }),
      h('div', { className: 'stage-name' }, [
        h('strong', { textContent: t(`stage.${stage}`) }),
        h('small', { className: 'muted', textContent: t(`stage.${stage}.hint`) }),
      ]),
      h(
        'select',
        {
          className: 'model',
          'aria-label': t('settings.model.for', { stage: t(`stage.${stage}`) }),
          onchange: (e) => {
            current.model = e.target.value || null;
            if (!levelsFor(current.model).includes(current.effort)) current.effort = null;
            s.saved = false;
            render();
          },
        },
        [
          option('', t('settings.default'), current.model ?? ''),
          ...(unknown ? [option(current.model, current.model, current.model)] : []),
          ...models.map((m) => option(m.value, m.displayName || m.value, current.model ?? '')),
        ],
      ),
      h(
        'select',
        {
          className: 'effort',
          disabled: levels.length === 0,
          title: levels.length ? '' : t('settings.effort.unsupported'),
          'aria-label': t('settings.effort.for', { stage: t(`stage.${stage}`) }),
          onchange: (e) => {
            current.effort = e.target.value || null;
            s.saved = false;
          },
        },
        [
          option('', t('settings.default'), current.effort ?? ''),
          ...levels.map((l) => option(l, t(`settings.effort.${l}`), current.effort ?? '')),
        ],
      ),
    ]);
  };

  return h('section', {}, [
    back(),
    h('h1', { textContent: t('settings.title') }),
    h('p', { className: 'muted intro', textContent: t('settings.intro') }),
    s.error ? errorBox(s.error, 'settings.error') : null,
    h('div', { className: 'stage-row' }, [
      h('div', { className: 'stage-name' }, [
        h('strong', { textContent: t('settings.buffer') }),
        h('small', { className: 'muted', textContent: t('settings.buffer.hint') }),
      ]),
      h('input', {
        type: 'number',
        className: 'bufor',
        min: '1',
        max: String(s.data.buforMax ?? 20),
        value: String(s.data.bufor),
        'aria-label': t('settings.buffer'),
        oninput: (e) => {
          s.data.bufor = Number(e.target.value);
          s.saved = false;
        },
      }),
    ]),
    h('div', { className: 'stage-row' }, [
      h('div', { className: 'stage-name' }, [
        h('strong', { textContent: t('settings.parallel') }),
        h('small', { className: 'muted', textContent: t('settings.parallel.hint') }),
      ]),
      h('input', {
        type: 'number',
        className: 'bufor',
        min: '1',
        max: String(s.data.narazMax ?? 4),
        value: String(s.data.naraz),
        'aria-label': t('settings.parallel'),
        oninput: (e) => {
          s.data.naraz = Number(e.target.value);
          s.saved = false;
        },
      }),
    ]),
    h('ol', { className: 'stages' }, Object.keys(settings).map(row)),
    h('div', { className: 'actions' }, [
      h('button', {
        className: 'primary',
        disabled: !!s.busy,
        textContent: s.busy ? t('app.loading') : t('settings.save'),
        onclick: save,
      }),
      h('button', {
        className: 'ghost',
        disabled: !!s.busy,
        textContent: t('settings.reset'),
        onclick: reset,
      }),
      s.saved ? h('span', { className: 'muted', role: 'status', textContent: t('settings.saved') }) : null,
    ]),
  ]);
}

// --- routing ----------------------------------------------------------------

const ROUTES = [
  [/^#\/$/, screenProjects],
  [/^#\/p\/([\w-]+)\/interview$/, screenInterview],
  [/^#\/p\/([\w-]+)\/plan$/, screenPlan],
  [/^#\/p\/([\w-]+)$/, screenProject],
  [/^#\/p\/([\w-]+)\/l\/([\w-]+)$/, screenLesson],
  [/^#\/ustawienia$/, screenSettings],
];

// Każdy ekran to inne zagięcie tego samego arkusza — kod jest etykietą miejsca, nie danymi.
const sheetCode = (hash) =>
  hash === '#/'
    ? 'M-01'
    : hash.endsWith('/interview')
      ? 'V-02'
      : hash.endsWith('/plan')
        ? 'M-03'
        : hash === '#/ustawienia'
          ? 'M-05'
          : hash.includes('/l/')
            ? 'V-06'
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
      h('a', {
        className: 'ghost',
        href: '#/ustawienia',
        textContent: t('app.settings'),
        'aria-label': t('app.settings'),
      }),
    ]),
  ];
}

async function render() {
  const hash = location.hash || '#/';
  const fresh = hash !== route;
  if (fresh) {
    state.es?.close(); // strumień postępu żyje tyle, co ekran, który go otworzył
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
