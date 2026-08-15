import test from 'node:test';
import assert from 'node:assert/strict';
import { nextOrderAfter, minInsertOrder, canInsertAfter } from '../server/store.js';

const L = (...orders) => orders.map((order, i) => ({ id: `l${i}`, order, status: 'gotowa' }));

test('pierwsza wstawka po 4 daje 4.1', () => {
  assert.equal(nextOrderAfter(L(3, 4, 5), 4), 4.1);
});

test('druga wstawka po 4 daje 4.2', () => {
  assert.equal(nextOrderAfter(L(3, 4, 4.1, 5), 4), 4.2);
});

test('wstawka między 4.1 a 4.2 ląduje ściśle pomiędzy', () => {
  const o = nextOrderAfter(L(4, 4.1, 4.2), 4.1);
  assert.ok(o > 4.1 && o < 4.2, `${o} nie mieści się między 4.1 a 4.2`);
});

test('wyczerpana siatka spada na średnią, wciąż w szparze', () => {
  const lessons = L(4, ...Array.from({ length: 9 }, (_, i) => Number((4.1 + i * 0.1).toFixed(1))), 5);
  const o = nextOrderAfter(lessons, 4);
  assert.ok(o > 4 && o < 4.1, `${o} nie mieści się między 4 a 4.1`);
});

test('wstawka na końcu kursu jest większa od maksimum', () => {
  assert.ok(nextOrderAfter(L(1, 2, 3), 3) > 3);
});

test('istniejące lekcje nie zmieniają order po wstawieniu', () => {
  const lessons = L(1, 2, 3, 4, 5);
  const before = lessons.map((l) => l.order);
  nextOrderAfter(lessons, 2);
  assert.deepEqual(lessons.map((l) => l.order), before);
});

test('sortowanie po order radzi sobie z ułamkami', () => {
  const lessons = L(4.15, 3, 4.2, 4, 4.1);
  assert.deepEqual(
    [...lessons].sort((a, b) => a.order - b.order).map((l) => l.order),
    [3, 4, 4.1, 4.15, 4.2],
  );
});

test('kolejne wstawki po tej samej lekcji rosną i nie kolidują', () => {
  let lessons = L(3, 4, 5);
  for (let i = 0; i < 5; i += 1) {
    const o = nextOrderAfter(lessons, 4);
    assert.ok(o > 4 && o < 5, `${o} wyszło poza szparę`);
    assert.ok(!lessons.some((l) => l.order === o), `${o} już zajęte`);
    lessons = [...lessons, { id: `x${i}`, order: o, status: 'gotowa' }];
  }
});

test('minInsertOrder to order ostatniej ukończonej, 0 gdy brak', () => {
  assert.equal(minInsertOrder(L(1, 2, 3)), 0);
  const lessons = L(1, 2, 3);
  lessons[0].status = 'ukończona';
  lessons[1].status = 'ukończona';
  assert.equal(minInsertOrder(lessons), 2);
});

test('canInsertAfter blokuje przed ostatnią ukończoną, przepuszcza od niej', () => {
  const lessons = L(1, 2, 3);
  lessons[1].status = 'ukończona';
  assert.equal(canInsertAfter(lessons, 1), false);
  assert.equal(canInsertAfter(lessons, 2), true);
  assert.equal(canInsertAfter(lessons, 3), true);
});
