import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-praktyka-'));
const store = await import('../server/store.js');
const { gradePractice } = await import('../server/generator.js');

/**
 * Zaślepka w kontrakcie runClaudeJson: woła walidator, przy błędzie jedno ponowienie.
 * Kolejne wywołania (i ponowienia) zjadają kolejne odpowiedzi z listy; ostatnia się powtarza.
 */
const model = (...odpowiedzi) => {
  let i = 0;
  const run = async (params, validate) => {
    run.prompty.push(params.prompt);
    run.stages.push(params.stage);
    let last;
    for (let proba = 0; proba < 2; proba += 1) {
      const data = odpowiedzi[Math.min(i, odpowiedzi.length - 1)];
      i += 1;
      try {
        validate?.(data);
        return data;
      } catch (err) {
        last = err;
      }
    }
    throw new Error(`claude: zła odpowiedź także po ponowieniu — ${last.message}`);
  };
  run.prompty = [];
  run.stages = [];
  return run;
};

const ocena = (verdict, note) => ({ verdict, feedback: 'było blisko', hint: 'policz jeszcze raz', note });

const kurs = () => {
  const project = store.createProject({ topic: 'Teoria muzyki', language: 'pl' });
  const lesson = store.addLesson(project.id, { afterOrder: 0, title: 'Czym jest dźwięk' });
  store.updateLesson(project.id, lesson.id, { status: 'gotowa', covers: ['oktawa'] });
  return { project, lesson };
};

/** Dokładnie to, co robi endpoint: ocena z modelu, notatka do indeksu. */
const ocen = async ({ project, lesson }, exerciseId, answer, run) => {
  const wynik = await gradePractice(project, lesson, 'Wyjaśnij, czym jest oktawa.', answer, run);
  store.savePracticeNote(project.id, lesson.id, exerciseId, wynik.note);
  return wynik;
};

const notatki = ({ project, lesson }) =>
  store.readIndex(project.id).find((l) => l.id === lesson.id).practiceNotes;

test('druga ocena tego samego ćwiczenia nadpisuje notatkę, nie dokłada drugiej', async () => {
  const k = kurs();
  const run = model(ocena('niepoprawnie', 'myli oktawę z kwintą'), ocena('częściowo', 'gubi stosunek 2:1'));
  await ocen(k, 'c1', 'oktawa to pięć dźwięków', run);
  await ocen(k, 'c1', 'oktawa to podwojenie czegoś tam', run);
  assert.deepEqual(notatki(k), [{ exerciseId: 'c1', note: 'gubi stosunek 2:1' }]);
});

test('różne ćwiczenia dostają osobne wpisy', async () => {
  const k = kurs();
  await ocen(k, 'c1', 'zła odpowiedź', model(ocena('częściowo', 'gubi stosunek 2:1')));
  await ocen(k, 'c2', 'też zła', model(ocena('niepoprawnie', 'myli amplitudę z barwą')));
  assert.deepEqual(notatki(k), [
    { exerciseId: 'c1', note: 'gubi stosunek 2:1' },
    { exerciseId: 'c2', note: 'myli amplitudę z barwą' },
  ]);
});

test('poprawna odpowiedź kasuje wpis — notatki opisują braki, nie historię', async () => {
  const k = kurs();
  await ocen(k, 'c1', 'zła odpowiedź', model(ocena('niepoprawnie', 'gubi stosunek 2:1')));
  const wynik = await ocen(k, 'c1', 'to stosunek 2:1', model(ocena('poprawnie', 'model i tak coś napisał')));
  assert.equal(wynik.note, ''); // notatka przy „poprawnie" nie powstaje, cokolwiek zwróci model
  assert.deepEqual(notatki(k), []);
});

test('treść odpowiedzi użytkownika nie ląduje w indeksie', async () => {
  const k = kurs();
  const odpowiedz = 'oktawa to jakieś pięć dźwięków chyba, nie pamiętam';
  await ocen(k, 'c1', odpowiedz, model(ocena('niepoprawnie', 'myli oktawę z kwintą')));
  const indeks = fs.readFileSync(
    path.join(process.env.DATA_DIR, 'projects', k.project.id, 'index.json'),
    'utf8',
  );
  assert.doesNotMatch(indeks, /pięć dźwięków/);
});

test('werdykt spoza enumu idzie do ponowienia, drugi zły kończy się błędem', async () => {
  const k = kurs();
  const zly = model({ verdict: 'świetnie', feedback: '', hint: '', note: '' });
  await assert.rejects(() => ocen(k, 'c1', 'cokolwiek', zly), /verdict spoza enumu/);
  assert.equal(zly.prompty.length, 1); // jedno wywołanie, w nim dwie próby

  const poprawiony = model({ verdict: 'świetnie' }, ocena('częściowo', 'gubi stosunek 2:1'));
  const wynik = await ocen(k, 'c1', 'cokolwiek', poprawiony);
  assert.equal(wynik.verdict, 'częściowo');
});

test('dziesięć ocen z rzędu przechodzi bez blokady i bez licznika prób w danych', async () => {
  const k = kurs();
  const run = model(ocena('częściowo', 'gubi stosunek 2:1'));
  for (let i = 0; i < 10; i += 1) {
    const wynik = await ocen(k, 'c1', `próba ${i}`, run);
    assert.equal(wynik.verdict, 'częściowo');
  }
  assert.equal(run.prompty.length, 10);
  assert.deepEqual(notatki(k), [{ exerciseId: 'c1', note: 'gubi stosunek 2:1' }]);
  const lekcja = store.readIndex(k.project.id).find((l) => l.id === k.lesson.id);
  assert.deepEqual(Object.keys(lekcja).filter((key) => /prób|attempt|licznik/i.test(key)), []);
});

test('prompt oceny niesie kontekst lekcji, treść ćwiczenia i odpowiedź, w języku kursu', async () => {
  const k = kurs();
  const run = model(ocena('częściowo', 'gubi stosunek 2:1'));
  await ocen(k, 'c1', 'coś tam o dźwiękach', run);
  const [prompt] = run.prompty;
  assert.deepEqual(run.stages, ['praktyka']); // własny etap = własny model w ustawieniach
  assert.doesNotMatch(prompt, /\{\{/);
  assert.match(prompt, /Teoria muzyki/);
  assert.match(prompt, /Czym jest dźwięk/);
  assert.match(prompt, /oktawa/); // covers lekcji
  assert.match(prompt, /Wyjaśnij, czym jest oktawa/);
  assert.match(prompt, /coś tam o dźwiękach/);
  assert.match(prompt, /polski \(pl\)/);
});

test('notatki wracają do promptu następnej lekcji', async () => {
  const k = kurs();
  await ocen(k, 'c1', 'zła odpowiedź', model(ocena('niepoprawnie', 'myli oktawę z kwintą')));
  const { generateLesson } = await import('../server/generator.js');
  const druga = store.addLesson(k.project.id, { afterOrder: 1, title: 'Skale' });
  const run = async (params) => {
    run.prompt = params.prompt;
    for (const name of ['index.html', 'lesson.css', 'lesson.js']) {
      fs.writeFileSync(path.join(params.cwd, name), 'x', 'utf8');
    }
    return '```json\n{ "summary": "o skalach", "covers": ["skala"] }\n```';
  };
  await generateLesson(k.project, druga, store.readIndex(k.project.id), run);
  assert.match(run.prompt, /Czym jest dźwięk: myli oktawę z kwintą/);
});
