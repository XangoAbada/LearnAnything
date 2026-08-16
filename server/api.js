import express from 'express';
import * as store from './store.js';
import * as generator from './generator.js';
import * as queue from './queue.js';
import { computeSuggestions } from './suggestions.js';
import { availableModels } from './claude.js';
import { katalog } from './komponenty.js';

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

// Status projektu nie jest przechowywany od czasu, gdy projekt ma lekcje — liczy go kolejka
// z indeksu i z tego, co właśnie chodzi. Zapisany `status` rządzi tylko przed planem.
// ponytail: drugi odczyt project.json + index.json na projekt; przy kilku projektach lokalnie
// to nic. Gdyby lista puchła — listProjects musiałoby oddawać oba pliki naraz.
const widok = (p) => ({ ...p, status: queue.projectStatus(p.id) ?? p.status });

const mustProject = (id) => {
  const project = store.readProject(id);
  if (!project) throw new HttpError(404, `nie ma projektu ${id}`);
  return project;
};

export const api = express.Router();

// --- projekty ---------------------------------------------------------------

api.get('/projects', (req, res) => res.json(store.listProjects().map(widok)));

api.post('/projects', (req, res) => {
  const { topic, language } = req.body ?? {};
  need(topic && String(topic).trim(), 'topic jest wymagany');
  need(['pl', 'en'].includes(language), 'language musi być pl albo en');
  res.status(201).json(store.createProject({ topic, language }));
});

api.get('/projects/:id', (req, res) => {
  const project = mustProject(req.params.id);
  const lessons = store.readIndex(project.id);
  res.json({
    project: widok(project),
    lessons,
    queue: queue.queueState(project.id),
    // Liczone tu i teraz, nigdzie nie zapisywane — i nic nie kolejkujące. Do kolejki
    // trafiają dopiero przez POST /lessons, czyli po kliknięciu „Utwórz lekcję”.
    suggestions: computeSuggestions(lessons),
    minInsertOrder: store.minInsertOrder(lessons),
  });
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
  // Widełki są podpowiedzią dla modelu, nie bramką dla użytkownika — sprawdzamy tylko kształt.
  need(lessons.length > 0 && lessons.every((l) => l?.title?.trim()), 'plan: każda lekcja potrzebuje tytułu');

  const created = lessons.reduce((acc, l) => {
    const afterOrder = acc.length ? acc[acc.length - 1].order : 0;
    acc.push(store.addLesson(project.id, { afterOrder, title: String(l.title).trim(), brief: String(l.brief ?? '').trim() }));
    return acc;
  }, []);

  // Generowanie rusza z kliknięcia użytkownika, nie samo — i tylko na bufor lekcji
  // z przodu. Reszta planu czeka `zaplanowana` poza kolejką.
  queue.topUp(project.id);
  // Projekt czytany na nowo: kolejkę dopisał enqueue, obiekt w pamięci jej nie zna.
  res.json({ project: widok(store.readProject(project.id)), lessons: created });
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
  const lesson = store.updateLesson(project.id, req.params.lessonId, {
    score: Math.round(score),
    status: 'ukończona',
    completedAt: new Date().toISOString(),
  });
  // Ukończona lekcja zwalnia miejsce w buforze — kolejna dogenerowuje się teraz, a nie
  // wtedy, gdy użytkownik na nią trafi. Nadal spust użytkownika: to jego sprawdzian.
  queue.topUp(project.id);
  res.json(lesson);
});

// --- praktyka oceniana ------------------------------------------------------

// Poza kolejką: krótkie wywołanie na żądanie nie może czekać za generowaniem lekcji.
// Bezstanowe — żadnego licznika prób ani blokady, to samo ćwiczenie wolno oceniać bez końca.
api.post('/projects/:id/lessons/:lessonId/practice', async (req, res) => {
  const project = mustProject(req.params.id);
  const { exerciseId, task, answer } = req.body ?? {};
  need(exerciseId && String(exerciseId).trim(), 'exerciseId jest wymagany');
  need(task && String(task).trim(), 'task jest wymagany');
  need(answer && String(answer).trim(), 'answer jest wymagany');

  const lesson = store.readIndex(project.id).find((l) => l.id === req.params.lessonId);
  if (!lesson) throw new HttpError(404, `nie ma lekcji ${req.params.lessonId}`);

  const { verdict, feedback, hint, note } = await generator.gradePractice(
    project,
    lesson,
    String(task),
    String(answer),
  );
  // Do kursu idzie sam skrót słabego punktu — treść odpowiedzi użytkownika nigdzie nie ląduje.
  store.savePracticeNote(project.id, lesson.id, String(exerciseId), note);
  res.json({ verdict, feedback, hint });
});

// --- rozbudowa kursu --------------------------------------------------------

// Tryby dodania lekcji = `origin` bez „plan”. Ta sama trasa obsługuje ręczne dodanie
// i akceptację propozycji — reguła miejsca i kolejkowanie mają przez to jedno miejsce.
const MODES = ['pośrednia', 'powtórka', 'rozwinięcie', 'nowy wątek'];

api.post('/projects/:id/lessons', (req, res) => {
  const project = mustProject(req.params.id);
  const { afterOrder, brief, title, mode } = req.body ?? {};
  need(Number.isFinite(afterOrder) && afterOrder >= 0, 'afterOrder musi być liczbą >= 0');
  need(brief && String(brief).trim(), 'brief jest wymagany');
  need(MODES.includes(mode), `mode musi być jednym z: ${MODES.join(', ')}`);

  let lesson;
  try {
    // Tytuł domyślnie z opisu: użytkownik pisze, czego brakuje, i to samo widzi na liście
    // do czasu wygenerowania. Serwer nie skleja tu żadnego zdania — nie zna języka interfejsu.
    lesson = store.addLesson(project.id, {
      afterOrder,
      title: String(title ?? brief).trim(),
      brief: String(brief).trim(),
      origin: mode,
    });
  } catch (err) {
    if (err.code === 'HISTORIA_NIEZMIENNA') throw new HttpError(400, err.message);
    throw err;
  }

  // Prosto do kolejki, z pominięciem bufora: użytkownik poprosił o TĘ lekcję. Wejdzie przed
  // dalsze lekcje z planu (kolejka bierze najniższy `order`), ale nie przerwie bieżącej.
  queue.enqueue(project.id, lesson.id);
  res.status(201).json(lesson);
});

// Jedyna propozycja wymagająca modelu, więc osobny przycisk i osobne żądanie. Wynik nie
// jest zapisywany — żyje w tej odpowiedzi, jak plan przed akceptacją.
api.post('/projects/:id/suggestions/thread', async (req, res) => {
  const project = mustProject(req.params.id);
  const suggestions = await generator.suggestThreads(project, store.readIndex(project.id));
  res.json({ suggestions });
});

// --- generowanie na żądanie -------------------------------------------------

// „Generuj następną” — użytkownik wyprzedza bufor dla kolejnej lekcji z planu.
api.post('/projects/:id/lessons/next', (req, res) => {
  const project = mustProject(req.params.id);
  const lesson = queue.enqueueNext(project.id);
  if (!lesson) throw new HttpError(409, 'nie ma już lekcji do wygenerowania');
  res.json(lesson);
});

// Ponowienie po błędzie: lekcja wraca do kolejki, pliki po nieudanej próbie idą precz.
api.post('/projects/:id/lessons/:lessonId/retry', (req, res) => {
  const project = mustProject(req.params.id);
  const lesson = store.readIndex(project.id).find((l) => l.id === req.params.lessonId);
  if (!lesson) throw new HttpError(404, `nie ma lekcji ${req.params.lessonId}`);

  // Ręczne ponowienie kasuje licznik prób: użytkownik dostaje pełną pulę od nowa.
  const updated = store.updateLesson(project.id, lesson.id, {
    status: 'zaplanowana',
    error: null,
    attempts: 0,
  });
  queue.enqueue(project.id, lesson.id);
  res.json(updated);
});

// --- postęp generowania (SSE) -----------------------------------------------

const clients = new Map(); // projectId albo '*' (pulpit) -> Set<res>
const HEARTBEAT = ':\n\n'; // komentarz SSE: ruch bez treści
const WSZYSTKIE = '*'; // klucz pulpitu; nie koliduje z id projektu (8 znaków hex)

queue.events.on('event', ({ projectId, type, data }) => {
  const ramka = (payload) => `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients.get(projectId) ?? []) res.write(ramka(data));
  // Pulpit dostaje kamienie milowe, nie każdą turę modelu — postęp lekcji zatrzymujemy tutaj,
  // bo filtr po stronie serwera jest tańszy niż dyscyplina po stronie klienta.
  if (type !== 'lesson-progress') {
    for (const res of clients.get(WSZYSTKIE) ?? []) res.write(ramka({ ...data, projectId }));
  }
});

// Bez ruchu pośrednik potrafi zamknąć połączenie po cichu. unref: heartbeat nie trzyma procesu.
setInterval(() => {
  for (const set of clients.values()) for (const res of set) res.write(HEARTBEAT);
}, 30_000).unref();

/** Wpina odpowiedź w strumień pod danym kluczem i sprząta po zamknięciu połączenia. */
const subscribe = (key, req, res) => {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write(HEARTBEAT); // otwiera strumień u klienta, zanim padnie pierwsze zdarzenie

  const set = clients.get(key) ?? new Set();
  set.add(res);
  clients.set(key, set);
  req.on('close', () => {
    set.delete(res);
    if (!set.size) clients.delete(key);
  });
};

api.get('/projects/:id/events', (req, res) => {
  mustProject(req.params.id);
  subscribe(req.params.id, req, res);
});

// Strumień pulpitu: wszystkie projekty naraz, każde zdarzenie z `projectId` w danych.
api.get('/events', (req, res) => subscribe(WSZYSTKIE, req, res));

// --- biblioteka komponentów --------------------------------------------------

// Dla galerii. Prompt lekcji bierze ten sam katalog przez generator, nie przez HTTP.
api.get('/komponenty', async (req, res) => res.json(await katalog()));

// --- ustawienia modelu ------------------------------------------------------

// Ustawienia i lista modeli jednym żądaniem — ekran potrzebuje obu naraz.
api.get('/settings', (req, res) =>
  res.json({
    settings: store.readSettings(),
    defaults: store.DEFAULT_SETTINGS,
    models: availableModels(),
    efforts: store.EFFORTS,
    bufor: store.readBuffer(),
    buforDefault: store.DEFAULT_BUFFER,
    buforMax: store.BUFFER_MAX,
    naraz: store.readNaraz(),
    narazDefault: store.DEFAULT_NARAZ,
    narazMax: store.NARAZ_MAX,
  }),
);

api.put('/settings', (req, res) => {
  const { settings, bufor, naraz } = req.body ?? {};
  need(settings === undefined || (settings && typeof settings === 'object'), 'settings musi być obiektem');
  try {
    // Skalary pierwsze: writeSettings scala z zawartością pliku, więc świeże wartości przetrwają.
    if (bufor !== undefined) store.writeBuffer(bufor);
    if (naraz !== undefined) store.writeNaraz(naraz);
    if (settings !== undefined) store.writeSettings(settings);
  } catch (err) {
    throw new HttpError(400, err.message);
  }
  // Podniesiony limit działa od razu, bez czekania na kolejne zlecenie użytkownika. Bez `await`:
  // obietnica kończy się dopiero z całą kolejką, czyli za kilkanaście minut.
  queue.startWorker();
  res.json({ settings: store.readSettings(), bufor: store.readBuffer(), naraz: store.readNaraz() });
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
