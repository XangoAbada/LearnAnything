import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-'));
const store = await import('../server/store.js');
const { projectsDir } = await import('../server/config.js');

const newProject = () => store.createProject({ topic: 'Teoria muzyki', language: 'pl' });

test('createProject tworzy katalog i project.json z językiem', () => {
  const p = newProject();
  assert.equal(p.language, 'pl');
  assert.ok(fs.existsSync(path.join(projectsDir, p.id, 'project.json')));
  assert.deepEqual(store.readProject(p.id), p);
});

test('createProject odrzuca język spoza pl/en oraz pusty temat', () => {
  assert.throws(() => store.createProject({ topic: 'X', language: 'de' }));
  assert.throws(() => store.createProject({ topic: '  ', language: 'pl' }));
});

test('zapis projektu nie gubi pól', () => {
  const p = newProject();
  p.status = 'generowanie';
  p.queue = ['l3', 'l4'];
  store.writeProject(p);
  const read = store.readProject(p.id);
  assert.deepEqual(read, p);
  assert.deepEqual(read.interview, { skipped: false, questions: [], answers: [] });
});

test('readIndex na nieistniejącym pliku zwraca pustą tablicę', () => {
  assert.deepEqual(store.readIndex(newProject().id), []);
  assert.deepEqual(store.readIndex('nie-ma-takiego'), []);
});

test('writeIndex zapisuje posortowane po order', () => {
  const p = newProject();
  store.writeIndex(p.id, [
    { id: 'l2', order: 4.1 },
    { id: 'l1', order: 2 },
    { id: 'l3', order: 4 },
  ]);
  assert.deepEqual(store.readIndex(p.id).map((l) => l.order), [2, 4, 4.1]);
});

test('updateLesson scala patch i nie kasuje pozostałych pól', () => {
  const p = newProject();
  const lesson = store.addLesson(p.id, { afterOrder: 0, title: 'Czym jest dźwięk' });
  const updated = store.updateLesson(p.id, lesson.id, { status: 'ukończona', score: 80 });
  assert.equal(updated.status, 'ukończona');
  assert.equal(updated.score, 80);
  assert.equal(updated.title, 'Czym jest dźwięk');
  assert.deepEqual(updated.practiceNotes, []);
  assert.deepEqual(store.readIndex(p.id)[0], updated);
});

test('addLesson nadaje order, path i pełny kształt wpisu', () => {
  const p = newProject();
  const first = store.addLesson(p.id, { afterOrder: 0, title: 'Czym jest dźwięk' });
  assert.equal(first.order, 1);
  assert.equal(first.path, 'lessons/01-czym-jest-dzwiek');
  assert.equal(first.status, 'zaplanowana');
  assert.equal(first.origin, 'plan');
  assert.equal(first.score, null);

  const second = store.addLesson(p.id, { afterOrder: 1, title: 'Skala', origin: 'pośrednia' });
  assert.equal(second.order, 2);
  assert.notEqual(second.id, first.id);
});

test('addLesson rzuca rozpoznawalnym błędem przy naruszeniu historii', () => {
  const p = newProject();
  const l1 = store.addLesson(p.id, { afterOrder: 0, title: 'Jeden' });
  store.addLesson(p.id, { afterOrder: 1, title: 'Dwa' });
  store.updateLesson(p.id, l1.id, { status: 'ukończona' });
  assert.throws(() => store.addLesson(p.id, { afterOrder: 0, title: 'Wciśnięta' }), {
    code: 'HISTORIA_NIEZMIENNA',
  });
});

test('slugify zamienia ogonki i koduje ułamkowy order', () => {
  assert.equal(store.slugify('Czym jest dźwięk', 4), '04-czym-jest-dzwiek');
  assert.equal(store.slugify('Łąka i żółw', 4.1), '04-1-laka-i-zolw');
  assert.equal(store.slugify('Skala', 4.15), '04-15-skala');
});

test('createLessonDir tworzy katalog lekcji pod path', () => {
  const p = newProject();
  const lesson = store.addLesson(p.id, { afterOrder: 0, title: 'Czym jest dźwięk' });
  const dir = store.createLessonDir(p.id, lesson);
  assert.ok(fs.existsSync(dir));
  assert.equal(dir, path.join(projectsDir, p.id, 'lessons', '01-czym-jest-dzwiek'));
});

test('listProjects zwraca postęp policzony z indeksu', () => {
  const p = newProject();
  const l1 = store.addLesson(p.id, { afterOrder: 0, title: 'Jeden' });
  store.addLesson(p.id, { afterOrder: 1, title: 'Dwa' });
  store.updateLesson(p.id, l1.id, { status: 'ukończona' });
  const entry = store.listProjects().find((x) => x.id === p.id);
  assert.deepEqual(entry.progress, { done: 1, total: 2 });
  assert.equal(entry.topic, 'Teoria muzyki');
  assert.equal(entry.language, 'pl');
});

test('deleteProject usuwa katalog razem z lekcjami', () => {
  const p = newProject();
  store.createLessonDir(p.id, store.addLesson(p.id, { afterOrder: 0, title: 'Jeden' }));
  store.deleteProject(p.id);
  assert.equal(store.readProject(p.id), null);
  assert.equal(fs.existsSync(path.join(projectsDir, p.id)), false);
});

test.after(() => fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }));
