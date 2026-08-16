// Wizualna kontrola komponentów w prawdziwej przeglądarce: czy tekst nie wyjeżdża poza kadr,
// czy elementy nie nachodzą na siebie, czy nic nie jest ucięte. Reguły są tu, nie w promptcie —
// prompt można zignorować, tego nie.
//
// Uruchamiany z ręki (`npm run sprawdz`) i z generatora (execFile + --json). Poza procesem serwera:
// przeglądarka nie ma prawa wisieć w Expressie, a skrypt ma działać przy wyłączonej aplikacji.
//
// ponytail: playwright-core + systemowy Chrome zamiast `playwright` z własnym Chromium —
// 130 MB pobrania na maszynę, która ma przeglądarkę. Gdyby zabrakło, wystarczy dołożyć kanał niżej.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { nazwyKomponentow, komponentyDir } from '../server/komponenty.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', 'public');

const KANALY = ['chrome', 'msedge', 'chromium'];
const SZEROKOSCI = [1000, 560]; // realny iframe powłoki i wąsko; media query w projekcie nie ma
const MOTYWY = ['jasny', 'ciemny'];
const MAX_FINDINGS = 20;
// Twarde reguły cofają lekcję do poprawy; reszta idzie do logu, żeby jeden piksel
// nie palił dwudziestominutowego ponowienia.
export const TWARDE = ['blad-konsoli', 'tekst-poza-kadrem', 'nieznany-komponent', 'pusty-render'];

function argi(argv) {
  const o = { nazwy: [], json: false, kandydat: null, lekcja: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--kandydat') o.kandydat = path.resolve(argv[++i]);
    else if (a === '--lekcja') o.lekcja = path.resolve(argv[++i]);
    else if (!a.startsWith('--')) o.nazwy.push(a);
  }
  return o;
}

/** Statyczny serwer na losowym porcie. Katalog kandydata idzie przed biblioteką, więc
 *  niezatwierdzony komponent rozwiązuje się bez kopiowania go do public/. */
async function serwer({ kandydat, lekcja }) {
  const app = express();
  if (kandydat) app.use('/komponenty', express.static(kandydat));
  app.use('/komponenty', express.static(komponentyDir));
  if (lekcja) app.use('/lekcja', express.static(lekcja));
  app.use(express.static(publicDir));
  const srv = http.createServer(app);
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${srv.address().port}`, zamknij: () => new Promise((ok) => srv.close(ok)) };
}

async function przegladarka() {
  // Leniwie: generator importuje ten moduł dla samego `raport()` i nie ma po co wciągać
  // playwrighta do procesu serwera — przeglądarka chodzi w osobnym procesie.
  const { chromium } = await import('playwright-core');
  const bledy = [];
  for (const channel of KANALY) {
    try {
      return await chromium.launch({ channel });
    } catch (err) {
      bledy.push(`${channel}: ${err.message.split('\n')[0]}`);
    }
  }
  throw new Error(`nie ma z czym sprawdzać komponentów — ${bledy.join(' · ')}`);
}

// --- reguły (wykonywane w przeglądarce) --------------------------------------

/* c8 ignore start */
function kontrole(limit) {
  const findings = [];
  const dodaj = (regula, wezel, szczegol) => {
    if (findings.length >= limit) return;
    const host = wezel?.closest?.('[data-demko]');
    findings.push({ regula, gdzie: host?.id ?? '', szczegol });
  };
  const prostokaty = (a, b) => {
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return x * y;
  };
  const skrot = (t) => (t.length > 48 ? `${t.slice(0, 48)}…` : t);

  for (const demko of document.querySelectorAll('[data-demko]')) {
    const rysunek = demko.querySelector('.diagram') ?? demko;
    const widoczny = [...rysunek.querySelectorAll('*')].some((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!widoczny) dodaj('pusty-render', demko, 'brak czegokolwiek o niezerowym rozmiarze');

    // 1. tekst poza viewBox — dokładnie ten błąd, dla którego powstała biblioteka
    for (const svg of rysunek.querySelectorAll('svg')) {
      const vb = svg.viewBox?.baseVal;
      const skala = vb?.width ? svg.getBoundingClientRect().width / vb.width : 1;
      for (const t of svg.querySelectorAll('text, tspan')) {
        const tekst = (t.textContent ?? '').trim();
        if (!tekst) continue;
        let bbox;
        try {
          bbox = t.getBBox();
        } catch {
          continue;
        }
        if (vb?.width) {
          const poza = Math.max(
            vb.x - bbox.x,
            bbox.x + bbox.width - (vb.x + vb.width),
            vb.y - bbox.y,
            bbox.y + bbox.height - (vb.y + vb.height),
          );
          if (poza > 1) {
            dodaj(
              'tekst-poza-kadrem',
              t,
              `<text> „${skrot(tekst)}" wychodzi ${Math.round(poza)} px poza viewBox (${vb.x} ${vb.y} ${vb.width} ${vb.height})`,
            );
          }
        }
        const px = parseFloat(getComputedStyle(t).fontSize) * skala;
        if (px && px < 10) dodaj('za-maly-font', t, `<text> „${skrot(tekst)}" renderuje się jako ${px.toFixed(1)} px (min 10)`);
      }
    }

    // 2. liście z tekstem: ucięcie, za mały font, wystawanie, nachodzenie
    const liscie = [...rysunek.querySelectorAll('*')].filter((e) => {
      if (e.closest('svg')) return false;
      const wlasny = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!wlasny) return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    const pole = rysunek.getBoundingClientRect();
    for (const e of liscie) {
      const s = getComputedStyle(e);
      const px = parseFloat(s.fontSize);
      if (px && px < 11) dodaj('za-maly-font', e, `„${skrot(e.textContent.trim())}" ma ${px.toFixed(1)} px (min 11)`);

      const chowa = /hidden|clip/.test(s.overflow) || s.textOverflow === 'ellipsis';
      if (chowa && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) {
        dodaj('tekst-uciety', e, `„${skrot(e.textContent.trim())}" nie mieści się w swoim pudełku`);
      }

      const r = e.getBoundingClientRect();
      // Przewijanie w poziomie jest zamierzone (.diagram ma overflow-x:auto) — liczy się pion i lewa krawędź.
      const poza = Math.max(pole.top - r.top, r.bottom - pole.bottom, pole.left - r.left);
      if (poza > 1) dodaj('wystaje-poza-kontener', e, `„${skrot(e.textContent.trim())}" wystaje ${Math.round(poza)} px poza pole rysunku`);
    }

    const teksty = [...liscie, ...rysunek.querySelectorAll('svg text')];
    for (let i = 0; i < teksty.length; i++) {
      for (let j = i + 1; j < teksty.length; j++) {
        const [a, b] = [teksty[i], teksty[j]];
        if (a.contains(b) || b.contains(a)) continue;
        const [ra, rb] = [a.getBoundingClientRect(), b.getBoundingClientRect()];
        const wspolne = prostokaty(ra, rb);
        const mniejsze = Math.min(ra.width * ra.height, rb.width * rb.height);
        if (mniejsze > 0 && wspolne / mniejsze > 0.15) {
          dodaj(
            'nachodzace-teksty',
            a,
            `„${skrot(a.textContent.trim())}" × „${skrot(b.textContent.trim())}" — ${Math.round((wspolne / mniejsze) * 100)} % pokrycia`,
          );
        }
      }
    }
  }
  return findings;
}
/* c8 ignore stop */

// --- przebieg -----------------------------------------------------------------

async function zbadaj(page, url, { motyw, szerokosc, gotowe }) {
  const bledy = [];
  // Favicony nie ma ani galeria, ani lekcja — 404 na niej nic nie mówi o komponencie.
  const naBlad = (e) => {
    const tekst = String(e?.message ?? e);
    if (!/favicon/.test(tekst)) bledy.push(tekst);
  };
  page.on('pageerror', naBlad);
  page.on('console', (m) => m.type() === 'error' && naBlad(`${m.text()} (${m.location().url})`));

  await page.setViewportSize({ width: szerokosc, height: 900 });
  await page.goto(url, { waitUntil: 'load' });
  try {
    await page.waitForFunction(gotowe, null, { timeout: 8000 });
  } catch {
    bledy.push('render nie zdążył się zakończyć w 8 s');
  }
  // Zmiana motywu po zamontowaniu — dokładnie tak, jak robi to powłoka w działającej lekcji.
  await page.evaluate((m) => {
    document.documentElement.dataset.theme = m;
  }, motyw);
  await page.waitForTimeout(120);

  const findings = await page.evaluate(kontrole, MAX_FINDINGS);
  page.off('pageerror', naBlad);
  return [...bledy.map((b) => ({ regula: 'blad-konsoli', gdzie: '', szczegol: b })), ...findings];
}

/** Raport dla modelu: czysty tekst, jedna linia na finding. Bez zrzutów — model ich nie ogląda. */
export function raport(findings) {
  const grupy = new Map();
  for (const f of findings) {
    const klucz = `${f.komponent}${f.gdzie ? ` · ${f.gdzie}` : ''} · ${f.motyw} · ${f.szerokosc} px`;
    if (!grupy.has(klucz)) grupy.set(klucz, []);
    grupy.get(klucz).push(`  ${f.regula}: ${f.szczegol}`);
  }
  return [...grupy].map(([klucz, linie]) => [klucz, ...linie].join('\n')).join('\n');
}

export async function sprawdz({ nazwy = [], kandydat = null, lekcja = null } = {}) {
  const cele = lekcja
    ? ['lekcja']
    : nazwy.length
      ? nazwy
      : [...new Set([...nazwyKomponentow(), ...(kandydat ? nazwyZKatalogu(kandydat) : [])])];

  const { url, zamknij } = await serwer({ kandydat, lekcja });
  const browser = await przegladarka();
  const findings = [];
  try {
    const page = await browser.newPage();
    for (const cel of cele) {
      for (const motyw of MOTYWY) {
        for (const szerokosc of SZEROKOSCI) {
          const adres =
            cel === 'lekcja'
              ? `${url}/lekcja/index.html`
              : `${url}/galeria.html?k=${encodeURIComponent(cel)}&motyw=${motyw}`;
          const gotowe =
            cel === 'lekcja'
              ? '[...document.querySelectorAll(".demko")].every((d) => d.querySelector(".diagram, .edytor, .blad-komponentu"))'
              : 'document.body.dataset.gotowe === "1" || document.body.dataset.blad';
          const wynik = await zbadaj(page, adres, { motyw, szerokosc, gotowe });
          findings.push(...wynik.map((f) => ({ ...f, komponent: cel, motyw, szerokosc })));
        }
      }
    }
  } finally {
    await browser.close();
    await zamknij();
  }
  return findings;
}

const nazwyZKatalogu = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)) : [];

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') || process.argv[1]?.endsWith('sprawdz-komponenty.js')) {
  const opcje = argi(process.argv.slice(2));
  const findings = await sprawdz(opcje);
  if (opcje.json) console.log(JSON.stringify(findings));
  else if (findings.length) console.log(raport(findings));
  else console.log('Bez zastrzeżeń.');
  process.exit(findings.some((f) => TWARDE.includes(f.regula)) ? 1 : 0);
}
