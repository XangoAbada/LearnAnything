import { runClaudeJson } from './claude.js';
import { loadPrompt } from './prompts.js';

// Zadania modelu związane z wywiadem i planem. Nie zna HTTP ani dysku — dostaje projekt,
// oddaje zwalidowane dane. Ostatni argument `run` istnieje po to, żeby testy zaślepiły model.

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
    { prompt: loadPrompt('interview-questions', { language: project.language, topic: project.topic }) },
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
    { prompt: loadPrompt('interview-assess', { language: project.language, topic: project.topic, qa }) },
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
  const data = await run({ prompt }, (d) => {
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
