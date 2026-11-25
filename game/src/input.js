// input.js — keyboard + mouse, kept in one place so main.js only reads state.
// WASD / arrows move, E interacts, P pauses, R restarts after the shift.
// Clicking the floor walks there; clicking a station walks there AND uses it.

const Input = {
  keys: {},
  mouse: { x: 0, y: 0 },
  clicked: null,   // { x, y } in canvas coords, consumed once by main.js
  interactPressed: false,
  pausePressed: false,
  restartPressed: false,
};

function inputInit(canvas) {
  window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) >= 0) {
      e.preventDefault();
    }
    if (!e.repeat) {
      if (e.code === "KeyE" || e.code === "Space") Input.interactPressed = true;
      if (e.code === "KeyP") Input.pausePressed = true;
      if (e.code === "KeyR") Input.restartPressed = true;
    }
    Input.keys[e.code] = true;
  });
  window.addEventListener("keyup", function (e) {
    Input.keys[e.code] = false;
  });
  canvas.addEventListener("mousemove", function (e) {
    const r = canvas.getBoundingClientRect();
    Input.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    Input.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener("click", function (e) {
    const r = canvas.getBoundingClientRect();
    Input.clicked = {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
    SoundFX.unlock();
  });
}

function inputMoveVector() {
  let x = 0, y = 0;
  if (Input.keys["KeyA"] || Input.keys["ArrowLeft"]) x -= 1;
  if (Input.keys["KeyD"] || Input.keys["ArrowRight"]) x += 1;
  if (Input.keys["KeyW"] || Input.keys["ArrowUp"]) y -= 1;
  if (Input.keys["KeyS"] || Input.keys["ArrowDown"]) y += 1;
  if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
  return { x: x, y: y };
}

// True while the chef is being steered by the keyboard right now.
function inputHasKeyboardSteering() {
  const v = inputMoveVector();
  return v.x !== 0 || v.y !== 0;
}

// Which station (if any) sits under a canvas point.
function stationAtPoint(px, py) {
  for (const s of STATIONS) {
    const r = s.rect;
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return s;
  }
  return null;
}
