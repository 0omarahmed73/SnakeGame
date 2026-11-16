import { VECTORS, createGame, step, tickMs, turn } from "./engine.js";

const BEST_KEY = "snake-best";
const SOUND_KEY = "snake-sound";
const COLS = 16;

const board = document.querySelector("#board");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const primary = document.querySelector("#primary");
const pauseButton = document.querySelector("#pause");
const soundButton = document.querySelector("#sound");
const installButton = document.querySelector("#install");
const scoreNode = document.querySelector("#score");
const bestNode = document.querySelector("#best");
const live = document.querySelector("#live");
const hint = document.querySelector("#hint");
const ctx = board.getContext("2d");

const keys = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

let game = createGame({ cols: COLS, rows: COLS });
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let lastFrame = 0;
let accumulator = 0;
let installEvent = null;
let pointer = null;
let viewSize = 320;

const audio = {
  enabled: localStorage.getItem(SOUND_KEY) !== "off",
  context: null,
};

function announce(message) {
  live.textContent = message;
}

function paintScore() {
  scoreNode.textContent = String(game.score);
  bestNode.textContent = String(best);
}

function setSoundLabel() {
  soundButton.textContent = audio.enabled ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-pressed", String(audio.enabled));
}

function tone(frequency, duration, type = "sine") {
  if (!audio.enabled) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!audio.context) audio.context = new AudioCtx();
  if (audio.context.state === "suspended") audio.context.resume();
  const now = audio.context.currentTime;
  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audio.context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function showOverlay(title, copy, action) {
  overlay.hidden = false;
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  primary.textContent = action;
  primary.focus();
}

function hideOverlay() {
  overlay.hidden = true;
}

function syncControls() {
  const liveRun = game.status === "running" || game.status === "paused";
  pauseButton.disabled = !liveRun;
  pauseButton.textContent = game.status === "paused" ? "Resume" : "Pause";
  paintScore();
}

function rememberBest() {
  if (game.score > best) {
    best = game.score;
    localStorage.setItem(BEST_KEY, String(best));
  }
}

function freshGame() {
  game = createGame({ cols: COLS, rows: COLS });
  accumulator = 0;
  syncControls();
  draw();
  showOverlay(
    "Ready",
    "Collect the apples. Leave an edge and you come back on the other side.",
    "Play",
  );
  announce("Ready. Press Play.");
}

function begin() {
  if (game.status === "over" || game.status === "won") {
    game = createGame({ cols: COLS, rows: COLS });
  }
  if (game.status !== "ready" && game.status !== "paused") return;
  game.status = "running";
  accumulator = 0;
  lastFrame = 0;
  hideOverlay();
  syncControls();
  tone(330, 0.06);
  announce("Running.");
}

function pause() {
  if (game.status === "running") {
    game.status = "paused";
    showOverlay("Paused", "Take a breath. The board will wait.", "Resume");
    announce("Paused.");
  } else if (game.status === "paused") {
    begin();
    return;
  }
  syncControls();
}

function finish(result) {
  rememberBest();
  syncControls();
  if (result.type === "win") {
    showOverlay("Cleared", `The board is full. Score ${game.score}.`, "Play again");
    announce(`You cleared the board. Score ${game.score}. Best ${best}.`);
    tone(660, 0.12);
    return;
  }
  showOverlay("Game over", `You ran into yourself. Score ${game.score}.`, "Play again");
  announce(`You ran into yourself. Score ${game.score}. Best ${best}.`);
  tone(180, 0.22, "triangle");
}

function steer(direction) {
  if (game.status === "ready") begin();
  if (game.status !== "running") return;
  turn(game, direction);
}

function resize() {
  const node = board.parentElement;
  viewSize = Math.max(160, Math.floor(Math.min(node.clientWidth, node.clientHeight)));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  board.width = Math.floor(viewSize * dpr);
  board.height = Math.floor(viewSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function center(cell, x, y) {
  return { x: x * cell + cell / 2, y: y * cell + cell / 2 };
}

function draw() {
  const size = viewSize;
  const cell = size / COLS;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#f4fbf7";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(12, 107, 88, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < COLS; i += 1) {
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, size);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(size, i * cell);
  }
  ctx.stroke();

  if (game.food) drawApple(game.food.x, game.food.y, cell);
  drawSnake(cell);
  drawEyes(cell);
}

function drawSnake(cell) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#14967a";
  ctx.lineWidth = cell * 0.62;
  ctx.beginPath();
  for (let i = game.snake.length - 1; i >= 0; i -= 1) {
    const segment = game.snake[i];
    const point = center(cell, segment.x, segment.y);
    if (i === game.snake.length - 1) {
      ctx.moveTo(point.x, point.y);
      continue;
    }
    const previous = game.snake[i + 1];
    const wrapped = Math.abs(segment.x - previous.x) > 1 || Math.abs(segment.y - previous.y) > 1;
    if (wrapped) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();

  const head = center(cell, game.snake[0].x, game.snake[0].y);
  ctx.fillStyle = "#0c6b58";
  ctx.beginPath();
  ctx.arc(head.x, head.y, cell * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

function drawApple(x, y, cell) {
  const point = center(cell, x, y);
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(point.x, point.y, cell * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(point.x - cell * 0.08, point.y - cell * 0.08, cell * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(point.x + cell * 0.02, point.y - cell * 0.36, cell * 0.08, cell * 0.16);
}

function drawEyes(cell) {
  const head = center(cell, game.snake[0].x, game.snake[0].y);
  const direction = VECTORS[game.direction];
  const side = { x: -direction.y, y: direction.x };
  const radius = Math.max(1.5, cell * 0.055);
  ctx.fillStyle = "#f4fbf7";
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(
      head.x + direction.x * cell * 0.1 + side.x * cell * 0.12 * sign,
      head.y + direction.y * cell * 0.1 + side.y * cell * 0.12 * sign,
      radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function frame(time) {
  requestAnimationFrame(frame);
  if (game.status !== "running") {
    lastFrame = time;
    return;
  }
  if (!lastFrame) lastFrame = time;
  accumulator += time - lastFrame;
  lastFrame = time;
  const interval = tickMs(game.score);
  let guard = 0;
  while (accumulator >= interval && guard < 4) {
    accumulator -= interval;
    guard += 1;
    const result = step(game);
    if (result.type === "eat") {
      rememberBest();
      paintScore();
      tone(520 + Math.min(game.score, 240), 0.05);
      announce(`Score ${game.score}.`);
    }
    if (result.type === "dead" || result.type === "win") {
      accumulator = 0;
      finish(result);
      break;
    }
  }
  draw();
}

primary.addEventListener("click", () => {
  if (game.status === "over" || game.status === "won") freshGame();
  begin();
});

pauseButton.addEventListener("click", pause);

soundButton.addEventListener("click", () => {
  audio.enabled = !audio.enabled;
  localStorage.setItem(SOUND_KEY, audio.enabled ? "on" : "off");
  setSoundLabel();
  if (audio.enabled) tone(440, 0.05);
});

document.querySelectorAll(".dpad button").forEach((button) => {
  button.addEventListener("click", () => steer(button.dataset.dir));
});

window.addEventListener("keydown", (event) => {
  const direction = keys[event.key.toLowerCase()];
  if (direction) {
    event.preventDefault();
    steer(direction);
    return;
  }
  if (event.key === " " || event.key === "Enter") {
    if (event.target === soundButton || event.target === installButton) return;
    event.preventDefault();
    if (game.status === "running" || game.status === "paused") pause();
    else {
      if (game.status === "over" || game.status === "won") freshGame();
      begin();
    }
  }
});

board.addEventListener("pointerdown", (event) => {
  pointer = { x: event.clientX, y: event.clientY };
});

board.addEventListener("pointerup", (event) => {
  if (!pointer) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  pointer = null;
  if (Math.hypot(dx, dy) < 24) return;
  steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installEvent = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
  announce("Snake is installed.");
});

const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (ios && !standalone) {
  hint.textContent = "Swipe the board. To install, use Share, then Add to Home Screen.";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      announce("Offline install is unavailable in this browser.");
    });
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.status === "running") pause();
});

new ResizeObserver(resize).observe(board.parentElement);
setSoundLabel();
freshGame();
requestAnimationFrame(frame);
