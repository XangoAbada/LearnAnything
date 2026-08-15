import test from 'node:test';
import assert from 'node:assert/strict';
import { dict, LANGS } from '../public/i18n.js';

// Jedyny automat fazy 04: DOM-u w node --test nie ma, ale słowniki to czysty ESM.
// Pominięte tłumaczenie wychodzi tutaj taniej niż klikaniem po ekranach.

const missing = (from, to) => Object.keys(from).filter((k) => !(k in to));
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('oba języki są w słowniku', () => {
  assert.deepEqual(Object.keys(dict).sort(), [...LANGS].sort());
});

test('słowniki pl i en mają identyczny zbiór kluczy', () => {
  assert.deepEqual(missing(dict.pl, dict.en), [], 'brakuje w en');
  assert.deepEqual(missing(dict.en, dict.pl), [], 'brakuje w pl');
});

test('żadne tłumaczenie nie jest puste', () => {
  for (const lang of LANGS) {
    const empty = Object.entries(dict[lang])
      .filter(([, v]) => typeof v !== 'string' || !v.trim())
      .map(([k]) => k);
    assert.deepEqual(empty, [], `puste wartości w ${lang}`);
  }
});

test('te same placeholdery po obu stronach', () => {
  const different = Object.keys(dict.pl).filter(
    (k) =>
      k in dict.en &&
      placeholders(dict.pl[k]).join() !== placeholders(dict.en[k]).join(),
  );
  assert.deepEqual(different, []); // {n} zgubione w tłumaczeniu = liczba znika z ekranu
});
