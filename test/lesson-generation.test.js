import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// DATA_DIR musi stać przed importem store.js — config rozwiązuje ścieżkę raz, przy imporcie.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'learnanything-'));
const store = await import('../server/store.js');
const { generateLesson, zamowienia } = await import('../server/generator.js');
const { komponentyDir } = await import('../server/komponenty.js');

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

// Kontrola wizualna chodzi w prawdziwej przeglądarce — w node --test podstawiamy ciszę.
const BEZ_USTEREK = { komponent: async () => [], lekcja: async () => [] };
const gen = (project, lesson, index, run, onProgress, kontrola = BEZ_USTEREK) =>
  generateLesson(project, lesson, index, run, onProgress, kontrola);

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

test('opcje treści przycinają lekcję: zero pytań, zero ćwiczeń, katalog bez komponentów', async () => {
  const { project, second } = course();
  project.content = {
    sprawdzian: 'brak',
    praktyka: 'brak',
    mikroPytania: 'brak',
    wizualizacje: 'brak',
    tryby: 'statyczne',
    uwagi: 'przykłady z produkcji muzycznej',
  };
  const run = stub(KOMPLET);
  await gen(project, second, store.readIndex(project.id), run);

  const { prompt } = run.seen;
  assert.doesNotMatch(prompt, /\{\{/);
  assert.match(prompt, /ćwiczeń w praktyce: \*\*dokładnie 0\*\*/);
  assert.match(prompt, /pytań w sprawdzianie: \*\*0\*\*, w tym \*\*0\*\*/);
  assert.match(prompt, /Bez `\.mikro-pytanie`/);
  assert.match(prompt, /Bez wizualizacji/);
  assert.match(prompt, /Wyłącznie tryb `staly`/);
  assert.match(prompt, /przykłady z produkcji muzycznej/);
  // Katalog biblioteki to kilkanaście kilobajtów — lekcja bez wizualizacji go nie dostaje.
  assert.doesNotMatch(prompt, /`wykres-xy`/);
});

test('krótszy wariant tnie liczby, nie wyłącza sekcji', async () => {
  const { project, second } = course();
  project.content = { sprawdzian: 'krótki', praktyka: 'krótka' };
  const run = stub(KOMPLET);
  await gen(project, second, store.readIndex(project.id), run);

  assert.match(run.seen.prompt, /ćwiczeń w praktyce: \*\*dokładnie 1\*\*/);
  assert.match(run.seen.prompt, /pytań w sprawdzianie: \*\*4\*\*, w tym \*\*1\*\*/);
});

test('projekt bez opcji generuje się jak dotąd', async () => {
  const { project, second } = course();
  const run = stub(KOMPLET);
  await gen(project, second, store.readIndex(project.id), run);

  const { prompt } = run.seen;
  assert.match(prompt, /ćwiczeń w praktyce: \*\*dokładnie 3\*\*/);
  assert.match(prompt, /pytań w sprawdzianie: \*\*8\*\*, w tym \*\*2\*\*/);
  assert.match(prompt, /Każda sekcja teorii kończy się jednym `\.mikro-pytanie`/);
  assert.match(prompt, /`wykres-xy`/);
});

test('prompt niesie szkielet, indeks poprzednich lekcji i słabe punkty', async () => {
  const { project, second } = course();
  const run = stub(KOMPLET);
  const out = await gen(project, second, store.readIndex(project.id), run);

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

  await gen(project, second, [], run, (p) => kroki.push(p));

  assert.equal(kroki.length, 2, 'wiadomość spoza asystenta nie jest turą');
  assert.deepEqual(kroki.at(-1), { turn: 2, files: ['index.html'], total: 3 });
});

test('pierwsza lekcja idzie bez powtórek', async () => {
  const project = store.createProject({ topic: 'Teoria muzyki', language: 'en' });
  const lesson = store.addLesson(project.id, { afterOrder: 0, title: 'What sound is' });
  const run = stub(KOMPLET);
  await gen(project, lesson, store.readIndex(project.id), run);

  assert.match(run.seen.prompt, /pierwsza lekcja kursu/);
  assert.match(run.seen.prompt, /\*\*0\*\* z pojęć powtórkowych/);
  assert.match(run.seen.prompt, /języku: English/);
});

test('brakujący albo nadmiarowy plik unieważnia lekcję', async () => {
  const { project, second } = course();
  await assert.rejects(
    () => gen(project, second, [], stub(['index.html'])),
    /lesson.css/,
  );
  await assert.rejects(
    () => gen(project, second, [], stub([...KOMPLET, 'notatki.md'])),
    /notatki.md/,
  );
});

test('odpowiedź bez summary albo covers to błąd, nie cichy zapis', async () => {
  const { project, second } = course();
  await assert.rejects(
    () => gen(project, second, [], stub(KOMPLET, 'gotowe!')),
    /summary albo covers/,
  );
  await assert.rejects(
    () => gen(project, second, [], stub(KOMPLET, '```json\n{ "summary": "x" }\n```')),
    /summary albo covers/,
  );
});

test('katalog lekcji rusza pusty przy każdej próbie', async () => {
  const { project, second } = course();
  await assert.rejects(() => gen(project, second, [], stub(['index.html', 'smiec.txt'])));
  await gen(project, second, [], stub(KOMPLET));
  assert.deepEqual(store.lessonFiles(project.id, second), KOMPLET);
});

test('lekcja z planu nie dostaje kontekstu rozbudowy', async () => {
  const { project, second } = course();
  const run = stub(KOMPLET);
  await gen(project, second, store.readIndex(project.id), run);
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
  await gen(project, wstawka, store.readIndex(project.id), run);
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


// --- biblioteka komponentów ---------------------------------------------------

test('prompt lekcji niesie katalog komponentów i widzi bibliotekę do odczytu', async () => {
  const { project, second } = course();
  const run = stub(KOMPLET);
  await gen(project, second, [], run);

  assert.match(run.seen.prompt, /LA\.komponent/);
  assert.match(run.seen.prompt, /`karty`/);
  assert.deepEqual(run.seen.additionalDirectories, [komponentyDir]);
});

test('lekcja pisząca po bibliotece jest unieważniona', async () => {
  const { project, second } = course();
  const podrzucony = path.join(komponentyDir, 'podrzucony-test.js');
  const run = async (params) => {
    for (const name of KOMPLET) fs.writeFileSync(path.join(params.cwd, name), 'x', 'utf8');
    fs.writeFileSync(podrzucony, 'export const meta = {};', 'utf8'); // czego SDK nie zabroni
    return ODPOWIEDZ;
  };
  try {
    await assert.rejects(() => gen(project, second, [], run), /biblioteka komponentów została zmieniona/);
  } finally {
    fs.rmSync(podrzucony, { force: true });
  }
});

/** Zaślepka rozdzielająca etapy: lekcja pisze pliki, etap `komponent` pisze plik komponentu. */
const stubZEtapami = ({ zamowienie, komponentPisze = true }) => {
  const etapy = [];
  const run = async (params) => {
    etapy.push(params.stage);
    if (params.stage === 'lekcja') {
      for (const name of KOMPLET) fs.writeFileSync(path.join(params.cwd, name), 'x', 'utf8');
      return '```json\n' + JSON.stringify({ summary: 's', covers: ['c'], komponenty: [zamowienie] }) + '\n```';
    }
    // Ten sam etap łata lekcję — wtedy w cwd leży już index.html i nic nowego tam nie wchodzi.
    const laty = fs.existsSync(path.join(params.cwd, 'index.html'));
    if (komponentPisze && !laty) fs.writeFileSync(path.join(params.cwd, `${zamowienie.nazwa}.js`), 'x', 'utf8');
    return '```json\n{ "nazwa": "x", "opis": "y" }\n```';
  };
  run.etapy = etapy;
  return run;
};

test('zamówiony komponent powstaje osobnym, tanim etapem i wchodzi do biblioteki', async () => {
  const { project, second } = course();
  const run = stubZEtapami({ zamowienie: { nazwa: 'testowy-komponent', opis: 'o', dane: '{}' } });
  const cel = path.join(komponentyDir, 'testowy-komponent.js');
  try {
    const out = await gen(project, second, [], run, undefined, BEZ_USTEREK);
    assert.deepEqual(out, { summary: 's', covers: ['c'] });
    assert.deepEqual(run.etapy, ['lekcja', 'komponent']);
    assert.ok(fs.existsSync(cel), 'komponent bez usterek wchodzi do biblioteki bez pytania');
  } finally {
    fs.rmSync(cel, { force: true });
  }
});

test('komponent z usterkami dostaje rundy naprawcze, a potem lekcja idzie do łatania', async () => {
  const { project, second } = course();
  const run = stubZEtapami({ zamowienie: { nazwa: 'wadliwy-komponent', opis: 'o', dane: '{}' } });
  const usterka = [{ regula: 'tekst-poza-kadrem', gdzie: 'k1', szczegol: 'wyjeżdża', komponent: 'wadliwy-komponent', motyw: 'jasny', szerokosc: 560 }];
  let lekcjaSprawdzona = 0;

  const out = await gen(project, second, [], run, undefined, {
    komponent: async () => usterka,
    lekcja: async () => (lekcjaSprawdzona++ ? [] : []),
  });

  // pierwsze podejście + dwie rundy naprawcze, a na końcu jedno łatanie lekcji
  assert.deepEqual(run.etapy, ['lekcja', 'komponent', 'komponent', 'komponent', 'komponent']);
  assert.equal(lekcjaSprawdzona, 2, 'lekcja sprawdzana przed łataniem i po nim');
  assert.equal(out.summary, 's', 'materiał zostaje, poprawiany jest sposób pokazania');
  assert.ok(!fs.existsSync(path.join(komponentyDir, 'wadliwy-komponent.js')));
});

test('twarda usterka lekcji, której nie da się załatać, unieważnia lekcję', async () => {
  const { project, second } = course();
  const twarda = [{ regula: 'tekst-poza-kadrem', gdzie: 'k1', szczegol: 'wyjeżdża', komponent: 'lekcja', motyw: 'jasny', szerokosc: 1000 }];
  await assert.rejects(
    () => gen(project, second, [], stub(KOMPLET), undefined, { komponent: async () => [], lekcja: async () => twarda }),
    /kontrola wizualna nie przeszła/,
  );
});

test('zamówienia są filtrowane: złe nazwy, duplikaty i nadmiar ponad trzy', () => {
  const dane = {
    komponenty: [
      { nazwa: 'macierz-2x2' },
      { nazwa: 'macierz-2x2' }, // duplikat
      { nazwa: 'karty' }, // już istnieje
      { nazwa: 'ZłaNazwa' },
      { nazwa: 'a' }, // za krótka
      { nazwa: 'druga-rzecz' },
      { nazwa: 'trzecia-rzecz' },
      { nazwa: 'czwarta-rzecz' },
    ],
  };
  assert.deepEqual(
    zamowienia(dane, ['karty']).map((z) => z.nazwa),
    ['macierz-2x2', 'druga-rzecz', 'trzecia-rzecz'],
  );
  assert.deepEqual(zamowienia({}, []), []);
});

test.after(() => fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }));
