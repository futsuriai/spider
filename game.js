'use strict';

const SUITS = {
  S: { sym: '♠', red: false },
  H: { sym: '♥', red: true },
  D: { sym: '♦', red: true },
  C: { sym: '♣', red: false },
};
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const LEVELS = {
  easy: { label: 'Easy', suits: ['S'], heartsSuits: ['H'] },
  medium: { label: 'Medium', suits: ['S', 'H'], heartsSuits: ['H', 'C'] },
  hard: { label: 'Hard', suits: ['S', 'H', 'D', 'C'] },
};
const DEFAULT_OPTIONS = {
  back: 'lattice',
  messages: true,
  brightness: 70,
  rich: true,
  hearts: false,
  spacing: true,
  bounce: true,
  lowering: 50,
  mix: true,
  sound: true,
};
const STORE = { game: 'spider.game', options: 'spider.options' };
const GAP = 6;
const PAD = 12;
const BASE_PAD = 8;
const CANT_MOVE = "This card can't move. Pick up a run of one suit, in order.";
const BAD_DROP = 'That card needs a card one rank higher.';

const $ = (sel) => document.querySelector(sel);
const el = {
  undo: $('#btn-undo'),
  menu: $('#btn-menu'),
  stock: $('#stock'),
  foundations: $('#foundations'),
  tableau: $('#tableau'),
  toast: $('#toast'),
  dragLayer: $('#drag-layer'),
  level: $('#hud-level'),
  score: $('#hud-score'),
  moves: $('#hud-moves'),
  time: $('#hud-time'),
};

let game = null;
let options = { ...DEFAULT_OPTIONS };
let drag = null;
let bounced = new Set();
let pendingLevel = null;
let toastTimer = 0;
let audio = null;
let cw = 60;
let ch = 84;
let lift = 0;
let lastUp = new Set();
let anim = null;
let pulseSlot = -1;
let animatingTimer = 0;

// ---------- screens and sheets ----------

function show(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
}

function onGameScreen() {
  return $('#screen-game').classList.contains('active');
}

function openSheet(id) {
  $(`#${id}`).classList.add('open');
}

function closeSheet(id) {
  $(`#${id}`).classList.remove('open');
}

function sheetOpen() {
  return !!document.querySelector('.sheet-overlay.open');
}

function go(name) {
  if (name === 'home') renderHome();
  if (name === 'game') render();
  if (name === 'options') syncOptionInputs();
  show(name);
}

function renderHome() {
  const live = game && !game.won ? game : null;
  $('#btn-resume').hidden = !live;
  if (live) {
    $('#resume-title').textContent = LEVELS[live.diff].label;
    $('#resume-meta').textContent = `${live.moves} ${live.moves === 1 ? 'move' : 'moves'} · ${fmt(live.elapsed)}`;
  }
}

// ---------- storage (every read and write is allowed to fail) ----------

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep playing, just without saving.
  }
}

function loadOptions() {
  options = { ...DEFAULT_OPTIONS, ...(read(STORE.options) || {}) };
}

function saveOptions() {
  write(STORE.options, options);
}

function saveGame() {
  if (game) write(STORE.game, game);
}

function loadGame() {
  const saved = read(STORE.game);
  if (!saved || !Array.isArray(saved.tableau) || saved.tableau.length !== 10) return null;
  // Bold and Expert were removed: their games carry on as Hard.
  if (saved.diff === 'bold' || saved.diff === 'expert') saved.diff = 'hard';
  return LEVELS[saved.diff] ? saved : null;
  return null;
}

// ---------- deck and rules ----------

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function buildDeck(suits) {
  const copies = 104 / (suits.length * 13);
  const deck = [];
  for (let c = 0; c < copies; c++) {
    for (const s of suits) {
      for (let r = 1; r <= 13; r++) deck.push({ r, s, up: false, id: deck.length });
    }
  }
  return shuffle(deck);
}

function newGame(level) {
  const cfg = LEVELS[level];
  const deck = buildDeck(options.hearts && cfg.heartsSuits ? cfg.heartsSuits : cfg.suits);
  const tableau = [];
  for (let i = 0; i < 10; i++) {
    const col = deck.splice(0, i < 4 ? 6 : 5);
    col[col.length - 1].up = true;
    tableau.push(col);
  }
  game = { diff: level, tableau, stock: deck, done: 0, score: 500, moves: 0, elapsed: 0, won: false, history: [], selected: null };
  bounced = new Set();
  afterChange();
}

// A run is movable when it is face up, one suit, and descending by one rank.
function isRun(col, i) {
  if (!col[i] || !col[i].up) return false;
  for (let k = i + 1; k < col.length; k++) {
    const prev = col[k - 1];
    const cur = col[k];
    if (!cur.up || cur.s !== prev.s || cur.r !== prev.r - 1) return false;
  }
  return true;
}

function canDrop(run, col) {
  const top = col[col.length - 1];
  return !top || top.r === run[0].r + 1;
}

function flip(col) {
  const top = col[col.length - 1];
  if (top && !top.up) top.up = true;
}

function collectSuit(ci) {
  const col = game.tableau[ci];
  if (col.length < 13) return;
  const run = col.slice(-13);
  const full = run.every((c, k) => c.up && c.r === 13 - k && c.s === run[0].s);
  if (!full) return;
  col.length -= 13;
  flip(col);
  game.done++;
  pulseSlot = game.done - 1;
  game.score += 100;
  toast('Suit complete! +100');
  sfx(660, 0.18, 'triangle', 0.07);
}

function snapshot() {
  return JSON.stringify({ tableau: game.tableau, stock: game.stock, done: game.done, score: game.score, moves: game.moves });
}

function checkpoint() {
  game.history.push(snapshot());
  if (game.history.length > 100) game.history.shift();
}

function moveRun(from, idx, to) {
  if (from === to) return false;
  const src = game.tableau[from];
  const dst = game.tableau[to];
  if (!isRun(src, idx)) {
    note(CANT_MOVE);
    return false;
  }
  const run = src.slice(idx);
  if (!canDrop(run, dst)) {
    note(BAD_DROP);
    return false;
  }
  checkpoint();
  src.splice(idx);
  dst.push(...run);
  flip(src);
  game.selected = null;
  game.moves++;
  game.score -= 1;
  bounced = new Set(run.map((c) => c.id));
  collectSuit(to);
  sfx(520, 0.05, 'triangle', 0.05);
  anim = 'move';
  afterChange();
  return true;
}

function dealRow() {
  if (!game || game.won) return;
  if (game.stock.length === 0) return toast('No more cards to deal.');
  if (game.tableau.some((col) => col.length === 0)) return toast('Fill every empty column before dealing.');
  checkpoint();
  const batch = game.stock.splice(-10);
  batch.forEach((card, i) => {
    card.up = true;
    game.tableau[i].push(card);
  });
  game.selected = null;
  game.moves++;
  bounced = new Set(batch.map((c) => c.id));
  for (let i = 0; i < 10; i++) collectSuit(i);
  sfx(300, 0.12, 'sine', 0.06);
  anim = 'deal';
  afterChange();
}

// Finds a legal move to suggest: prefer moves that turn over a face-down card.
function findHint() {
  if (!game || game.won) return null;
  let best = null;
  game.tableau.forEach((src, from) => {
    for (let idx = 0; idx < src.length; idx++) {
      if (!isRun(src, idx)) continue;
      const run = src.slice(idx);
      const reveals = idx > 0 && !src[idx - 1].up;
      game.tableau.forEach((dst, to) => {
        if (to === from || !canDrop(run, dst)) return;
        if (dst.length === 0 && idx === 0) return;
        const score = (reveals ? 10 : 0) + (dst.length ? 1 : 0) + run.length * 0.1;
        if (!best || score > best.score) best = { from, idx, to, score };
      });
    }
  });
  if (best) return best;
  if (game.stock.length && game.tableau.every((c) => c.length)) return { deal: true };
  return null;
}

let hintTimer = 0;
function showHint() {
  const hint = findHint();
  el.tableau.querySelectorAll('.hint, .hint-target').forEach((n) => n.classList.remove('hint', 'hint-target'));
  el.stock.classList.remove('hint');
  if (!hint) return toast('No moves to suggest. Try Undo, or start a new game.');
  if (hint.deal) {
    el.stock.classList.add('hint');
    toast('Deal the next row.');
  } else {
    const src = el.tableau.querySelector(`.col[data-col="${hint.from}"] .card[data-idx="${hint.idx}"]`);
    if (src) src.classList.add('hint');
    el.tableau.querySelector(`.col[data-col="${hint.to}"]`).classList.add('hint-target');
    toast('Try moving the highlighted cards.');
  }
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    el.tableau.querySelectorAll('.hint, .hint-target').forEach((n) => n.classList.remove('hint', 'hint-target'));
    el.stock.classList.remove('hint');
  }, 3000);
}

function undo() {
  if (!game || game.won) return;
  const prev = game.history.pop();
  if (!prev) return toast('Nothing to undo yet.');
  Object.assign(game, JSON.parse(prev));
  game.selected = null;
  bounced = new Set();
  anim = 'move';
  afterChange();
}

function afterChange() {
  if (game.done === 8 && !game.won) {
    game.won = true;
    showWin();
  }
  saveGame();
  render();
  bounced = new Set();
}

// ---------- layout and rendering ----------

function layout() {
  const width = el.tableau.clientWidth - 2 * PAD - 9 * GAP;
  cw = Math.max(40, Math.min(110, Math.floor(width / 10)));
  ch = Math.round(cw * 1.4);
  lift = Math.round((ch * 0.45 * options.lowering) / 100);
  const root = document.documentElement.style;
  root.setProperty('--cw', cw + 'px');
  root.setProperty('--ch', ch + 'px');
  root.setProperty('--gap', GAP + 'px');
  root.setProperty('--pad', PAD + 'px');
}

function fanSteps(n) {
  const max = ch * 0.3;
  const min = ch * 0.1;
  let up = max;
  if (options.spacing && n > 1) {
    const room = el.tableau.clientHeight - ch - BASE_PAD - lift;
    up = Math.max(min, Math.min(ch * 0.55, room / (n - 1)));
  }
  return { up, down: up * 0.5 };
}

function cardNode(card) {
  const node = document.createElement('div');
  node.className = 'card';
  if (!card.up) {
    node.classList.add('down');
    return node;
  }
  const s = SUITS[card.s];
  node.classList.add('up', s.red ? 'red' : 'black');
  if (card.r === 10) node.classList.add('ten');
  node.dataset.id = card.id;
  const rank = RANKS[card.r];
  const corner = `<span class="corner tl"><b>${rank}</b><i>${s.sym}</i></span>`;
  if (card.r > 10) {
    // Court cards: the top half of the figure, shown at the bottom of an uncovered card; the rank and suit stay in the corner.
    node.classList.add('court');
    const word = { 11: 'jack', 12: 'queen', 13: 'king' }[card.r];
    const suitWord = { S: 'spade', H: 'heart', D: 'diamond', C: 'club' }[card.s];
    node.innerHTML = `<img class="face-img" src="court/figures/${suitWord}_${word}.svg" alt="${word} of ${suitWord}s" draggable="false">` + corner;
    return node;
  }
  // Number cards show one large suit in the open area, like an Ace; covered cards hide it in CSS.
  node.innerHTML = corner + `<span class="pip ace">${s.sym}</span>`;
  return node;
}

function renderTableau(before, stockRect) {
  el.tableau.innerHTML = '';
  const flips = [];
  const nowUp = new Set();
  let fresh = 0;
  game.tableau.forEach((col, ci) => {
    const colEl = document.createElement('div');
    colEl.className = 'col';
    colEl.dataset.col = ci;
    const steps = fanSteps(col.length);
    let y = BASE_PAD + lift;
    col.forEach((card, idx) => {
      const node = cardNode(card);
      node.dataset.idx = idx;
      // A covered card shows only its top edge, so its bottom index is left out.
      if (idx < col.length - 1) node.classList.add('covered');
      node.style.top = y + 'px';
      const sel = game.selected;
      if (sel && sel.col === ci && idx >= sel.idx) node.style.transform = `translateY(${-lift}px)`;
      if (options.bounce && bounced.has(card.id)) node.classList.add('bounce');
      if (card.up) {
        nowUp.add(card.id);
        if (anim === 'move' && before.has(card.id)) {
          flips.push({ node, from: before.get(card.id), delay: 0 });
        } else if (anim === 'deal' && !before.has(card.id)) {
          flips.push({ node, from: stockRect, delay: 45 * fresh++ });
        } else if (lastUp.size && !lastUp.has(card.id) && anim !== 'deal') {
          node.classList.add('reveal');
        }
      }
      colEl.appendChild(node);
      y += card.up ? steps.up : steps.down;
    });
    el.tableau.appendChild(colEl);
  });
  // Columns clip their children, which would cut cards off mid-flight, so let them show while cards glide.
  if (flips.length) {
    el.tableau.classList.add('animating');
    clearTimeout(animatingTimer);
    animatingTimer = setTimeout(() => el.tableau.classList.remove('animating'), 1100);
  }
  // Glide each moved or dealt card from where it was to where it is now.
  flips.forEach(({ node, from, delay }) => {
    const to = node.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const final = node.style.transform;
    node.style.transition = 'none';
    node.style.transform = `translate(${dx}px, ${dy}px) ${final}`;
    void node.offsetWidth;
    node.style.transition = '';
    node.style.transitionDelay = delay + 'ms';
    node.style.transform = final;
  });
  lastUp = nowUp;
}

function shakeCol(ci) {
  const colEl = el.tableau.querySelector(`.col[data-col="${ci}"]`);
  if (!colEl) return;
  colEl.classList.remove('shake');
  void colEl.offsetWidth;
  colEl.classList.add('shake');
  setTimeout(() => colEl.classList.remove('shake'), 450);
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const glyphs = ['♠', '♥', '♦', '♣'];
  for (let i = 0; i < 44; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti' + (i % 4 === 1 || i % 4 === 2 ? ' red' : '');
    piece.textContent = glyphs[i % 4];
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.animationDelay = Math.random() * 0.8 + 's';
    piece.style.animationDuration = 2.4 + Math.random() * 1.6 + 's';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4600);
  }
}

function renderTop() {
  const deals = game.stock.length / 10;
  el.stock.innerHTML = '';
  el.stock.classList.toggle('empty', deals === 0);
  el.stock.disabled = deals === 0;
  for (let i = 0; i < Math.min(4, deals); i++) {
    const back = cardNode({ up: false });
    back.style.left = i * 2 + 'px';
    back.style.top = i * 2 + 'px';
    el.stock.appendChild(back);
  }
  if (deals > 0) {
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = deals;
    el.stock.appendChild(count);
  }
  el.foundations.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot' + (i < game.done ? ' filled' : '') + (i === pulseSlot ? ' pulse' : '');
    slot.textContent = i < game.done ? '✓' : '';
    el.foundations.appendChild(slot);
  }
}

function fmt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function updateHud() {
  el.level.textContent = LEVELS[game.diff].label;
  el.score.textContent = game.score;
  el.moves.textContent = game.moves;
  el.time.textContent = fmt(game.elapsed);
}

function captureRects() {
  const rects = new Map();
  el.tableau.querySelectorAll('.card.up').forEach((node) => {
    rects.set(Number(node.dataset.id), node.getBoundingClientRect());
  });
  return rects;
}

function render() {
  if (!game) return;
  const before = captureRects();
  const stockRect = el.stock.getBoundingClientRect();
  layout();
  updateHud();
  renderTop();
  renderTableau(before, stockRect);
  const noUndo = game.won || game.history.length === 0;
  el.undo.classList.toggle('is-disabled', noUndo);
  el.undo.setAttribute('aria-disabled', String(noUndo));
  anim = null;
  pulseSlot = -1;
}

// ---------- touch: drag a run, or tap a card then tap where it goes ----------

function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 5000);
}

function note(msg) {
  if (options.messages) toast(msg);
}

function columnAt(x, y) {
  const hit = document.elementFromPoint(x, y);
  const direct = hit && hit.closest('.col');
  if (direct) return Number(direct.dataset.col);
  // Finger landed in the gap between columns: use the nearest column.
  let best = -1;
  let bestDist = Infinity;
  el.tableau.querySelectorAll('.col').forEach((c) => {
    const r = c.getBoundingClientRect();
    if (y < r.top || y > r.bottom) return;
    const dist = Math.abs(x - (r.left + r.width / 2));
    if (dist < bestDist && dist <= r.width / 2 + GAP * 2) {
      bestDist = dist;
      best = Number(c.dataset.col);
    }
  });
  return best;
}

function onTap(ci, idx) {
  const sel = game.selected;
  if (sel && sel.col !== ci && canDrop(game.tableau[sel.col].slice(sel.idx), game.tableau[ci])) {
    moveRun(sel.col, sel.idx, ci);
    return;
  }
  if (idx < 0) {
    game.selected = null;
    render();
    return;
  }
  if (sel && sel.col === ci && sel.idx === idx) {
    game.selected = null;
  } else if (isRun(game.tableau[ci], idx)) {
    game.selected = { col: ci, idx };
  } else {
    game.selected = null;
    note(CANT_MOVE);
    shakeCol(ci);
  }
  render();
}

function startDrag() {
  drag.moving = true;
  const cards = [...el.tableau.querySelectorAll(`.col[data-col="${drag.ci}"] .card`)].filter(
    (c) => Number(c.dataset.idx) >= drag.idx,
  );
  const baseTop = parseFloat(cards[0].style.top);
  const ghost = document.createElement('div');
  ghost.className = 'ghost';
  cards.forEach((c) => {
    const copy = c.cloneNode(true);
    copy.classList.remove('bounce');
    copy.style.transform = '';
    copy.style.top = parseFloat(c.style.top) - baseTop + 'px';
    ghost.appendChild(copy);
    c.classList.add('dragging');
  });
  el.dragLayer.appendChild(ghost);
  drag.ghost = ghost;
}

function placeGhost(x, y) {
  drag.ghost.style.transform = `translate(${x - drag.offX}px, ${y - drag.offY}px)`;
}

function markTarget(x, y) {
  el.tableau.querySelectorAll('.col').forEach((c) => c.classList.remove('target', 'bad'));
  const ci = columnAt(x, y);
  if (ci < 0 || ci === drag.ci) return;
  const ok = canDrop(game.tableau[drag.ci].slice(drag.idx), game.tableau[ci]);
  el.tableau.querySelector(`.col[data-col="${ci}"]`).classList.add(ok ? 'target' : 'bad');
}

el.tableau.addEventListener('pointerdown', (e) => {
  if (!game || game.won || e.button !== 0) return;
  const colEl = e.target.closest('.col');
  if (!colEl) return;
  const ci = Number(colEl.dataset.col);
  const cardEl = e.target.closest('.card');
  if (!cardEl) {
    onTap(ci, -1);
    return;
  }
  if (cardEl.classList.contains('down')) return;
  const idx = Number(cardEl.dataset.idx);
  const rect = cardEl.getBoundingClientRect();
  drag = {
    ci,
    idx,
    pointer: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    offX: e.clientX - rect.left,
    offY: e.clientY - rect.top,
    moving: false,
    warned: false,
    ok: isRun(game.tableau[ci], idx),
    ghost: null,
  };
  el.tableau.setPointerCapture(e.pointerId);
});

el.tableau.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pointer) return;
  if (!drag.moving) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    if (!drag.ok) {
      if (!drag.warned) {
        drag.warned = true;
        note(CANT_MOVE);
      }
      return;
    }
    startDrag();
  }
  placeGhost(e.clientX, e.clientY);
  markTarget(e.clientX, e.clientY);
});

function endPointer(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  if (d.ghost) d.ghost.remove();
  el.tableau.querySelectorAll('.col').forEach((c) => c.classList.remove('target', 'bad'));
  if (e.type === 'pointercancel') return render();
  if (d.warned) return render();
  if (!d.moving) return onTap(d.ci, d.idx);
  const to = columnAt(e.clientX, e.clientY);
  // A successful move already re-rendered; re-rendering again would cut its glide short.
  if (to < 0 || !moveRun(d.ci, d.idx, to)) {
    if (to >= 0) shakeCol(to);
    render();
  }
}

el.tableau.addEventListener('pointerup', endPointer);
el.tableau.addEventListener('pointercancel', endPointer);
el.stock.addEventListener('click', dealRow);
el.undo.addEventListener('click', undo);
el.hint = document.querySelector('#btn-hint');
el.hint.addEventListener('click', showHint);
el.menu.addEventListener('click', () => go('home'));

// ---------- home, options, help, win, confirm ----------

document.querySelectorAll('[data-go]').forEach((btn) => {
  btn.addEventListener('click', () => go(btn.dataset.go));
});

$('#btn-resume').addEventListener('click', () => go('game'));

document.querySelectorAll('[data-diff]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (game && !game.won && game.moves > 0) {
      pendingLevel = btn.dataset.diff;
      openSheet('sheet-confirm');
      return;
    }
    startGame(btn.dataset.diff);
  });
});

function startGame(level) {
  newGame(level);
  go('game');
}

$('#btn-confirm-new').addEventListener('click', () => {
  closeSheet('sheet-confirm');
  // Replacing a game in progress counts as a loss; show its result before the new game starts.
  if (game && !game.won && game.moves > 0) {
    const entry = recordResult(false);
    showResults(entry, 'Game lost', 'Start new game', () => {
      closeSheet('sheet-win');
      startGame(pendingLevel);
    });
    return;
  }
  startGame(pendingLevel);
});
$('#btn-confirm-keep').addEventListener('click', () => closeSheet('sheet-confirm'));

function showWin() {
  sfx(784, 0.4, 'sine', 0.08);
  confetti();
  const entry = recordResult(true);
  showResults(entry, 'You won!', 'Back to start', goHome);
}

function goHome() {
  closeSheet('sheet-win');
  go('home');
}

// ---------- results: every finished or abandoned game, ranked by period ----------

const RESULTS_KEY = 'spider.results';
const MAX_RESULTS = 2000;
const PERIODS = { today: 'today', week: 'this week', month: 'this month', year: 'this year', all: 'all time' };
let resultsPeriod = 'today';
let resultsEntry = null;
let resultAction = goHome;

function loadResults() {
  const list = read(RESULTS_KEY);
  return Array.isArray(list) ? list : [];
}

// Records the current game once. Losses are recorded when a game in progress is replaced.
function recordResult(won) {
  if (!game || game.recorded) return null;
  game.recorded = true;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    diff: game.diff,
    won,
    score: game.score,
    elapsed: game.elapsed,
    moves: game.moves,
  };
  const list = loadResults();
  list.push(entry);
  if (list.length > MAX_RESULTS) list.splice(0, list.length - MAX_RESULTS);
  write(RESULTS_KEY, list);
  return entry;
}

// Start of the chosen period, in local time. Weeks start on Monday.
function periodStart(period, now) {
  if (period === 'all') return 0;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (period === 'month') d.setDate(1);
  if (period === 'year') d.setMonth(0, 1);
  return d.getTime();
}

// Best first: higher score wins, and on a tie the faster game ranks higher.
function rankedIn(list, entry) {
  const sorted = [...list].sort((p, q) => q.score - p.score || p.elapsed - q.elapsed);
  return sorted.findIndex((e) => e.id === entry.id) + 1;
}

function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return n + suffix;
}

function renderResultsPeriod() {
  const now = Date.now();
  const start = periodStart(resultsPeriod, now);
  const list = loadResults().filter((e) => e.at >= start && e.at <= now);
  document.querySelectorAll('.period-tab').forEach((tab) => {
    const active = tab.dataset.period === resultsPeriod;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  const wins = list.filter((e) => e.won).length;
  const losses = list.length - wins;
  const best = list.length ? Math.max(...list.map((e) => e.score)) : null;
  let text = list.length
    ? `${wins} won · ${losses} lost · best score ${best}`
    : 'No games yet in this period.';
  if (resultsEntry && list.some((e) => e.id === resultsEntry.id)) {
    const rank = ordinal(rankedIn(list, resultsEntry));
    text += ` · This game ranked ${rank} of ${list.length} ${PERIODS[resultsPeriod]}.`;
  }
  $('#period-summary').textContent = text;
}

function showResults(entry, title, actionLabel, action) {
  resultsEntry = entry;
  resultAction = action;
  $('#win-title').textContent = title;
  $('#result-kicker').textContent = entry ? (entry.won ? 'Eight suits complete' : 'Game over') : 'Your games';
  $('#win-text').textContent = entry
    ? `Score ${entry.score} · ${fmt(entry.elapsed)} · ${entry.moves} ${entry.moves === 1 ? 'move' : 'moves'}`
    : '';
  $('#btn-play-again').textContent = actionLabel;
  renderResultsPeriod();
  openSheet('sheet-win');
}

document.querySelectorAll('.period-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    resultsPeriod = tab.dataset.period;
    renderResultsPeriod();
  });
});

$('#btn-play-again').addEventListener('click', () => resultAction());
$('#btn-results').addEventListener('click', () => showResults(null, 'Results', 'Back to start', goHome));

function syncOptionInputs() {
  document.querySelectorAll('#screen-options input[name]').forEach((input) => {
    const value = options[input.name];
    if (input.type === 'radio') input.checked = input.value === value;
    else if (input.type === 'checkbox') input.checked = value;
    else input.value = value;
  });
}

document.querySelectorAll('#screen-options input[name]').forEach((input) => {
  input.addEventListener('input', () => {
    if (input.type === 'radio') {
      if (!input.checked) return;
      options[input.name] = input.value;
    } else {
      options[input.name] = input.type === 'checkbox' ? input.checked : Number(input.value);
    }
    saveOptions();
    applyOptions();
  });
});

function applyOptions() {
  document.body.classList.toggle('no-rich', !options.rich);
  document.body.className = document.body.className.replace(/\bback-\S+/g, '').trim();
  document.body.classList.add('back-' + options.back);
  document.documentElement.style.setProperty('--label-alpha', (0.35 + (0.65 * options.brightness) / 100).toFixed(2));
  if ('audioSession' in navigator) {
    try {
      navigator.audioSession.type = options.mix ? 'ambient' : 'playback';
    } catch {
      // Not supported on this browser: sounds play normally.
    }
  }
  if (game) render();
}

// ---------- sound (generated, no files) ----------

function sfx(freq, dur, type, gain) {
  if (!options.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    // No audio available: stay silent.
  }
}

// ---------- timer, saving, and launch ----------

setInterval(() => {
  if (!game || game.won || document.hidden || !onGameScreen() || sheetOpen()) return;
  game.elapsed++;
  updateHud();
  if (game.elapsed % 10 === 0) saveGame();
}, 1000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame();
});
window.addEventListener('pagehide', saveGame);
window.addEventListener('resize', () => render());
document.addEventListener('contextmenu', (e) => e.preventDefault());

function boot() {
  loadOptions();
  applyOptions();
  game = loadGame();
  if (game && game.won) game = null;
  go('home');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
}

boot();
