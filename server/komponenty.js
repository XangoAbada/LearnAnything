import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Katalog biblioteki komponentów: czytany przez prompt lekcji i przez galerię.
// Import zamiast parsowania regexem — komponent i tak musi być import-safe w Node
// (document wolno mu dotknąć wyłącznie w `rysuj`), a test tego pilnuje.

const here = path.dirname(fileURLToPath(import.meta.url));
export const komponentyDir = path.join(here, '..', 'public', 'komponenty');

export const NAZWA = /^[a-z][a-z0-9-]{2,31}$/;
export const TRYBY = ['staly', 'parametry', 'kroki', 'manipulacja', 'kod'];

/** Katalog w promptzie ma budżet — po jego przekroczeniu trzeba go dzielić na kategorie. */
export const LIMIT_KATALOGU = 16_000;

export const nazwyKomponentow = () =>
  fs.existsSync(komponentyDir)
    ? fs
        .readdirSync(komponentyDir)
        .filter((f) => f.endsWith('.js'))
        .map((f) => f.slice(0, -3))
        .filter((n) => NAZWA.test(n))
        .sort()
    : [];

/** Jedno `meta` albo null. Zepsuty plik nie ma prawa zatrzymać generowania lekcji. */
export async function meta(nazwa) {
  try {
    const modul = await import(pathToFileURL(path.join(komponentyDir, `${nazwa}.js`)).href);
    return modul.meta ?? null;
  } catch (err) {
    console.warn(`komponent ${nazwa}: pominięty — ${err.message}`);
    return null;
  }
}

export async function katalog() {
  const wszystkie = await Promise.all(nazwyKomponentow().map(meta));
  return wszystkie.filter(Boolean);
}

/** Jedna linia na komponent. `przyklad` zostaje w pliku — od czytania źródła jest Read. */
export async function katalogTekst() {
  const wpisy = await katalog();
  if (!wpisy.length) return '_(biblioteka jest pusta — każdą wizualizację trzeba zamówić)_';
  return wpisy
    .map((m) => `- \`${m.nazwa}\` — ${m.opis} dane: \`${m.dane}\`. tryby: ${(m.tryby ?? []).join(', ')}`)
    .join('\n');
}
