import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import express from 'express';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-events-'));
const store = await import('../server/store.js');
const { api } = await import('../server/api.js');
const queue = await import('../server/queue.js');

const app = express();
app.use(express.json());
app.use('/api', api);
const server = app.listen(0);
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/api`;

// Otwarte strumienie SSE nigdy nie kończą się same — bez zerwania gniazd close() wisi.
test.after(() => {
  server.closeAllConnections();
  server.close();
});

/** Czeka na warunek, zamiast zgadywać liczbę ticków. Rzuca, żeby regresja była czerwona, nie wisząca. */
const czekajNa = async (warunek, ms = 2000) => {
  for (let i = 0; i < ms / 10; i += 1) {
    if (warunek()) return;
    await sleep(10);
  }
  throw new Error('ramka SSE nie dotarła w czasie');
};

/** Otwiera strumień SSE i zbiera surowe ramki, dopóki nie zamkniemy go przez `stop()`. */
const stream = async (url) => {
  const ac = new AbortController();
  const res = await fetch(base + url, { signal: ac.signal });
  assert.equal(res.status, 200);
  const ramki = [];
  const czytaj = (async () => {
    const dekoder = new TextDecoder();
    for await (const chunk of res.body) ramki.push(dekoder.decode(chunk));
  })().catch(() => {}); // przerwanie to nasz sposób na zamknięcie, nie błąd
  return { ramki, stop: () => (ac.abort(), czytaj) };
};

test('strumień pulpitu dostaje kamienie milowe z projectId, ale nie postęp lekcji', async () => {
  const project = store.createProject({ topic: 'Teoria muzyki', language: 'pl' });
  const pulpit = await stream('/events');
  const projektowy = await stream(`/projects/${project.id}/events`);

  queue.events.emit('event', {
    projectId: project.id,
    type: 'lesson-ready',
    data: { lessonId: 'l1' },
  });
  queue.events.emit('event', {
    projectId: project.id,
    type: 'lesson-progress',
    data: { lessonId: 'l1', turn: 3 },
  });
  // Ramki idą przez gniazdo — czekamy na treść, a nie na jeden tick pętli zdarzeń.
  await czekajNa(() => pulpit.ramki.join('').includes('lesson-ready'));
  await czekajNa(() => projektowy.ramki.join('').includes('lesson-progress'));

  const zPulpitu = pulpit.ramki.join('');
  assert.match(zPulpitu, /event: lesson-ready/);
  assert.match(zPulpitu, new RegExp(`"projectId":"${project.id}"`), 'pulpit musi wiedzieć, czyj to projekt');
  assert.doesNotMatch(zPulpitu, /lesson-progress/, 'postęp lekcji ma zostać na strumieniu projektu');

  const zProjektu = projektowy.ramki.join('');
  assert.match(zProjektu, /event: lesson-progress/);
  assert.match(zProjektu, /"turn":3/);

  await Promise.all([pulpit.stop(), projektowy.stop()]);
});

test('PUT /settings zapisuje naraz obok bufora i oddaje komplet', async () => {
  const res = await fetch(`${base}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ bufor: 4, naraz: 3 }),
  });
  const body = await res.json();
  assert.equal(body.bufor, 4);
  assert.equal(body.naraz, 3);
  assert.equal(store.readNaraz(), 3);

  const zly = await fetch(`${base}/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ naraz: store.NARAZ_MAX + 1 }),
  });
  assert.equal(zly.status, 400);
  assert.equal(store.readNaraz(), 3, 'odrzucony zapis nie miał prawa nic zmienić');
});
