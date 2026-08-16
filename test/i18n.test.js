import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dict, LANGS } from '../public/i18n.js';
import { texts } from '../public/runtime.js';

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

// Klucz zgubiony przy przenoszeniu kodu nie wysypuje aplikacji — t() oddaje sam klucz,
// więc na ekranie ląduje `projects.empty` zamiast zdania. Tego nie widać, dopóki się nie wejdzie
// na ten jeden ekran; regex po źródle łapie to za darmo.
const zrodlo = (name) =>
  readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8');

// ponytail: tylko klucze podane wprost, `t(`status.${s}`)` zostaje na oku — enumy pilnują testy niżej.
const uzyte = (src, fn) => {
  const wywolania = new RegExp(String.raw`\b${fn}\(\s*'([^']+)'`, 'g');
  return [...new Set([...src.matchAll(wywolania)].map((m) => m[1]))];
};

test('każdy klucz t() z app.js jest w słowniku', () => {
  const brakuje = uzyte(zrodlo('app.js'), 't').filter((k) => !(k in dict.pl));
  assert.deepEqual(brakuje, []);
});

test('każdy klucz tl() z runtime.js jest w słowniku lekcji', () => {
  const brakuje = uzyte(zrodlo('runtime.js'), 'tl').filter((k) => !(k in texts.pl));
  assert.deepEqual(brakuje, []);
});

test('słownik lekcji ma te same klucze w pl i en', () => {
  assert.deepEqual(missing(texts.pl, texts.en), [], 'brakuje w en');
  assert.deepEqual(missing(texts.en, texts.pl), [], 'brakuje w pl');
});

// Enumy z kontraktu (00-README.md). Nowa wartość bez etykiety pokazuje na ekranie
// surowy klucz — a widać ją dopiero wtedy, gdy kurs akurat w nią wejdzie.
const ENUMY = {
  status: ['nowy', 'wywiad', 'plan', 'generowanie', 'gotowy',
           'zaplanowana', 'generowana', 'gotowa', 'ukończona', 'błąd'],
  origin: ['plan', 'pośrednia', 'powtórka', 'rozwinięcie', 'nowy wątek'],
  level: ['początkujący', 'średni', 'zaawansowany'],
  pace: ['wolne', 'normalne', 'szybkie'],
  scope: ['podstawy', 'standardowy', 'szeroki'],
  verdict: ['poprawnie', 'częściowo', 'niepoprawnie'],
};

test('każda wartość enuma ma etykietę w powłoce', () => {
  const brakuje = Object.entries(ENUMY)
    .flatMap(([grupa, wartosci]) => wartosci.map((v) => `${grupa}.${v}`))
    .filter((k) => !(k in dict.pl));
  assert.deepEqual(brakuje, []);
});

test('werdykty praktyki mają etykietę też w lekcji', () => {
  assert.deepEqual(ENUMY.verdict.filter((v) => !(v in texts.pl)), []);
});
