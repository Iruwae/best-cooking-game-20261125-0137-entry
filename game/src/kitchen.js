// kitchen.js — the room itself: station layout, counters, ingredient icons.
// The floor is y 176..552; counters hug the walls so every trip is a route
// choice: bins up top, chopping board left, grill top-right, plates + serve
// window along the bottom. The chef must cross the room for every dish.

const FLOOR = { x: 20, y: 176, w: 920, h: 376 };

const STATIONS = [
  { id: "bin-tomato",  kind: "bin",   item: "tomato",  label: "Tomatoes", rect: { x: 20,  y: 118, w: 116, h: 54 } },
  { id: "bin-lettuce", kind: "bin",   item: "lettuce", label: "Lettuce",  rect: { x: 144, y: 118, w: 116, h: 54 } },
  { id: "bin-cheese",  kind: "bin",   item: "cheese",  label: "Cheese",   rect: { x: 268, y: 118, w: 116, h: 54 } },
  { id: "bin-bread",   kind: "bin",   item: "bread",   label: "Bread",    rect: { x: 392, y: 118, w: 116, h: 54 } },
  { id: "bin-patty",   kind: "bin",   item: "patty",   label: "Patties",  rect: { x: 516, y: 118, w: 116, h: 54 } },
  { id: "grill",       kind: "grill",                 label: "Grill",    rect: { x: 660, y: 118, w: 280, h: 54 } },
  { id: "board",       kind: "board",                 label: "Chopping Board", rect: { x: 20, y: 210, w: 98, h: 170 } },
  { id: "trash",       kind: "trash",                 label: "Trash",    rect: { x: 20,  y: 556, w: 120, h: 68 } },
  { id: "plateA",      kind: "plate", plate: 0,       label: "Plate 1",  rect: { x: 300, y: 556, w: 170, h: 68 } },
  { id: "plateB",      kind: "plate", plate: 1,       label: "Plate 2",  rect: { x: 490, y: 556, w: 170, h: 68 } },
  { id: "serve",       kind: "serve",                 label: "Serve Window", rect: { x: 700, y: 556, w: 240, h: 68 } },
];

function stationById(id) {
  for (const s of STATIONS) if (s.id === id) return s;
  return null;
}

// Nearest point on a station's counter edge, pushed out toward the chef,
// clamped into the walkable floor so the target is always reachable.
function approachPoint(station, cx, cy) {
  const r = station.rect;
  const px = Math.max(r.x, Math.min(cx, r.x + r.w));
  const py = Math.max(r.y, Math.min(cy, r.y + r.h));
  let dx = cx - px, dy = cy - py;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  return {
    x: Math.max(36, Math.min(924, px + dx * 34)),
    y: Math.max(192, Math.min(540, py + dy * 34)),
  };
}

function chefNearStation(chef, station) {
  const r = station.rect;
  const px = Math.max(r.x, Math.min(chef.x, r.x + r.w));
  const py = Math.max(r.y, Math.min(chef.y, r.y + r.h));
  return Math.hypot(chef.x - px, chef.y - py) < 52;
}

// ---- the room: floor, counters, stations, plates, serve window ----

function drawKitchen(ctx, state) {
  ctx.save();
  // Floor tiles.
  ctx.fillStyle = "#4a2f3d";
  ctx.fillRect(0, 108, 960, 532);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 20; x < 960; x += 46) {
    ctx.beginPath(); ctx.moveTo(x, 108); ctx.lineTo(x, 640); ctx.stroke();
  }
  for (let y = 176; y < 640; y += 46) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke();
  }
  // Wall band between board and counters.
  ctx.fillStyle = "#6b4a5e";
  ctx.fillRect(0, 108, 960, 10);

  for (const s of STATIONS) drawStation(ctx, s, state);
  // Fridge decor on the right wall (not a station).
  ctx.fillStyle = "#b8c4cc";
  roundRect(ctx, 842, 210, 98, 120, 8); ctx.fill();
  ctx.strokeStyle = "#7d8b94"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#5b6b74";
  ctx.fillRect(858, 250, 66, 4);
  ctx.fillRect(858, 290, 66, 4);
  ctx.fillStyle = "#3a2b1e";
  ctx.font = "bold 11px 'Trebuchet MS', Verdana, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FRIDGE", 891, 228);
  ctx.restore();
}

function drawStation(ctx, s, state) {
  const r = s.rect;
  ctx.save();
  if (s.kind === "bin") {
    ctx.fillStyle = "#8a6d3b";
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.fillStyle = "#c9a86a";
    roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 6); ctx.fill();
    drawIngredientIcon(ctx, s.item, r.x + r.w / 2, r.y + 22, 13);
    ctx.fillStyle = "#3a2b1e";
    ctx.font = "bold 11px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.label, r.x + r.w / 2, r.y + r.h - 8);
  } else if (s.kind === "grill") {
    ctx.fillStyle = "#4a4a52";
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.fillStyle = "#2e2e34";
    roundRect(ctx, r.x + 6, r.y + 6, r.w - 12, r.h - 12, 6); ctx.fill();
    ctx.fillStyle = "#f2b441";
    ctx.font = "bold 11px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("GRILL", r.x + 12, r.y + 20);
    for (let i = 0; i < 2; i++) {
      const gx = r.x + 80 + i * 95, gy = r.y + 27;
      ctx.fillStyle = state.grill[i].item ? "#7a4a2b" : "#55555e";
      ctx.beginPath(); ctx.arc(gx, gy, 17, 0, Math.PI * 2); ctx.fill();
      if (state.grill[i].item) {
        if (state.grill[i].ready) {
          ctx.strokeStyle = "#7CFC98"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(gx, gy, 21, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.strokeStyle = "#f2a541"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(gx, gy, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.grill[i].progress); ctx.stroke();
        }
      }
    }
  } else if (s.kind === "board") {
    ctx.fillStyle = "#8a6d3b";
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.fillStyle = "#e8d3a0";
    roundRect(ctx, r.x + 8, r.y + 8, r.w - 16, r.h - 16, 6); ctx.fill();
    // Knife.
    ctx.strokeStyle = "#888"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(r.x + 30, r.y + 30); ctx.lineTo(r.x + 62, r.y + 62); ctx.stroke();
    ctx.strokeStyle = "#3a2b1e"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(r.x + 62, r.y + 62); ctx.lineTo(r.x + 76, r.y + 76); ctx.stroke();
    ctx.fillStyle = "#3a2b1e";
    ctx.font = "bold 11px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CHOP", r.x + r.w / 2, r.y + r.h - 16);
    ctx.fillText("BOARD", r.x + r.w / 2, r.y + r.h - 4);
  } else if (s.kind === "trash") {
    ctx.fillStyle = "#5b6b74";
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.fillStyle = "#3a2b1e";
    ctx.font = "bold 12px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TRASH", r.x + r.w / 2, r.y + r.h / 2 + 4);
  } else if (s.kind === "plate") {
    const plate = state.plates[s.plate];
    const ready = plate.items.length > 0 && matchingOrderForPlate(plate.items, state.board.orders);
    ctx.fillStyle = ready ? "#2f7a3a" : "#8a6d3b";
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.fillStyle = ready ? "#8fd694" : "#c9a86a";
    roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 6); ctx.fill();
    // The white plate.
    ctx.fillStyle = "#fff6dd";
    ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + 36, 52, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#b8a888"; ctx.lineWidth = 2; ctx.stroke();
    let ix = r.x + r.w / 2 - (plate.items.length - 1) * 15;
    for (const item of plate.items) {
      drawIngredientIcon(ctx, item, ix, r.y + 36, 11);
      ix += 30;
    }
    ctx.fillStyle = ready ? "#1e4d24" : "#3a2b1e";
    ctx.font = "bold 12px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ready ? "READY — SERVE IT!" : s.label + (plate.items.length ? " (" + plate.items.length + ")" : ""), r.x + r.w / 2, r.y + r.h - 8);
  } else if (s.kind === "serve") {
    ctx.fillStyle = "#7a2b2b";
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.fillStyle = "#a83c3c";
    roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 6); ctx.fill();
    ctx.fillStyle = "#ffe9b0";
    ctx.font = "bold 14px 'Trebuchet MS', Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SERVE WINDOW", r.x + r.w / 2, r.y + 30);
    ctx.fillStyle = "#ffd9d9";
    ctx.font = "11px 'Trebuchet MS', Verdana, sans-serif";
    ctx.fillText("bring a finished plate here", r.x + r.w / 2, r.y + 50);
  }
  ctx.restore();
}

// ---- the chef ----

function drawChef(ctx, chef) {
  ctx.save();
  ctx.translate(chef.x, chef.y);
  // Shadow.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(0, 14, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Body + apron.
  ctx.fillStyle = "#f5f0e6";
  ctx.beginPath(); ctx.arc(0, 2, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e64533";
  ctx.fillRect(-9, 6, 18, 8);
  // Head.
  ctx.fillStyle = "#f2c89b";
  ctx.beginPath(); ctx.arc(0, -14, 10, 0, Math.PI * 2); ctx.fill();
  // Chef hat.
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(-6, -22, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -25, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -22, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-9, -24, 18, 5);
  // Carried item floats above the hat.
  if (chef.carrying) {
    if (chef.carrying.dish) {
      ctx.fillStyle = "#fff6dd";
      ctx.beginPath(); ctx.ellipse(0, -38, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
      let ix = -(chef.carrying.items.length - 1) * 8;
      for (const item of chef.carrying.items) {
        drawIngredientIcon(ctx, item, ix, -38, 7);
        ix += 16;
      }
    } else {
      drawIngredientIcon(ctx, chef.carrying.id, 0, -36, 12);
    }
  }
  // Chopping / busy progress ring.
  if (chef.busy > 0) {
    ctx.strokeStyle = "#f2b441"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chef.busyProgress); ctx.stroke();
  }
  ctx.restore();
}


function drawIngredientIcon(ctx, itemId, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  const def = INGREDIENTS[itemId];
  const col = def ? def.color : "#999";
  if (itemId === "tomato") {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3d8b40";
    ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.28, 0, Math.PI * 2); ctx.fill();
  } else if (itemId === "tomato_chopped") {
    ctx.fillStyle = "#ff7a5c";
    ctx.beginPath(); ctx.arc(-r * 0.35, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.4, r * 0.15, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#d63d2a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.4); ctx.lineTo(r * 0.7, r * 0.5); ctx.stroke();
  } else if (itemId === "lettuce") {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.72, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2f7a3a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.3); ctx.quadraticCurveTo(0, -r * 0.1, r * 0.7, -r * 0.4); ctx.stroke();
  } else if (itemId === "lettuce_chopped") {
    ctx.fillStyle = "#8fd694";
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(-r + i * 2, i * r * 0.55 - r * 0.25, r * 1.9, r * 0.42);
    }
  } else if (itemId === "cheese") {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-r, r * 0.7); ctx.lineTo(0, -r); ctx.lineTo(r, r * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d99e1f";
    ctx.beginPath(); ctx.arc(-r * 0.25, r * 0.25, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.3, r * 0.4, r * 0.12, 0, Math.PI * 2); ctx.fill();
  } else if (itemId === "bread") {
    ctx.fillStyle = "#e8b96f";
    roundRect(ctx, -r, -r * 0.7, r * 2, r * 1.4, r * 0.5); ctx.fill();
    ctx.strokeStyle = "#b57e35"; ctx.lineWidth = 2;
    roundRect(ctx, -r, -r * 0.7, r * 2, r * 1.4, r * 0.5); ctx.stroke();
  } else if (itemId === "patty") {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d98a7a";
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.25, r * 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (itemId === "patty_cooked") {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#4a2c14"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(r * 0.6, -r * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.3); ctx.lineTo(r * 0.6, r * 0.3); ctx.stroke();
  } else {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
