import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config, projectsDir } from './config.js';
import { komponentyDir } from './komponenty.js';

// Jedyny moduł dotykający dysku. Wszystko synchronicznie: jeden użytkownik, pliki rzędu kilobajtów.

fs.mkdirSync(projectsDir, { recursive: true });

const LANGUAGES = ['pl', 'en'];

const projectDir = (id) => path.join(projectsDir, id);
const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');

// --- projekty ---------------------------------------------------------------

export function projectIds() {
  return fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export function listProjects() {
  return projectIds()
    .map((id) => readProject(id))
    .filter(Boolean)
    .map((p) => {
      const lessons = readIndex(p.id);
      return {
        id: p.id,
        topic: p.topic,
        language: p.language,
        status: p.status,
        // Krok kreatora — czysta nawigacja pulpitu, żeby kafelek wracał tam, gdzie
        // użytkownik przerwał. Po akceptacji planu nie ma już kreatora, więc `null`.
        step: lessons.length ? null : p.plan ? 'plan' : p.status === 'plan' ? 'podsumowanie' : 'wywiad',
        progress: {
          done: lessons.filter((l) => l.status === 'ukończona').length,
          // Wygenerowane, czyli ile kursu już stoi na dysku — to jest pasek na kafelku.
          ready: lessons.filter((l) => l.status === 'gotowa' || l.status === 'ukończona').length,
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

/**
 * Notatka ze słabym punktem po ocenie praktyki. Jeden wpis na ćwiczenie: kolejna ocena
 * tego samego `exerciseId` nadpisuje poprzednią, a pusta notatka (odpowiedź `poprawnie`)
 * kasuje wpis. Bez limitu prób lista puchłaby w nieskończoność, a notatki mają opisywać
 * aktualne braki, nie historię.
 * @returns {object} zaktualizowany wpis lekcji
 */
export function savePracticeNote(id, lessonId, exerciseId, note) {
  const lesson = readIndex(id).find((l) => l.id === lessonId);
  if (!lesson) throw new Error(`brak lekcji ${lessonId} w projekcie ${id}`);
  const kept = (lesson.practiceNotes ?? []).filter((n) => n.exerciseId !== exerciseId);
  const text = String(note ?? '').trim();
  return updateLesson(id, lessonId, {
    practiceNotes: text ? [...kept, { exerciseId, note: text }] : kept,
  });
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

/** Pusty katalog przed generowaniem: po padzie w połowie leżą tam pliki-niedopałki. */
export function resetLessonDir(projectId, lesson) {
  fs.rmSync(lessonDir(projectId, lesson), { recursive: true, force: true });
  return createLessonDir(projectId, lesson);
}

/** Nazwy plików lekcji — generator sprawdza nimi, co model faktycznie napisał. */
export function lessonFiles(projectId, lesson) {
  const dir = lessonDir(projectId, lesson);
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
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

// --- biblioteka komponentów --------------------------------------------------

/** Katalog roboczy na komponent w budowie. Poza `data/`, bo to nie są dane użytkownika. */
export function tempKomponentDir(nazwa) {
  const dir = path.join(os.tmpdir(), `learnanything-komponent-${nazwa}-${randomUUID().slice(0, 8)}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Odcisk biblioteki: nazwa, rozmiar i czas zapisu każdego pliku. SDK nie zna katalogu
 * dodatkowego „tylko do odczytu", więc jedyne, co pilnuje biblioteki przed lekcją piszącą
 * po niej bez weryfikacji, to porównanie tego odcisku przed i po.
 */
export function komponentySnapshot() {
  if (!fs.existsSync(komponentyDir)) return '';
  return fs
    .readdirSync(komponentyDir)
    .sort()
    .map((f) => {
      const st = fs.statSync(path.join(komponentyDir, f));
      return `${f}:${st.size}:${st.mtimeMs}`;
    })
    .join('|');
}

/** Sprzątanie po katalogu roboczym — dysk należy do store, także ten tymczasowy. */
export const usunKatalog = (dir) => fs.rmSync(dir, { recursive: true, force: true });

/** Zatwierdzony komponent wchodzi do biblioteki. Wołane dopiero po kontroli w przeglądarce. */
export function zapiszKomponent(nazwa, zrodlo) {
  fs.mkdirSync(komponentyDir, { recursive: true });
  const cel = path.join(komponentyDir, `${nazwa}.js`);
  fs.copyFileSync(zrodlo, cel);
  return cel;
}

// --- ustawienia modelu ------------------------------------------------------

// Etapy aplikacji, które wołają model. Po polsku, bo to enum w danych — jak lesson.status.
// „sugestie" to wyłącznie propozycja nowego wątku: powtórkę i rozwinięcie liczy czysta
// funkcja z indeksu, bez modelu.
export const STAGES = [
  'wywiad-pytania',
  'wywiad-ocena',
  'plan',
  'lekcja',
  'komponent',
  'praktyka',
  'sugestie',
];

export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

// Domyślne dobrane do ciężaru zadania: krótka lista pytań nie potrzebuje opusa,
// plan kursu i lekcja tak. null przy haiku, bo ten model nie przyjmuje effort.
export const DEFAULT_SETTINGS = {
  'wywiad-pytania': { model: 'haiku', effort: null },
  'wywiad-ocena': { model: 'sonnet', effort: 'medium' },
  'plan': { model: 'opus', effort: 'high' },
  'lekcja': { model: 'opus', effort: 'high' },
  'komponent': { model: 'sonnet', effort: 'high' },
  'praktyka': { model: 'sonnet', effort: 'high' },
  'sugestie': { model: 'sonnet', effort: 'low' },
};

const settingsFile = () => path.join(config.dataDir, 'settings.json');

/** @returns {Record<string, {model: string|null, effort: string|null}>} komplet etapów */
export function readSettings() {
  const saved = readJson(settingsFile(), {});
  return Object.fromEntries(
    STAGES.map((stage) => [stage, { ...DEFAULT_SETTINGS[stage], ...(saved[stage] ?? {}) }]),
  );
}

/**
 * Model NIE jest sprawdzany przeciwko liście z SDK — ta bywa niedostępna, a zła nazwa
 * i tak wyjdzie błędem Claude'a. Sprawdzamy to, co znamy na pewno: etapy i poziomy.
 * @throws przy nieznanym etapie albo poziomie
 */
export function writeSettings(settings) {
  if (!settings || typeof settings !== 'object') throw new Error('ustawienia muszą być obiektem');
  for (const [stage, value] of Object.entries(settings)) {
    if (!STAGES.includes(stage)) throw new Error(`nieznany etap: ${stage}`);
    const { model = null, effort = null } = value ?? {};
    if (model !== null && !String(model).trim()) throw new Error(`${stage}: pusta nazwa modelu`);
    if (effort !== null && !EFFORTS.includes(effort)) {
      throw new Error(`${stage}: nieznany poziom rozumowania "${effort}"`);
    }
  }
  // Etap pominięty w żądaniu zostaje jak był — PUT z jednym etapem nie kasuje reszty.
  const current = readSettings();
  const full = Object.fromEntries(
    STAGES.map((stage) => {
      if (!(stage in settings)) return [stage, current[stage]];
      const { model = null, effort = null } = settings[stage] ?? {};
      return [stage, { model: model === null ? null : String(model).trim(), effort }];
    }),
  );
  // Spread zachowuje klucze spoza STAGES (bufor) — zapis modeli nie ma ich kasować.
  writeJson(settingsFile(), { ...readJson(settingsFile(), {}), ...full });
  return full;
}

// --- bufor generowania ------------------------------------------------------

// Ile lekcji trzymamy wygenerowanych z przodu. Nie jest etapem, więc siedzi w tym samym
// pliku obok etapów, pod własnym kluczem — schemat etapów zostaje nietknięty.
export const DEFAULT_BUFFER = 3;
export const BUFFER_MAX = 20;

const validBuffer = (n) => Number.isInteger(n) && n >= 1 && n <= BUFFER_MAX;

/** @returns {number} */
export function readBuffer() {
  const n = readJson(settingsFile(), {}).bufor;
  return validBuffer(n) ? n : DEFAULT_BUFFER;
}

/** @throws przy wartości spoza 1–BUFFER_MAX */
export function writeBuffer(n) {
  if (!validBuffer(n)) throw new Error(`bufor musi być liczbą całkowitą 1–${BUFFER_MAX}`);
  writeJson(settingsFile(), { ...readJson(settingsFile(), {}), bufor: n });
  return n;
}

// --- ile projektów naraz ----------------------------------------------------

// Ile RÓŻNYCH projektów generuje się równolegle. W obrębie projektu i tak leci jedna lekcja
// naraz. Każdy równoległy projekt to osobny proces Claude Code na opusie — stąd niski sufit.
export const DEFAULT_NARAZ = 1;
export const NARAZ_MAX = 4;

const validNaraz = (n) => Number.isInteger(n) && n >= 1 && n <= NARAZ_MAX;

/** @returns {number} */
export function readNaraz() {
  const n = readJson(settingsFile(), {}).naraz;
  return validNaraz(n) ? n : DEFAULT_NARAZ;
}

/** @throws przy wartości spoza 1–NARAZ_MAX */
export function writeNaraz(n) {
  if (!validNaraz(n)) throw new Error(`naraz musi być liczbą całkowitą 1–${NARAZ_MAX}`);
  writeJson(settingsFile(), { ...readJson(settingsFile(), {}), naraz: n });
  return n;
}
