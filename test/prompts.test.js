import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPrompt } from '../server/prompts.js';

const promptsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'prompts');
const fixture = path.join(promptsDir, '_fixture.md');

const withFixture = (t, body) => {
  fs.writeFileSync(fixture, body, 'utf8');
  t.after(() => fs.rmSync(fixture, { force: true }));
};

test('wszystkie placeholdery podstawione', (t) => {
  withFixture(t, 'Temat: {{topic}}, poziom: {{level}}, temat znowu: {{topic}}.');
  const out = loadPrompt('_fixture', { language: 'pl', topic: 'Teoria muzyki', level: 'średni' });
  assert.match(out, /Temat: Teoria muzyki, poziom: średni, temat znowu: Teoria muzyki\./);
  assert.doesNotMatch(out, /\{\{/);
});

test('brakująca zmienna rzuca', (t) => {
  withFixture(t, 'Zakres: {{covers}}');
  assert.throws(() => loadPrompt('_fixture', { language: 'pl' }), /covers/);
});

test('nieznany język rzuca', (t) => {
  withFixture(t, 'nic');
  assert.throws(() => loadPrompt('_fixture', { language: 'de' }), /language/);
});

test('nagłówek językowy trafia do wyniku dla pl i en', (t) => {
  withFixture(t, 'ciało promptu {{language}}');
  const pl = loadPrompt('_fixture', { language: 'pl' });
  const en = loadPrompt('_fixture', { language: 'en' });
  assert.match(pl, /języku: polski \(pl\)/);
  assert.match(pl, /ciało promptu pl/);
  assert.match(en, /języku: English \(en\)/);
  assert.match(en, /ciało promptu en/);
  // enumy zostają nietłumaczone — zdanie musi być w każdym promptcie
  for (const out of [pl, en]) assert.match(out, /nie tłumacz ich/);
});

test('prompt smoke wypełnia się dla obu języków', () => {
  for (const language of ['pl', 'en']) {
    assert.doesNotMatch(loadPrompt('smoke', { language }), /\{\{/);
  }
});
