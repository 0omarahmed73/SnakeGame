import assert from "node:assert/strict";
import test from "node:test";
import { createGame, step, tickMs, turn } from "../js/engine.js";

test("snake advances one cell in the current direction", () => {
  const game = createGame({ status: "running", food: { x: 10, y: 10 } });
  const before = game.snake[0].x;
  const result = step(game);
  assert.equal(result.type, "move");
  assert.equal(game.snake[0].x, before + 1);
  assert.equal(game.snake.length, 3);
});

test("a reverse input is ignored and the next turn is queued", () => {
  const game = createGame({ status: "running", food: { x: 10, y: 10 } });
  assert.equal(turn(game, "left"), false);
  assert.equal(turn(game, "up"), true);
  step(game);
  assert.equal(game.direction, "up");
  assert.equal(game.snake[0].y, game.snake[1].y - 1);
});

test("eating grows the snake, scores, and moves the apple", () => {
  const game = createGame({
    status: "running",
    food: { x: 4, y: 8 },
    rng: () => 0,
  });
  const result = step(game);
  assert.equal(result.type, "eat");
  assert.equal(game.score, 10);
  assert.equal(game.snake.length, 4);
  assert.notDeepEqual(game.food, { x: 4, y: 8 });
  assert.equal(
    game.snake.some((cell) => cell.x === game.food.x && cell.y === game.food.y),
    false,
  );
});

test("the tail cell is safe when the snake is not eating", () => {
  const game = createGame({
    status: "running",
    direction: "right",
    snake: [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
    ],
    food: { x: 10, y: 10 },
  });
  const result = step(game);
  assert.equal(result.type, "move");
  assert.equal(game.status, "running");
  assert.deepEqual(game.snake[0], { x: 2, y: 1 });
});

test("running into the body ends the run", () => {
  const game = createGame({
    status: "running",
    direction: "right",
    snake: [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
    food: { x: 10, y: 10 },
  });
  const result = step(game);
  assert.equal(result.type, "dead");
  assert.equal(result.reason, "self");
});

test("the snake wraps across the opposite edge", () => {
  const game = createGame({
    cols: 6,
    rows: 6,
    status: "running",
    direction: "up",
    snake: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
    food: { x: 4, y: 4 },
  });
  const result = step(game);
  assert.equal(result.type, "move");
  assert.equal(game.status, "running");
  assert.deepEqual(game.snake[0], { x: 1, y: 5 });
});

test("wrapping into the body ends the run", () => {
  const game = createGame({
    cols: 4,
    rows: 4,
    status: "running",
    direction: "left",
    snake: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 0 },
      { x: 2, y: 0 },
    ],
    food: { x: 1, y: 3 },
  });
  const result = step(game);
  assert.equal(result.type, "dead");
  assert.equal(result.reason, "self");
});

test("filling the board wins", () => {
  const snake = [];
  for (let y = 0; y < 2; y += 1) {
    for (let x = 0; x < 2; x += 1) snake.push({ x, y });
  }
  snake.splice(0, 1);
  const game = createGame({
    cols: 2,
    rows: 2,
    status: "running",
    direction: "left",
    snake,
    food: { x: 0, y: 0 },
  });
  const result = step(game);
  assert.equal(result.type, "win");
  assert.equal(game.status, "won");
  assert.equal(game.snake.length, 4);
});

test("speed increases with score and then holds", () => {
  assert.equal(tickMs(0), 168);
  assert.equal(tickMs(40), 144);
  assert.equal(tickMs(500), 68);
});
