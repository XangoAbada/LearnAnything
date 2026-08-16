import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const promptsDir = path.join(here, 'prompts');

/**
 * Szablon lekcji czytany z public/ — jedno źródło prawdy dla przeglądarki i dla promptu.
 * Komentarz-instrukcja dla generatora leci precz: modelowi nie jest do niczego potrzebny.
 */
export const lessonTemplate = fs
  .readFileSync(path.join(here, '..', 'public', 'lesson-template.html'), 'utf8')
  .replace(/<!--[\s\S]*?-->\r?\n?/, '');

const LANGUAGE_NAMES = { pl: 'polski', en: 'English' };

// Nagłówek doklejany do każdego promptu — dlatego pliki .md go nie powtarzają.
// Ostatnie zdanie jest krytyczne: enumy są kluczami danych, przetłumaczone rozjeżdżają index.json.
const languageHeader = (language) =>
  `Odpowiadaj wyłącznie w języku: ${LANGUAGE_NAMES[language]} (${language}).\n` +
  `Dotyczy to całej treści dla użytkownika: pytań, tytułów, wyjaśnień, ćwiczeń, ocen.\n` +
  `Wartości pól technicznych (status, verdict, level, pace, scope) zostają w formie\n` +
  `podanej w schemacie — nie tłumacz ich.\n\n`;

/**
 * Wczytuje server/prompts/<name>.md i podstawia {{placeholdery}}, bez nagłówka językowego.
 * Dla fragmentów doklejanych do innego promptu (kontekst rozbudowy w lekcji) — nagłówek
 * ma stać raz, na samej górze.
 * Rzuca przy brakującej wartości: cicho wysłany prompt z {{covers}} w środku
 * to zmarnowane generowanie lekcji.
 * @param {string} name
 * @param {object} vars
 * @returns {string}
 */
export function loadPart(name, vars = {}) {
  const body = fs.readFileSync(path.join(promptsDir, `${name}.md`), 'utf8');
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (vars[key] === undefined) throw new Error(`prompt ${name}: brak wartości dla {{${key}}}`);
    return String(vars[key]);
  });
}

/**
 * To samo z nagłówkiem językowym — pełny prompt wysyłany do modelu.
 * @param {string} name
 * @param {object} vars musi zawierać language ('pl' | 'en'); languageName dokładany automatycznie
 * @returns {string}
 */
export function loadPrompt(name, vars = {}) {
  if (!LANGUAGE_NAMES[vars.language]) {
    throw new Error(`prompt ${name}: nieznany language ${JSON.stringify(vars.language)}`);
  }
  return (
    languageHeader(vars.language) +
    loadPart(name, { ...vars, languageName: LANGUAGE_NAMES[vars.language] })
  );
}
