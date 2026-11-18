// Live score feed. Every browser keeps one SSE connection open, so a change made
// by one teacher reaches all the other screens without a reload.
const clients = new Set();

export function addEventClient(res) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function sendScores(res, scores) {
  try {
    res.write(`event: scores\ndata: ${JSON.stringify(scores)}\n\n`);
  } catch {
    clients.delete(res);
  }
}

export function broadcastScores(scores) {
  for (const res of clients) {
    if (res.writableEnded) {
      clients.delete(res);
      continue;
    }
    sendScores(res, scores);
  }
}
