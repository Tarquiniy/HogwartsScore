const BASE = '/api';

async function request(url, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const res = await fetch(`${BASE}${url}`, {
    ...rest,
    // Merge after rest so Content-Type is not wiped by caller headers (admin auth).
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

function adminHeaders(adminKey, adminFio) {
  return {
    'X-User-Key': encodeURIComponent(adminKey ?? ''),
    'X-User-Fio': encodeURIComponent(adminFio ?? ''),
  };
}

export const api = {
  getScores: () => request('/scores'),
  login: (userKey, fio) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userKey, fio }),
    }),
  listUsers: (adminKey, adminFio) =>
    request('/admin/users', {
      headers: adminHeaders(adminKey, adminFio),
    }),
  createUser: (adminKey, adminFio, userKey, fio) =>
    request('/admin/users', {
      method: 'POST',
      headers: adminHeaders(adminKey, adminFio),
      body: JSON.stringify({ userKey, fio }),
    }),
  removeUser: (adminKey, adminFio, userKey) =>
    request(`/admin/users/${encodeURIComponent(userKey)}`, {
      method: 'DELETE',
      headers: adminHeaders(adminKey, adminFio),
    }),
  addPoints: (house, amount, userFio, comment = '') =>
    request(`/scores/${encodeURIComponent(house)}/add`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        userFio,
        comment: String(comment ?? '').trim(),
      }),
    }),
  subtractPoints: (house, amount, userFio, comment = '') =>
    request(`/scores/${encodeURIComponent(house)}/subtract`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        userFio,
        comment: String(comment ?? '').trim(),
      }),
    }),
  // Live feed of the shared score board. The server sends a fresh snapshot on every
  // connect, so reconnecting is also how a client catches up on what it missed.
  subscribeScores: (onScores) => {
    let source = null;
    let retry = null;
    let stopped = false;

    const connect = () => {
      source = new EventSource(`${BASE}/events`);

      source.addEventListener('scores', (event) => {
        try {
          onScores(JSON.parse(event.data));
        } catch { /* ignore a malformed frame, the next one will be fine */ }
      });

      source.onerror = () => {
        // A restarting server answers with an error page rather than a stream, and
        // the browser then drops the connection for good instead of retrying — so
        // reconnect by hand. While it retries on its own the state is CONNECTING.
        if (stopped || source.readyState !== EventSource.CLOSED) return;
        source.close();
        retry = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      source?.close();
    };
  },
  getLog: () => request('/log'),
  downloadLog: () => window.open(`${BASE}/log/download`, '_blank'),
  clearLog: (adminKey, adminFio) =>
    request('/log/clear', {
      method: 'POST',
      headers: adminHeaders(adminKey, adminFio),
    }),
  resetScores: (adminKey, adminFio) =>
    request('/scores/reset', {
      method: 'POST',
      headers: adminHeaders(adminKey, adminFio),
    }),
};
