import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Kontrakt plików biblioteki. Wygląd sprawdza przeglądarka (`npm run sprawdz`) — tu jest
// wszystko, co da się orzec bez DOM-u, łącznie z tym, że plik w ogóle wolno zaimportować w Node.

import {
  katalog,
  katalogTekst,
  komponentyDir,
  nazwyKomponentow,
  LIMIT_KATALOGU,
  NAZWA,
  TRYBY,
} from '../server/komponenty.js';
import { loadPrompt } from '../server/prompts.js';

const nazwy = nazwyKomponentow();
const zrodlo = (n) => fs.readFileSync(path.join(komponentyDir, `${n}.js`), 'utf8');
// Na Windowsie ścieżka bezwzględna nie jest URL-em — import wymaga file://.
const wczytaj = (n) => import(pathToFileURL(path.join(komponentyDir, `${n}.js`)).href);

// „white" w white-space to nie kolor — stąd granice bez myślnika i podkreślenia.
const KOLORY =
  /(#[0-9a-fA-F]{3,8}\b)|(\brgba?\()|(\bhsla?\()|((?<![-\w])(red|blue|green|black|white|gray|grey|yellow|orange|purple|pink|brown|cyan|magenta|gold|silver)(?![-\w]))/;

test('biblioteka nie jest pusta', () => {
  assert.ok(nazwy.length >= 1, 'w public/komponenty/ nie ma ani jednego komponentu');
});

for (const nazwa of nazwy) {
  test(`komponent ${nazwa}: kontrakt pliku`, async () => {
    // Import w Node dowodzi, że document jest dotykany wyłącznie w rysuj — inaczej wywala serwer.
    const modul = await wczytaj(nazwa);
    const { meta, probki, style, rysuj } = modul;

    assert.ok(meta, 'brak eksportu meta');
    assert.equal(meta.nazwa, nazwa, 'meta.nazwa musi być nazwą pliku');
    assert.match(nazwa, NAZWA);
    for (const pole of ['opis', 'dane', 'przyklad']) {
      assert.ok(String(meta[pole] ?? '').trim(), `meta.${pole} jest puste`);
    }
    assert.ok(Array.isArray(meta.tryby) && meta.tryby.length, 'meta.tryby musi być niepustą listą');
    for (const tryb of meta.tryby) assert.ok(TRYBY.includes(tryb), `nieznany tryb ${tryb}`);

    assert.equal(typeof rysuj, 'function', 'rysuj musi być funkcją');
    assert.equal(typeof style, 'string', 'style musi być stringiem (może być pusty)');

    // Próbki jadą przez stronę galerii jako JSON — funkcja w danych rozwaliłaby kontrolę.
    assert.ok(Array.isArray(probki) && probki.length >= 2, 'potrzebne co najmniej dwie próbki');
    for (const probka of probki) {
      assert.ok(String(probka?.nazwa ?? '').trim(), 'próbka bez nazwy');
      assert.deepEqual(JSON.parse(JSON.stringify(probka.dane ?? {})), probka.dane ?? {});
    }
  });

  test(`komponent ${nazwa}: style nie wyciekają i nie mają kolorów`, async () => {
    const { style } = await wczytaj(nazwa);
    for (const blok of style.split('}')) {
      const selektor = blok.split('{')[0].trim();
      if (!selektor) continue;
      for (const czesc of selektor.split(',')) {
        const s = czesc.trim();
        if (s) assert.ok(s.startsWith(`.k-${nazwa}`), `selektor „${s}" nie zaczyna się od .k-${nazwa}`);
      }
    }
    // Reguła jednego źródła koloru: paleta żyje w theme.css, komponent zna tylko zmienne.
    const trafienie = zrodlo(nazwa).match(KOLORY);
    assert.equal(trafienie, null, `literał koloru „${trafienie?.[0]}" — użyj zmiennej motywu`);
  });
}

test('katalog dla promptu: linia na komponent i budżet znaków', async () => {
  const tekst = await katalogTekst();
  const linie = tekst.split('\n');
  assert.equal(linie.length, nazwy.length, 'jedna linia na komponent');
  for (const nazwa of nazwy) assert.match(tekst, new RegExp(`\`${nazwa}\``));
  assert.ok(tekst.length <= LIMIT_KATALOGU, `katalog ma ${tekst.length} znaków, limit ${LIMIT_KATALOGU}`);

  const wpisy = await katalog();
  assert.equal(wpisy.length, nazwy.length, 'zepsuty komponent wypadłby z katalogu');
});

test('prompt lekcji przyjmuje katalog i nie zostawia placeholderów', async () => {
  const prompt = loadPrompt('lesson', {
    language: 'pl',
    topic: 't',
    title: 't',
    brief: 'b',
    order: 1,
    level: 'początkujący',
    pace: 'normalne',
    scope: 'standardowy',
    courseSummary: 's',
    previous: '-',
    weak: '-',
    revision: '-',
    concepts: '4–5',
    exercises: 3,
    quiz: 8,
    revisionQuestions: 2,
    extend: '',
    skeleton: '<html></html>',
    komponenty: await katalogTekst(),
  });
  assert.doesNotMatch(prompt, /\{\{/);
  assert.match(prompt, /LA\.komponent/);
  assert.match(prompt, /`karty`/);
});
