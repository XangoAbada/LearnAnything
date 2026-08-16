// The lesson script only hands the runtime its data: demo definitions with a drawing
// function, and the quiz. Grading, control panels, dragging and the sandbox are shared —
// a lesson is not allowed to have its own sliders or buttons.

// --- shared wave drawing ------------------------------------------------------

const SZER = 460;
const WYS = 150;
const OS = WYS / 2;

/** SVG path from a sample function: probka(t) in [-1, 1] for t in [0, 1]. */
function sciezka(probka, osY = OS, amplituda = OS - 12) {
  const punkty = [];
  for (let i = 0; i <= 240; i++) {
    const t = i / 240;
    punkty.push(`${(t * SZER).toFixed(1)} ${(osY - probka(t) * amplituda).toFixed(1)}`);
  }
  return `M${punkty.join(' L')}`;
}

function wykresFali(cel, d, kolor, etykieta, dodatki = '') {
  cel.innerHTML = `
    <svg viewBox="0 0 ${SZER} ${WYS}" role="img" aria-label="${etykieta}">
      <line class="os" x1="0" y1="${OS}" x2="${SZER}" y2="${OS}" />
      <path class="fala" stroke="var(${kolor})" d="${d}" />
      ${dodatki}
    </svg>`;
}

// --- demo 1: parameter controls ------------------------------------------------

LA.demoParametry({
  el: '#demko-fala',
  opis: 'Move the sliders: frequency packs the vibrations tighter, amplitude makes them swing wider.',
  kontrolki: [
    { id: 'czestotliwosc', etykieta: 'Frequency (Hz)', min: 110, max: 880, krok: 10, wartosc: 220 },
    { id: 'amplituda', etykieta: 'Amplitude (%)', min: 10, max: 100, krok: 5, wartosc: 70 },
    { id: 'ksztalt', etykieta: 'Shape', opcje: ['sine', 'square'], wartosc: 'sine' },
  ],
  rysuj: (cel, w) => {
    const okresy = w.czestotliwosc / 110; // 110 Hz is one full period across the drawing
    const fala = (t) => {
      const faza = Math.sin(2 * Math.PI * okresy * t);
      return (w.amplituda / 100) * (w.ksztalt === 'square' ? Math.sign(faza) : faza);
    };
    wykresFali(cel, sciezka(fala), '--wiz-1', 'Vibration shape for the chosen parameters');
  },
});

// --- demo 2: step by step ------------------------------------------------------

LA.demoKroki({
  el: '#demko-glosnosc',
  opis: 'Every step doubles the amplitude. On the decibel scale that is always the same +6 dB.',
  kroki: [
    { opis: 'The reference amplitude — everything else is counted from here.', amplituda: 0.125, db: 0 },
    { opis: 'Twice the swing: +6 dB.', amplituda: 0.25, db: 6 },
    { opis: 'Twice again: +12 dB. The pitch does not move at all.', amplituda: 0.5, db: 12 },
    { opis: 'Three doublings from the start: +18 dB, same frequency.', amplituda: 1, db: 18 },
  ],
  rysuj: (cel, krok) => {
    const fala = (t) => krok.amplituda * Math.sin(2 * Math.PI * 3 * t);
    wykresFali(
      cel,
      sciezka(fala),
      '--wiz-4',
      `A wave ${krok.db} decibels louder than the reference`,
      `<text class="opis" x="8" y="18">+${krok.db} dB</text>`,
    );
  },
});

// --- demo 3: direct manipulation ----------------------------------------------

const DOL = 150; // zero line of the bars
const GORA = 20; // strongest overtone share

LA.demoManipulacja({
  el: '#demko-barwa',
  opis: 'Drag the overtone bars. The sum of the parts changes the timbre, never the pitch.',
  elementy: [
    { id: 'h1', x: 60, y: 30 },
    { id: 'h2', x: 190, y: 80 },
    { id: 'h3', x: 300, y: 110 },
    { id: 'h4', x: 410, y: 130 },
  ],
  rysuj: (cel, slupki) => {
    // A bar stays in its column: x snaps back, only the vertical move counts.
    slupki.forEach((s, i) => {
      s.x = 60 + i * 115;
      s.y = Math.min(Math.max(s.y, GORA), DOL);
    });
    const udzialy = slupki.map((s) => (DOL - s.y) / (DOL - GORA));
    const suma = udzialy.reduce((a, b) => a + b, 0) || 1;
    const barwa = (t) =>
      udzialy.reduce((v, u, i) => v + u * Math.sin(2 * Math.PI * 2 * (i + 1) * t), 0) / suma;

    cel.innerHTML = `
      <svg viewBox="0 0 ${SZER} 300" role="img" aria-label="Four overtones and the resulting wave shape">
        <line class="os" x1="0" y1="${DOL}" x2="${SZER}" y2="${DOL}" />
        ${slupki
          .map(
            (s, i) => `
          <line class="slupek" stroke="var(--wiz-2)" x1="${s.x}" y1="${DOL}" x2="${s.x}" y2="${s.y}" />
          <circle class="uchwyt" cx="${s.x}" cy="${s.y}" r="10" fill="var(--wiz-2)" />
          <text class="opis" x="${s.x}" y="${DOL + 20}" text-anchor="middle">${i + 1}×</text>`,
          )
          .join('')}
        <path class="fala" stroke="var(--wiz-3)" d="${sciezka(barwa, 235, 55)}" />
        <text class="opis" x="8" y="176">sum</text>
      </svg>`;
  },
});

// --- practice: exercises graded by the model -----------------------------------

LA.cwiczenia([
  {
    id: 'c1',
    tresc:
      'Write down four consecutive octaves of the note A, starting at 110 Hz. Explain where each next value comes from.',
    rozwiazanie:
      '110 Hz, 220 Hz, 440 Hz, 880 Hz. Every step doubles the previous value — an octave is a 2:1 ratio.',
    demko: 'demko-kod',
  },
  {
    id: 'c2',
    tresc:
      'Find two objects in the room that sound clearly different in pitch (a glass and a mug, for instance). Write which one vibrates faster and how you can tell.',
    rozwiazanie:
      'The one that sounds higher vibrates faster. Smaller and stiffer things usually vibrate faster, so they sound higher.',
  },
  {
    id: 'c3',
    tresc:
      'Hum the same note twice: once softly, once loudly. Name what changed and what stayed the same.',
    rozwiazanie:
      'The frequency, that is the pitch, did not change. Only the amplitude did — the same vibration with more force behind it.',
  },
]);

// --- demo 4: code editor -------------------------------------------------------

LA.demoKod({
  el: '#demko-kod',
  jezyk: 'js',
  opis: 'Change the starting value and run it — the output shows up below.',
  kodStartowy: [
    'const start = 110;',
    '',
    'for (let i = 0; i < 5; i++) {',
    '  console.log(`Octave ${i}: ${start * 2 ** i} Hz`);',
    '}',
  ].join('\n'),
});

// --- quiz ----------------------------------------------------------------------

LA.quiz([
  {
    id: 'q1',
    typ: 'jednokrotny',
    tekst: 'What decides the pitch of a sound?',
    opcje: ['Amplitude', 'Frequency', 'Timbre'],
    poprawne: [1],
    uzasadnienie: 'Pitch is the number of vibrations per second, that is the frequency.',
  },
  {
    id: 'q2',
    typ: 'wielokrotny',
    tekst: 'Which statements about overtones are true?',
    opcje: [
      'Their frequencies are multiples of the fundamental',
      'They are responsible for timbre',
      'They change the pitch you hear',
    ],
    poprawne: [0, 1],
    uzasadnienie: 'Overtones make the timbre, but the pitch comes from the fundamental.',
  },
  {
    id: 'q3',
    typ: 'prawda-falsz',
    tekst: 'Doubling the frequency raises the sound by an octave.',
    poprawne: [0],
    uzasadnienie: 'An octave is a 2:1 ratio — 220 Hz becomes 440 Hz.',
  },
]);
