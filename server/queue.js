import { EventEmitter } from 'node:events';
import * as store from './store.js';
import * as generator from './generator.js';

// Kolejka generowania: JEDNA lekcja naraz w całym procesie, nie jedna na projekt.
// Stan trwały siedzi w `project.queue` — pamięć trzyma wyłącznie pętlę i kolejność
// zgłoszeń projektów. Restart odtwarza kolejkę z dysku (recoverOnBoot).
//
// Kolejka rusza WYŁĄCZNIE z enqueue, czyli z akcji użytkownika (akceptacja planu,
// ponowienie, oddanie sprawdzianu, „Generuj następną”). Żadna ścieżka nie dokłada tu
// pracy sama — `topUp` też siedzi na końcu żądania, które kliknął użytkownik.
//
// Kurs NIE generuje się w całości z góry: z przodu jest tylko `store.readBuffer()`
// lekcji, reszta planu czeka `zaplanowana` poza kolejką.

export const events = new EventEmitter();

// Podmiana wyłącznie dla testów: kolejka woła generator przez tę zmienną.
let generate = generator.generateLesson;
export const useGenerator = (fn) => {
  generate = fn ?? generator.generateLesson;
};

let pending = []; // projectId w kolejności zgłoszenia, bez powtórek
let running = null; // { projectId, lessonId }
let loop = null;

const emit = (projectId, type, data = {}) => events.emit('event', { projectId, type, data });

// Projekt mógł zniknąć w trakcie generowania — zapis stanu nie ma prawa zabić pętli.
const patch = (projectId, lessonId, data) => {
  try {
    store.updateLesson(projectId, lessonId, data);
  } catch {
    /* projekt albo lekcja usunięte w trakcie */
  }
};

/** Dokłada lekcję do kolejki projektu i budzi pętlę. Idempotentne. */
export function enqueue(projectId, lessonId) {
  const project = store.readProject(projectId);
  if (!project) throw new Error(`nie ma projektu ${projectId}`);
  project.queue ??= [];
  if (!project.queue.includes(lessonId)) {
    project.queue.push(lessonId);
    store.writeProject(project);
  }
  if (!pending.includes(projectId)) pending.push(projectId);
  return startWorker();
}

/**
 * Zapas = lekcje, które użytkownik ma przed sobą gotowe albo w drodze. Lekcja `błąd`
 * się nie liczy i nie wraca tu sama — od tego jest „Ponów”, inaczej padająca lekcja
 * kręciłaby generowanie w kółko.
 */
const zapas = (lessons, queued) =>
  lessons.filter((l) => l.status === 'gotowa' || queued.has(l.id)).length;

const kolejka = (projectId) => new Set(store.readProject(projectId)?.queue ?? []);

/**
 * Pierwsza `zaplanowana` spoza kolejki idzie do kolejki — akcja użytkownika
 * „Generuj następną”.
 * @returns {object|null} wpis lekcji albo null, gdy nie ma już czego dokładać
 */
export function enqueueNext(projectId) {
  const w = kolejka(projectId);
  const lesson = store.readIndex(projectId).find((l) => l.status === 'zaplanowana' && !w.has(l.id));
  if (lesson) enqueue(projectId, lesson.id);
  return lesson ?? null;
}

/**
 * Dociąga lekcje, aż zapas sięgnie bufora z ustawień. Wołane z akceptacji planu
 * i z ukończenia lekcji — kurs nie generuje się w całości z góry.
 * @returns {number} liczba dołożonych lekcji
 */
export function topUp(projectId) {
  const bufor = store.readBuffer();
  let dodane = 0;
  while (zapas(store.readIndex(projectId), kolejka(projectId)) < bufor) {
    if (!enqueueNext(projectId)) break; // nie ma już zaplanowanych lekcji
    dodane += 1;
  }
  return dodane;
}

/** @returns {{running: string|null, waiting: string[]}} */
export function queueState(projectId) {
  const queue = store.readProject(projectId)?.queue ?? [];
  const active = running?.projectId === projectId ? running.lessonId : null;
  return { running: active, waiting: queue.filter((id) => id !== active) };
}

/**
 * Po restarcie: lekcja `generowana` wraca do `zaplanowana` — proces zginął w połowie,
 * pliki mogą być niekompletne, więc generujemy od nowa. Kolejka wraca z project.queue.
 * @returns {number} liczba projektów z zaległą pracą
 */
export function recoverOnBoot() {
  for (const projectId of store.projectIds()) {
    const project = store.readProject(projectId);
    if (!project) continue;
    const lessons = store.readIndex(projectId);
    for (const lesson of lessons) {
      if (lesson.status === 'generowana') patch(projectId, lesson.id, { status: 'zaplanowana' });
    }
    // Wpis w kolejce bez lekcji w indeksie to śmieć po usuniętej lekcji.
    const queue = (project.queue ?? []).filter((id) => lessons.some((l) => l.id === id));
    if (queue.length !== (project.queue ?? []).length) {
      project.queue = queue;
      store.writeProject(project);
    }
    if (queue.length && !pending.includes(projectId)) pending.push(projectId);
  }
  const projects = pending.length;
  if (projects) startWorker();
  return projects;
}

/** Odpala pętlę, jeśli nie chodzi. Zwraca obietnicę końca bieżącego przebiegu. */
export function startWorker() {
  // Pętla rusza dopiero w kolejnym mikrozadaniu, nie w tym wywołaniu. Inaczej `loop` jest
  // jeszcze niepodstawione, gdy run() dochodzi do pierwszego await — a enqueue wołane po
  // drodze odpaliłoby DRUGĄ pętlę na tej samej lekcji. Przy okazji seria enqueue zdąży się
  // zapisać w całości, zanim kolejka wybierze pierwszą lekcję.
  if (!loop) loop = Promise.resolve().then(run).finally(() => (loop = null));
  return loop;
}

async function run() {
  for (let job = pick(); job; job = pick()) await one(job);
}

/**
 * Następna do wzięcia: pierwszy projekt w kolejce zgłoszeń, w nim czekająca lekcja
 * o NAJNIŻSZYM `order` — nie najstarsza w kolejce. Stąd priorytet pierwszej lekcji
 * i wejście wstawki 4.1 przed 5, bez osobnego mechanizmu.
 */
function pick() {
  while (pending.length) {
    const projectId = pending[0];
    const project = store.readProject(projectId);
    const queued = new Set(project?.queue ?? []);
    const lesson = store.readIndex(projectId).find((l) => queued.has(l.id)); // indeks jest sortowany po order
    if (lesson) return { projectId, project, lesson };
    pending.shift();
  }
  return null;
}

async function one({ projectId, project, lesson }) {
  running = { projectId, lessonId: lesson.id };
  patch(projectId, lesson.id, { status: 'generowana', error: null });
  emit(projectId, 'lesson-started', { lessonId: lesson.id, title: lesson.title });

  try {
    const { summary, covers } = await generate(project, lesson, store.readIndex(projectId));
    patch(projectId, lesson.id, { status: 'gotowa', summary, covers });
    emit(projectId, 'lesson-ready', { lessonId: lesson.id, title: lesson.title, order: lesson.order });
  } catch (err) {
    // Porażka jednej lekcji nie zatrzymuje kursu — kolejka idzie dalej.
    console.error(`lekcja ${lesson.id} (${projectId}): ${err.message}`);
    patch(projectId, lesson.id, { status: 'błąd', error: err.message });
    emit(projectId, 'lesson-failed', { lessonId: lesson.id, error: err.message });
  } finally {
    running = null;
    finish(projectId, lesson.id);
  }
}

function finish(projectId, lessonId) {
  const project = store.readProject(projectId);
  if (!project) return;
  project.queue = (project.queue ?? []).filter((id) => id !== lessonId);
  // Pusta kolejka to jeszcze nie gotowy kurs: przy generowaniu buforem reszta planu czeka
  // niewygenerowana. `gotowy` należy się dopiero, gdy nie ma już czego dogenerować.
  const zostalo = store.readIndex(projectId).some((l) => l.status === 'zaplanowana');
  if (!project.queue.length && !zostalo) project.status = 'gotowy';
  store.writeProject(project);
  if (!project.queue.length) emit(projectId, 'queue-empty');
}
