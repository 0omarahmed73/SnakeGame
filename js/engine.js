export const VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function createGame(options = {}) {
  const cols = options.cols ?? 16;
  const rows = options.rows ?? 16;
  const rng = options.rng ?? Math.random;
  const mid = Math.floor(rows / 2);
  const snake = (options.snake ?? [
    { x: 3, y: mid },
    { x: 2, y: mid },
    { x: 1, y: mid },
  ]).map((cell) => ({ x: cell.x, y: cell.y }));

  const game = {
    cols,
    rows,
    rng,
    snake,
    direction: options.direction ?? "right",
    queue: [],
    food: options.food ? { x: options.food.x, y: options.food.y } : null,
    score: options.score ?? 0,
    status: options.status ?? "ready",
  };

  if (!game.food) game.food = spawnFood(game);
  return game;
}

export function turn(game, direction) {
  if (!VECTORS[direction]) return false;
  const pending = game.queue.at(-1) ?? game.direction;
  if (direction === pending || direction === OPPOSITE[pending]) return false;
  if (game.queue.length >= 2) return false;
  game.queue.push(direction);
  return true;
}

export function step(game) {
  if (game.status !== "running") return { type: "idle" };

  const queued = game.queue.shift();
  if (queued && queued !== OPPOSITE[game.direction]) game.direction = queued;

  const head = game.snake[0];
  const vector = VECTORS[game.direction];
  const next = {
    x: (head.x + vector.x + game.cols) % game.cols,
    y: (head.y + vector.y + game.rows) % game.rows,
  };

  const willEat = game.food && next.x === game.food.x && next.y === game.food.y;
  const occupied = willEat ? game.snake : game.snake.slice(0, -1);
  if (occupied.some((cell) => cell.x === next.x && cell.y === next.y)) {
    game.status = "over";
    return { type: "dead", reason: "self" };
  }

  game.snake.unshift(next);

  if (!willEat) {
    game.snake.pop();
    return { type: "move" };
  }

  game.score += 10;
  const food = spawnFood(game);
  if (!food) {
    game.food = null;
    game.status = "won";
    return { type: "win" };
  }

  game.food = food;
  return { type: "eat" };
}

export function spawnFood(game) {
  const open = [];
  for (let y = 0; y < game.rows; y += 1) {
    for (let x = 0; x < game.cols; x += 1) {
      if (!game.snake.some((cell) => cell.x === x && cell.y === y)) open.push({ x, y });
    }
  }
  if (open.length === 0) return null;
  const index = Math.floor(game.rng() * open.length) % open.length;
  return open[index];
}

export function tickMs(score) {
  const apples = Math.max(0, Math.floor(score / 10));
  return Math.max(68, 168 - apples * 6);
}
