// Bramka fazy 02: czy SDK dogaduje się z Claude Code na subskrypcji, bez klucza API.
// Uruchamiane ręcznie: node scripts/smoke-claude.js
import { runClaudeJson } from '../server/claude.js';
import { loadPrompt } from '../server/prompts.js';

const validate = (data, language) => {
  if (data?.ok !== true) throw new Error(`brak ok:true (${JSON.stringify(data)})`);
  if (data.lang !== language) throw new Error(`lang=${data.lang}, oczekiwano ${language}`);
};

console.log(
  `ANTHROPIC_API_KEY w środowisku: ${process.env.ANTHROPIC_API_KEY ? 'jest (zostanie usunięty z env Claude\'a)' : 'brak'}`,
);

for (const language of ['pl', 'en']) {
  const data = await runClaudeJson({ prompt: loadPrompt('smoke', { language }) }, (d) =>
    validate(d, language),
  );
  console.log(`${language}: ${JSON.stringify(data)}`);
}

console.log('OK — subskrypcja działa, klucz API niepotrzebny.');
