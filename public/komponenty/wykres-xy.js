// Jedyny komponent, który naprawdę potrzebuje SVG: krzywe i serie punktów.
// W SVG zostają wyłącznie liczby przy podziałce — tytuły osi i legenda są HTML-em pod rysunkiem,
// bo to one bywają długie, a <text> nie zawija.

export const meta = {
  nazwa: 'wykres-xy',
  opis: 'Wykres liniowy XY z osiami i siatką; legenda i tytuły osi w HTML. Do zależności, przebiegów, funkcji.',
  dane: '{ serie: [{ nazwa, punkty: [[x, y]], akcent?: 1..5 }], osX?: { tytul?, min?, max? }, osY?: { … } }',
  tryby: ['staly', 'parametry', 'kroki'],
  przyklad:
    "LA.komponent({ el: '#demko-fala', nazwa: 'wykres-xy', dane: { serie: [{ nazwa: '220 Hz', punkty: [[0, 0], [1, 1]] }] } })",
};

const sinus = (okresy) => Array.from({ length: 121 }, (_, i) => [i / 120, Math.sin(2 * Math.PI * okresy * (i / 120))]);

export const probki = [
  {
    nazwa: 'typowa',
    dane: {
      osX: { tytul: 'czas (s)' },
      osY: { tytul: 'wychylenie', min: -1, max: 1 },
      serie: [
        { nazwa: '220 Hz', punkty: sinus(2), akcent: 1 },
        { nazwa: '440 Hz', punkty: sinus(4), akcent: 2 },
      ],
    },
  },
  {
    nazwa: 'wrogie dane',
    dane: {
      osX: { tytul: 'Bardzo długi tytuł osi poziomej, który nie zmieściłby się pod wykresem w jednej linii' },
      osY: { tytul: 'Równie długi tytuł osi pionowej z jednostką podaną w nawiasie (jednostek umownych)' },
      serie: Array.from({ length: 5 }, (_, s) => ({
        nazwa: `Seria numer ${s + 1} o nazwie tak długiej, że legenda musi się zawinąć do kolejnego wiersza`,
        punkty: Array.from({ length: 40 }, (_, i) => [i * 1234, (s % 2 ? -1 : 1) * i * i * (s + 1) * 987 || 0]),
        akcent: (s % 5) + 1,
      })),
    },
  },
];

export const style = `
.k-wykres-xy svg { display: block; width: 100%; max-width: 600px; height: auto; }
.k-wykres-xy .k-wykres-xy-siatka { stroke: var(--wiz-siatka); stroke-width: 1; }
.k-wykres-xy .k-wykres-xy-os { stroke: var(--border); stroke-width: 1.5; }
.k-wykres-xy .k-wykres-xy-seria { fill: none; stroke-width: 2; }
.k-wykres-xy .k-wykres-xy-podzialka { font-size: 15px; fill: var(--muted); font-family: var(--font-mono); }
.k-wykres-xy .k-wykres-xy-tytuly { display: flex; flex-wrap: wrap; gap: 0.2rem 1rem; margin-top: 0.4rem; }
.k-wykres-xy .k-wykres-xy-tytuly span,
.k-wykres-xy .k-wykres-xy-legenda span {
  font-size: 0.75rem; color: var(--muted); overflow-wrap: anywhere; min-width: 0;
}
.k-wykres-xy .k-wykres-xy-legenda { display: flex; flex-wrap: wrap; gap: 0.3rem 0.9rem; margin-top: 0.3rem; }
.k-wykres-xy .k-wykres-xy-legenda span { display: flex; align-items: baseline; gap: 0.35rem; }
.k-wykres-xy .k-wykres-xy-probka { width: 0.8rem; height: 0.2rem; flex: 0 0 auto; background: var(--wiz-1); }
`;

const W = 600;
const H = 300;
const MARGINES = { gora: 12, prawo: 12, dol: 30 };
const ZNAK = 9; // szerokość cyfry w foncie mono przy 15 px — z niej liczy się margines na podziałkę

/** Krótko, bo to jedyny tekst w SVG: 1234567 → „1.2M", 0.5 → „0.5". */
function skrot(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  if (a === 0) return '0';
  if (a < 0.01) return v.toExponential(0);
  return String(Math.round(v * 100) / 100);
}

const zakres = (wartosci, os) => {
  let min = Number.isFinite(os?.min) ? os.min : Math.min(...wartosci);
  let max = Number.isFinite(os?.max) ? os.max : Math.max(...wartosci);
  if (!Number.isFinite(min) || !Number.isFinite(max)) [min, max] = [0, 1];
  if (min === max) [min, max] = [min - 1, max + 1]; // płaska seria nie może dzielić przez zero
  return [min, max];
};

export function rysuj(cel, dane, ctx) {
  const serie = (Array.isArray(dane?.serie) ? dane.serie : [])
    .map((s) => ({ ...s, punkty: (Array.isArray(s.punkty) ? s.punkty : []).filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1])) }))
    .filter((s) => s.punkty.length);

  const wszystkie = serie.flatMap((s) => s.punkty);
  const [xMin, xMax] = zakres(wszystkie.map((p) => p[0]), dane?.osX);
  const [yMin, yMax] = zakres(wszystkie.map((p) => p[1]), dane?.osY);

  const kroki = 4;
  const tick = (i, min, max) => min + ((max - min) * i) / kroki;
  // Margines z najdłuższej etykiety, nie na oko: „750.6k" przy stałych 52 px wychodziło poza kadr.
  const etykietyY = Array.from({ length: kroki + 1 }, (_, i) => skrot(tick(i, yMin, yMax)));
  const lewo = 10 + Math.max(...etykietyY.map((t) => t.length)) * ZNAK;

  const px = (x) => lewo + ((x - xMin) / (xMax - xMin)) * (W - lewo - MARGINES.prawo);
  const py = (y) => H - MARGINES.dol - ((y - yMin) / (yMax - yMin)) * (H - MARGINES.gora - MARGINES.dol);

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${serie.map((s) => s.nazwa).join(', ') || 'wykres'}">
      ${Array.from({ length: kroki + 1 }, (_, i) => {
        const y = py(tick(i, yMin, yMax));
        return `<line class="k-wykres-xy-siatka" x1="${lewo}" y1="${y}" x2="${W - MARGINES.prawo}" y2="${y}" />
                <text class="k-wykres-xy-podzialka" x="${lewo - 6}" y="${y + 5}" text-anchor="end">${etykietyY[i]}</text>`;
      }).join('')}
      ${Array.from({ length: kroki + 1 }, (_, i) => {
        const x = px(tick(i, xMin, xMax));
        const kotwica = i === 0 ? 'start' : i === kroki ? 'end' : 'middle';
        return `<text class="k-wykres-xy-podzialka" x="${x}" y="${H - MARGINES.dol + 18}" text-anchor="${kotwica}">${skrot(tick(i, xMin, xMax))}</text>`;
      }).join('')}
      <line class="k-wykres-xy-os" x1="${lewo}" y1="${MARGINES.gora}" x2="${lewo}" y2="${H - MARGINES.dol}" />
      <line class="k-wykres-xy-os" x1="${lewo}" y1="${H - MARGINES.dol}" x2="${W - MARGINES.prawo}" y2="${H - MARGINES.dol}" />
      ${serie
        .map(
          (s) =>
            `<path class="k-wykres-xy-seria" stroke="var(--wiz-${s.akcent ?? 1})" d="M${s.punkty
              .map((p) => `${px(p[0]).toFixed(1)} ${py(p[1]).toFixed(1)}`)
              .join(' L')}" />`,
        )
        .join('')}
    </svg>`;

  const pole = ctx.el('div', { className: 'k-wykres-xy' });
  pole.innerHTML = svg;

  const tytuly = [dane?.osY?.tytul && `↑ ${dane.osY.tytul}`, dane?.osX?.tytul && `→ ${dane.osX.tytul}`].filter(Boolean);
  if (tytuly.length) {
    pole.append(ctx.el('div', { className: 'k-wykres-xy-tytuly' }, tytuly.map((t) => ctx.el('span', { textContent: t }))));
  }
  if (serie.length > 1 || serie.some((s) => s.nazwa)) {
    pole.append(
      ctx.el(
        'div',
        { className: 'k-wykres-xy-legenda' },
        serie.map((s) => {
          const probka = ctx.el('span', { className: 'k-wykres-xy-probka' });
          probka.style.background = `var(--wiz-${s.akcent ?? 1})`;
          return ctx.el('span', {}, [probka, ctx.el('span', { textContent: String(s.nazwa ?? '') })]);
        }),
      ),
    );
  }

  cel.replaceChildren(pole);
}
