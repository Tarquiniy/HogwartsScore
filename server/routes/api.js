import { Router } from 'express';
import {
  getScores,
  getUserFio,
  getLog,
  addPoints,
  subtractPoints,
  resetScores,
  exportLogText,
  clearLog,
  loginUser,
  listUsers,
  createUser,
  removeUser,
  ensureAdminUser,
} from '../storage.js';
import { HOUSES, isAdminUser } from '../constants.js';
import { addEventClient, broadcastScores, sendScores } from '../events.js';

const router = Router();

function adminCredentials(req) {
  const rawKey = req.get('x-user-key') || req.body?.adminKey || '';
  const rawFio = req.get('x-user-fio') || req.body?.adminFio || '';
  const decode = (value) => {
    try {
      return decodeURIComponent(String(value));
    } catch {
      return String(value);
    }
  };
  return { userKey: decode(rawKey), fio: decode(rawFio) };
}

async function requireAdmin(req) {
  const { userKey, fio } = adminCredentials(req);
  const session = await loginUser(userKey, fio);
  if (!session.isAdmin) {
    const err = new Error('Только администратор может управлять пользователями');
    err.status = 403;
    throw err;
  }
  return session;
}

router.get('/houses', (_req, res) => {
  res.json({ houses: HOUSES });
});

router.get('/scores', async (_req, res) => {
  try {
    const scores = await getScores();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/events', async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  addEventClient(res);

  try {
    sendScores(res, await getScores());
  } catch { /* the client will still get the next broadcast */ }

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    res.write(': ping\n\n');
  }, 25_000);

  req.on('close', () => clearInterval(heartbeat));
});

router.post('/auth/login', async (req, res) => {
  try {
    const { userKey, fio } = req.body ?? {};
    const session = await loginUser(userKey, fio);
    res.json(session);
  } catch (err) {
    res.status(err.status || 403).json({ error: err.message });
  }
});

router.get('/users/:userKey', async (req, res) => {
  try {
    const fio = await getUserFio(req.params.userKey);
    if (!fio) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({
      userKey: req.params.userKey,
      fio,
      isAdmin: isAdminUser(req.params.userKey, fio),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users', async (req, res) => {
  try {
    await requireAdmin(req);
    res.json({ users: await listUsers() });
  } catch (err) {
    res.status(err.status || 403).json({ error: err.message });
  }
});

router.post('/admin/users', async (req, res) => {
  try {
    await requireAdmin(req);
    const { userKey, fio } = req.body ?? {};
    const created = await createUser(userKey, fio);
    res.status(201).json(created);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.delete('/admin/users/:userKey', async (req, res) => {
  try {
    await requireAdmin(req);
    const users = await removeUser(decodeURIComponent(req.params.userKey));
    res.json({ users });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/scores/:house/add', async (req, res) => {
  try {
    const house = decodeURIComponent(req.params.house);
    const { amount, userFio, comment } = req.body;
    if (!userFio?.trim()) {
      return res.status(400).json({ error: 'Укажите ФИО пользователя' });
    }
    const result = await addPoints(house, Number(amount), userFio.trim(), comment);
    broadcastScores(result.scores);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/scores/:house/subtract', async (req, res) => {
  try {
    const house = decodeURIComponent(req.params.house);
    const { amount, userFio, comment } = req.body;
    if (!userFio?.trim()) {
      return res.status(400).json({ error: 'Укажите ФИО пользователя' });
    }
    const result = await subtractPoints(house, Number(amount), userFio.trim(), comment);
    broadcastScores(result.scores);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/log', async (_req, res) => {
  try {
    const log = await getLog();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/log/download', async (_req, res) => {
  try {
    const text = await exportLogText();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hogwarts-history.txt"');
    res.send(text || 'История пуста');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/log/clear', async (_req, res) => {
  try {
    const log = await clearLog();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scores/reset', async (_req, res) => {
  try {
    const scores = await resetScores();
    broadcastScores(scores);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { ensureAdminUser };
export default router;
