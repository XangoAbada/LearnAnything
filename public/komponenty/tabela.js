// Tabela porównawcza. Natywny <table> daje zawijanie, nagłówki i czytnik ekranu za darmo —
// to samo narysowane w SVG wymaga liczenia szerokości kolumn i zawsze się rozjeżdża.

export const meta = {
  nazwa: 'tabela',
  opis: 'Tabela porównawcza z nagłówkami; komórki zawijają się. Do zestawień cech, wad i zalet, zależności.',
  dane: '{ naglowki: [string], wiersze: [[string]], podpis?, wyroznionaKolumna?: number }',
  tryby: ['staly', 'parametry', 'kroki'],
  przyklad:
    "LA.komponent({ el: '#demko-porownanie', nazwa: 'tabela', dane: { naglowki: ['Podejście', 'Koszt'], wiersze: [['Monolit', 'niski']] } })",
};

export const probki = [
  {
    nazwa: 'typowa',
    dane: {
      naglowki: ['Podejście', 'Koszt startu', 'Koszt zmiany'],
      wiersze: [
        ['Monolit', 'niski', 'rośnie z czasem'],
        ['Usługi', 'wysoki', 'stały'],
      ],
      podpis: 'Nie ma dobrych architektur, są opłacalne',
    },
  },
  {
    nazwa: 'wrogie dane',
    dane: {
      naglowki: [
        'Kolumna pierwsza z bardzo długim nagłówkiem opisowym',
        'Druga',
        'Trzecia kolumna również z rozwlekłym nagłówkiem',
        'Czwarta',
        'Piąta',
        'Szósta',
      ],
      wiersze: Array.from({ length: 12 }, (_, i) => [
        `Wiersz ${i + 1} z komórką, której treść przekracza sto dwadzieścia znaków i musi się zawinąć, zamiast rozpychać tabelę w bok bez końca.`,
        'krótko',
        'Średniej długości komórka z kilkoma słowami.',
        String(1234567 * (i + 1)),
        '—',
        'ok',
      ]),
      wyroznionaKolumna: 0,
    },
  },
];

export const style = `
.k-tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.k-tabela th, .k-tabela td {
  border: 1px solid var(--border); padding: 0.45rem 0.6rem; text-align: left;
  vertical-align: top; line-height: 1.4; overflow-wrap: anywhere;
}
.k-tabela thead th {
  background: var(--surface-2);
  font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.k-tabela tbody tr:nth-child(even) { background: var(--surface); }
.k-tabela [data-wyrozniona] { font-weight: 600; }
.k-tabela-podpis { font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
`;

export function rysuj(cel, dane, ctx) {
  const naglowki = Array.isArray(dane?.naglowki) ? dane.naglowki : [];
  const wiersze = Array.isArray(dane?.wiersze) ? dane.wiersze : [];
  const wyrozniona = Number.isInteger(dane?.wyroznionaKolumna) ? dane.wyroznionaKolumna : -1;

  const komorka = (tag, tekst, kolumna) => {
    const node = ctx.el(tag, { textContent: String(tekst ?? '') });
    if (kolumna === wyrozniona) node.dataset.wyrozniona = '';
    return node;
  };

  const tabela = ctx.el('table', { className: 'k-tabela' }, [
    naglowki.length
      ? ctx.el('thead', {}, [ctx.el('tr', {}, naglowki.map((h, i) => komorka('th', h, i)))])
      : null,
    ctx.el(
      'tbody',
      {},
      wiersze.map((wiersz) =>
        ctx.el('tr', {}, (Array.isArray(wiersz) ? wiersz : [wiersz]).map((c, i) => komorka('td', c, i))),
      ),
    ),
  ]);

  cel.replaceChildren(tabela);
  if (dane?.podpis) {
    cel.append(ctx.el('figcaption', { className: 'k-tabela-podpis', textContent: String(dane.podpis) }));
  }
}
