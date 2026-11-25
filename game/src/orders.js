// orders.js — the order board: tickets arrive, patience drains, serving pays.
// A ticket is { id, recipe, patience, maxPatience, bornAt }.

let nextOrderId = 1;

function makeOrder(elapsedSeconds, existingCount) {
  const pool = recipesAvailable(elapsedSeconds);
  // Early on favour the easy salad; later the heavy dishes show up more.
  const weights = pool.map(function (r, i) {
    return r.id === "salad" ? 3 : (r.id === "double" ? 1 : 2);
  });
  let total = 0;
  for (const w of weights) total += w;
  let roll = Math.random() * total;
  let recipe = pool[0];
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { recipe = pool[i]; break; }
  }
  const patience = Math.max(38, 62 - elapsedSeconds * 0.12);
  return {
    id: nextOrderId++,
    recipe: recipe,
    patience: patience,
    maxPatience: patience,
    bornAt: elapsedSeconds,
  };
}

function OrderBoard() {
  this.orders = [];
  this.spawnTimer = 1.2;   // first ticket lands almost at once
  this.served = 0;
  this.expired = 0;
  this.earned = 0;
}

OrderBoard.prototype.spawnInterval = function (elapsedSeconds) {
  // Pressure rises without new chores: tickets simply arrive faster.
  return Math.max(7, 14 - elapsedSeconds * 0.055);
};

OrderBoard.prototype.maxConcurrent = function () {
  return 4;
};

OrderBoard.prototype.update = function (dt, elapsedSeconds) {
  this.spawnTimer -= dt;
  if (this.spawnTimer <= 0 && this.orders.length < this.maxConcurrent()) {
    this.orders.push(makeOrder(elapsedSeconds, this.orders.length));
    this.spawnTimer = this.spawnInterval(elapsedSeconds);
    SoundFX.beep(660, 0.09, "square");
  }
  for (let i = this.orders.length - 1; i >= 0; i--) {
    const o = this.orders[i];
    o.patience -= dt;
    if (o.patience <= 0) {
      this.orders.splice(i, 1);
      this.expired++;
      if (typeof window !== "undefined" && window.__RHK) window.__RHK.lastEvent = "order expired: " + o.recipe.name;
      SoundFX.beep(180, 0.25, "sawtooth");
    }
  }
};

OrderBoard.prototype.remove = function (order) {
  const i = this.orders.indexOf(order);
  if (i >= 0) this.orders.splice(i, 1);
};

// Serving pays the dish price plus a speed tip while patience is still high.
OrderBoard.prototype.serveValue = function (order) {
  const frac = Math.max(0, order.patience / order.maxPatience);
  const tip = frac > 0.5 ? 25 : 0;
  return { base: order.recipe.price, tip: tip, total: order.recipe.price + tip };
};

// Draw the ticket rail across the top of the screen (y 0..104).
OrderBoard.prototype.draw = function (ctx, canvasWidth) {
  ctx.save();
  ctx.fillStyle = "#3a2b1e";
  ctx.fillRect(0, 0, canvasWidth, 104);
  ctx.fillStyle = "#f2b441";
  ctx.fillRect(0, 104, canvasWidth, 4);
  ctx.fillStyle = "#ffe9b0";
  ctx.font = "bold 13px 'Trebuchet MS', Verdana, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("ORDER BOARD", 14, 16);

  const ticketW = 158, ticketH = 72, gap = 10;
  let x = 14;
  for (const o of this.orders) {
    const frac = Math.max(0, o.patience / o.maxPatience);
    ctx.fillStyle = frac > 0.5 ? "#fff6dd" : (frac > 0.25 ? "#ffe1a8" : "#ffb3a0");
    roundRect(ctx, x, 26, ticketW, ticketH, 8);
    ctx.fill();
    ctx.strokeStyle = frac > 0.25 ? "#8a6d3b" : "#c0392b";
    ctx.lineWidth = frac > 0.25 ? 1.5 : 3;
    ctx.stroke();
    ctx.fillStyle = "#3a2b1e";
    ctx.font = "bold 13px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText(o.recipe.name, x + 8, 40);
    // Needed items as little icons in a row.
    let ix = x + 8;
    for (const item of o.recipe.items) {
      drawIngredientIcon(ctx, item, ix + 10, 62, 11);
      ix += 26;
    }
    // Patience bar.
    ctx.fillStyle = "#d8c9a8";
    ctx.fillRect(x + 8, 84, ticketW - 16, 7);
    ctx.fillStyle = frac > 0.5 ? "#58b368" : (frac > 0.25 ? "#f2a541" : "#e64533");
    ctx.fillRect(x + 8, 84, (ticketW - 16) * frac, 7);
    x += ticketW + gap;
  }
  if (this.orders.length === 0) {
    ctx.fillStyle = "#cbb98f";
    ctx.font = "13px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText("No orders yet — the lunch rush is coming…", 150, 60);
  }
  ctx.restore();
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
