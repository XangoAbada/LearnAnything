import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { projectsDir } from './config.js';

// Jedyny moduł dotykający dysku. Wszystko synchronicznie: jeden użytkownik, pliki rzędu kilobajtów.

fs.mkdirSync(projectsDir, { recursive: true });

const LANGUAGES = ['pl', 'en'];

const projectDir = (id) => path.join(projectsDir, id);
const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');

// --- projekty ---------------------------------------------------------------

export function listProjects() {
  return fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => readProject(e.name))
    .filter(Boolean)
    .map((p) => {
      const lessons = readIndex(p.id);
      return {
        id: p.id,
        topic: p.topic,
        language: p.language,
        status: p.status,
        progress: {
          done: lessons.filter((l) => l.status === 'ukończona').length,
          total: lessons.length,
        },
      };
    });
}

export function createProject({ topic, language }) {
  if (!topic || !String(topic).trim()) throw new Error('topic jest wymagany');
  if (!LANGUAGES.includes(language)) throw new Error(`language musi być jednym z: ${LANGUAGES}`);

  const project = {
    id: randomUUID().slice(0, 8),
    topic: String(topic).trim(),
    language,
    createdAt: new Date().toISOString(),
    interview: { skipped: false, questions: [], answers: [] },
    course: { level: 'początkujący', pace: 'normalne', scope: 'standardowy' },
    status: 'nowy',
    queue: [],
  };
  fs.mkdirSync(path.join(projectDir(project.id), 'lessons'), { recursive: true });
  writeProject(project);
  return project;
}

export function readProject(id) {
  return readJson(path.join(projectDir(id), 'project.json'), null);
}

export function writeProject(project) {
  writeJson(path.join(projectDir(project.id), 'project.json'), project);
}

export function deleteProject(id) {
  fs.rmSync(projectDir(id), { recursive: true, force: true });
}

// --- indeks lekcji ----------------------------------------------------------

export function readIndex(id) {
  return readJson(path.join(projectDir(id), 'index.json'), []).sort((a, b) => a.order - b.order);
}

export function writeIndex(id, lessons) {
  writeJson(path.join(projectDir(id), 'index.json'), [...lessons].sort((a, b) => a.order - b.order));
}

export function updateLesson(id, lessonId, patch) {
  const lessons = readIndex(id);
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new Error(`brak lekcji ${lessonId} w projekcie ${id}`);
  Object.assign(lesson, patch);
  writeIndex(id, lessons);
  return lesson;
}

// --- numeracja i wstawianie (czyste funkcje, bez dysku) ---------------------

const decimals = (n) => (String(n).split('.')[1] || '').length;
const round = (n) => Number(n.toFixed(10)); // higiena zmiennoprzecinkowa: 4.1 + 0.1 !== 4.2

export function nextOrderAfter(lessons, afterOrder) {
  const orders = lessons.map((l) => l.order).sort((a, b) => a - b);
  const next = orders.find((o) => o > afterOrder);
  if (next === undefined) return round(afterOrder + 1);

  // Siatka o jeden rząd głębsza niż wstawka-rodzic: po 4 idą 4.1, 4.2…, po 4.1 idą 4.11, 4.12…
  const step = 10 ** -(decimals(afterOrder) + 1);
  const taken = (c) => orders.some((o) => Math.abs(o - c) < 1e-9);
  // Pierwszy nie-potomek za afterOrder: dalej niż on wjeżdżać nie wolno.
  const bound = orders.find((o) => o > afterOrder && decimals(o) <= decimals(afterOrder));

  let c = round(afterOrder + step);
  while (taken(c)) c = round(c + step); // kolejne wstawki po tej samej lekcji idą po kolei
  if (bound === undefined || c < bound) return c;

  // Siatka wyczerpana — wciskamy się w połowę pierwszej szpary.
  return round((afterOrder + next) / 2);
}

export function minInsertOrder(lessons) {
  return lessons
    .filter((l) => l.status === 'ukończona')
    .reduce((max, l) => Math.max(max, l.order), 0);
}

export function canInsertAfter(lessons, afterOrder) {
  return afterOrder >= minInsertOrder(lessons);
}

export function addLesson(id, { afterOrder, title, brief = '', origin = 'plan' }) {
  const lessons = readIndex(id);
  if (!canInsertAfter(lessons, afterOrder)) {
    const err = new Error(
      `nie można wstawić lekcji przed ostatnią ukończoną (order ${minInsertOrder(lessons)})`,
    );
    err.code = 'HISTORIA_NIEZMIENNA';
    throw err;
  }
  const order = nextOrderAfter(lessons, afterOrder);
  const used = new Set(lessons.map((l) => l.id));
  let n = lessons.length + 1;
  while (used.has(`l${n}`)) n += 1;

  const lesson = {
    id: `l${n}`,
    order,
    title,
    brief,
    origin,
    path: `lessons/${slugify(title, order)}`,
    status: 'zaplanowana',
    summary: '',
    covers: [],
    score: null,
    practiceNotes: [],
    completedAt: null,
  };
  writeIndex(id, [...lessons, lesson]);
  return lesson;
}

// --- katalogi lekcji --------------------------------------------------------

export function lessonDir(projectId, lesson) {
  return path.join(projectDir(projectId), lesson.path);
}

export function createLessonDir(projectId, lesson) {
  const dir = lessonDir(projectId, lesson);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function slugify(title, order) {
  const [whole, frac] = String(order).split('.');
  const prefix = whole.padStart(2, '0') + (frac ? `-${frac}` : '');
  const name = String(title)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${prefix}-${name || 'lekcja'}`;
}
