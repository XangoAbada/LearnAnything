// Oś czasu / kolejność etapów. Pionowa, nie pozioma: przy poziomej podpisy sąsiednich punktów
// zachodzą na siebie, gdy tylko etykieta jest dłuższa niż jedno słowo. Pionowa zawija się bez końca.

export const meta = {
  nazwa: 'os-czasu',
  opis: 'Pionowa oś z ponumerowanymi punktami: etap, data, wydarzenie. Do kolejności i procesów w czasie.',
  dane: '{ punkty: [{ etykieta, opis?, znacznik?, akcent?: 1..5, biezacy?: boolean }] }',
  tryby: ['staly', 'kroki', 'parametry'],
  przyklad:
    "LA.komponent({ el: '#demko-etapy', nazwa: 'os-czasu', dane: { punkty: [{ etykieta: 'Brudnopis', znacznik: 'tydz. 1–12' }] } })",
};

export const probki = [
  {
    nazwa: 'typowa',
    dane: {
      punkty: [
        { etykieta: 'Pomysł', znacznik: 'tydz. 0', opis: 'Premisa w jednym zdaniu.' },
        { etykieta: 'Brudnopis', znacznik: 'tydz. 1–12', opis: 'Piszesz, nie poprawiasz.', biezacy: true },
        { etykieta: 'Redakcja', znacznik: 'tydz. 13–20' },
      ],
    },
  },
  {
    nazwa: 'wrogie dane',
    dane: {
      punkty: Array.from({ length: 12 }, (_, i) => ({
        etykieta: `Etap ${i + 1}: nazwa etapu rozpisana tak szeroko, że w poziomej osi dawno zachodziłaby na sąsiada`,
        znacznik: `tydzień ${i * 4 + 1}–${i * 4 + 4} roku kalendarzowego`,
        opis: 'Opis etapu liczący ponad sto dwadzieścia znaków, sprawdzający, czy tekst ustępuje w dół zamiast wychodzić poza pole rysunku.',
        akcent: (i % 5) + 1,
        biezacy: i === 7,
      })),
    },
  },
];

export const style = `
.k-os-czasu { display: grid; gap: 0; }
.k-os-czasu > li { display: grid; grid-template-columns: 1.6rem 1fr; gap: 0.7rem; list-style: none; }
.k-os-czasu .k-os-czasu-tor { display: grid; grid-template-rows: auto 1fr; justify-items: center; }
.k-os-czasu .k-os-czasu-kropka {
  width: 0.85rem; height: 0.85rem; margin-top: 0.3rem;
  background: var(--akcent-punktu, var(--wiz-1)); border: 1px solid var(--border);
}
.k-os-czasu .k-os-czasu-linia { width: 1px; background: var(--border); min-height: 0.6rem; }
.k-os-czasu > li:last-child .k-os-czasu-linia { background: none; }
.k-os-czasu .k-os-czasu-tresc { min-width: 0; padding-bottom: 0.9rem; }
.k-os-czasu .k-os-czasu-znacznik {
  display: block; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
  overflow-wrap: anywhere;
}
.k-os-czasu .k-os-czasu-etykieta { font-size: 0.92rem; font-weight: 600; overflow-wrap: anywhere; }
.k-os-czasu p { margin: 0.25rem 0 0; font-size: 0.85rem; line-height: 1.45; overflow-wrap: anywhere; }
.k-os-czasu [data-biezacy] .k-os-czasu-kropka { outline: 2px solid var(--accent); outline-offset: 2px; }
`;

export function rysuj(cel, dane, ctx) {
  const punkty = Array.isArray(dane?.punkty) ? dane.punkty : [];
  const lista = ctx.el('ol', { className: 'k-os-czasu' });

  for (const punkt of punkty) {
    const kropka = ctx.el('span', { className: 'k-os-czasu-kropka' });
    if (punkt.akcent) kropka.style.setProperty('--akcent-punktu', `var(--wiz-${punkt.akcent})`);

    const pozycja = ctx.el('li', {}, [
      ctx.el('span', { className: 'k-os-czasu-tor' }, [kropka, ctx.el('span', { className: 'k-os-czasu-linia' })]),
      ctx.el('div', { className: 'k-os-czasu-tresc' }, [
        punkt.znacznik ? ctx.el('span', { className: 'k-os-czasu-znacznik', textContent: String(punkt.znacznik) }) : null,
        ctx.el('span', { className: 'k-os-czasu-etykieta', textContent: String(punkt.etykieta ?? '') }),
        punkt.opis ? ctx.el('p', { textContent: String(punkt.opis) }) : null,
      ]),
    ]);
    if (punkt.biezacy) pozycja.dataset.biezacy = '';
    lista.append(pozycja);
  }

  cel.replaceChildren(lista);
}
