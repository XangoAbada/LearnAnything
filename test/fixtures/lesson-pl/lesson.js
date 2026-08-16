// Zadania skryptu lekcji: podać dane demek z funkcją rysującą i podać sprawdzian.
// Ocena, panele sterowania, przeciąganie i sandbox są wspólne — lekcja nie ma prawa
// mieć własnych suwaków ani przycisków.

// --- wspólne rysowanie fal ---------------------------------------------------

const SZER = 460;
const WYS = 150;
const OS = WYS / 2;

/** Ścieżka SVG z funkcji próbki: probka(t) w zakresie [-1, 1] dla t w [0, 1]. */
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

// --- demko 1: sterowanie parametrami -----------------------------------------

LA.demoParametry({
  el: '#demko-fala',
  opis: 'Przesuń suwaki: częstotliwość zagęszcza drgania, amplituda podnosi ich wychylenie.',
  kontrolki: [
    {
      id: 'czestotliwosc',
      etykieta: 'Częstotliwość (Hz)',
      min: 110,
      max: 880,
      krok: 10,
      wartosc: 220,
    },
    { id: 'amplituda', etykieta: 'Amplituda (%)', min: 10, max: 100, krok: 5, wartosc: 70 },
    { id: 'ksztalt', etykieta: 'Kształt', opcje: ['sinus', 'prostokąt'], wartosc: 'sinus' },
  ],
  rysuj: (cel, w) => {
    const okresy = w.czestotliwosc / 110; // 110 Hz to jeden pełny okres na szerokość rysunku
    const fala = (t) => {
      const faza = Math.sin(2 * Math.PI * okresy * t);
      return (w.amplituda / 100) * (w.ksztalt === 'prostokąt' ? Math.sign(faza) : faza);
    };
    wykresFali(cel, sciezka(fala), '--wiz-1', 'Kształt drgania przy zadanych parametrach');
  },
});

// --- demko 2: krok po kroku ---------------------------------------------------

LA.demoKroki({
  el: '#demko-glosnosc',
  opis: 'Każdy krok podwaja amplitudę. Na skali decybelowej to zawsze te same +6 dB.',
  kroki: [
    { opis: 'Amplituda odniesienia — od niej liczymy resztę.', amplituda: 0.125, db: 0 },
    { opis: 'Dwa razy większe wychylenie: +6 dB.', amplituda: 0.25, db: 6 },
    { opis: 'Znowu dwa razy: +12 dB. Wysokość nawet nie drgnie.', amplituda: 0.5, db: 12 },
    { opis: 'Trzy podwojenia od startu: +18 dB, ta sama częstotliwość.', amplituda: 1, db: 18 },
  ],
  rysuj: (cel, krok) => {
    const fala = (t) => krok.amplituda * Math.sin(2 * Math.PI * 3 * t);
    wykresFali(
      cel,
      sciezka(fala),
      '--wiz-4',
      `Fala głośniejsza o ${krok.db} decybeli od odniesienia`,
      `<text class="opis" x="8" y="18">+${krok.db} dB</text>`,
    );
  },
});

// --- demko 3: manipulacja bezpośrednia ---------------------------------------

const DOL = 150; // poziom zerowy słupków
const GORA = 20; // maksymalny udział alikwotu

LA.demoManipulacja({
  el: '#demko-barwa',
  opis: 'Przeciągnij słupki alikwotów. Suma składowych zmienia barwę, nie wysokość dźwięku.',
  elementy: [
    { id: 'h1', x: 60, y: 30 },
    { id: 'h2', x: 190, y: 80 },
    { id: 'h3', x: 300, y: 110 },
    { id: 'h4', x: 410, y: 130 },
  ],
  rysuj: (cel, slupki) => {
    // Słupek stoi w swojej kolumnie: x wraca na miejsce, liczy się ruch w pionie.
    slupki.forEach((s, i) => {
      s.x = 60 + i * 115;
      s.y = Math.min(Math.max(s.y, GORA), DOL);
    });
    const udzialy = slupki.map((s) => (DOL - s.y) / (DOL - GORA));
    const suma = udzialy.reduce((a, b) => a + b, 0) || 1;
    const barwa = (t) =>
      udzialy.reduce((v, u, i) => v + u * Math.sin(2 * Math.PI * 2 * (i + 1) * t), 0) / suma;

    cel.innerHTML = `
      <svg viewBox="0 0 ${SZER} 300" role="img" aria-label="Cztery alikwoty i wypadkowy kształt fali">
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
        <text class="opis" x="8" y="176">wypadkowa</text>
      </svg>`;
  },
});

// --- praktyka: ćwiczenia oceniane przez model --------------------------------

LA.cwiczenia([
  {
    id: 'c1',
    tresc:
      'Wypisz częstotliwości czterech kolejnych oktaw dźwięku A, zaczynając od 110 Hz. Wyjaśnij, skąd bierze się każda kolejna wartość.',
    rozwiazanie:
      '110 Hz, 220 Hz, 440 Hz, 880 Hz. Każdy krok to podwojenie poprzedniej wartości — oktawa to stosunek 2:1.',
    demko: 'demko-kod',
  },
  {
    id: 'c2',
    tresc:
      'Znajdź w pokoju dwa przedmioty wydające dźwięk o wyraźnie różnej wysokości (np. szklankę i kubek). Napisz, który z nich drga szybciej i po czym to poznajesz.',
    rozwiazanie:
      'Szybciej drga ten, który brzmi wyżej. Mniejsza i sztywniejsza rzecz zwykle drga szybciej, więc daje wyższy dźwięk.',
  },
  {
    id: 'c3',
    tresc:
      'Zanuć ten sam dźwięk dwa razy: raz cicho, raz głośno. Nazwij, co się zmieniło, a co zostało bez zmian.',
    rozwiazanie:
      'Nie zmieniła się częstotliwość, czyli wysokość. Zmieniła się wyłącznie amplituda — to samo drganie o innej sile.',
  },
]);

// --- demko 4: edytor kodu -----------------------------------------------------

LA.demoKod({
  el: '#demko-kod',
  jezyk: 'js',
  opis: 'Zmień wartość startową i uruchom — wynik wypisze się niżej.',
  kodStartowy: [
    'const start = 110;',
    '',
    'for (let i = 0; i < 5; i++) {',
    '  console.log(`Oktawa ${i}: ${start * 2 ** i} Hz`);',
    '}',
  ].join('\n'),
});

// --- sprawdzian ---------------------------------------------------------------

LA.quiz([
  {
    id: 'q1',
    typ: 'jednokrotny',
    tekst: 'Co decyduje o wysokości dźwięku?',
    opcje: ['Amplituda', 'Częstotliwość', 'Barwa'],
    poprawne: [1],
    uzasadnienie: 'Wysokość to liczba drgań na sekundę, czyli częstotliwość.',
  },
  {
    id: 'q2',
    typ: 'wielokrotny',
    tekst: 'Które zdania o alikwotach są prawdziwe?',
    opcje: [
      'Ich częstotliwości są wielokrotnościami składowej podstawowej',
      'Odpowiadają za barwę dźwięku',
      'Zmieniają słyszaną wysokość dźwięku',
    ],
    poprawne: [0, 1],
    uzasadnienie: 'Alikwoty składają się na barwę, ale wysokość niesie składowa podstawowa.',
  },
  {
    id: 'q3',
    typ: 'prawda-falsz',
    tekst: 'Podwojenie częstotliwości podnosi dźwięk o oktawę.',
    poprawne: [0],
    uzasadnienie: 'Oktawa to stosunek 2:1 — z 220 Hz robi się 440 Hz.',
  },
]);
