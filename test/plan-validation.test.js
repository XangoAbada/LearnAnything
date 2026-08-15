import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-'));
const store = await import('../server/store.js');
const { validatePlan, planCourse, assessInterview, interviewQuestions } = await import(
  '../server/generator.js'
);
const { api } = await import('../server/api.js');

// Zaślepka modelu w miejscu runClaudeJson: kolejne odpowiedzi z listy, z liczeniem wywołań.
const stub = (...responses) => {
  const calls = [];
  const run = async ({ prompt }, validate) => {
    calls.push(prompt);
    const data = responses[calls.length - 1] ?? responses[responses.length - 1];
    validate?.(data);
    return data;
  };
  run.calls = calls;
  return run;
};

const plan = (n) => ({ lessons: Array.from({ length: n }, (_, i) => ({ title: `L${i + 1}`, brief: 'b' })) });

const projectWith = (scope) => ({
  ...store.createProject({ topic: 'Teoria muzyki', language: 'pl' }),
  course: { level: 'początkujący', pace: 'normalne', scope },
});

// --- widełki ----------------------------------------------------------------

test('widełki zakresu podstawy: 5 i 8 przechodzą, 4 i 9 nie', () => {
  assert.equal(validatePlan(plan(5).lessons, 'podstawy'), true);
  assert.equal(validatePlan(plan(8).lessons, 'podstawy'), true);
  assert.throws(() => validatePlan(plan(4).lessons, 'podstawy'), /5–8/);
  assert.throws(() => validatePlan(plan(9).lessons, 'podstawy'), /5–8/);
});

test('plan poza widełkami ponawiany dokładnie raz i to wystarcza', async () => {
  const run = stub(plan(4), plan(6));
  const { lessons } = await planCourse(projectWith('podstawy'), '', run);
  assert.equal(lessons.length, 6);
  assert.equal(run.calls.length, 2);
  assert.match(run.calls[1], /Poprzedni plan miał 4 lekcji\. Wymagane: 5–8/);
  assert.deepEqual(lessons.map((l) => l.order), [1, 2, 3, 4, 5, 6]);
});

test('drugie niepowodzenie to błąd, nie przycięcie listy', async () => {
  const run = stub(plan(12), plan(11));
  await assert.rejects(() => planCourse(projectWith('podstawy'), '', run), /11 lekcji/);
  assert.equal(run.calls.length, 2);
});

test('komentarz użytkownika trafia do promptu planu', async () => {
  const run = stub(plan(6));
  await planCourse(projectWith('podstawy'), 'więcej praktyki', run);
  assert.match(run.calls[0], /więcej praktyki/);
});

// --- wywiad -----------------------------------------------------------------

test('wartość spoza enumu spada na domyślną, bez wyjątku', async () => {
  const run = stub({ level: 'ekspert', pace: 'normalne', scope: 'szeroki', summary: 'wie sporo' });
  const project = projectWith('standardowy');
  const out = await assessInterview(project, [{ id: 'q1', answer: 'tak' }], run);
  assert.deepEqual(out, {
    level: 'początkujący',
    pace: 'normalne',
    scope: 'szeroki',
    summary: 'wie sporo',
  });
});

test('id pytań nadaje serwer, kind bez options spada na otwarte', async () => {
  const run = stub({
    questions: [
      { text: 'Po co ci to?', kind: 'otwarte' },
      { text: 'Co to interwał?', kind: 'wybór', options: ['a', 'b'] },
      { text: 'Bez wariantów', kind: 'wybór' },
    ],
  });
  const { questions } = await interviewQuestions(projectWith('standardowy'), run);
  assert.deepEqual(questions.map((q) => q.id), ['q1', 'q2', 'q3']);
  assert.deepEqual(questions[1].options, ['a', 'b']);
  assert.equal(questions[2].kind, 'otwarte');
});

// --- API: pominięcie wywiadu i akceptacja planu -----------------------------

const app = express();
app.use(express.json());
app.use('/api', api);
const server = app.listen(0);
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/api`;

const call = async (method, url, body) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
};

const newProject = async () => (await call('POST', '/projects', { topic: 'Teoria muzyki', language: 'pl' })).body;

test('skip ustawia domyślne parametry i skipped, bez wołania modelu', async () => {
  const p = await newProject();
  const { status, body } = await call('POST', `/projects/${p.id}/interview/skip`);
  assert.equal(status, 200);
  assert.deepEqual(body, {
    level: 'początkujący',
    pace: 'normalne',
    scope: 'standardowy',
    summary: '',
  });
  const saved = store.readProject(p.id);
  assert.equal(saved.interview.skipped, true);
  assert.equal(saved.status, 'plan');
});

test('skip działa też w połowie wywiadu i nie kasuje zebranych odpowiedzi', async () => {
  const p = await newProject();
  const started = store.readProject(p.id);
  started.status = 'wywiad';
  started.interview.questions = [{ id: 'q1', text: 'Po co ci to?', kind: 'otwarte' }];
  started.interview.answers = [{ id: 'q1', answer: 'do pracy' }];
  store.writeProject(started);

  assert.equal((await call('POST', `/projects/${p.id}/interview/skip`)).status, 200);
  const saved = store.readProject(p.id);
  assert.equal(saved.status, 'plan');
  assert.equal(saved.interview.skipped, true);
  assert.deepEqual(saved.interview.answers, [{ id: 'q1', answer: 'do pracy' }]);
  assert.deepEqual(saved.course, { level: 'początkujący', pace: 'normalne', scope: 'standardowy' });
});

test('akceptacja nadaje order 1..n, status zaplanowana i kolejkę w kolejności', async () => {
  const p = await newProject();
  await call('POST', `/projects/${p.id}/interview/skip`);
  const lessons = plan(10).lessons;
  const { status, body } = await call('POST', `/projects/${p.id}/plan/accept`, { lessons });

  assert.equal(status, 200);
  assert.deepEqual(body.lessons.map((l) => l.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(body.lessons.every((l) => l.status === 'zaplanowana' && l.origin === 'plan'));
  assert.deepEqual(body.lessons.map((l) => l.title), lessons.map((l) => l.title));
  assert.equal(body.project.status, 'generowanie');
  assert.deepEqual(body.project.queue, body.lessons.map((l) => l.id));
  assert.deepEqual(store.readIndex(p.id), body.lessons);
});

test('druga akceptacja daje 409 i nie rusza indeksu', async () => {
  const p = await newProject();
  await call('POST', `/projects/${p.id}/interview/skip`);
  await call('POST', `/projects/${p.id}/plan/accept`, { lessons: plan(10).lessons });
  const before = store.readIndex(p.id);
  const { status } = await call('POST', `/projects/${p.id}/plan/accept`, { lessons: plan(12).lessons });
  assert.equal(status, 409);
  assert.deepEqual(store.readIndex(p.id), before);
});

test('akceptacja poza widełkami to 502, brak projektu to 404, zły kształt to 400', async () => {
  const p = await newProject();
  await call('POST', `/projects/${p.id}/interview/skip`);
  assert.equal((await call('POST', `/projects/${p.id}/plan/accept`, { lessons: plan(3).lessons })).status, 502);
  assert.equal((await call('POST', `/projects/${p.id}/plan/accept`, {})).status, 400);
  assert.equal((await call('GET', '/projects/nie-ma-takiego')).status, 404);
  assert.equal((await call('POST', '/projects', { topic: 'X', language: 'de' })).status, 400);
});

test.after(() => {
  server.close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});
