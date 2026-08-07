const clients = new Set<ReadableStreamDefaultController>();

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
  controller.enqueue(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}

function broadcast(data: string) {
  for (const client of clients) {
    try {
      client.enqueue(`data: ${data}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}

export function notifyNewGame(game: any) {
  broadcast(JSON.stringify({ type: "new_game", game, timestamp: Date.now() }));
}

export function notifyGameUpdate(game: any) {
  broadcast(JSON.stringify({ type: "game_update", game, timestamp: Date.now() }));
}

export function notifyGameEnd(game: any) {
  broadcast(JSON.stringify({ type: "game_end", game, timestamp: Date.now() }));
}

export function getClientCount(): number {
  return clients.size;
}