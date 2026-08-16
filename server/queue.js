import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import * as store from './store.js';
import * as generator from './generator.js';

// Kolejka generowania: JEDNA lekcja naraz w projekcie, do `naraz` projektów równolegle.
// Jedna na projekt, bo prompt kolejnej lekcji karmi się `summary`/`covers` poprzedniej.
// Stan trwały siedzi w `project.queue` — pamięć trzyma wyłącznie pętle i kolejność
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

/** Ile podejść dostaje lekcja, zanim zostanie z błędem. Pierwsze plus dwa ponowienia. */
export const PROBY = 3;

// Przerwa przed kolejnym podejściem: limit tempa API i timeout nie mijają natychmiast.
const ODSTEP = [5_000, 20_000];
let odstep = ODSTEP;
/** Podmiana wyłącznie dla testów — inaczej test ponowienia trwałby 25 sekund. */
export const useBackoff = (ms) => {
  odstep = ms ?? ODSTEP;
};

let pending = []; // projectId w kolejności zgłoszenia, bez powtórek
const running = new Map(); // projectId -> lessonId; rezerwacja projektu przez pętlę
const loops = new Set(); // pętle robocze; rozmiar = ile lekcji chodzi naraz

const limit = () => store.readNaraz();

// Zdarzenie to powiadomienie, nie praca — padnięty słuchacz SSE nie ma prawa zabić pętli.
const emit = (projectId, type, data = {}) => {
  try {
    events.emit('event', { projectId, type, data });
  } catch (err) {
    console.error(`kolejka: słuchacz zdarzeń padł (${err.message})`);
  }
};

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
  const active = running.get(projectId) ?? null;
  return { running: active, waiting: queue.filter((id) => id !== active) };
}

/**
 * Status projektu liczony z faktów, nie przechowywany: zapisany `status` rządzi tylko do
 * czasu, aż projekt dostanie lekcje (nowy/wywiad/plan). Potem decyduje indeks i kolejka.
 * Błąd bije niepustą kolejkę, bo po wyczerpaniu prób kolejka tego projektu i tak stoi —
 * wyprzedza go tylko faktycznie chodząca lekcja.
 * @returns {string|null} null, gdy projektu nie ma
 */
export function projectStatus(projectId) {
  const project = store.readProject(projectId);
  if (!project) return null;
  const lessons = store.readIndex(projectId);
  if (!lessons.length) return project.status; // nowy / wywiad / plan
  if (running.has(projectId)) return 'generowanie';
  if (lessons.some((l) => l.status === 'błąd')) return 'błąd';
  if (project.queue?.length) return 'generowanie';
  if (lessons.some((l) => l.status === 'zaplanowana')) return 'w toku';
  return 'gotowy';
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

/**
 * Dokłada pętle do limitu i zwraca obietnicę końca WSZYSTKICH bieżących.
 * Nie wolno tego awaitować z wnętrza generatora — czekałoby na własną pętlę.
 */
export function startWorker() {
  // Ile pętli dokładamy, to oszacowanie: nadmiarowa nie znajdzie wolnego projektu i zejdzie
  // na pierwszym pick(). Twardą blokadą jest rezerwacja w `running`, nie ta arytmetyka.
  // Obniżony `naraz` działa od następnej fali pętli — bieżących nie przerywamy.
  for (let n = Math.min(limit(), pending.length) - loops.size; n > 0; n -= 1) spawn();
  return drain();
}

const spawn = () => {
  // Pętla rusza dopiero w kolejnym mikrozadaniu: seria enqueue z jednego ticku ma zdążyć
  // wypełnić `pending`, zanim pierwszy pick() cokolwiek zarezerwuje, a run() wołane wprost
  // emitowałoby zdarzenia w środku niedokończonego spawn(). Cena: dwa startWorker() w tym
  // samym ticku mogą dołożyć pętlę na ten sam projekt — nadmiarowa zejdzie na pick() === null.
  const p = Promise.resolve()
    .then(run)
    .catch((err) => console.error(`kolejka: ${err.message}`)) // pętla nie wywraca procesu
    .finally(() => loops.delete(p));
  loops.add(p);
};

// Pętla dołożona w trakcie czekania (enqueue z wnętrza generatora) też musi się załapać.
async function drain() {
  while (loops.size) await Promise.all([...loops]);
}

async function run() {
  for (let job = pick(); job; job = pick()) await one(job);
}

/**
 * Następna do wzięcia: pierwszy projekt zgłoszeń, którego NIE robi inna pętla, a w nim
 * czekająca lekcja o NAJNIŻSZYM `order` — nie najstarsza w kolejce. Stąd priorytet
 * pierwszej lekcji i wejście wstawki 4.1 przed 5, bez osobnego mechanizmu.
 * Rezerwacja projektu idzie synchronicznie — inaczej dwie pętle wzięłyby ten sam projekt.
 */
function pick() {
  for (let i = 0; i < pending.length; ) {
    const projectId = pending[i];
    if (running.has(projectId)) {
      i += 1; // zajęty inną pętlą — zostaje w zgłoszeniach
      continue;
    }
    const project = store.readProject(projectId);
    const queued = new Set(project?.queue ?? []);
    const lessons = store.readIndex(projectId); // indeks jest sortowany po order
    const lesson = lessons.find((l) => queued.has(l.id));
    if (!lesson) {
      pending.splice(i, 1); // nic do roboty — precz ze zgłoszeń
      continue;
    }
    // Lekcja z błędem zatrzymuje kurs: następna nie ma prawa powstać bez podsumowania
    // poprzedniej. Projekt zostaje w zgłoszeniach i ruszy po „Ponów”.
    if (lessons.some((l) => l.status === 'błąd' && l.order < lesson.order)) {
      i += 1;
      continue;
    }
    running.set(projectId, lesson.id); // rezerwacja
    return { projectId, project, lesson };
  }
  return null;
}

async function one({ projectId, project, lesson }) {
  let ponow = false;
  let przerwa = 0;

  try {
    patch(projectId, lesson.id, { status: 'generowana', error: null });
    emit(projectId, 'lesson-started', { lessonId: lesson.id, title: lesson.title });

    // `undefined` bierze domyślny runClaude — piąty argument to podgląd postępu.
    const { summary, covers } = await generate(
      project,
      lesson,
      store.readIndex(projectId),
      undefined,
      (postep) => emit(projectId, 'lesson-progress', { lessonId: lesson.id, ...postep }),
    );
    patch(projectId, lesson.id, { status: 'gotowa', summary, covers, attempts: 0 });
    emit(projectId, 'lesson-ready', {
      lessonId: lesson.id,
      title: lesson.title,
      order: lesson.order,
    });
  } catch (err) {
    // Błąd ponawia TĘ SAMĄ lekcję, nigdy nie przepuszcza następnej: ponawiana zostaje
    // w project.queue i ma najniższy order, więc pick() weźmie ją znowu.
    const proba = (lesson.attempts ?? 0) + 1;
    ponow = proba < PROBY;
    przerwa = odstep[proba - 1] ?? odstep.at(-1) ?? 0;
    console.error(`lekcja ${lesson.id} (${projectId}), próba ${proba}/${PROBY}: ${err.message}`);
    patch(projectId, lesson.id, {
      status: ponow ? 'zaplanowana' : 'błąd',
      attempts: proba,
      error: err.message,
    });
    emit(projectId, 'lesson-failed', { lessonId: lesson.id, error: err.message, proba, ponow });
  } finally {
    running.delete(projectId);
    if (!ponow) finish(projectId, lesson.id); // ponawiana lekcja nie schodzi z kolejki
  }

  // ponytail: przerwa trzyma całą pętlę, nie tylko ten projekt — przy naraz > 1 druga pętla jedzie.
  if (ponow && przerwa) await sleep(przerwa);
}

function finish(projectId, lessonId) {
  const project = store.readProject(projectId);
  if (!project) return;
  project.queue = (project.queue ?? []).filter((id) => id !== lessonId);
  store.writeProject(project);
  if (!project.queue.length) emit(projectId, 'queue-empty');
}
