// Przepływ A → B → C. Kroki są zwykłymi pudełkami HTML w kontenerze flex z zawijaniem:
// łańcuch narysowany w SVG ma stałą szerokość i przy dłuższych podpisach ucina tekst.

export const meta = {
  nazwa: 'przeplyw',
  opis: 'Łańcuch kroków ze strzałkami, zawijany do kolejnych rzędów. Do procesów, potoków, przepływu danych.',
  dane: '{ kroki: [{ etykieta, opis?, akcent?: 1..5 }], kierunek?: "poziomy"|"pionowy" }',
  tryby: ['staly', 'kroki', 'parametry'],
  przyklad:
    "LA.komponent({ el: '#demko-zadanie', nazwa: 'przeplyw', dane: { kroki: [{ etykieta: 'Przeglądarka' }, { etykieta: 'Serwer' }] } })",
};

export const probki = [
  {
    nazwa: 'typowa',
    dane: {
      kroki: [
        { etykieta: 'Przeglądarka', opis: 'wysyła żądanie', akcent: 1 },
        { etykieta: 'Serwer', opis: 'składa odpowiedź', akcent: 2 },
        { etykieta: 'Baza', opis: 'zwraca dane', akcent: 3 },
      ],
    },
  },
  {
    nazwa: 'wrogie dane',
    dane: {
      kroki: Array.from({ length: 12 }, (_, i) => ({
        etykieta: `Krok numer ${i + 1} o nazwie zdecydowanie za długiej na jedno pudełko w rzędzie`,
        opis: 'Dodatkowy opis kroku liczący ponad sto dwadzieścia znaków, po to, żeby sprawdzić zawijanie i to, czy strzałki nie wchodzą na tekst.',
        akcent: (i % 5) + 1,
      })),
      kierunek: 'poziomy',
    },
  },
];

export const style = `
.k-przeplyw { display: flex; flex-wrap: wrap; align-items: stretch; gap: 0.5rem; }
.k-przeplyw[data-kierunek='pionowy'] { flex-direction: column; align-items: stretch; }
.k-przeplyw .k-przeplyw-krok {
  flex: 1 1 10rem; min-width: 0;
  border: 1px solid var(--border);
  border-top: 3px solid var(--akcent-kroku, var(--wiz-1));
  background: var(--surface); padding: 0.6rem 0.7rem;
}
.k-przeplyw .k-przeplyw-etykieta { display: block; font-size: 0.88rem; font-weight: 600; overflow-wrap: anywhere; }
.k-przeplyw p { margin: 0.25rem 0 0; font-size: 0.8rem; line-height: 1.4; color: var(--muted); overflow-wrap: anywhere; }
.k-przeplyw .k-przeplyw-strzalka {
  flex: 0 0 auto; align-self: center; color: var(--muted); font-size: 1.1rem; line-height: 1;
}
.k-przeplyw[data-kierunek='pionowy'] .k-przeplyw-strzalka { align-self: start; }
`;

export function rysuj(cel, dane, ctx) {
  const kroki = Array.isArray(dane?.kroki) ? dane.kroki : [];
  const pionowy = dane?.kierunek === 'pionowy';
  const lancuch = ctx.el('div', { className: 'k-przeplyw' });
  lancuch.dataset.kierunek = pionowy ? 'pionowy' : 'poziomy';

  kroki.forEach((krok, i) => {
    const box = ctx.el('div', { className: 'k-przeplyw-krok' }, [
      ctx.el('span', { className: 'k-przeplyw-etykieta', textContent: String(krok.etykieta ?? '') }),
      krok.opis ? ctx.el('p', { textContent: String(krok.opis) }) : null,
    ]);
    if (krok.akcent) box.style.setProperty('--akcent-kroku', `var(--wiz-${krok.akcent})`);
    lancuch.append(box);
    // Strzałka jest ozdobą kierunku, nie treścią — czytnik ekranu ma czytać same kroki po kolei.
    if (i < kroki.length - 1) {
      lancuch.append(
        ctx.el('span', { className: 'k-przeplyw-strzalka', textContent: pionowy ? '↓' : '→', 'aria-hidden': 'true' }),
      );
    }
  });

  cel.replaceChildren(lancuch);
}
