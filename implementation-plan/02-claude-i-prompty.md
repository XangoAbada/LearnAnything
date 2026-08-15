# Faza 02 — Silnik Claude i prompty

## Cel

Jedna funkcja `runClaude()`, przez którą przechodzą **wszystkie** wywołania modelu, oraz niezawodne wyciąganie JSON-a z odpowiedzi. Plus bramka: **smoke test na subskrypcji bez klucza API**. Dopóki nie przejdzie, dalsze fazy nie mają sensu — cała aplikacja stoi na tym jednym pliku.

## Pliki

| Plik | Zawartość |
|---|---|
| `server/claude.js` | `runClaude()`, `runClaudeJson()`, `extractLastJsonBlock()`, `assertClaudeAvailable()` |
| `server/prompts/` | prompty jako pliki `.md` z placeholderami |
| `server/prompts.js` | wczytanie i podstawienie placeholderów |
| `scripts/smoke-claude.js` | smoke test auth uruchamiany ręcznie |
| `test/prompts.test.js`, `test/json.test.js` | testy podstawiania i parsera JSON |

## Kontrakty

### `runClaude()`

```js
/**
 * @param {object} p
 * @param {string}   p.prompt        pełny tekst promptu
 * @param {string}  [p.cwd]          katalog roboczy — przy generowaniu lekcji katalog lekcji
 * @param {string[]}[p.allowedTools] domyślnie [] (brak narzędzi — czysty tekst)
 * @param {number} [p.maxTurns]      domyślnie 1 dla zadań tekstowych
 * @param {number} [p.timeoutMs]     domyślnie 120_000; lekcje dostają więcej
 * @returns {Promise<string>}        tekst wyniku (message.type === 'result', subtype 'success')
 */
export async function runClaude({ prompt, cwd, allowedTools = [], maxTurns = 1, timeoutMs })
```

Wywołanie SDK:

```js
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt,
  options: {
    cwd,
    allowedTools,
    maxTurns,
    permissionMode: allowedTools.length ? 'acceptEdits' : 'default',
    settingSources: [],          // izolacja od cudzych CLAUDE.md — nie dotyka poświadczeń
    env: envWithoutApiKey(),     // patrz niżej
  },
})) {
  if (message.type === 'result') {
    if (message.subtype === 'success') return message.result;
    throw new Error(`claude: ${message.subtype}`);
  }
}
```

`query()` **rzuca** po wyniku błędnym (np. `error_max_turns`) — obudować `try/catch` i zamienić na czytelny błąd domenowy.

### Wymuszenie subskrypcji (sedno tej fazy)

```js
function envWithoutApiKey() {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;      // obecny klucz przełącza rozliczanie na tokeny
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;                        // CLAUDE_CONFIG_DIR zostaje domyślny — tam są poświadczenia
}
```

- `settingSources: []` — bezpieczne, izoluje ustawienia, nie logowanie.
- **Nie** ustawiać `CLAUDE_CONFIG_DIR`; poświadczenia subskrypcji leżą w `~/.claude`.
- `assertClaudeAvailable()` woła krótki prompt przy starcie serwera (faza 01 dokłada wywołanie w `index.js`) i przy niepowodzeniu wypisuje: *„Brak dostępu do Claude Code — zaloguj się poleceniem `claude` i uruchom ponownie"*. Serwer nie wstaje.

### Wyciąganie JSON

Model lubi opakować JSON w tekst i wstawić literalny ` ``` ` **wewnątrz** wartości stringa — naiwny regex ucina wtedy blok i gubi cały wynik. Przenieść sprawdzony algorytm z Kaizen (`D:\Projects\Kaizen\server\src\agents\verdict.ts:11`):

```js
export function extractLastJsonBlock(text)  // -> obiekt | null
```

Idzie po otwarciach ` ```json ` **od końca**, dla każdego próbuje **najdłuższego** kandydata domknięcia i zwraca pierwszy, który się parsuje. Fallback: cały tekst jako goły JSON.

```js
export async function runClaudeJson(params, validate)  // -> obiekt
```

Woła `runClaude`, parsuje, przepuszcza przez `validate` (zwykła funkcja rzucająca przy złym kształcie). Przy porażce **jedna próba ponowienia** z dopiskiem do promptu: *„Poprzednia odpowiedź nie była poprawnym JSON-em. Zwróć wyłącznie blok ```json."* Druga porażka → błąd w górę.

### Prompty

Pliki `.md` w `server/prompts/`, placeholdery `{{nazwa}}`:

| Plik | Kiedy | Faza |
|---|---|---|
| `interview-questions.md` | pytania wywiadu | 03 |
| `interview-assess.md` | ocena odpowiedzi → poziom/tempo/zakres | 03 |
| `course-plan.md` | plan kursu | 03 |
| `lesson.md` | treść lekcji (najdłuższy) | 06 |
| `practice-grade.md` | ocena ćwiczenia | 09 |
| `lesson-extend.md` | rozbudowa: pośrednia / powtórka / rozwinięcie / nowy wątek | 10 |

```js
export function loadPrompt(name, vars)  // -> string ; rzuca gdy placeholder bez wartości
```

Rzucanie przy brakującym placeholderze jest celowe — cicho wysłany prompt z `{{covers}}` w środku to zmarnowane generowanie lekcji.

### Język w promptach

**Każdy** prompt dostaje `{{language}}` i sekcję nagłówkową:

```
Odpowiadaj wyłącznie w języku: {{languageName}} ({{language}}).
Dotyczy to całej treści dla użytkownika: pytań, tytułów, wyjaśnień, ćwiczeń, ocen.
Wartości pól technicznych (status, verdict, level, pace, scope) zostają w formie
podanej w schemacie — nie tłumacz ich.
```

Ostatnie zdanie jest krytyczne: enumy są kluczami danych, ich przetłumaczenie rozjeżdża `index.json` z kodem. `languageName` to `"polski"` / `"English"`.

## Kroki

1. `npm i @anthropic-ai/claude-agent-sdk`.
2. `claude.js`: `envWithoutApiKey`, `runClaude`, `extractLastJsonBlock`, `runClaudeJson`, `assertClaudeAvailable`.
3. `prompts.js`: wczytanie pliku + podstawienie + kontrola brakujących placeholderów.
4. `scripts/smoke-claude.js`: prosi o `{"ok": true, "lang": "..."}` w obu językach, wypisuje wynik. **Uruchomić i potwierdzić, że działa bez `ANTHROPIC_API_KEY`.**
5. Dopiąć `assertClaudeAvailable()` do startu serwera.
6. Testy parsera i promptów (bez modelu).

## Testy (`node --test`)

`test/json.test.js` — na sztucznych stringach:
- czysty ` ```json ` blok parsuje się;
- literalny ` ``` ` **wewnątrz wartości stringa** nie ucina bloku (regresja z Kaizen);
- przy dwóch blokach wygrywa **ostatni**;
- goły JSON bez płotków parsuje się;
- śmieci → `null`, nie wyjątek.

`test/prompts.test.js`:
- wszystkie placeholdery podstawione;
- brakująca zmienna → wyjątek;
- `{{language}}` i `{{languageName}}` trafiają do wyniku dla `pl` i `en`.

Wywołań modelu nie testujemy automatycznie — `runClaude` jest zaślepiany w kolejnych fazach.

## Definition of Done

- [ ] **`node scripts/smoke-claude.js` zwraca sparsowany JSON przy pustym `ANTHROPIC_API_KEY`.** Bramka fazy.
- [ ] Serwer nie wstaje, gdy Claude niedostępny — z komunikatem mówiącym, co zrobić.
- [ ] `npm test` zielony.
- [ ] Żaden inny plik nie importuje `@anthropic-ai/claude-agent-sdk`.

## Jeśli smoke test nie przejdzie

SDK ma wymagać klucza API — wtedy podmienić **wnętrze** `runClaude` na spawn CLI wzorowany na `D:\Projects\Kaizen\server\src\agents\claudeRunner.ts` (`claude -p --output-format stream-json --verbose`, prompt przez `stdin`, na Windows `where.exe claude` i `shell:true` dla shimów `.cmd`). Sygnatura `runClaude` zostaje bez zmian, reszta aplikacji nie zauważy. Odnotować zmianę w `00-README.md`.

## Baza wiedzy

`80-integrations.md` (zadania zlecane Claude'owi, zasady promptów) · `70-tech-stack.md` (silnik generowania, uwierzytelnienie) · `40-architecture.md` („generator nie zna HTTP")
