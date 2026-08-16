import { query } from '@anthropic-ai/claude-agent-sdk';
import { readSettings } from './store.js';

// Jedyny plik w projekcie, który zna SDK. Reszta aplikacji woła runClaude/runClaudeJson.

const DEFAULT_TIMEOUT_MS = 120_000;

// Sedno uwierzytelnienia: obecność klucza przełącza rozliczanie na tokeny zamiast subskrypcji.
// CLAUDE_CONFIG_DIR zostaje domyślny — w ~/.claude leżą poświadczenia zalogowanego CLI.
function envWithoutApiKey() {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
}

/**
 * Składa `options` dla SDK. Wydzielone z runClaude, bo to jedyne miejsce, w którym
 * ustawienia etapu spotykają się z wywołaniem — i jedyne, które da się sprawdzić testem.
 * Brak etapu albo `null` w ustawieniu znaczy „domyślne z CLI”: pole nie trafia do options.
 */
export function queryOptions({
  stage,
  cwd,
  allowedTools = [],
  maxTurns = 1,
  abortController,
  additionalDirectories = [],
}) {
  const { model = null, effort = null } = (stage && readSettings()[stage]) || {};
  return {
    cwd,
    allowedTools,
    maxTurns,
    // SDK nie zna katalogu „tylko do odczytu" — że biblioteka komponentów nie została ruszona,
    // sprawdza generator po fakcie (store.komponentySnapshot).
    ...(additionalDirectories.length ? { additionalDirectories } : {}),
    permissionMode: allowedTools.length ? 'acceptEdits' : 'default',
    settingSources: [], // izolacja od cudzych CLAUDE.md — nie dotyka poświadczeń
    env: envWithoutApiKey(),
    abortController,
    ...(model ? { model } : {}),
    ...(effort ? { effort } : {}),
  };
}

/**
 * @param {object} p
 * @param {string}   p.prompt        pełny tekst promptu
 * @param {string}  [p.cwd]          katalog roboczy — przy generowaniu lekcji katalog lekcji
 * @param {string[]}[p.allowedTools] domyślnie [] (brak narzędzi — czysty tekst)
 * @param {number}  [p.maxTurns]     domyślnie 1 dla zadań tekstowych
 * @param {number}  [p.timeoutMs]    domyślnie 120_000; lekcje dostają więcej
 * @param {string}  [p.stage]        etap aplikacji — decyduje o modelu i poziomie rozumowania
 * @param {string[]}[p.additionalDirectories] katalogi widoczne poza `cwd` (biblioteka komponentów)
 * @param {(m: object) => void} [p.onMessage] podgląd ruchu modelu; jedyne źródło postępu w locie
 * @returns {Promise<string>}        tekst wyniku
 */
export async function runClaude({
  prompt,
  cwd,
  allowedTools = [],
  maxTurns = 1,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  stage,
  onMessage,
  additionalDirectories = [],
}) {
  const abortController = new AbortController();
  // Sam abortController nie przerywa wywołania w locie (sprawdzone: abort po 1 s, wynik po 6 s),
  // więc limit czasu pilnuje wyścig, a abort tylko sprząta proces potomny.
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      abortController.abort();
      reject(new Error(`claude: przekroczony limit czasu ${timeoutMs} ms`));
    }, timeoutMs);
  });

  const consume = async () => {
    for await (const message of query({
      prompt,
      options: queryOptions({ stage, cwd, allowedTools, maxTurns, abortController, additionalDirectories }),
    })) {
      if (message.type === 'result') {
        if (message.subtype === 'success') return message.result;
        throw new Error(`claude: ${message.subtype}`);
      }
      try {
        onMessage?.(message);
      } catch {
        /* podgląd postępu to ozdoba — nie ma prawa zabić generowania lekcji */
      }
    }
    throw new Error('claude: strumień skończył się bez wyniku');
  };

  const consumed = consume();
  consumed.catch(() => {}); // przegrany wyścig nie może wywrócić procesu nieobsłużonym odrzuceniem
  try {
    return await Promise.race([consumed, deadline]);
  } catch (err) {
    throw err.message?.startsWith('claude:') ? err : new Error(`claude: ${err.message}`);
  } finally {
    clearTimeout(timer);
    abortController.abort();
  }
}

/**
 * Wyciąga OSTATNI blok ```json i parsuje. Model regularnie wstawia literalny ``` wewnątrz
 * wartości stringa — leniwy regex urwałby tam blok i zgubił cały wynik. Więc: otwarcia od końca,
 * dla każdego NAJDŁUŻSZY kandydat domknięcia najpierw, wygrywa pierwszy, który się parsuje.
 * Port z Kaizen (server/src/agents/verdict.ts:11).
 * @returns {object|Array|null}
 */
export function extractLastJsonBlock(text) {
  const openers = [...text.matchAll(/```json[ \t]*\r?\n/g)];
  const fences = [...text.matchAll(/```/g)].map((m) => m.index);

  for (let i = openers.length - 1; i >= 0; i--) {
    const start = openers[i].index + openers[i][0].length;
    // text.length pierwsze: obsługuje odpowiedź uciętą przed domykającym płotkiem.
    // ponytail: O(otwarcia × płotki) — w realnej odpowiedzi jest ich garstka.
    const candidates = [text.length, ...fences.filter((f) => f >= start).reverse()];
    for (const end of candidates) {
      try {
        return JSON.parse(text.slice(start, end));
      } catch {
        // krótszy kandydat
      }
    }
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

const RETRY_NOTE =
  '\n\nPoprzednia odpowiedź nie była poprawnym JSON-em. Zwróć wyłącznie blok ```json.';

/**
 * runClaude + parsowanie + walidacja. Jedna próba ponowienia, potem błąd w górę.
 * @param {object} params jak w runClaude
 * @param {(data: any) => void} [validate] rzuca przy złym kształcie
 */
export async function runClaudeJson(params, validate) {
  let last;
  for (const prompt of [params.prompt, params.prompt + RETRY_NOTE]) {
    const text = await runClaude({ ...params, prompt });
    try {
      const data = extractLastJsonBlock(text);
      if (data === null) throw new Error('odpowiedź nie zawiera bloku JSON');
      validate?.(data);
      return data;
    } catch (err) {
      last = err;
    }
  }
  throw new Error(`claude: zła odpowiedź także po ponowieniu — ${last.message}`);
}

/** Bramka startu serwera: bez zalogowanego Claude Code aplikacja nie ma sensu. */
export async function assertClaudeAvailable() {
  try {
    await runClaude({ prompt: 'Odpowiedz jednym słowem: ok', timeoutMs: 60_000 });
  } catch (err) {
    throw new Error(
      `Brak dostępu do Claude Code — zaloguj się poleceniem \`claude\` i uruchom ponownie.\n(${err.message})`,
    );
  }
}

// --- lista modeli -----------------------------------------------------------

// ponytail: lista zapasowa aliasów CLI — starzeje się, ale ekran ustawień ma działać
// także wtedy, gdy CLI nie odpowie. Poziomy puste, bo bez odpowiedzi nie wiemy, co model wspiera.
const FALLBACK_MODELS = ['fable', 'opus', 'sonnet', 'haiku'].map((value) => ({
  value,
  displayName: value,
  description: '',
  supportsEffort: true,
  supportedEffortLevels: [],
}));

let models = null;

/** Lista pobrana przy starcie. Nie zmienia się w trakcie życia serwera. */
export const availableModels = () => models ?? FALLBACK_MODELS;

/**
 * Żądanie control-protocol, nie wywołanie modelu — nie kosztuje tokenów, ale wymaga
 * trybu streaming input, stąd prompt jako generator, który nic nie emituje.
 * Wynik zapamiętany w module; przy błędzie zostaje lista zapasowa.
 */
export async function listModels(timeoutMs = 20_000) {
  const abortController = new AbortController();
  const never = new Promise(() => {});
  async function* prompt() {
    await never; // sesja ma zostać otwarta, dopóki nie wyciągniemy listy
  }

  const timer = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const q = query({ prompt: prompt(), options: queryOptions({ abortController }) });
    const found = await q.supportedModels();
    if (Array.isArray(found) && found.length) models = found;
  } catch (err) {
    console.warn(`claude: nie udało się pobrać listy modeli (${err.message}) — lista zapasowa`);
  } finally {
    clearTimeout(timer);
    abortController.abort();
  }
  return availableModels();
}
