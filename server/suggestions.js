import { minInsertOrder } from './store.js';

// Propozycje liczone przy KAŻDYM odczycie projektu i nigdzie nie zapisywane — to nie encja.
// Czysta funkcja: bez dysku, bez kolejki, bez modelu. Propozycja niczego nie generuje;
// dopiero „Utwórz lekcję" woła POST /lessons — tę samą trasę co ręczne dodanie.
//
// Tu żyją tylko `powtórka` i `rozwinięcie`, bo wynikają wprost z indeksu. `nowy wątek`
// wymaga wiedzy o temacie, więc idzie osobnym przyciskiem i osobnym wywołaniem modelu
// (generator.suggestThreads) — ekran projektu nie może czekać na Claude'a przy odświeżeniu.

export const LOW_SCORE = 60;
export const GOOD_SCORE = 80;
const MIN_NOTES = 2; // jedno potknięcie to nie brak; brakiem robi je powtarzalność

/** Lekcja-rodzic wstawki: 4.15 → 4.1, 4.1 → 4, 4 → 4. Po tym poznajemy duplikat propozycji. */
const parentOrder = (order) => {
  const [whole, frac] = String(order).split('.');
  if (!frac) return Number(whole);
  return Number(frac.length > 1 ? `${whole}.${frac.slice(0, -1)}` : whole);
};

// `brief` i `title` idą z `covers` i notatek, czyli z języka kursu — serwer nie skleja
// tu żadnego zdania. Uzasadnienie zostaje strukturalne (`reason.code` + dane), zdanie
// składa UI przez t(), więc mówi w języku interfejsu, nie kursu.
const suggest = (lesson) => {
  const covers = lesson.covers ?? [];
  const notes = (lesson.practiceNotes ?? []).map((n) => n.note);
  const of = (kind, concepts, reason) => ({
    kind,
    title: concepts.join(', '),
    brief: concepts.join(', '),
    reason: { concepts, ...reason },
  });

  if (typeof lesson.score === 'number' && lesson.score < LOW_SCORE && covers.length) {
    return of('powtórka', covers, { code: 'niski-wynik', score: lesson.score });
  }
  if (notes.length >= MIN_NOTES) return of('powtórka', notes, { code: 'powtarzajace-braki' });
  if (typeof lesson.score === 'number' && lesson.score >= GOOD_SCORE && covers.length) {
    return of('rozwinięcie', covers, { code: 'dobry-wynik', score: lesson.score });
  }
  return null; // nie ma czego utrwalać ani pogłębiać
};

/**
 * @param {object[]} lessons indeks lekcji
 * @returns {object[]} propozycje: { kind, afterOrder, lessonId, title, brief, reason }
 */
export function computeSuggestions(lessons = []) {
  const floor = minInsertOrder(lessons);
  return lessons.flatMap((lesson) => {
    if (lesson.status !== 'ukończona') return [];
    const s = suggest(lesson);
    if (!s) return [];
    // Reguła miejsca: propozycja dla lekcji sprzed ostatniej ukończonej nie znika,
    // tylko przesuwa się za nią. Materiał przerobiony jest zamknięty.
    const afterOrder = Math.max(lesson.order, floor);
    const juzJest = lessons.some(
      (l) => l.origin === s.kind && parentOrder(l.order) === afterOrder,
    );
    return juzJest ? [] : [{ ...s, afterOrder, lessonId: lesson.id }];
  });
}
