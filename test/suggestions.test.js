import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-'));
const { computeSuggestions } = await import('../server/suggestions.js');

const lekcja = (order, patch = {}) => ({
  id: `l${String(order).replace('.', '_')}`,
  order,
  title: `Lekcja ${order}`,
  origin: 'plan',
  status: 'ukończona',
  score: null,
  covers: ['rekurencja', 'stos wywołań'],
  practiceNotes: [],
  ...patch,
});

test('słaby sprawdzian daje powtórkę z pojęciami lekcji', () => {
  const [s, ...reszta] = computeSuggestions([lekcja(4, { score: 40 })]);
  assert.deepEqual(reszta, []);
  assert.equal(s.kind, 'powtórka');
  assert.equal(s.afterOrder, 4);
  assert.equal(s.lessonId, 'l4');
  assert.deepEqual(s.reason, {
    code: 'niski-wynik',
    score: 40,
    concepts: ['rekurencja', 'stos wywołań'],
  });
  assert.equal(s.brief, 'rekurencja, stos wywołań');
});

test('dobry sprawdzian daje rozwinięcie, nie powtórkę', () => {
  const [s] = computeSuggestions([lekcja(4, { score: 90 })]);
  assert.equal(s.kind, 'rozwinięcie');
  assert.equal(s.reason.code, 'dobry-wynik');
});

test('powtarzające się braki bez niskiego wyniku to powtarzajace-braki', () => {
  const [s] = computeSuggestions([
    lekcja(4, {
      score: 75,
      practiceNotes: [
        { exerciseId: 'c1', note: 'myli rekurencję z iteracją' },
        { exerciseId: 'c2', note: 'gubi warunek stopu' },
      ],
    }),
  ]);
  assert.equal(s.kind, 'powtórka');
  assert.equal(s.reason.code, 'powtarzajace-braki');
  assert.deepEqual(s.reason.concepts, ['myli rekurencję z iteracją', 'gubi warunek stopu']);
});

test('jedna notatka to za mało na propozycję', () => {
  const lekcje = [lekcja(4, { score: 75, practiceNotes: [{ exerciseId: 'c1', note: 'gubi się' }] })];
  assert.deepEqual(computeSuggestions(lekcje), []);
});

test('propozycja sprzed ostatniej ukończonej przesuwa się za nią, nie znika', () => {
  const s = computeSuggestions([lekcja(2, { score: 40 }), lekcja(5), lekcja(7)]);
  assert.equal(s.length, 1);
  assert.equal(s[0].lessonId, 'l2', 'propozycja nadal dotyczy lekcji źródłowej');
  assert.equal(s[0].afterOrder, 7, 'ale wstawia się za ostatnią ukończoną');
});

test('istniejąca lekcja tego samego rodzaju w tym miejscu kasuje propozycję', () => {
  const lekcje = [lekcja(4, { score: 40 }), lekcja(4.1, { origin: 'powtórka', status: 'gotowa' })];
  assert.deepEqual(computeSuggestions(lekcje), []);
  // Inny rodzaj w tym samym miejscu nie zasłania propozycji.
  lekcje[1].origin = 'pośrednia';
  assert.equal(computeSuggestions(lekcje).length, 1);
});

test('brak wyników to pusta lista, bez wyjątku', () => {
  assert.deepEqual(computeSuggestions(), []);
  assert.deepEqual(computeSuggestions([]), []);
  assert.deepEqual(computeSuggestions([lekcja(1, { status: 'gotowa' })]), []);
  assert.deepEqual(computeSuggestions([{ id: 'l1', order: 1, status: 'ukończona' }]), []);
});

test('computeSuggestions niczego nie dopisuje i nie zna kolejki', () => {
  const lekcje = [lekcja(4, { score: 40 })];
  const przed = JSON.stringify(lekcje);
  computeSuggestions(lekcje);
  assert.equal(JSON.stringify(lekcje), przed, 'wejście zmienione w locie');

  // Propozycja nie ma prawa nic wygenerować — moduł nie widzi ani kolejki, ani generatora.
  const src = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'suggestions.js'),
    'utf8',
  );
  assert.doesNotMatch(src, /from '.\/queue.js'/);
  assert.doesNotMatch(src, /from '.\/generator.js'/);
});

test.after(() => fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }));
