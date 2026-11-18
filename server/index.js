import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter, { ensureAdminUser } from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist, {
  setHeaders(res, filePath) {
    const base = path.basename(filePath);
    // Always revalidate the shell and service worker so phones pick up releases.
    if (
      base === 'index.html'
      || base === 'sw.js'
      || base === 'registerSW.js'
      || base.endsWith('.webmanifest')
    ) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

function lanAddresses() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

const server = app.listen(PORT, HOST);

server.on('listening', async () => {
  try {
    await ensureAdminUser();
  } catch (err) {
    console.error('   Не удалось проверить учётную запись администратора:', err.message);
  }

  console.log(`🏰 Hogwarts Score server: http://localhost:${PORT}`);
  for (const ip of lanAddresses()) {
    console.log(`   Телефон в той же Wi‑Fi: http://${ip}:${PORT}`);
  }
  console.log('   PWA: откройте адрес на телефоне → «Установить» / «На экран Домой»');
  console.log('   API: scores · history · live events · whitelist login');
  console.log('   Админ для регистрации пользователей: «Король Чертей»');
});

// A restart in watch mode can outrun the old process releasing the port, and
// exiting on the first EADDRINUSE left the watcher dead until a source edit.
const PORT_RETRY_LIMIT = 5;
let portRetries = 0;

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;

  if (portRetries < PORT_RETRY_LIMIT) {
    portRetries += 1;
    console.log(`   Порт ${PORT} ещё занят, повтор ${portRetries}/${PORT_RETRY_LIMIT}…`);
    setTimeout(() => server.listen(PORT, HOST), 1000);
    return;
  }

  console.error(`❌ Порт ${PORT} занят другим процессом. Остановите его: npx kill-port ${PORT}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
