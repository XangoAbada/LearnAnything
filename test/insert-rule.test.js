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
const { api } = await import('../server/api.js');
const queue = await import('../server/queue.js');

// Zaślepka bez końca: lekcja wchodzi w „generowana" i tam zostaje. Testujemy regułę
// wstawienia i kolejkowanie, nie generowanie.
queue.useGenerator(() => new Promise(() => {}));

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

const plan = (n) => Array.from({ length: n }, (_, i) => ({ title: `L${i + 1}`, brief: 'b' }));

/** Kurs z 10 lekcji z planu; `ukonczone` dostaje status „ukończona". */
const kurs = async (...ukonczone) => {
  const p = (await call('POST', '/projects', { topic: 'Programowanie', language: 'pl' })).body;
  await call('POST', `/projects/${p.id}/interview/skip`);
  await call('POST', `/projects/${p.id}/plan/accept`, { lessons: plan(10) });
  for (const order of ukonczone) {
    const l = store.readIndex(p.id).find((x) => x.order === order);
    store.updateLesson(p.id, l.id, { status: 'ukończona', score: 80 });
  }
  return p;
};

const dodaj = (p, afterOrder, mode = 'pośrednia', brief = 'czego brakuje') =>
  call('POST', `/projects/${p.id}/lessons`, { afterOrder, brief, mode });

test('wstawienie przed ostatnią ukończoną to 400 i nic w indeksie', async () => {
  const p = await kurs(4);
  const przed = store.readIndex(p.id);
  const { status, body } = await dodaj(p, 3);
  assert.equal(status, 400);
  assert.match(body.error, /ukończoną/);
  assert.deepEqual(store.readIndex(p.id), przed);
});

test('dokładnie za ostatnią ukończoną przechodzi i dostaje 4.1', async () => {
  const p = await kurs(4);
  const { status, body } = await dodaj(p, 4);
  assert.equal(status, 201);
  assert.equal(body.order, 4.1);
  assert.equal(body.status, 'zaplanowana');
  assert.equal(body.origin, 'pośrednia');
});

test('wstawienie na końcu kursu przechodzi', async () => {
  const p = await kurs(4);
  const { status, body } = await dodaj(p, 10, 'nowy wątek');
  assert.equal(status, 201);
  assert.equal(body.order, 11);
  assert.equal(body.origin, 'nowy wątek');
});

test('kolejne wstawki: 4.1, 4.2, a między nie wartość pośrednia', async () => {
  const p = await kurs(4);
  assert.equal((await dodaj(p, 4)).body.order, 4.1);
  assert.equal((await dodaj(p, 4)).body.order, 4.2);
  const miedzy = (await dodaj(p, 4.1)).body.order;
  assert.ok(miedzy > 4.1 && miedzy < 4.2, `${miedzy} nie mieści się między 4.1 a 4.2`);
});

test('żadna istniejąca lekcja nie zmienia order ani path', async () => {
  const p = await kurs(4);
  const przed = store.readIndex(p.id).map((l) => [l.id, l.order, l.path]);
  await dodaj(p, 4);
  await dodaj(p, 6, 'rozwinięcie');
  const po = new Map(store.readIndex(p.id).map((l) => [l.id, [l.order, l.path]]));
  for (const [id, order, sciezka] of przed) assert.deepEqual(po.get(id), [order, sciezka], id);
});

test('nowa lekcja ląduje w kolejce z własnym origin, przed dalszymi lekcjami z planu', async () => {
  const p = await kurs(4);
  const { body } = await dodaj(p, 4, 'powtórka', 'rekurencja');
  const projekt = store.readProject(p.id);
  assert.ok(projekt.queue.includes(body.id), 'wstawka nie trafiła do kolejki');
  assert.equal(projekt.status, 'generowanie');
  assert.equal(store.readIndex(p.id).find((l) => l.id === body.id).origin, 'powtórka');

});

test('wstawka wchodzi do generowania przed dalszymi lekcjami z planu', async () => {
  const p = await kurs(4);
  // Dalsza część planu już czeka w kolejce — wstawka ma je wyprzedzić.
  for (let i = 0; i < 4; i += 1) await call('POST', `/projects/${p.id}/lessons/next`);
  await dodaj(p, 4);

  const kolejka = store.readProject(p.id).queue;
  // Indeks jest sortowany po `order`, a kolejka bierze pierwszą swoją lekcję z indeksu.
  const kolejnosc = store.readIndex(p.id).filter((l) => kolejka.includes(l.id)).map((l) => l.order);
  assert.ok(
    kolejnosc.indexOf(4.1) < kolejnosc.indexOf(5),
    `4.1 nie wyprzedziło planu: ${kolejnosc.join(', ')}`,
  );
});

test('zły tryb, brak opisu i ujemny afterOrder to 400', async () => {
  const p = await kurs();
  assert.equal((await dodaj(p, 4, 'plan')).status, 400);
  assert.equal((await dodaj(p, 4, 'pośrednia', '  ')).status, 400);
  assert.equal((await dodaj(p, -1)).status, 400);
  assert.equal((await call('POST', '/projects/nie-ma/lessons', { afterOrder: 1, brief: 'x', mode: 'pośrednia' })).status, 404);
});

test('propozycje i minInsertOrder wracają z odczytu projektu', async () => {
  const p = await kurs();
  const l4 = store.readIndex(p.id).find((x) => x.order === 4);
  store.updateLesson(p.id, l4.id, {
    status: 'ukończona',
    score: 40,
    covers: ['rekurencja', 'stos wywołań'],
  });
  const { body } = await call('GET', `/projects/${p.id}`);
  assert.equal(body.minInsertOrder, 4);
  assert.equal(body.suggestions.length, 1);
  assert.equal(body.suggestions[0].kind, 'powtórka');

  // Sam odczyt niczego nie kolejkuje — propozycja czeka na kliknięcie.
  const kolejkaPrzed = store.readProject(p.id).queue;
  await call('GET', `/projects/${p.id}`);
  await call('GET', `/projects/${p.id}`);
  assert.deepEqual(store.readProject(p.id).queue, kolejkaPrzed);
});

test.after(() => {
  server.close();
  fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });
});
