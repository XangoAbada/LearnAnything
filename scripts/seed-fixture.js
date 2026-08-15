// Wkłada lekcję-wzorzec do prawdziwego projektu: DoD fazy 05 wymaga otwarcia jej pod
// /lessons/… i zapisania wyniku sprawdzianu w index.json. Katalog data/ jest poza repo,
// więc źródłem prawdy zostają fikstury w test/fixtures.
//
//   node scripts/seed-fixture.js [pl|en]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from '../server/store.js';
import { config } from '../server/config.js';

const lang = process.argv[2] === 'en' ? 'en' : 'pl';
const topic = lang === 'pl' ? 'Teoria muzyki' : 'Music theory';
const title = lang === 'pl' ? 'Czym jest dźwięk' : 'What sound is';

const project = store.createProject({ topic, language: lang });
const lesson = store.addLesson(project.id, { afterOrder: 0, title });
const dir = store.createLessonDir(project.id, lesson);

const source = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'test',
  'fixtures',
  `lesson-${lang}`,
);
for (const file of fs.readdirSync(source)) {
  const content = fs
    .readFileSync(path.join(source, file), 'utf8')
    .replaceAll('{{projectId}}', project.id)
    .replaceAll('{{lessonId}}', lesson.id);
  fs.writeFileSync(path.join(dir, file), content, 'utf8');
}
store.updateLesson(project.id, lesson.id, { status: 'gotowa' });

const slug = lesson.path.replace(/^lessons\//, '');
console.log(`http://localhost:${config.port}/lessons/${project.id}/${slug}/lesson.html`);
