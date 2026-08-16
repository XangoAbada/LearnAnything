// Słupki poziome. Poziome, nie pionowe, bo etykieta stoi obok słupka i może się zawinąć —
// przy pionowych etykieta pod słupkiem zawsze albo nachodzi na sąsiednią, albo jest ucinana.

export const meta = {
  nazwa: 'slupki',
  opis: 'Słupki poziome z etykietą i wartością; etykieta zawija się. Do porównań wielkości i udziałów.',
  dane: '{ slupki: [{ etykieta, wartosc, akcent?: 1..5, opis? }], jednostka?, max? }',
  tryby: ['staly', 'parametry', 'kroki'],
  przyklad:
    "LA.komponent({ el: '#demko-budzet', nazwa: 'slupki', dane: { jednostka: 'h', slupki: [{ etykieta: 'Pisanie', wartosc: 10 }] } })",
};

export const probki = [
  {
    nazwa: 'typowa',
    dane: {
      jednostka: 'h/tydz.',
      slupki: [
        { etykieta: 'Pisanie', wartosc: 10, akcent: 1 },
        { etykieta: 'Poprawki', wartosc: 4, akcent: 2 },
        { etykieta: 'Riserczowanie', wartosc: 2, akcent: 3 },
      ],
    },
  },
  {
    nazwa: 'wrogie dane',
    dane: {
      jednostka: 'jednostek umownych na tydzień',
      slupki: Array.from({ length: 12 }, (_, i) => ({
        etykieta: `Pozycja numer ${i + 1} z etykietą tak długą, że musi się zawinąć na kilka linii bez rozpychania wykresu`,
        wartosc: [0, 1, 7, 1234567, 42, 3, 99, 5, 18, 250, 8, 61][i],
        akcent: (i % 5) + 1,
      })),
    },
  },
];

export const style = `
.k-slupki { display: grid; gap: 0.5rem; }
.k-slupki > div { display: grid; grid-template-columns: minmax(6rem, 12rem) 1fr auto; gap: 0.6rem; align-items: center; }
.k-slupki .k-slupki-etykieta { font-size: 0.85rem; line-height: 1.35; overflow-wrap: anywhere; min-width: 0; }
.k-slupki .k-slupki-tor { background: var(--surface-2); border: 1px solid var(--border); height: 1.1rem; min-width: 2rem; }
.k-slupki .k-slupki-wypelnienie { height: 100%; background: var(--wiz-1); }
.k-slupki .k-slupki-wartosc { font-variant-numeric: tabular-nums; font-size: 0.85rem; white-space: nowrap; }
.k-slupki figcaption, .k-slupki .k-slupki-jednostka {
  font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
}
`;

export function rysuj(cel, dane, ctx) {
  const slupki = Array.isArray(dane?.slupki) ? dane.slupki : [];
  const liczby = slupki.map((s) => Number(s.wartosc) || 0);
  // Skala z danych, chyba że lekcja narzuca swoją. Zero-max daje puste tory zamiast dzielenia przez zero.
  const max = Number(dane?.max) || Math.max(...liczby, 0);

  const lista = ctx.el('div', { className: 'k-slupki' });
  slupki.forEach((slupek, i) => {
    const wypelnienie = ctx.el('div', { className: 'k-slupki-wypelnienie' });
    wypelnienie.style.width = max > 0 ? `${Math.max((liczby[i] / max) * 100, liczby[i] > 0 ? 1 : 0)}%` : '0%';
    if (slupek.akcent) wypelnienie.style.background = `var(--wiz-${slupek.akcent})`;

    lista.append(
      ctx.el('div', {}, [
        ctx.el('span', { className: 'k-slupki-etykieta', textContent: String(slupek.etykieta ?? '') }),
        ctx.el('div', { className: 'k-slupki-tor', role: 'img', 'aria-label': `${slupek.etykieta}: ${liczby[i]}` }, [
          wypelnienie,
        ]),
        ctx.el('span', { className: 'k-slupki-wartosc', textContent: String(slupek.wartosc ?? '') }),
      ]),
    );
  });

  cel.replaceChildren(lista);
  if (dane?.jednostka) {
    cel.append(ctx.el('figcaption', { className: 'k-slupki-jednostka', textContent: String(dane.jednostka) }));
  }
}
