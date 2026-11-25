// main.js — Rush Hour Kitchen: game loop, chef movement, station actions,
// scoring, the shift timer and the end-of-shift screen. One job: run the game.

const SHIFT_LENGTH = 180;      // seconds per shift
const CHEF_SPEED = 235;        // px per second
const CHEF_RADIUS = 16;
const CHOP_TIME = 0.9;         // seconds to chop one ingredient
const GRILL_TIME = 4;          // seconds to grill one patty
const FRIDGE = { x: 842, y: 210, w: 98, h: 120 };

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function freshState() {
  return {
    mode: "playing",           // "playing" | "paused" | "over"
    elapsed: 0,
    timeLeft: SHIFT_LENGTH,
    score: 0,
    board: new OrderBoard(),
    chef: {
      x: 480, y: 360,
      tx: 480, ty: 360,        // click-to-move target
      carrying: null,          // { id } or { dish: true, items: [...] }
      busy: 0, busyTotal: 1, busyProgress: 0, busyLabel: "", busyDone: null,
      pendingStation: null,    // station to use once the chef arrives
    },
    plates: [{ items: [] }, { items: [] }],
    grill: [
      { item: null, progress: 0, ready: false },
      { item: null, progress: 0, ready: false },
    ],
    popups: [],                // floating "+160" texts
    lastExpired: 0,
    lastTickSecond: -1,
    flash: 0,                  // red flash on expired order
  };
}

let state = freshState();
window.__RHK = state;          // exposed for play-testing
window.__RHK_STATE = function () { return state; };

function resetGame() {
  state = freshState();
  window.__RHK = state;
}

// ---- movement + collision ----

function collideCircleRect(px, py, r, rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
  const dx = px - cx, dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { x: px, y: py };
  if (d2 === 0) return { x: px, y: rect.y - r }; // centre inside: push up
  const d = Math.sqrt(d2);
  return { x: px + (dx / d) * (r - d), y: py + (dy / d) * (r - d) };
}

function resolveCollisions(chef) {
  for (const s of STATIONS) {
    const p = collideCircleRect(chef.x, chef.y, CHEF_RADIUS, s.rect);
    chef.x = p.x; chef.y = p.y;
  }
  const f = collideCircleRect(chef.x, chef.y, CHEF_RADIUS, FRIDGE);
  chef.x = f.x; chef.y = f.y;
  chef.x = Math.max(36, Math.min(924, chef.x));
  chef.y = Math.max(192, Math.min(540, chef.y));
}

function moveChef(dt) {
  const chef = state.chef;
  if (chef.busy > 0) return;
  const kv = inputMoveVector();
  if (kv.x !== 0 || kv.y !== 0) {
    chef.tx = chef.x; chef.ty = chef.y;   // keyboard steering cancels the walk target
    chef.pendingStation = null;
    chef.x += kv.x * CHEF_SPEED * dt;
    chef.y += kv.y * CHEF_SPEED * dt;
  } else {
    const dx = chef.tx - chef.x, dy = chef.ty - chef.y;
    const dist = Math.hypot(dx, dy);
    // Arrive either at the walk target or close enough to the station itself
    // (collision push-out can keep the chef a few px off the exact target).
    const atStation = chef.pendingStation && chefNearStation(chef, chef.pendingStation);
    if (dist > 10 && !atStation) {
      const step = Math.min(dist, CHEF_SPEED * dt);
      chef.x += (dx / dist) * step;
      chef.y += (dy / dist) * step;
    } else if (chef.pendingStation) {
      const st = chef.pendingStation;
      chef.pendingStation = null;
      interact(st);
    }
  }
  resolveCollisions(chef);
}

// ---- station actions ----

function addPopup(x, y, text, color) {
  state.popups.push({ x: x, y: y, text: text, color: color || "#ffe9b0", life: 1.4 });
}

function nearestStation() {
  let best = null, bestD = 1e9;
  for (const s of STATIONS) {
    if (!chefNearStation(state.chef, s)) continue;
    const r = s.rect;
    const px = Math.max(r.x, Math.min(state.chef.x, r.x + r.w));
    const py = Math.max(r.y, Math.min(state.chef.y, r.y + r.h));
    const d = Math.hypot(state.chef.x - px, state.chef.y - py);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function interact(st) {
  const chef = state.chef;
  if (chef.busy > 0) return;
  if (!chefNearStation(chef, st)) return; // must actually be at the counter

  if (st.kind === "bin") {
    if (chef.carrying) { addPopup(chef.x, chef.y - 50, "Hands full!", "#ffb3a0"); return; }
    chef.carrying = { id: st.item };
    SoundFX.pickup();
  } else if (st.kind === "board") {
    const c = chef.carrying;
    if (!c || c.dish) { addPopup(chef.x, chef.y - 50, "Bring something to chop", "#ffb3a0"); return; }
    const def = INGREDIENTS[c.id];
    if (!def || !def.chopsTo) { addPopup(chef.x, chef.y - 50, "Nothing to chop here", "#ffb3a0"); return; }
    const chopped = def.chopsTo;
    chef.busy = CHOP_TIME; chef.busyTotal = CHOP_TIME;
    chef.busyProgress = 0; chef.busyLabel = "Chopping…";
    chef.busyDone = function () {
      chef.carrying = { id: chopped };
      SoundFX.chopDone();
    };
  } else if (st.kind === "grill") {
    const c = chef.carrying;
    if (c && !c.dish && c.id === "patty") {
      const slot = state.grill.find(function (g) { return !g.item; });
      if (!slot) { addPopup(chef.x, chef.y - 50, "Grill is full!", "#ffb3a0"); return; }
      slot.item = "patty"; slot.progress = 0; slot.ready = false;
      chef.carrying = null;
      SoundFX.pickup();
    } else if (!c) {
      const slot = state.grill.find(function (g) { return g.item && g.ready; });
      if (!slot) { addPopup(chef.x, chef.y - 50, "Nothing ready on the grill", "#ffb3a0"); return; }
      slot.item = null; slot.progress = 0; slot.ready = false;
      chef.carrying = { id: "patty_cooked" };
      SoundFX.pickup();
    } else {
      addPopup(chef.x, chef.y - 50, "Only patties go on the grill", "#ffb3a0");
    }
  } else if (st.kind === "plate") {
    const plate = state.plates[st.plate];
    const c = chef.carrying;
    if (c && !c.dish) {
      const combined = plate.items.concat([c.id]);
      if (combined.length > 4) { addPopup(chef.x, chef.y - 50, "Plate is full!", "#ffb3a0"); return; }
      if (!isSubsetOfSomeRecipe(combined, state.board.orders)) {
        addPopup(chef.x, chef.y - 50, "No order needs that yet", "#ffb3a0");
        return;
      }
      plate.items.push(c.id);
      chef.carrying = null;
      SoundFX.pickup();
      if (matchingOrderForPlate(plate.items, state.board.orders)) {
        addPopup(st.rect.x + st.rect.w / 2, st.rect.y - 12, "READY TO SERVE!", "#8fd694");
        SoundFX.grillDone();
      }
    } else if (!c) {
      if (plate.items.length === 0) { addPopup(chef.x, chef.y - 50, "Plate is empty", "#ffb3a0"); return; }
      if (!matchingOrderForPlate(plate.items, state.board.orders)) {
        addPopup(chef.x, chef.y - 50, "Dish is not finished yet", "#ffb3a0");
        return;
      }
      chef.carrying = { dish: true, items: plate.items.slice() };
      plate.items = [];
      SoundFX.pickup();
    } else {
      addPopup(chef.x, chef.y - 50, "Put the plate down first", "#ffb3a0");
    }
  } else if (st.kind === "serve") {
    const c = chef.carrying;
    if (!c || !c.dish) { addPopup(chef.x, chef.y - 50, "Bring a finished plate", "#ffb3a0"); return; }
    const order = matchingOrderForPlate(c.items, state.board.orders);
    if (!order) { addPopup(chef.x, chef.y - 50, "No ticket matches this dish", "#ffb3a0"); SoundFX.serveBad(); return; }
    const value = state.board.serveValue(order);
    state.board.remove(order);
    state.board.served++;
    state.score += value.total;
    chef.carrying = null;
    addPopup(st.rect.x + st.rect.w / 2, st.rect.y - 12, "+" + value.total + (value.tip ? " (incl. $" + value.tip + " tip)" : ""), "#8fd694");
    SoundFX.serveGood();
  } else if (st.kind === "trash") {
    if (!chef.carrying) { addPopup(chef.x, chef.y - 50, "Nothing to toss", "#ffb3a0"); return; }
    chef.carrying = null;
    addPopup(chef.x, chef.y - 50, "Tossed", "#cbb98f");
  }
}

// Action hint shown under the chef for the nearest station.
function actionHint(st) {
  if (!st) return "";
  const c = state.chef.carrying;
  if (st.kind === "bin") return c ? "Hands full" : "E: grab " + itemLabel(st.item);
  if (st.kind === "board") {
    if (!c || c.dish) return "E: chop (bring tomato / lettuce)";
    const def = INGREDIENTS[c.id];
    return def && def.chopsTo ? "E: chop the " + def.name : "E: can't chop that";
  }
  if (st.kind === "grill") {
    if (c && !c.dish && c.id === "patty") return "E: put patty on the grill";
    if (!c) return state.grill.some(function (g) { return g.item && g.ready; }) ? "E: take grilled patty" : "E: grill (bring a patty)";
    return "E: only patties on the grill";
  }
  if (st.kind === "plate") {
    const plate = state.plates[st.plate];
    if (c && !c.dish) return "E: add " + itemLabel(c.id) + " to " + st.label;
    if (!c && plate.items.length > 0 && matchingOrderForPlate(plate.items, state.board.orders)) return "E: pick up finished dish";
    if (!c && plate.items.length > 0) return st.label + ": dish in progress";
    return st.label + ": build a dish here";
  }
  if (st.kind === "serve") return c && c.dish ? "E: SERVE IT!" : "E: serve (bring a finished plate)";
  if (st.kind === "trash") return c ? "E: toss it" : "Trash";
  return "";
}

// ---- update ----

function update(dt) {
  if (state.mode === "over") return;
  if (Input.pausePressed) {
    Input.pausePressed = false;
    if (state.mode === "playing") state.mode = "paused";
    else if (state.mode === "paused") state.mode = "playing";
  }
  if (state.mode === "paused") return;

  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_LENGTH - state.elapsed);
  if (state.timeLeft <= 10.5) {
    const sec = Math.ceil(state.timeLeft);
    if (sec !== state.lastTickSecond && sec > 0) {
      state.lastTickSecond = sec;
      SoundFX.tick();
    }
  }
  if (state.timeLeft <= 0) {
    state.mode = "over";
    return;
  }

  // Clicks: station = walk there and use it; floor = walk there.
  if (Input.clicked) {
    const click = Input.clicked;
    Input.clicked = null;
    const st = stationAtPoint(click.x, click.y);
    if (st) {
      const ap = approachPoint(st, state.chef.x, state.chef.y);
      state.chef.tx = ap.x; state.chef.ty = ap.y;
      state.chef.pendingStation = st;
    } else {
      state.chef.tx = Math.max(36, Math.min(924, click.x));
      state.chef.ty = Math.max(192, Math.min(540, click.y));
      state.chef.pendingStation = null;
    }
  }
  if (Input.interactPressed) {
    Input.interactPressed = false;
    const st = nearestStation();
    if (st) interact(st);
  }

  // Chopping in progress.
  const chef = state.chef;
  if (chef.busy > 0) {
    chef.busy -= dt;
    chef.busyProgress = 1 - Math.max(0, chef.busy) / chef.busyTotal;
    if (chef.busy <= 0) {
      chef.busy = 0; chef.busyProgress = 0;
      if (chef.busyDone) { const done = chef.busyDone; chef.busyDone = null; done(); }
    }
  }

  moveChef(dt);
  state.board.update(dt, state.elapsed);

  // Expired tickets cost $50.
  if (state.board.expired > state.lastExpired) {
    const n = state.board.expired - state.lastExpired;
    state.lastExpired = state.board.expired;
    state.score = Math.max(0, state.score - 50 * n);
    state.flash = 0.6;
    addPopup(480, 130, "Order expired! -$50", "#ff9a8a");
  }
  if (state.flash > 0) state.flash -= dt;

  // Grill slots cook.
  for (const slot of state.grill) {
    if (slot.item && !slot.ready) {
      slot.progress += dt / GRILL_TIME;
      if (slot.progress >= 1) {
        slot.progress = 1; slot.ready = true;
        SoundFX.grillDone();
      }
    }
  }

  for (let i = state.popups.length - 1; i >= 0; i--) {
    const p = state.popups[i];
    p.life -= dt; p.y -= 22 * dt;
    if (p.life <= 0) state.popups.splice(i, 1);
  }
}

// ---- draw ----

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.board.draw(ctx, canvas.width);
  drawKitchen(ctx, state);
  drawChef(ctx, state.chef);

  // HUD: timer + score live in the board bar's free right side, clear of
  // the ingredient bins below it.
  ctx.save();
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const urgent = state.timeLeft <= 30;
  ctx.fillStyle = urgent ? "#ff9a8a" : "#ffe9b0";
  ctx.font = "bold 26px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillText("TIME " + fmtTime(state.timeLeft), 706, 30);
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "bold 20px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillText("SCORE $" + state.score, 706, 62);
  ctx.font = "14px 'Trebuchet MS', Verdana, sans-serif";
  ctx.fillStyle = "#cbb98f";
  ctx.fillText("Served: " + state.board.served + "   Lost: " + state.board.expired, 706, 88);
  // Timer bar across the board's bottom edge: the rush you can feel.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 100, 960, 4);
  ctx.fillStyle = urgent ? "#e64533" : "#58b368";
  ctx.fillRect(0, 100, 960 * (state.timeLeft / SHIFT_LENGTH), 4);
  ctx.restore();

  // Context hint above the chef.
  if (state.mode === "playing") {
    const st = nearestStation();
    const hint = state.chef.busy > 0 ? state.chef.busyLabel : actionHint(st);
    if (hint) {
      ctx.save();
      ctx.font = "bold 13px 'Trebuchet MS', Verdana, sans-serif";
      const w = ctx.measureText(hint).width + 18;
      ctx.fillStyle = "rgba(20,12,20,0.85)";
      roundRect(ctx, state.chef.x - w / 2, state.chef.y - 66, w, 22, 10); ctx.fill();
      ctx.fillStyle = "#ffe9b0";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(hint, state.chef.x, state.chef.y - 55);
      ctx.restore();
    }
  }

  // Popups.
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 16px 'Trebuchet MS', Verdana, sans-serif";
  for (const p of state.popups) {
    ctx.globalAlpha = Math.min(1, p.life);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.restore();

  // Opening tip for the first seconds of the shift.
  if (state.mode === "playing" && state.elapsed < 7) {
    ctx.save();
    ctx.fillStyle = "rgba(20,12,20,0.8)";
    roundRect(ctx, 230, 640 - 96, 500, 34, 10); ctx.fill();
    ctx.fillStyle = "#ffe9b0";
    ctx.font = "bold 14px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Click a station — or walk with WASD and press E", 480, 640 - 79);
    ctx.restore();
  }

  // Red flash on expired order.
  if (state.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.35, state.flash);
    ctx.fillStyle = "#e64533";
    ctx.fillRect(0, 108, 960, 532);
    ctx.restore();
  }

  if (state.mode === "paused") {
    ctx.save();
    ctx.fillStyle = "rgba(20,12,20,0.7)";
    ctx.fillRect(0, 0, 960, 640);
    ctx.fillStyle = "#ffe9b0";
    ctx.font = "bold 40px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", 480, 300);
    ctx.font = "18px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText("Press P to keep cooking", 480, 340);
    ctx.restore();
  }

  if (state.mode === "over") {
    ctx.save();
    ctx.fillStyle = "rgba(20,12,20,0.82)";
    ctx.fillRect(0, 0, 960, 640);
    ctx.fillStyle = "#f2b441";
    ctx.font = "bold 44px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SHIFT OVER!", 480, 250);
    ctx.fillStyle = "#ffe9b0";
    ctx.font = "bold 26px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText("Final score: $" + state.score, 480, 310);
    ctx.font = "18px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillStyle = "#cbb98f";
    ctx.fillText("Dishes served: " + state.board.served + "    Orders lost: " + state.board.expired, 480, 348);
    const verdict = state.score >= 600 ? "Head chef material. The lunch rush fears you."
      : state.score >= 300 ? "Solid service — the regulars will be back."
      : "A quiet shift… the rush will come again. Press R!";
    ctx.fillStyle = "#ffe9b0";
    ctx.fillText(verdict, 480, 386);
    ctx.font = "bold 18px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText("Press R to cook another shift", 480, 430);
    ctx.restore();
  }
}

// ---- loop + boot ----

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;
  if (Input.restartPressed) {
    Input.restartPressed = false;
    if (state.mode === "over") resetGame();
  }
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

inputInit(canvas);
SoundFX.unlock();
requestAnimationFrame(loop);

