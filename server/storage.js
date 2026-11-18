import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { HOUSES, HOUSE_DATIVE, HOUSE_GENITIVE, ADMIN_KEY } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

const FILES = {
  score: path.join(DATA_DIR, 'score.json'),
  users: path.join(DATA_DIR, 'users.json'),
  log: path.join(DATA_DIR, 'log.json'),
};

// The JSON files are a read-modify-write store, so parallel requests used to read
// the same value and overwrite each other: 20 simultaneous "+1" left a single
// point. Every mutation goes through this queue instead.
let mutations = Promise.resolve();

function withLock(task) {
  const result = mutations.then(task);
  mutations = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readJson(filePath, fallback) {
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch {
    await writeJson(filePath, fallback);
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    // Keep the damaged file instead of quietly replacing live scores with zeroes.
    const backup = `${filePath}.corrupt-${Date.now()}`;
    await fs.rename(filePath, backup).catch(() => {});
    console.error(`❌ ${path.basename(filePath)} повреждён, сохранён как ${path.basename(backup)}`);
    await writeJson(filePath, fallback);
    return fallback;
  }
}

async function writeJson(filePath, data) {
  // Write-then-rename: a process killed mid-write can no longer leave a truncated
  // file that reads back as "no data".
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmp, filePath);
}

export async function getScores() {
  const scores = await readJson(FILES.score, Object.fromEntries(HOUSES.map((h) => [h, 0])));
  for (const house of HOUSES) {
    if (typeof scores[house] !== 'number') scores[house] = 0;
  }
  return scores;
}

export async function getUsers() {
  return readJson(FILES.users, {});
}

function normalizeField(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export async function ensureAdminUser() {
  return withLock(async () => {
    const users = await getUsers();
    if (!users[ADMIN_KEY]) {
      users[ADMIN_KEY] = 'Администратор';
      await writeJson(FILES.users, users);
    }
    return users;
  });
}

export async function loginUser(userKey, fio) {
  const key = normalizeField(userKey);
  const title = normalizeField(fio);
  if (!key || !title) {
    throw new Error('Укажите имя и должность с ФИО');
  }

  const users = await getUsers();
  const stored = users[key];
  if (!stored || normalizeField(stored) !== title) {
    throw new Error('Доступ запрещён. Такой связки имени и должности нет — обратитесь к администратору.');
  }

  return {
    userKey: key,
    fio: normalizeField(stored),
    isAdmin: key === ADMIN_KEY,
  };
}

export async function listUsers() {
  const users = await getUsers();
  return Object.entries(users)
    .map(([userKey, fio]) => ({
      userKey,
      fio,
      isAdmin: userKey === ADMIN_KEY,
    }))
    .sort((a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
      return a.userKey.localeCompare(b.userKey, 'ru');
    });
}

export async function createUser(userKey, fio) {
  const key = normalizeField(userKey);
  const title = normalizeField(fio);
  if (!key || !title) {
    throw new Error('Укажите имя и должность с ФИО');
  }
  if (key === ADMIN_KEY) {
    throw new Error('Нельзя создать ещё одного администратора с этим именем');
  }

  return withLock(async () => {
    const users = await getUsers();
    if (users[key]) {
      throw new Error('Пользователь с таким именем уже зарегистрирован');
    }
    users[key] = title;
    await writeJson(FILES.users, users);
    return { userKey: key, fio: title, isAdmin: false };
  });
}

export async function removeUser(userKey) {
  const key = normalizeField(userKey);
  if (!key) throw new Error('Укажите имя пользователя');
  if (key === ADMIN_KEY) {
    throw new Error('Нельзя удалить администратора');
  }

  return withLock(async () => {
    const users = await getUsers();
    if (!users[key]) {
      throw new Error('Пользователь не найден');
    }
    delete users[key];
    await writeJson(FILES.users, users);
    return listUsersFrom(users);
  });
}

function listUsersFrom(users) {
  return Object.entries(users)
    .map(([userKey, fio]) => ({
      userKey,
      fio,
      isAdmin: userKey === ADMIN_KEY,
    }))
    .sort((a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
      return a.userKey.localeCompare(b.userKey, 'ru');
    });
}

export async function getUserFio(userKey) {
  const users = await getUsers();
  return users[normalizeField(userKey)] || null;
}

export async function getLog() {
  return readJson(FILES.log, []);
}

// Date.now() alone repeats when two entries land in the same millisecond, which
// gave the history duplicate ids.
let lastLogId = 0;

function nextLogId() {
  const now = Date.now();
  lastLogId = now > lastLogId ? now : lastLogId + 1;
  return lastLogId;
}

async function appendLog(entry) {
  const log = await getLog();
  log.unshift({
    id: nextLogId(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  await writeJson(FILES.log, log);
  return log;
}

function normalizeComment(comment) {
  if (comment == null) return '';
  const trimmed = String(comment).trim();
  if (!trimmed) return '';
  if (trimmed.length > 500) {
    throw new Error('Комментарий не должен быть длиннее 500 символов');
  }
  return trimmed;
}

function withComment(message, comment) {
  return comment ? `${message} — ${comment}` : message;
}

export async function addPoints(house, amount, userFio, comment = '') {
  if (!HOUSES.includes(house)) {
    throw new Error('Неизвестный факультет');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Количество баллов должно быть положительным целым числом');
  }

  const reason = normalizeComment(comment);

  return withLock(async () => {
    const scores = await getScores();
    scores[house] += amount;
    await writeJson(FILES.score, scores);

    const message = withComment(
      `${userFio} добавил(а) ${amount} баллов ${HOUSE_DATIVE[house]}`,
      reason,
    );
    await appendLog({
      user: userFio,
      action: 'add',
      amount,
      house,
      message,
      comment: reason || null,
      newScore: scores[house],
    });

    return { scores, message, capped: false };
  });
}

export async function subtractPoints(house, amount, userFio, comment = '') {
  if (!HOUSES.includes(house)) {
    throw new Error('Неизвестный факультет');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Количество баллов должно быть положительным целым числом');
  }

  const reason = normalizeComment(comment);

  return withLock(async () => {
    const scores = await getScores();
    const previous = scores[house];
    let capped = false;
    let message;

    if (amount > previous) {
      scores[house] = 0;
      capped = true;
      message = withComment(
        `${userFio} попробовал(а) вычесть ${amount} баллов у ${HOUSE_GENITIVE[house]} и теперь количество баллов = 0`,
        reason,
      );
    } else {
      scores[house] -= amount;
      message = withComment(
        `${userFio} вычел(чла) ${amount} баллов у ${HOUSE_GENITIVE[house]}`,
        reason,
      );
    }

    await writeJson(FILES.score, scores);
    await appendLog({
      user: userFio,
      action: capped ? 'subtract_capped' : 'subtract',
      amount,
      house,
      message,
      comment: reason || null,
      newScore: scores[house],
      previousScore: previous,
    });

    return { scores, message, capped };
  });
}

export async function resetScores() {
  return withLock(async () => {
    const scores = Object.fromEntries(HOUSES.map((h) => [h, 0]));
    await writeJson(FILES.score, scores);
    return scores;
  });
}

export async function clearLog() {
  return withLock(async () => {
    await writeJson(FILES.log, []);
    return [];
  });
}

function formatLogTimestamp(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractLogComment(entry) {
  const stored = entry.comment?.trim();
  if (stored) return stored;

  const dashIndex = entry.message.lastIndexOf(' — ');
  if (dashIndex <= 0) return '';

  return entry.message.slice(dashIndex + 3).trim();
}

function formatLogEntryForExport(entry) {
  const time = formatLogTimestamp(entry.timestamp);
  const comment = extractLogComment(entry);
  const message = comment && entry.message.endsWith(` — ${comment}`)
    ? entry.message.slice(0, -(` — ${comment}`).length)
    : entry.message;

  const lines = [`[${time}] ${message}`];
  if (comment) {
    lines.push(`Комментарий: ${comment}`);
  }
  return lines.join('\n');
}

export async function exportLogText() {
  const log = await getLog();
  if (!log.length) return '';
  return log.map(formatLogEntryForExport).join('\n\n');
}
