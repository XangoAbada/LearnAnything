import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-'));
const store = await import('../server/store.js');
const queue = await import('../server/queue.js');

// Zaślepka generatora: zapisuje kolejność wywołań, pilnuje jednej lekcji NA PROJEKT
// i zapamiętuje szczyt równoległości w `calls.max`.
const spy = (body) => {
  const calls = [];
  const live = new Map(); // projectId -> ile lekcji tego projektu chodzi
  // Nieprzeliczalna, żeby deepEqual na `calls` porównywało samą listę wywołań.
  Object.defineProperty(calls, 'max', { value: 0, writable: true });
  queue.useGenerator(async (project, lesson, index) => {
    live.set(project.id, (live.get(project.id) ?? 0) + 1);
    assert.equal(live.get(project.id), 1, 'dwie lekcje jednego projektu naraz');
    calls.max = Math.max(calls.max, [...live.values()].reduce((a, b) => a + b, 0));
    calls.push(lesson.id);
    try {
      return (await body?.(project, lesson, index)) ?? { summary: `o ${lesson.title}`, covers: ['x'] };
    } finally {
      live.set(project.id, live.get(project.id) - 1);
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

// Bez tego każdy test porażki czekałby prawdziwe 5 i 20 sekund między próbami.
queue.useBackoff([0, 0]);

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
  assert.equal(queue.projectStatus(project.id), 'gotowy');
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

test('porażka ponawia tę samą lekcję i lekcja dochodzi do skutku', async () => {
  let padnij = true;
  const calls = spy(async () => {
    if (padnij) {
      padnij = false;
      throw new Error('pierwsza próba pada');
    }
    return { summary: 's', covers: ['c'] };
  });

  const { project, lessons } = course(['A', 'B']);
  for (const l of lessons) queue.enqueue(project.id, l.id);
  await drain();

  const [first, second] = store.readIndex(project.id);
  assert.deepEqual(calls, ['l1', 'l1', 'l2'], 'l2 nie ma prawa wejść przed dokończeniem l1');
  assert.equal(first.status, 'gotowa');
  assert.equal(first.attempts, 0, 'sukces kasuje licznik prób');
  assert.equal(second.status, 'gotowa');
});

test('po wyczerpaniu prób lekcja zostaje z błędem i zatrzymuje kurs', async () => {
  const calls = spy(async (_project, lesson) => {
    if (lesson.id === 'l1') throw new Error('model odmówił');
    return { summary: 's', covers: ['c'] };
  });

  const { project, lessons } = course(['A', 'B']);
  for (const l of lessons) queue.enqueue(project.id, l.id);
  await drain();

  const [first, second] = store.readIndex(project.id);
  assert.deepEqual(calls, ['l1', 'l1', 'l1'], `dokładnie ${queue.PROBY} podejścia`);
  assert.equal(first.status, 'błąd');
  assert.equal(first.attempts, queue.PROBY);
  assert.match(first.error, /model odmówił/);
  assert.equal(second.status, 'zaplanowana', 'lekcja po błędnej nie może powstać bez jej podsumowania');
  assert.equal(queue.projectStatus(project.id), 'błąd');
});

test('ręczne ponowienie odblokowuje kurs', async () => {
  let fail = true;
  const calls = spy(async () => {
    if (fail) throw new Error('próba pada');
    return { summary: 's', covers: ['c'] };
  });

  const { project, lessons } = course(['A', 'B']);
  for (const l of lessons) queue.enqueue(project.id, l.id);
  await drain();
  assert.equal(store.readIndex(project.id)[0].status, 'błąd');

  fail = false;
  store.updateLesson(project.id, lessons[0].id, { status: 'zaplanowana', error: null, attempts: 0 });
  queue.enqueue(project.id, lessons[0].id);
  await drain();

  assert.deepEqual(calls, ['l1', 'l1', 'l1', 'l1', 'l2'], 'po odblokowaniu wchodzi też l2');
  assert.deepEqual(
    store.readIndex(project.id).map((l) => l.status),
    ['gotowa', 'gotowa'],
  );
  assert.equal(queue.projectStatus(project.id), 'gotowy');
});

test('recoverOnBoot przestawia generowaną na zaplanowaną i dokańcza kolejkę', async () => {
  const calls = spy();
  const { project, lessons } = course(['A']);
  // Stan po padzie procesu w połowie generowania: kolejka na dysku, lekcja „generowana”.
  const stored = store.readProject(project.id);
  stored.queue = [lessons[0].id];
  store.writeProject(stored);
  store.updateLesson(project.id, lessons[0].id, { status: 'generowana' });

  // >= 1, bo katalog danych dzielą wszystkie testy w pliku — inne projekty też mogą mieć zaległości.
  assert.ok(queue.recoverOnBoot() >= 1);
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
  // Zapas pusty (błąd się nie liczy), więc topUp bierze NASTĘPNĄ, a nie tę z błędem…
  assert.equal(queue.topUp(project.id), 1);
  await drain();
  // …ale wygenerować jej nie wolno, dopóki l1 leży: kolejka projektu stoi na błędzie.
  assert.deepEqual(calls, ['l1', 'l1', 'l1']);
  assert.equal(store.readIndex(project.id)[0].status, 'błąd');
  assert.equal(store.readIndex(project.id)[1].status, 'zaplanowana');
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

// --- równoległość projektów -------------------------------------------------

// Zaślepka z przerwą daje drugiej pętli okno na wejście. Żadnych bramek „czekaj, aż wejdzie
// druga” — regresja dałaby wtedy wiszący test zamiast czerwonego.
const wolno = () => sleep(20);

test('dwa projekty jadą równolegle przy naraz = 2', async (t) => {
  store.writeNaraz(2);
  t.after(() => store.writeNaraz(1));

  const calls = spy(wolno);
  const a = course(['A']);
  const b = course(['B']);
  queue.enqueue(a.project.id, a.lessons[0].id);
  queue.enqueue(b.project.id, b.lessons[0].id);
  await drain();

  assert.equal(calls.max, 2, 'druga pętla nie ruszyła');
  assert.equal(store.readIndex(a.project.id)[0].status, 'gotowa');
  assert.equal(store.readIndex(b.project.id)[0].status, 'gotowa');
});

test('w jednym projekcie nadal jedna lekcja naraz', async (t) => {
  store.writeNaraz(4);
  t.after(() => store.writeNaraz(1));

  const calls = spy(wolno);
  const { project, lessons } = course(['A', 'B', 'C']);
  for (const l of lessons) queue.enqueue(project.id, l.id);
  await drain();

  assert.deepEqual(calls, ['l1', 'l2', 'l3']); // kolejny prompt potrzebuje summary poprzedniej
  assert.equal(calls.max, 1);
});

test('naraz z ustawień jest sufitem równoległości', async (t) => {
  store.writeNaraz(2);
  t.after(() => store.writeNaraz(1));

  const calls = spy(wolno);
  for (const titles of [['A'], ['B'], ['C']]) {
    const { project, lessons } = course(titles);
    queue.enqueue(project.id, lessons[0].id);
  }
  await drain();

  assert.equal(calls.length, 3);
  assert.equal(calls.max, 2, 'trzeci projekt wjechał ponad limit');
});

// --- status wyliczany -------------------------------------------------------

test('projectStatus liczy się z lekcji i kolejki, nie z pliku projektu', async () => {
  spy();
  const pusty = store.createProject({ topic: 'Bez lekcji', language: 'pl' });
  assert.equal(queue.projectStatus(pusty.id), 'nowy', 'brak lekcji → status zapisany');

  const { project, lessons } = course(['A', 'B']);
  assert.equal(queue.projectStatus(project.id), 'w toku');

  queue.enqueue(project.id, lessons[0].id); // kolejka na dysku już niepusta
  assert.equal(queue.projectStatus(project.id), 'generowanie');
  await drain();
  assert.equal(queue.projectStatus(project.id), 'w toku', 'l2 wciąż zaplanowana');

  queue.enqueue(project.id, lessons[1].id);
  await drain();
  assert.equal(queue.projectStatus(project.id), 'gotowy');
  assert.equal(queue.projectStatus('nie-ma-takiego'), null);
});

test('gotowy dopiero, gdy nie ma już lekcji do wygenerowania', async () => {
  store.writeBuffer(2);
  spy();
  const { project } = course(['A', 'B', 'C']);
  queue.topUp(project.id);
  await drain();

  assert.equal(queue.projectStatus(project.id), 'w toku', 'kurs z niewygenerowaną lekcją');

  queue.enqueueNext(project.id);
  await drain();
  assert.equal(queue.projectStatus(project.id), 'gotowy');
});
