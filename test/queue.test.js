import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-'));
const store = await import('../server/store.js');
const queue = await import('../server/queue.js');

// Zaślepka generatora: zapisuje kolejność wywołań i pilnuje, że nigdy nie chodzą dwa naraz.
const spy = (body) => {
  const calls = [];
  let live = 0;
  queue.useGenerator(async (project, lesson, index) => {
    live += 1;
    assert.equal(live, 1, 'dwie lekcje generowane jednocześnie');
    calls.push(lesson.id);
    try {
      return (await body?.(project, lesson, index)) ?? { summary: `o ${lesson.title}`, covers: ['x'] };
    } finally {
      live -= 1;
    }
  });
  return calls;
};

/** Projekt z lekcjami o kolejnych order (1, 2, 3…), żadna jeszcze nie w kolejce. */
const course = (titles) => {
  const project = store.createProject({ topic: 'Teoria muzyki', language: 'pl' });
  const lessons = titles.map((title, i) =>
    store.addLesson(project.id, { afterOrder: i, title }),
  );
  return { project, lessons };
};

const drain = () => queue.startWorker();

test('lekcje idą po kolei, po jednej naraz', async () => {
  const calls = spy();
  const { project, lessons } = course(['A', 'B', 'C']);
  for (const l of lessons) queue.enqueue(project.id, l.id);
  await drain();

  assert.deepEqual(calls, ['l1', 'l2', 'l3']);
  assert.deepEqual(
    store.readIndex(project.id).map((l) => l.status),
    ['gotowa', 'gotowa', 'gotowa'],
  );
  assert.deepEqual(store.readProject(project.id).queue, []);
  assert.equal(store.readProject(project.id).status, 'gotowy');
});

test('summary i covers z modelu lądują w indeksie', async () => {
  spy(async () => ({ summary: 'o falach', covers: ['częstotliwość', 'amplituda'] }));
  const { project, lessons } = course(['A']);
  queue.enqueue(project.id, lessons[0].id);
  await drain();

  const [lesson] = store.readIndex(project.id);
  assert.equal(lesson.summary, 'o falach');
  assert.deepEqual(lesson.covers, ['częstotliwość', 'amplituda']);
});

test('wstawka 1.1 wchodzi przed 2, ale nie przerywa generowanej 1', async () => {
  let inserted = null;
  const calls = spy(async (project, lesson) => {
    // Dokładanie lekcji w trakcie generowania pierwszej — dokładnie przypadek z fazy 10.
    if (lesson.id === 'l1') {
      inserted = store.addLesson(project.id, { afterOrder: 1, title: 'A i pół' });
      queue.enqueue(project.id, inserted.id);
    }
    return { summary: 's', covers: ['c'] };
  });

  const { project, lessons } = course(['A', 'B', 'C']);
  for (const l of lessons) queue.enqueue(project.id, l.id);
  await drain();

  assert.equal(inserted.order, 1.1);
  assert.deepEqual(calls, ['l1', inserted.id, 'l2', 'l3']); // l1 dokończone, wstawka przed l2
});

test('porażka daje status błąd i nie zatrzymuje kolejki', async () => {
  const calls = spy(async (_project, lesson) => {
    if (lesson.id === 'l1') throw new Error('model odmówił');
    return { summary: 's', covers: ['c'] };
  });

  const { project, lessons } = course(['A', 'B']);
  for (const l of lessons) queue.enqueue(project.id, l.id);
  await drain();

  const [first, second] = store.readIndex(project.id);
  assert.deepEqual(calls, ['l1', 'l2']);
  assert.equal(first.status, 'błąd');
  assert.match(first.error, /model odmówił/);
  assert.equal(second.status, 'gotowa');
});

test('ponowienie wraca do kolejki i generuje od nowa', async () => {
  let fail = true;
  const calls = spy(async () => {
    if (fail) throw new Error('pierwsza próba pada');
    return { summary: 's', covers: ['c'] };
  });

  const { project, lessons } = course(['A']);
  queue.enqueue(project.id, lessons[0].id);
  await drain();
  assert.equal(store.readIndex(project.id)[0].status, 'błąd');

  fail = false;
  store.updateLesson(project.id, lessons[0].id, { status: 'zaplanowana', error: null });
  queue.enqueue(project.id, lessons[0].id);
  await drain();

  assert.deepEqual(calls, ['l1', 'l1']);
  assert.equal(store.readIndex(project.id)[0].status, 'gotowa');
});

test('recoverOnBoot przestawia generowaną na zaplanowaną i dokańcza kolejkę', async () => {
  const calls = spy();
  const { project, lessons } = course(['A']);
  // Stan po padzie procesu w połowie generowania: kolejka na dysku, lekcja „generowana”.
  const stored = store.readProject(project.id);
  stored.queue = [lessons[0].id];
  store.writeProject(stored);
  store.updateLesson(project.id, lessons[0].id, { status: 'generowana' });

  assert.equal(queue.recoverOnBoot(), 1);
  await drain();

  assert.deepEqual(calls, ['l1']);
  assert.equal(store.readIndex(project.id)[0].status, 'gotowa');
});

test('bez enqueue worker nic nie robi', async () => {
  const calls = spy();
  course(['A', 'B']); // lekcje istnieją, ale nikt ich nie zlecił
  await drain();
  assert.deepEqual(calls, []);
});

test('queueState pokazuje bieżącą i czekające', async () => {
  let seen = null;
  spy(async (project, lesson) => {
    if (lesson.id === 'l1') seen = queue.queueState(project.id);
    return { summary: 's', covers: ['c'] };
  });

  const { project, lessons } = course(['A', 'B', 'C']);
  for (const l of lessons) queue.enqueue(project.id, l.id);
  await drain();

  assert.deepEqual(seen, { running: 'l1', waiting: ['l2', 'l3'] });
  assert.deepEqual(queue.queueState(project.id), { running: null, waiting: [] });
});

// --- bufor generowania ------------------------------------------------------

test('topUp bierze tylko tyle lekcji, ile mówi bufor', async () => {
  store.writeBuffer(2);
  const calls = spy();
  const { project, lessons } = course(['A', 'B', 'C', 'D', 'E']);

  assert.equal(queue.topUp(project.id), 2);
  await drain();

  assert.deepEqual(calls, ['l1', 'l2']);
  const po = store.readIndex(project.id);
  assert.deepEqual(
    po.map((l) => l.status),
    ['gotowa', 'gotowa', 'zaplanowana', 'zaplanowana', 'zaplanowana'],
  );
  assert.deepEqual(store.readProject(project.id).queue, []);
  assert.equal(lessons.length, 5);
});

test('ukończona lekcja zwalnia miejsce w buforze', async () => {
  store.writeBuffer(2);
  const calls = spy();
  const { project } = course(['A', 'B', 'C', 'D']);
  queue.topUp(project.id);
  await drain();

  store.updateLesson(project.id, 'l1', { status: 'ukończona', score: 80 });
  assert.equal(queue.topUp(project.id), 1);
  await drain();

  assert.deepEqual(calls, ['l1', 'l2', 'l3']);
});

test('topUp przy pełnym zapasie nie dokłada nic', async () => {
  store.writeBuffer(2);
  const calls = spy();
  const { project } = course(['A', 'B', 'C']);
  queue.topUp(project.id);
  await drain();

  assert.equal(queue.topUp(project.id), 0);
  await drain();
  assert.deepEqual(calls, ['l1', 'l2'], 'zapas był pełny, a mimo to poszło generowanie');
});

test('lekcja z błędem nie liczy się do zapasu i nie wraca sama', async () => {
  store.writeBuffer(1);
  const calls = spy(async (project, lesson) => {
    if (lesson.id === 'l1') throw new Error('model padł');
    return { summary: 's', covers: ['c'] };
  });
  const { project } = course(['A', 'B', 'C']);
  queue.topUp(project.id);
  await drain();

  assert.equal(store.readIndex(project.id)[0].status, 'błąd');
  // Zapas pusty (błąd się nie liczy), więc topUp bierze NASTĘPNĄ, a nie tę z błędem.
  assert.equal(queue.topUp(project.id), 1);
  await drain();
  assert.deepEqual(calls, ['l1', 'l2']);
  assert.equal(store.readIndex(project.id)[0].status, 'błąd');
});

test('enqueueNext dokłada mimo pełnego bufora i zwraca null, gdy nie ma czego', async () => {
  store.writeBuffer(1);
  const calls = spy();
  const { project } = course(['A', 'B']);
  queue.topUp(project.id);
  await drain();

  assert.equal(queue.enqueueNext(project.id)?.id, 'l2');
  await drain();
  assert.deepEqual(calls, ['l1', 'l2']);
  assert.equal(queue.enqueueNext(project.id), null);
});

test('gotowy dopiero, gdy nie ma już lekcji do wygenerowania', async () => {
  store.writeBuffer(2);
  spy();
  const { project } = course(['A', 'B', 'C']);
  queue.topUp(project.id);
  await drain();

  assert.notEqual(store.readProject(project.id).status, 'gotowy', 'kurs z niewygenerowaną lekcją');

  queue.enqueueNext(project.id);
  await drain();
  assert.equal(store.readProject(project.id).status, 'gotowy');
});
