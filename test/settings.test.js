import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-settings-'));
const store = await import('../server/store.js');
const { queryOptions } = await import('../server/claude.js');

test('readSettings bez pliku daje komplet etapów z domyślnymi', () => {
  const settings = store.readSettings();
  assert.deepEqual(Object.keys(settings), store.STAGES);
  assert.deepEqual(settings, store.DEFAULT_SETTINGS);
});

test('writeSettings odrzuca nieznany etap i nieznany poziom', () => {
  assert.throws(() => store.writeSettings({ 'wywiad-taniec': { model: 'opus' } }), /nieznany etap/);
  assert.throws(() => store.writeSettings({ plan: { effort: 'kosmiczny' } }), /poziom/);
});

test('writeSettings nie kasuje etapów pominiętych w żądaniu', () => {
  store.writeSettings({ plan: { model: 'haiku', effort: null } });
  const settings = store.readSettings();
  assert.deepEqual(settings.plan, { model: 'haiku', effort: null });
  assert.deepEqual(settings.lekcja, store.DEFAULT_SETTINGS.lekcja);
});

// Ten sprawdzian pada, jeśli podpięcie ustawień do SDK się urwie.
test('queryOptions przekazuje model i effort etapu, a null pomija', () => {
  store.writeSettings({
    plan: { model: 'haiku', effort: 'low' },
    lekcja: { model: null, effort: null },
  });
  assert.equal(queryOptions({ stage: 'plan' }).model, 'haiku');
  assert.equal(queryOptions({ stage: 'plan' }).effort, 'low');

  const bare = queryOptions({ stage: 'lekcja' });
  assert.ok(!('model' in bare), 'null model nie może trafić do options');
  assert.ok(!('effort' in bare), 'null effort nie może trafić do options');

  assert.ok(!('model' in queryOptions({})), 'brak etapu = domyślne z CLI');
});

test('queryOptions nie wpuszcza klucza API do środowiska SDK', () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test';
  assert.equal(queryOptions({}).env.ANTHROPIC_API_KEY, undefined);
  delete process.env.ANTHROPIC_API_KEY;
});

// --- bufor generowania ------------------------------------------------------

test('bufor ma wartość domyślną i daje się zapisać', () => {
  assert.equal(store.readBuffer(), store.DEFAULT_BUFFER);
  assert.equal(store.writeBuffer(5), 5);
  assert.equal(store.readBuffer(), 5);
});

test('bufor spoza zakresu jest odrzucany', () => {
  store.writeBuffer(4);
  for (const zly of [0, -1, 1.5, store.BUFFER_MAX + 1, '3', null]) {
    assert.throws(() => store.writeBuffer(zly), /bufor/, `przeszło: ${zly}`);
  }
  assert.equal(store.readBuffer(), 4, 'odrzucony zapis nie miał prawa nic zmienić');
});

test('zapis ustawień modelu nie kasuje bufora', () => {
  store.writeBuffer(7);
  store.writeSettings({ plan: { model: 'sonnet', effort: 'low' } });
  assert.equal(store.readBuffer(), 7);
});

// --- ile projektów naraz ----------------------------------------------------

test('naraz ma wartość domyślną i daje się zapisać', () => {
  assert.equal(store.readNaraz(), store.DEFAULT_NARAZ);
  assert.equal(store.writeNaraz(3), 3);
  assert.equal(store.readNaraz(), 3);
});

test('naraz spoza zakresu jest odrzucany', () => {
  store.writeNaraz(2);
  for (const zly of [0, -1, 1.5, store.NARAZ_MAX + 1, '2', null]) {
    assert.throws(() => store.writeNaraz(zly), /naraz/, `przeszło: ${zly}`);
  }
  assert.equal(store.readNaraz(), 2, 'odrzucony zapis nie miał prawa nic zmienić');
});

test('bufor i naraz nie kasują się nawzajem ani przez zapis modeli', () => {
  store.writeBuffer(6);
  store.writeNaraz(4);
  store.writeSettings({ lekcja: { model: 'opus', effort: 'high' } });
  assert.equal(store.readBuffer(), 6);
  assert.equal(store.readNaraz(), 4);
});
