import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-'));
const store = await import('../server/store.js');
const { generateLesson } = await import('../server/generator.js');

const ODPOWIEDZ = '```json\n{ "summary": "o falach", "covers": ["częstotliwość"] }\n```';

/** Zaślepka modelu: pisze podane pliki w cwd i oddaje tekst odpowiedzi. */
const stub = (files, text = ODPOWIEDZ) => {
  const seen = {};
  const run = async (params) => {
    Object.assign(seen, params);
    for (const name of files) fs.writeFileSync(path.join(params.cwd, name), 'x', 'utf8');
    return text;
  };
  run.seen = seen;
  return run;
};

const KOMPLET = ['index.html', 'lesson.css', 'lesson.js'];

const course = () => {
  const project = store.createProject({ topic: 'Teoria muzyki', language: 'pl' });
  const first = store.addLesson(project.id, { afterOrder: 0, title: 'Czym jest dźwięk' });
  store.updateLesson(project.id, first.id, {
    status: 'ukończona',
    score: 40,
    summary: 'o drganiach',
    covers: ['amplituda'],
    practiceNotes: [{ exerciseId: 'c1', note: 'myli amplitudę z częstotliwością' }],
  });
  const second = store.addLesson(project.id, { afterOrder: 1, title: 'Skale' });
  return { project, second };
};

test('prompt niesie szkielet, indeks poprzednich lekcji i słabe punkty', async () => {
  const { project, second } = course();
  const run = stub(KOMPLET);
  const out = await generateLesson(project, second, store.readIndex(project.id), run);

  assert.deepEqual(out, { summary: 'o falach', covers: ['częstotliwość'] });
  assert.equal(run.seen.stage, 'lekcja');
  assert.deepEqual(run.seen.allowedTools, ['Write', 'Read']);
  assert.equal(run.seen.cwd, store.lessonDir(project.id, second));

  const { prompt } = run.seen;
  assert.doesNotMatch(prompt, /\{\{/); // niepodstawiony placeholder = zmarnowane generowanie
  assert.match(prompt, /data-lesson="l2"/); // szkielet z podstawionymi danymi lekcji
  assert.match(prompt, /Czym jest dźwięk/); // indeks poprzednich lekcji
  assert.match(prompt, /myli amplitudę z częstotliwością/); // słabe punkty
  assert.match(prompt, /sprawdzian 40%/);
  assert.match(prompt, /- amplituda/); // pojęcia do powtórki
  assert.match(prompt, /3\*\*/); // ćwiczeń z tempa „normalne"

  const [, saved] = store.readIndex(project.id);
  assert.equal(saved.title, 'Skale');
});

test('postęp lekcji melduje zapisane pliki i numer tury', async () => {
  const { project, second } = course();
  const kroki = [];
  const run = async (params) => {
    params.onMessage({ type: 'system', subtype: 'init' }); // nie-asystenckie się nie liczy
    params.onMessage({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'piszę' },
          { type: 'tool_use', name: 'Write', input: { file_path: `${params.cwd}/index.html` } },
          { type: 'tool_use', name: 'Write', input: { file_path: `${params.cwd}/notatki.md` } },
        ],
      },
    });
    // Nadpisanie tego samego pliku nie może cofnąć ani podbić paska.
    params.onMessage({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', name: 'Write', input: { file_path: `${params.cwd}/index.html` } }],
      },
    });
    for (const name of KOMPLET) fs.writeFileSync(path.join(params.cwd, name), 'x', 'utf8');
    return ODPOWIEDZ;
  };

  await generateLesson(project, second, [], run, (p) => kroki.push(p));

  assert.equal(kroki.length, 2, 'wiadomość spoza asystenta nie jest turą');
  assert.deepEqual(kroki.at(-1), { turn: 2, files: ['index.html'], total: 3 });
});

test('pierwsza lekcja idzie bez powtórek', async () => {
  const project = store.createProject({ topic: 'Teoria muzyki', language: 'en' });
  const lesson = store.addLesson(project.id, { afterOrder: 0, title: 'What sound is' });
  const run = stub(KOMPLET);
  await generateLesson(project, lesson, store.readIndex(project.id), run);

  assert.match(run.seen.prompt, /pierwsza lekcja kursu/);
  assert.match(run.seen.prompt, /\*\*0\*\* z pojęć powtórkowych/);
  assert.match(run.seen.prompt, /języku: English/);
});

test('brakujący albo nadmiarowy plik unieważnia lekcję', async () => {
  const { project, second } = course();
  await assert.rejects(
    () => generateLesson(project, second, [], stub(['index.html'])),
    /lesson.css/,
  );
  await assert.rejects(
    () => generateLesson(project, second, [], stub([...KOMPLET, 'notatki.md'])),
    /notatki.md/,
  );
});

test('odpowiedź bez summary albo covers to błąd, nie cichy zapis', async () => {
  const { project, second } = course();
  await assert.rejects(
    () => generateLesson(project, second, [], stub(KOMPLET, 'gotowe!')),
    /summary albo covers/,
  );
  await assert.rejects(
    () => generateLesson(project, second, [], stub(KOMPLET, '```json\n{ "summary": "x" }\n```')),
    /summary albo covers/,
  );
});

test('katalog lekcji rusza pusty przy każdej próbie', async () => {
  const { project, second } = course();
  await assert.rejects(() => generateLesson(project, second, [], stub(['index.html', 'smiec.txt'])));
  await generateLesson(project, second, [], stub(KOMPLET));
  assert.deepEqual(store.lessonFiles(project.id, second), KOMPLET);
});

test('lekcja z planu nie dostaje kontekstu rozbudowy', async () => {
  const { project, second } = course();
  const run = stub(KOMPLET);
  await generateLesson(project, second, store.readIndex(project.id), run);
  assert.doesNotMatch(run.seen.prompt, /Rozbudowa kursu/);
});

test('wstawka dostaje tryb, lekcję źródłową i CAŁY indeks kursu', async () => {
  const { project } = course();
  const trzecia = store.addLesson(project.id, { afterOrder: 2, title: 'Akordy' });
  store.updateLesson(project.id, trzecia.id, { covers: ['tercja'] });
  const wstawka = store.addLesson(project.id, {
    afterOrder: 1,
    title: 'Znowu drgania',
    brief: 'amplituda',
    origin: 'powtórka',
  });

  const run = stub(KOMPLET);
  await generateLesson(project, wstawka, store.readIndex(project.id), run);
  const { prompt } = run.seen;

  assert.doesNotMatch(prompt, /\{\{/); // niepodstawiony placeholder = zmarnowane generowanie
  assert.match(prompt, /Rozbudowa kursu/);
  assert.match(prompt, /tryb: `powtórka`/);
  assert.match(prompt, /po lekcji \*\*Czym jest dźwięk\*\* \(1\)/);
  // Indeks całego kursu, także lekcji PO wstawce — bez tego wstawka dubluje ich materiał.
  assert.match(prompt, /\*\*Akordy\*\* \(3\)/);
  assert.match(prompt, /tercja/);
  assert.doesNotMatch(prompt, /\*\*Znowu drgania\*\* \(1.1\)/); // sama siebie nie wymienia
});

test.after(() => fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }));
