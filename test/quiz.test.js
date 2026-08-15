import test from 'node:test';
import assert from 'node:assert/strict';
import { ocenSprawdzian } from '../public/runtime.js';

// Ocena jest jedyną częścią runtime'u bez DOM-u — reszta modułu nie rusza się przy imporcie w Node.

const PYTANIA = [
  { id: 'q1', typ: 'jednokrotny', poprawne: [1], uzasadnienie: 'bo częstotliwość' },
  { id: 'q2', typ: 'wielokrotny', poprawne: [0, 2], uzasadnienie: 'bo obie naraz' },
  { id: 'q3', typ: 'prawda-falsz', poprawne: [0], uzasadnienie: 'bo stosunek 2:1' },
];

test('komplet poprawnych daje 100%', () => {
  const wynik = ocenSprawdzian(PYTANIA, { q1: [1], q2: [0, 2], q3: [0] });
  assert.equal(wynik.procent, 100);
  assert.equal(wynik.poprawne, 3);
});

test('wielokrotny wybór trafiony częściowo nie daje punktu', () => {
  const wynik = ocenSprawdzian(PYTANIA, { q1: [1], q2: [0], q3: [0] });
  assert.equal(wynik.poprawne, 2);
  assert.equal(wynik.szczegoly.find((s) => s.id === 'q2').trafione, false);
});

test('wielokrotny wybór z nadmiarem też nie daje punktu', () => {
  const wynik = ocenSprawdzian(PYTANIA, { q2: [0, 1, 2] });
  assert.equal(wynik.szczegoly.find((s) => s.id === 'q2').trafione, false);
});

test('brak odpowiedzi to zero punktów, bez wyjątku', () => {
  const wynik = ocenSprawdzian(PYTANIA, {});
  assert.equal(wynik.procent, 0);
  assert.equal(wynik.poprawne, 0);
});

test('2 z 3 zaokrągla się do 67%', () => {
  assert.equal(ocenSprawdzian(PYTANIA, { q1: [1], q3: [0] }).procent, 67);
});

test('kolejność zaznaczeń nie zmienia oceny', () => {
  assert.equal(ocenSprawdzian(PYTANIA, { q2: [2, 0] }).poprawne, 1);
});

test('szczegóły niosą uzasadnienie przy każdym pytaniu, także trafionym', () => {
  const { szczegoly } = ocenSprawdzian(PYTANIA, { q1: [1] });
  assert.equal(szczegoly.length, PYTANIA.length);
  assert.ok(szczegoly.every((s) => s.uzasadnienie));
  assert.equal(szczegoly[0].trafione, true);
  assert.equal(szczegoly[0].uzasadnienie, 'bo częstotliwość');
});

test('sprawdzian bez pytań nie dzieli przez zero', () => {
  assert.deepEqual(ocenSprawdzian([], {}), { procent: 0, poprawne: 0, szczegoly: [] });
});
