import test from 'node:test';
import assert from 'node:assert/strict';
import { zapiszSciezke, scalStan, stanLekcji } from '../public/runtime.js';

// Odtwarzanie stanu jest DOM-owe, więc testowalne bez przeglądarki zostają trzy rzeczy:
// zapis w głąb, scalenie z domyślnymi i sam magazyn. Reszta idzie checklistą fazy 08.

const atrapa = (dane = {}) => ({
  dane,
  getItem: (k) => (k in dane ? dane[k] : null),
  setItem: (k, v) => {
    dane[k] = String(v);
  },
  removeItem: (k) => {
    delete dane[k];
  },
});

const KLUCZ = 'learnanything:p1:l1';

test('zapiszSciezke tworzy brakujące poziomy i nie kasuje rodzeństwa', () => {
  const stan = { demka: { 'demko-fala': { czest: 220 } } };
  zapiszSciezke(stan, 'demka.demko-sort', { krok: 3 });
  zapiszSciezke(stan, 'sprawdzian.odpowiedzi.q1', [0]);
  assert.deepEqual(stan, {
    demka: { 'demko-fala': { czest: 220 }, 'demko-sort': { krok: 3 } },
    sprawdzian: { odpowiedzi: { q1: [0] } },
  });
});

test('zapiszSciezke nadpisuje wartość, gdy po drodze leży coś, co nie jest obiektem', () => {
  const stan = { chowane: 'bzdura' };
  zapiszSciezke(stan, 'chowane.pojecie-1', true);
  assert.deepEqual(stan, { chowane: { 'pojecie-1': true } });
});

test('scalStan bez zapisu daje stan domyślny', () => {
  const domyslny = { czest: 220, ksztalt: 'sinus' };
  assert.deepEqual(scalStan(undefined, domyslny), domyslny);
  assert.deepEqual(scalStan({}, domyslny), domyslny);
});

test('scalStan bierze znane klucze, nieznany ignoruje — lekcja mogła się zmienić', () => {
  const wynik = scalStan({ czest: 880, nieistnieje: 1 }, { czest: 220, ksztalt: 'sinus' });
  assert.deepEqual(wynik, { czest: 880, ksztalt: 'sinus' });
});

test('uszkodzony wpis czyta się jako pusty stan, bez wyjątku', () => {
  const stan = stanLekcji(KLUCZ, atrapa({ [KLUCZ]: '{ to nie jest json' }));
  assert.deepEqual(stan.wczytaj(), {});
  assert.equal(stan.czytaj('demka.demko-fala'), undefined);
});

test('wpis niebędący obiektem też jest ignorowany', () => {
  assert.deepEqual(stanLekcji(KLUCZ, atrapa({ [KLUCZ]: '42' })).wczytaj(), {});
});

test('czytaj schodzi po ścieżce i nie wywraca się na brakującym poziomie', () => {
  const zapis = JSON.stringify({ demka: { 'demko-fala': { czest: 880 } } });
  const stan = stanLekcji(KLUCZ, atrapa({ [KLUCZ]: zapis }));
  assert.equal(stan.czytaj('demka.demko-fala.czest'), 880);
  assert.equal(stan.czytaj('demka.demko-brak.czest'), undefined);
});

test('zapis czeka na debounce, spisz go wypycha', () => {
  const magazyn = atrapa();
  const stan = stanLekcji(KLUCZ, magazyn);
  stan.zapisz('demka.demko-fala', { czest: 880 });
  assert.equal(magazyn.dane[KLUCZ], undefined);
  stan.spisz();
  assert.deepEqual(JSON.parse(magazyn.dane[KLUCZ]), { demka: { 'demko-fala': { czest: 880 } } });
});

test('czyszczenie usuwa tylko klucz tej lekcji', () => {
  const magazyn = atrapa({
    [KLUCZ]: '{"chowane":{"c1":true}}',
    'learnanything:p1:l2': '{"chowane":{"c1":true}}',
    'learnanything:theme': 'ciemny',
  });
  stanLekcji(KLUCZ, magazyn).wyczysc();
  assert.deepEqual(Object.keys(magazyn.dane), ['learnanything:p1:l2', 'learnanything:theme']);
});

test('brak magazynu (tryb prywatny, file://) nie wysypuje stanu', () => {
  const stan = stanLekcji(KLUCZ, null);
  assert.deepEqual(stan.wczytaj(), {});
  stan.zapisz('demka.x', 1);
  stan.spisz();
  stan.wyczysc();
  assert.deepEqual(stan.wczytaj(), {});
});
