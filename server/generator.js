import { runClaude, runClaudeJson, extractLastJsonBlock } from './claude.js';
import { loadPrompt, loadPart, lessonTemplate } from './prompts.js';
import * as store from './store.js';

// Zadania modelu: wywiad, plan, lekcja. Nie zna HTTP i nie dotyka dysku sam — katalog lekcji
// dostaje ze store'a. Ostatni argument `run` istnieje po to, żeby testy zaślepiły model.

export const LEVELS = ['początkujący', 'średni', 'zaawansowany'];
export const PACES = ['wolne', 'normalne', 'szybkie'];
export const SCOPES = ['podstawy', 'standardowy', 'szeroki'];

export const DEFAULT_COURSE = { level: 'początkujący', pace: 'normalne', scope: 'standardowy' };

/** Widełki liczby lekcji — zakres steruje objętością kursu, tempo gęstością lekcji. */
export const PLAN_RANGE = { podstawy: [5, 8], standardowy: [10, 15], szeroki: [18, 25] };

/** Widełki dla zakresu, z domyślnym standardowym. Ekran planu pokazuje je użytkownikowi. */
export const planRange = (scope) => PLAN_RANGE[scope] ?? PLAN_RANGE.standardowy;

const modelError = (message) => Object.assign(new Error(message), { code: 'MODEL' });

/** @returns {true} @throws gdy plan nie mieści się w widełkach zakresu */
export function validatePlan(lessons, scope) {
  const [min, max] = planRange(scope);
  if (!Array.isArray(lessons) || lessons.some((l) => !l?.title?.trim())) {
    throw modelError('plan: oczekiwano listy lekcji z tytułami');
  }
  if (lessons.length < min || lessons.length > max) {
    throw modelError(
      `plan: ${lessons.length} lekcji, wymagane ${min}–${max} dla zakresu "${scope}"`,
    );
  }
  return true;
}

// --- wywiad -----------------------------------------------------------------

export async function interviewQuestions(project, run = runClaudeJson) {
  const data = await run(
    {
      stage: 'wywiad-pytania',
      prompt: loadPrompt('interview-questions', { language: project.language, topic: project.topic }),
    },
    (d) => {
      if (!Array.isArray(d?.questions) || d.questions.length === 0) {
        throw new Error('brak listy questions');
      }
      if (d.questions.some((q) => !q?.text?.trim())) throw new Error('pytanie bez treści');
    },
  );
  // id nadaje serwer: model bywa kreatywny, a odpowiedzi muszą się z czymś skleić.
  return {
    questions: data.questions.map((q, i) => ({
      id: `q${i + 1}`,
      text: q.text.trim(),
      kind: q.kind === 'wybór' && Array.isArray(q.options) ? 'wybór' : 'otwarte',
      ...(q.kind === 'wybór' && Array.isArray(q.options) ? { options: q.options } : {}),
    })),
  };
}

const oneOf = (values, value, fallback, field) => {
  if (values.includes(value)) return value;
  console.warn(`ocena wywiadu: ${field}=${JSON.stringify(value)} spoza enumu → ${fallback}`);
  return fallback;
};

export async function assessInterview(project, answers, run = runClaudeJson) {
  const questions = project.interview?.questions ?? [];
  const qa = answers
    .map((a, i) => `P: ${questions.find((q) => q.id === a.id)?.text ?? `pytanie ${i + 1}`}\nO: ${a.answer}`)
    .join('\n\n');

  const data = await run(
    {
      stage: 'wywiad-ocena',
      prompt: loadPrompt('interview-assess', { language: project.language, topic: project.topic, qa }),
    },
    (d) => {
      if (!d || typeof d !== 'object') throw new Error('oczekiwano obiektu oceny');
    },
  );

  // Pojedyncze pole spoza enumu nie jest wart ponawiania całego wywiadu — bierzemy domyślne.
  return {
    level: oneOf(LEVELS, data.level, DEFAULT_COURSE.level, 'level'),
    pace: oneOf(PACES, data.pace, DEFAULT_COURSE.pace, 'pace'),
    scope: oneOf(SCOPES, data.scope, DEFAULT_COURSE.scope, 'scope'),
    summary: typeof data.summary === 'string' ? data.summary.trim() : '',
  };
}

// --- plan kursu -------------------------------------------------------------

const askPlan = async (prompt, run) => {
  const data = await run({ stage: 'plan', prompt }, (d) => {
    if (!Array.isArray(d?.lessons)) throw new Error('brak listy lessons');
  });
  // order nadaje serwer — numeracja to jego sprawa, nie modelu.
  return data.lessons.map((l, i) => ({
    order: i + 1,
    title: String(l?.title ?? '').trim(),
    brief: String(l?.brief ?? '').trim(),
  }));
};

export async function planCourse(project, comment = '', run = runClaudeJson) {
  const { level, pace, scope } = project.course;
  const [min, max] = planRange(scope);
  const prompt = loadPrompt('course-plan', {
    language: project.language,
    topic: project.topic,
    level,
    pace,
    scope,
    min,
    max,
    summary: project.interview?.summary || '(brak wywiadu)',
    comment: comment ? `Uwaga użytkownika do poprzedniego planu: „${comment}”` : '',
  });

  const lessons = await askPlan(prompt, run);
  try {
    validatePlan(lessons, scope);
    return { lessons };
  } catch {
    // Dokładnie jedno ponowienie. Druga porażka leci w górę — listy nie przycinamy,
    // bo użytkownik ma wiedzieć, że model nie posłuchał.
    const retry = await askPlan(
      `${prompt}\n\nPoprzedni plan miał ${lessons.length} lekcji. Wymagane: ${min}–${max}. Zwróć plan mieszczący się w widełkach.`,
      run,
    );
    validatePlan(retry, scope);
    return { lessons: retry };
  }
}

// --- generowanie lekcji -----------------------------------------------------

/** Gęstość lekcji wynika z tempa kursu, nie z uznania modelu. */
export const PACE_SHAPE = {
  wolne: { concepts: '2–3', exercises: 2, quiz: 5 },
  normalne: { concepts: '4–5', exercises: 3, quiz: 8 },
  szybkie: { concepts: '6–8', exercises: 5, quiz: 10 },
};

/** Dokładnie te pliki i nic poza nimi — katalog lekcji jest granicą zapisu. */
const LESSON_FILES = ['index.html', 'lesson.css', 'lesson.js'];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (c) => ESCAPES[c]);

const line = (items, empty) => (items.length ? items.join('\n') : empty);

/** Skrót lekcji dla promptu: tytuł z numerem, podsumowanie i pojęcia. */
const entry = (l) =>
  `- **${l.title}** (${l.order}) — ${l.summary || l.brief || '(bez podsumowania)'}` +
  (l.covers?.length ? `\n  pojęcia: ${l.covers.join(', ')}` : '');

/** Indeks poprzednich lekcji: model ma wiedzieć, co zostało już wyjaśnione. */
const previousIndex = (previous) => line(previous.map(entry), '(to pierwsza lekcja kursu)');

/**
 * Kontekst rozbudowy: pusty dla lekcji z planu, więc prompt lekcji zostaje jeden.
 * Lekcja spoza planu dostaje CAŁY indeks (także lekcje po niej) — nie wolno jej dublować
 * materiału, który już gdzieś w kursie stoi, a `previous` widzi tylko to, co przed nią.
 */
const extendContext = (lesson, index) => {
  if (lesson.origin === 'plan') return '';
  const source = index.filter((l) => l.order < lesson.order).at(-1);
  return loadPart('lesson-extend', {
    mode: lesson.origin,
    source: source ? `**${source.title}** (${source.order})` : '(początek kursu)',
    index: line(index.filter((l) => l.id !== lesson.id).map(entry), '(brak innych lekcji)'),
  });
};

/** Słabe punkty: notatki z praktyki i sprawdziany poniżej 60%. */
const weakPoints = (previous) =>
  line(
    previous.flatMap((l) => [
      ...(l.practiceNotes ?? []).map(({ note }) => `- ${l.title}: ${note}`),
      ...(typeof l.score === 'number' && l.score < 60 ? [`- ${l.title}: sprawdzian ${l.score}%`] : []),
    ]),
    '(brak — nic nie wymaga nadrabiania)',
  );

/**
 * Pisze pliki lekcji na dysk przez Claude'a i zwraca opis tego, co powstało.
 * @param {object} project
 * @param {object} lesson wpis z indeksu
 * @param {object[]} index cały indeks lekcji — kontekst bierze się z lekcji o niższym `order`
 * @returns {Promise<{summary: string, covers: string[]}>}
 */
export async function generateLesson(project, lesson, index = [], run = runClaude) {
  const previous = index.filter((l) => l.order < lesson.order);
  const revision = [...new Set(previous.flatMap((l) => l.covers ?? []))];
  const shape = PACE_SHAPE[project.course.pace] ?? PACE_SHAPE.normalne;
  // 20–30% sprawdzianu to powtórka; w pierwszej lekcji nie ma czego powtarzać.
  const revisionQuestions = revision.length ? Math.max(1, Math.round(shape.quiz * 0.25)) : 0;

  const skeleton = lessonTemplate
    .replaceAll('{{language}}', project.language)
    .replaceAll('{{title}}', escapeHtml(lesson.title))
    .replaceAll('{{projectId}}', project.id)
    .replaceAll('{{lessonId}}', lesson.id);

  const prompt = loadPrompt('lesson', {
    language: project.language,
    topic: project.topic,
    title: lesson.title,
    brief: lesson.brief || '(bez opisu — wyprowadź zakres z tytułu i miejsca w kursie)',
    order: lesson.order,
    level: project.course.level,
    pace: project.course.pace,
    scope: project.course.scope,
    courseSummary: project.interview?.summary || '(brak wywiadu)',
    previous: previousIndex(previous),
    weak: weakPoints(previous),
    revision: revision.length ? revision.map((c) => `- ${c}`).join('\n') : '(brak — pierwsza lekcja)',
    concepts: shape.concepts,
    exercises: shape.exercises,
    quiz: shape.quiz,
    revisionQuestions,
    extend: extendContext(lesson, index),
    skeleton,
  });

  // Pusty katalog przed startem: po nieudanej próbie leżą tam pliki-niedopałki.
  const cwd = store.resetLessonDir(project.id, lesson);
  const text = await run({
    stage: 'lekcja',
    prompt,
    cwd,
    allowedTools: ['Write', 'Read'],
    maxTurns: 30, // trzy pliki plus poprawki — z zapasem
    timeoutMs: 20 * 60_000, // lekcja liczy się w minutach, nie sekundach
  });

  // cwd bez additionalDirectories to granica zapisu; to jest jej sprawdzenie po fakcie.
  const files = store.lessonFiles(project.id, lesson);
  const missing = LESSON_FILES.filter((f) => !files.includes(f));
  const extra = files.filter((f) => !LESSON_FILES.includes(f));
  if (missing.length || extra.length) {
    throw modelError(
      `lekcja: złe pliki w katalogu (brak: ${missing.join(', ') || '—'}; nadmiar: ${extra.join(', ') || '—'})`,
    );
  }

  const data = extractLastJsonBlock(text) ?? {};
  const summary = String(data.summary ?? '').trim();
  const covers = (Array.isArray(data.covers) ? data.covers : [])
    .map((c) => String(c).trim())
    .filter(Boolean);
  // Bez tego kolejne lekcje dublują materiał — cichy zapis pustych pól psuje kurs za trzy lekcje.
  if (!summary || !covers.length) throw modelError('lekcja: odpowiedź bez summary albo covers');

  return { summary, covers };
}

// --- ocena praktyki ---------------------------------------------------------

export const VERDICTS = ['poprawnie', 'częściowo', 'niepoprawnie'];

/**
 * Ocena jednej odpowiedzi na ćwiczenie. Bezstanowa: żadnego licznika prób, żadnej blokady —
 * to samo ćwiczenie wolno ocenić dowolną liczbę razy.
 * @param {object} project
 * @param {object} lesson wpis z indeksu
 * @param {string} task treść ćwiczenia (przychodzi z lekcji — serwer nie czyta jej plików)
 * @param {string} answer
 * @returns {Promise<{verdict: string, feedback: string, hint: string, note: string}>}
 */
export async function gradePractice(project, lesson, task, answer, run = runClaudeJson) {
  const data = await run(
    {
      stage: 'praktyka',
      prompt: loadPrompt('practice-grade', {
        language: project.language,
        topic: project.topic,
        title: lesson.title,
        covers: lesson.covers?.length ? lesson.covers.join(', ') : '(brak listy pojęć)',
        task,
        answer,
      }),
    },
    // Werdykt spoza enumu idzie do ponowienia (nie do domyślnego jak w wywiadzie): to jedyna
    // informacja w tej odpowiedzi, zgadywanie jej zafałszowałoby ocenę.
    (d) => {
      if (!VERDICTS.includes(d?.verdict)) {
        throw new Error(`verdict spoza enumu: ${JSON.stringify(d?.verdict)}`);
      }
    },
  );

  const text = (value) => String(value ?? '').trim();
  return {
    verdict: data.verdict,
    feedback: text(data.feedback),
    hint: text(data.hint),
    // Notatka opisuje aktualny brak — przy poprawnej odpowiedzi nie ma czego notować.
    note: data.verdict === 'poprawnie' ? '' : text(data.note),
  };
}

// --- propozycja nowego wątku ------------------------------------------------

/**
 * Jedyna propozycja wymagająca modelu: „czego w tym kursie nie ma" nie da się wyliczyć
 * z indeksu. Dlatego siedzi za osobnym przyciskiem, a nie w odczycie projektu — ekran
 * projektu nie może czekać na Claude'a przy każdym odświeżeniu.
 * @returns {Promise<object[]>} propozycje w kształcie z suggestions.js
 */
export async function suggestThreads(project, lessons = [], run = runClaudeJson) {
  const afterOrder = lessons.length ? lessons[lessons.length - 1].order : 0;
  const data = await run(
    {
      stage: 'sugestie',
      prompt: loadPrompt('suggest-thread', {
        language: project.language,
        topic: project.topic,
        index: line(lessons.map(entry), '(kurs nie ma jeszcze lekcji)'),
      }),
    },
    (d) => {
      if (!Array.isArray(d?.threads)) throw new Error('brak listy threads');
    },
  );

  return data.threads
    .map((th) => ({ title: String(th?.title ?? '').trim(), brief: String(th?.brief ?? '').trim() }))
    .filter((th) => th.title && th.brief)
    .map((th) => ({
      kind: 'nowy wątek',
      afterOrder, // nowy wątek dokleja się na końcu kursu, nigdy w środku
      lessonId: null,
      title: th.title,
      brief: th.brief,
      reason: { code: 'brak-watku', topic: th.title },
    }));
}
