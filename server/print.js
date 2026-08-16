import express from 'express';
import * as store from './store.js';

// Wydruk nie tworzy treści — skleja to, co już leży na dysku, i zmienia arkusz stylów.
// PDF robi przeglądarka („Zapisz jako PDF"), aplikacja nie ma generatora.

// Etykiety idą w języku kursu, nie powłoki: dwujęzyczny dokument byłby bez sensu.
const TEKSTY = {
  pl: {
    spis: 'Spis treści',
    niegotowa: 'jeszcze niewygenerowana',
    uszkodzona: 'nie udało się dołączyć',
    pusto: 'Żadna lekcja tego kursu nie jest jeszcze gotowa — wydruk pozostaje pusty.',
    drukuj: 'Zapisz jako PDF',
    podpowiedz: 'W oknie drukowania wybierz „Zapisz jako PDF”.',
  },
  en: {
    spis: 'Contents',
    niegotowa: 'not generated yet',
    uszkodzona: 'could not be included',
    pusto: 'No lesson of this course is ready yet — this printout stays empty.',
    drukuj: 'Save as PDF',
    podpowiedz: 'In the print dialog choose “Save as PDF”.',
  },
};

const ZNAKI = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ZNAKI[c]);

const gotowa = (lesson) => lesson.status === 'gotowa' || lesson.status === 'ukończona';
const katalog = (projectId, lesson) => `/lessons/${projectId}/${lesson.path.replace(/^lessons\//, '')}`;

/**
 * Zawartość `<body>` pliku lekcji, bez skryptów. Wszystkie lekcje wychodzą z jednego
 * szablonu, więc wystarczy wyciąć między znacznikami — parser HTML byłby zależnością
 * dla jednego wyrażenia. Skrypty wracają niżej, z pełnymi ścieżkami i w kolejności lekcji.
 * @returns {string|null} null, gdy plik nie pasuje do szablonu — wtedy adnotacja, nie wyjątek
 */
export function cialo(html) {
  const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html ?? '');
  return m ? m[1].replace(/<script\b[\s\S]*?<\/script>/gi, '').trim() : null;
}

/**
 * Cały dokument wydruku. Czysta funkcja: `czytaj(lesson)` oddaje HTML lekcji albo null,
 * dzięki czemu składanie testuje się bez dysku.
 * @param {{project: object, lessons: object[], czytaj: (l: object) => string|null, spis?: boolean}} opcje
 */
export function dokument({ project, lessons, czytaj, spis = true }) {
  const t = TEKSTY[project.language === 'en' ? 'en' : 'pl'];
  const czesci = lessons.map((lesson) => {
    const tresc = gotowa(lesson) ? cialo(czytaj(lesson)) : null;
    return { lesson, tresc, adnotacja: tresc ? null : gotowa(lesson) ? t.uszkodzona : t.niegotowa };
  });
  const wlozone = czesci.filter((c) => c.tresc);

  const pozycja = ({ lesson, adnotacja }) =>
    `<li${adnotacja ? ' class="brak"' : ''}><span class="num">${esc(lesson.order)}</span>` +
    `<span class="tytul">${esc(lesson.title)}</span>` +
    (adnotacja ? `<span class="adnotacja">${esc(adnotacja)}</span>` : '') +
    '</li>';

  const naglowek = [
    // Okno drukowania otwierane samo z siebie lądowało nad dokumentem, którego nikt jeszcze
    // nie widział — i po anulowaniu nie było jak wrócić. Pasek znika przy druku (print.css).
    wlozone.length &&
      `<div class="pasek-druku">` +
        `<button type="button" onclick="window.print()">${esc(t.drukuj)}</button>` +
        `<span>${esc(t.podpowiedz)}</span></div>`,
    spis && `<header class="lekcja-naglowek"><h1>${esc(project.topic)}</h1></header>`,
    spis && `<nav class="spis"><h2>${esc(t.spis)}</h2><ol>${czesci.map(pozycja).join('')}</ol></nav>`,
    // Pusty wydruk ma powiedzieć, dlaczego jest pusty — także ten z jednej niegotowej lekcji.
    wlozone.length ? '' : `<p class="pusto">${esc(t.pusto)}</p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const artykul = ({ lesson, tresc }) =>
    `<article class="lekcja-druk" data-lesson="${esc(lesson.id)}">\n${tresc}\n</article>`;

  // Marker przed skryptem lekcji przestawia korzeń runtime'u: w dokumencie zbiorczym każda
  // lekcja ma własne #teoria/#praktyka i bez tego wszystkie trafiłyby do pierwszej.
  const skrypt = ({ lesson }) =>
    `<script type="module">window.LA.druk(${JSON.stringify(lesson.id)})</script>\n` +
    `<script type="module" src="${katalog(project.id, lesson)}/lesson.js"></script>`;

  return `<!doctype html>
<html lang="${esc(project.language)}" data-theme="jasny">
  <head>
    <meta charset="utf-8" />
    <title>${esc(project.topic)}</title>
    <link rel="stylesheet" href="/theme.css" />
    <link rel="stylesheet" href="/print.css" />
${wlozone.map((c) => `    <link rel="stylesheet" href="${katalog(project.id, c.lesson)}/lesson.css" />`).join('\n')}
  </head>
  <body data-lesson="druk" data-druk="1" data-project="${esc(project.id)}" data-lang="${esc(project.language)}">
${naglowek}
${wlozone.map(artykul).join('\n')}
<script type="module" src="/runtime.js"></script>
${wlozone.map(skrypt).join('\n')}
  </body>
</html>
`;
}

export const print = express.Router();

const wyslij = (res, project, lessons, spis) =>
  res.type('html').send(
    dokument({
      project,
      lessons,
      spis,
      czytaj: (lesson) => store.readLessonHtml(project.id, lesson),
    }),
  );

// Cały kurs: spis treści + wszystkie gotowe lekcje po kolei. Niegotowe zostają w spisie
// z adnotacją — użytkownik ma wiedzieć, że PDF nie jest kompletny.
print.get('/:projectId', (req, res) => {
  const project = store.readProject(req.params.projectId);
  if (!project) return res.status(404).type('text').send(`nie ma projektu ${req.params.projectId}`);
  wyslij(res, project, store.readIndex(project.id), true);
});

print.get('/:projectId/:lessonId', (req, res) => {
  const project = store.readProject(req.params.projectId);
  if (!project) return res.status(404).type('text').send(`nie ma projektu ${req.params.projectId}`);
  const lesson = store.readIndex(project.id).find((l) => l.id === req.params.lessonId);
  if (!lesson) return res.status(404).type('text').send(`nie ma lekcji ${req.params.lessonId}`);
  wyslij(res, project, [lesson], false);
});
