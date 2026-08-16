import test from 'node:test';
import assert from 'node:assert/strict';
import { przytnij, krokIndeks } from '../public/runtime.js';

// Demka są DOM-owe, więc testowalne bez przeglądarki zostają dwie rzeczy: przycięcie wartości
// kontrolki do zakresu i wybór kroku. Reszta idzie ręczną checklistą fazy 07.

test('wartość spoza zakresu wraca do krańca, w środku zostaje bez zmian', () => {
  assert.equal(przytnij(1200, 110, 880), 880);
  assert.equal(przytnij(20, 110, 880), 110);
  assert.equal(przytnij(440, 110, 880), 440);
});

test('krańce zakresu są dozwolone', () => {
  assert.equal(przytnij(110, 110, 880), 110);
  assert.equal(przytnij(880, 110, 880), 880);
});

test('„dalej" na ostatnim kroku zostaje na ostatnim, nie zawija', () => {
  assert.equal(krokIndeks(6, 1, 7), 6);
  assert.equal(krokIndeks(5, 1, 7), 6);
});

test('„wstecz" na pierwszym kroku zostaje na pierwszym', () => {
  assert.equal(krokIndeks(0, -1, 7), 0);
  assert.equal(krokIndeks(3, -1, 7), 2);
});

test('skok poza zakres przycina się do krańca — tak wraca odtwarzanie na start', () => {
  assert.equal(krokIndeks(6, -7, 7), 0);
  assert.equal(krokIndeks(0, 99, 7), 6);
});

test('demko bez kroków nie daje ujemnego indeksu', () => {
  assert.equal(krokIndeks(0, 1, 0), 0);
  assert.equal(krokIndeks(0, -1, 0), 0);
});
