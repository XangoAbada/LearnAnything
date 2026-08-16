// Siatka kart. Zastępuje pudełka rysowane w SVG — tam tekst trzeba było ciąć przez slice()
// i i tak wyjeżdżał poza viewBox. Tutaj zawija go przeglądarka.

export const meta = {
  nazwa: 'karty',
  opis: 'Siatka kart z tytułem i treścią; tekst zawija się sam. Do zestawień pojęć, ról, składników.',
  dane: '{ karty: [{ tytul, tresc, akcent?: 1..5, stan?: "ok"|"warn"|"danger" }], kolumny?: number }',
  tryby: ['staly', 'parametry', 'kroki'],
  przyklad:
    "LA.komponent({ el: '#demko-premisa', nazwa: 'karty', dane: { karty: [{ tytul: 'KTO', tresc: 'Hela, córka latarnika' }] } })",
};

export const probki = [
  {
    nazwa: 'typowa',
    dane: {
      karty: [
        { tytul: 'KTO', tresc: 'Hela, córka latarnika', akcent: 1 },
        { tytul: 'CZEGO CHCE', tresc: 'odnaleźć siostrę', akcent: 2 },
        { tytul: 'CO PRZESZKADZA', tresc: 'świadek milczy', akcent: 3 },
      ],
    },
  },
  {
    nazwa: 'wrogie dane',
    dane: {
      karty: Array.from({ length: 12 }, (_, i) => ({
        tytul: `Bardzo długi tytuł karty numer ${i + 1}, który nie ma prawa się zmieścić w jednej linii`,
        tresc:
          'Treść tej karty jest równie przesadzona i liczy grubo ponad sto dwadzieścia znaków, żeby sprawdzić, ' +
          'czy układ ustępuje zamiast przycinać tekst albo nachodzić na sąsiada.',
        akcent: (i % 5) + 1,
        stan: ['ok', 'warn', 'danger'][i % 3],
      })),
    },
  },
];

export const style = `
.k-karty { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.6rem; }
.k-karty > article {
  border: 1px solid var(--border);
  border-left: 3px solid var(--akcent-karty, var(--wiz-1));
  background: var(--surface);
  padding: 0.7rem 0.8rem;
  min-width: 0;
}
.k-karty h4 {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  overflow-wrap: anywhere;
}
.k-karty p { margin: 0; font-size: 0.9rem; line-height: 1.45; overflow-wrap: anywhere; }
.k-karty [data-stan='ok'] { border-left-color: var(--ok); }
.k-karty [data-stan='warn'] { border-left-color: var(--warn); }
.k-karty [data-stan='danger'] { border-left-color: var(--danger); }
`;

export function rysuj(cel, dane, ctx) {
  const karty = Array.isArray(dane?.karty) ? dane.karty : [];
  const siatka = ctx.el('div', { className: 'k-karty' });
  if (dane?.kolumny) siatka.style.gridTemplateColumns = `repeat(${dane.kolumny}, minmax(0, 1fr))`;

  for (const karta of karty) {
    const box = ctx.el('article', {}, [
      karta.tytul ? ctx.el('h4', { textContent: String(karta.tytul) }) : null,
      ctx.el('p', { textContent: String(karta.tresc ?? '') }),
    ]);
    // Akcent przez zmienną, nie przez klasę na kolor: paleta zostaje w theme.css.
    if (karta.akcent) box.style.setProperty('--akcent-karty', `var(--wiz-${karta.akcent})`);
    if (karta.stan) box.dataset.stan = karta.stan;
    siatka.append(box);
  }

  cel.replaceChildren(siatka);
}
