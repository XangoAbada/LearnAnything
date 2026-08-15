import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const promptsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prompts');

const LANGUAGE_NAMES = { pl: 'polski', en: 'English' };

// Nagłówek doklejany do każdego promptu — dlatego pliki .md go nie powtarzają.
// Ostatnie zdanie jest krytyczne: enumy są kluczami danych, przetłumaczone rozjeżdżają index.json.
const languageHeader = (language) =>
  `Odpowiadaj wyłącznie w języku: ${LANGUAGE_NAMES[language]} (${language}).\n` +
  `Dotyczy to całej treści dla użytkownika: pytań, tytułów, wyjaśnień, ćwiczeń, ocen.\n` +
  `Wartości pól technicznych (status, verdict, level, pace, scope) zostają w formie\n` +
  `podanej w schemacie — nie tłumacz ich.\n\n`;

/**
 * Wczytuje server/prompts/<name>.md i podstawia {{placeholdery}}.
 * Rzuca przy brakującej wartości: cicho wysłany prompt z {{covers}} w środku
 * to zmarnowane generowanie lekcji.
 * @param {string} name
 * @param {object} vars musi zawierać language ('pl' | 'en'); languageName dokładany automatycznie
 * @returns {string}
 */
export function loadPrompt(name, vars = {}) {
  if (!LANGUAGE_NAMES[vars.language]) {
    throw new Error(`prompt ${name}: nieznany language ${JSON.stringify(vars.language)}`);
  }
  const all = { ...vars, languageName: LANGUAGE_NAMES[vars.language] };
  const body = fs.readFileSync(path.join(promptsDir, `${name}.md`), 'utf8');
  const filled = body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (all[key] === undefined) throw new Error(`prompt ${name}: brak wartości dla {{${key}}}`);
    return String(all[key]);
  });
  return languageHeader(vars.language) + filled;
}
