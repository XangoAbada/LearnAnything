import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// DATA_DIR przed importem: print.js ciągnie store.js, a ten zakłada katalog danych przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-print-'));
const { cialo, dokument } = await import('../server/print.js');

const fixtura = (lang) =>
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', `lesson-${lang}`, 'lesson.html'),
    'utf8',
  );

const PROJEKT = { id: 'p1', topic: 'Teoria muzyki', language: 'pl' };
const lekcja = (over) => ({
  id: 'l1',
  order: 1,
  title: 'Czym jest dźwięk',
  path: 'lessons/01-czym-jest-dzwiek',
  status: 'gotowa',
  ...over,
});
const zloz = (lessons, czytaj = () => fixtura('pl'), project = PROJEKT) =>
  dokument({ project, lessons, czytaj });

test('z pliku lekcji zostaje wnętrze <body>, bez <html>, <head> i skryptów', () => {
  const tresc = cialo(fixtura('pl'));
  assert.ok(tresc.startsWith('<header class="lekcja-naglowek">'));
  assert.doesNotMatch(tresc, /<(html|head|body|script)\b/i);
  assert.match(tresc, /Częstotliwość i wysokość/);
});

test('plik niepasujący do szablonu daje null zamiast wyjątku', () => {
  assert.equal(cialo('<div>bez body</div>'), null);
  assert.equal(cialo(null), null);
});

test('dwie lekcje sklejają się w jeden dokument, każda w swoim <article>', () => {
  const html = zloz([lekcja(), lekcja({ id: 'l2', order: 2, title: 'Skale' })]);
  assert.equal(html.match(/<article class="lekcja-druk"/g).length, 2);
  assert.match(html, /data-lesson="l1"/);
  assert.match(html, /data-lesson="l2"/);
  // Jeden dokument: jeden <html>, jeden runtime, po jednym skrypcie na lekcję.
  assert.equal(html.match(/<html\b/g).length, 1);
  assert.equal(html.match(/src="\/runtime\.js"/g).length, 1);
  assert.equal(html.match(/lesson\.js"/g).length, 2);
  assert.match(html, /window\.LA\.druk\("l1"\)/);
});

test('lekcje niegotowe są pomijane, ale zostają w spisie treści z adnotacją', () => {
  const html = zloz([
    lekcja(),
    lekcja({ id: 'l2', order: 2, title: 'Skale', status: 'zaplanowana' }),
    lekcja({ id: 'l3', order: 3, title: 'Akordy', status: 'generowana' }),
    lekcja({ id: 'l4', order: 4, title: 'Rytm', status: 'błąd' }),
  ]);
  assert.equal(html.match(/<article class="lekcja-druk"/g).length, 1);
  for (const title of ['Skale', 'Akordy', 'Rytm']) assert.ok(html.includes(title));
  assert.equal(html.match(/jeszcze niewygenerowana/g).length, 3);
});

test('kolejność wynika z order, także przy numerach ułamkowych', () => {
  const html = zloz([
    lekcja({ id: 'l1', order: 1 }),
    lekcja({ id: 'l3', order: 1.1, title: 'Wstawka' }),
    lekcja({ id: 'l2', order: 2, title: 'Skale' }),
  ]);
  const kolejnosc = [...html.matchAll(/data-lesson="(l\d)"/g)].map((m) => m[1]);
  assert.deepEqual(kolejnosc, ['l1', 'l3', 'l2']);
  assert.ok(html.indexOf('>1.1<') < html.indexOf('Skale'));
});

test('lekcja gotowa, ale nie do odczytania, jest pomijana z adnotacją', () => {
  const html = zloz([lekcja(), lekcja({ id: 'l2', order: 2, title: 'Skale' })], (l) =>
    l.id === 'l2' ? null : fixtura('pl'),
  );
  assert.equal(html.match(/<article class="lekcja-druk"/g).length, 1);
  assert.match(html, /Skale<\/span><span class="adnotacja">nie udało się dołączyć/);
});

test('kurs bez gotowych lekcji daje spis treści i wyjaśnienie, nie wyjątek', () => {
  const html = zloz([lekcja({ status: 'zaplanowana' })]);
  assert.doesNotMatch(html, /<article/);
  assert.match(html, /Spis treści/);
  assert.match(html, /wydruk pozostaje pusty/);
});

test('etykiety idą w języku kursu, nie powłoki', () => {
  const html = zloz([lekcja({ status: 'zaplanowana' })], () => fixtura('en'), {
    ...PROJEKT,
    language: 'en',
  });
  assert.match(html, /<html lang="en"/);
  assert.match(html, /Contents/);
  assert.match(html, /not generated yet/);
  assert.doesNotMatch(html, /Spis treści/);
});

test('dokument wstaje w trybie wydruku i z arkuszami lekcji', () => {
  const html = zloz([lekcja()]);
  assert.match(html, /<body data-lesson="druk" data-druk="1"/);
  assert.match(html, /data-theme="jasny"/);
  assert.match(html, /href="\/print\.css"/);
  assert.match(html, /href="\/lessons\/p1\/01-czym-jest-dzwiek\/lesson\.css"/);
  assert.match(html, /window\.LA\.drukuj\(\)/);
});

test('pojedyncza lekcja jedzie bez spisu treści', () => {
  const html = dokument({ project: PROJEKT, lessons: [lekcja()], czytaj: () => fixtura('pl'), spis: false });
  assert.doesNotMatch(html, /Spis treści/);
  assert.equal(html.match(/<article class="lekcja-druk"/g).length, 1);
});

test('tytuł ze znakami HTML nie rozjeżdża dokumentu', () => {
  const html = zloz([lekcja({ status: 'zaplanowana', title: '<script>&"x"' })]);
  assert.match(html, /&lt;script&gt;&amp;&quot;x&quot;/);
  assert.doesNotMatch(html, /<script>&/);
});
