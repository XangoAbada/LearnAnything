import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config, projectsDir } from './config.js';
import { assertClaudeAvailable } from './claude.js';
import { api } from './api.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const app = express();
app.use(express.json());
app.use('/api', api);

// Pliki lekcji serwowane wprost z katalogu projektu — nie ma osobnego kroku eksportu.
app.use('/lessons/:projectId', (req, res, next) => {
  if (!/^[\w-]{1,64}$/.test(req.params.projectId)) return next();
  express.static(path.join(projectsDir, req.params.projectId, 'lessons'))(req, res, next);
});

app.use(express.static(publicDir));

// Bramka startu: brak Claude'a wychodzi teraz, nie w połowie generowania piętnastej lekcji.
try {
  await assertClaudeAvailable();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`LearnAnything → http://localhost:${config.port}`);
});
