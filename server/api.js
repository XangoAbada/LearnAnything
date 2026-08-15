import express from 'express';
import * as store from './store.js';
import * as generator from './generator.js';

// Trasy REST. Cała wiedza o modelu siedzi w generator.js, cała o dysku w store.js.

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const need = (cond, message) => {
  if (!cond) throw new HttpError(400, message);
};

const mustProject = (id) => {
  const project = store.readProject(id);
  if (!project) throw new HttpError(404, `nie ma projektu ${id}`);
  return project;
};

export const api = express.Router();

// --- projekty ---------------------------------------------------------------

api.get('/projects', (req, res) => res.json(store.listProjects()));

api.post('/projects', (req, res) => {
  const { topic, language } = req.body ?? {};
  need(topic && String(topic).trim(), 'topic jest wymagany');
  need(['pl', 'en'].includes(language), 'language musi być pl albo en');
  res.status(201).json(store.createProject({ topic, language }));
});

api.get('/projects/:id', (req, res) => {
  const project = mustProject(req.params.id);
  const lessons = store.readIndex(project.id);
  // suggestions i pełna logika wstawiania przychodzą w fazie 10.
  res.json({ project, lessons, suggestions: [], minInsertOrder: store.minInsertOrder(lessons) });
});

api.delete('/projects/:id', (req, res) => {
  mustProject(req.params.id);
  store.deleteProject(req.params.id);
  res.status(204).end();
});

// --- wywiad -----------------------------------------------------------------

api.post('/projects/:id/interview', async (req, res) => {
  const project = mustProject(req.params.id);
  const { questions } = await generator.interviewQuestions(project);
  project.interview.questions = questions;
  project.status = 'wywiad';
  store.writeProject(project);
  res.json({ questions });
});

api.post('/projects/:id/interview/answers', async (req, res) => {
  const project = mustProject(req.params.id);
  const { answers } = req.body ?? {};
  need(Array.isArray(answers) && answers.length, 'answers musi być niepustą tablicą');

  const { level, pace, scope, summary } = await generator.assessInterview(project, answers);
  project.interview.answers = answers;
  project.interview.summary = summary;
  project.course = { level, pace, scope };
  project.status = 'plan';
  store.writeProject(project);
  res.json({ level, pace, scope, summary });
});

// Dostępny w każdej chwili, także w połowie wywiadu. Bez wołania modelu.
api.post('/projects/:id/interview/skip', (req, res) => {
  const project = mustProject(req.params.id);
  project.interview.skipped = true;
  project.course = { ...generator.DEFAULT_COURSE };
  project.status = 'plan';
  store.writeProject(project);
  res.json({ ...project.course, summary: project.interview.summary ?? '' });
});

// --- plan -------------------------------------------------------------------

// Plan nie jest zapisywany przed akceptacją — żyje tylko w tej odpowiedzi.
api.post('/projects/:id/plan', async (req, res) => {
  const project = mustProject(req.params.id);
  const { comment } = req.body ?? {};
  const plan = await generator.planCourse(project, comment ? String(comment) : '');
  // Widełki dokładane do odpowiedzi: ekran planu ma pokazać, czemu lekcji jest właśnie tyle.
  res.json({ ...plan, range: generator.planRange(project.course.scope) });
});

api.post('/projects/:id/plan/accept', (req, res) => {
  const project = mustProject(req.params.id);
  const { lessons } = req.body ?? {};
  need(Array.isArray(lessons), 'lessons musi być tablicą');
  if (store.readIndex(project.id).length) {
    throw new HttpError(409, 'plan tego projektu został już zaakceptowany');
  }
  generator.validatePlan(lessons, project.course.scope); // klient mógł namieszać przy edycji tytułów

  const created = lessons.reduce((acc, l) => {
    const afterOrder = acc.length ? acc[acc.length - 1].order : 0;
    acc.push(store.addLesson(project.id, { afterOrder, title: String(l.title).trim(), brief: String(l.brief ?? '').trim() }));
    return acc;
  }, []);

  project.queue = created.map((l) => l.id);
  project.status = 'generowanie';
  store.writeProject(project); // kolejka rusza dopiero w fazie 06
  res.json({ project, lessons: created });
});

// --- wynik lekcji -----------------------------------------------------------

// Lekcja dostaje „ukończona” niezależnie od wyniku — sprawdzian nie jest bramką.
api.post('/projects/:id/lessons/:lessonId/result', (req, res) => {
  const project = mustProject(req.params.id);
  const { score } = req.body ?? {};
  need(Number.isFinite(score) && score >= 0 && score <= 100, 'score musi być liczbą 0–100');
  if (!store.readIndex(project.id).some((l) => l.id === req.params.lessonId)) {
    throw new HttpError(404, `nie ma lekcji ${req.params.lessonId}`);
  }
  res.json(
    store.updateLesson(project.id, req.params.lessonId, {
      score: Math.round(score),
      status: 'ukończona',
      completedAt: new Date().toISOString(),
    }),
  );
});

// --- błędy ------------------------------------------------------------------

const statusOf = (err) =>
  err.status ?? (err.code === 'MODEL' || err.message.startsWith('claude:') ? 502 : 500);

// eslint-disable-next-line no-unused-vars -- Express rozpoznaje middleware błędów po arności
api.use((err, req, res, next) => {
  const status = statusOf(err);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message });
});
