# Rush Hour Kitchen

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Iruwae/best-cooking-game-20261125-0137-entry/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Iruwae/best-cooking-game-20261125-0137-entry/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

An original 2D canvas cooking game, built for the [best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137) on make.fun.

Made from scratch in one session for the bounty — no copied game, no
libraries, no copied art. Every pixel is drawn in code.

## The game

You are the only chef on a lunch shift. Tickets land on the order board and
their patience drains fast. Run the kitchen: grab ingredients from the bins up
top, chop tomatoes and lettuce on the board, grill patties on the stove, build
each dish on one of the two plates, and serve it at the window before the
ticket runs out. Serve fast for a tip; let a ticket expire and it costs $50.

- **Orders that force route planning** — bins, chopping board, grill, plates
  and serve window sit on opposite walls, so every dish is a trip across the
  room, and the route changes with the recipe.
- **Recipes that combine differently** — Garden Salad (chopped tomato +
  chopped lettuce), Cheesy Melt, Classic Burger, and the late-shift Double
  Stack (two grilled patties).
- **Pressure that grows without new chores** — tickets arrive faster and
  patience shrinks as the 3-minute shift goes on. Nothing new to learn, just
  a faster rush.
- **Two plates** — build one dish while another waits, or keep a finished
  plate ready while you start the next.

## Controls

- **WASD / arrow keys** — move the chef
- **Click a station** — walk there and use it (click the floor to walk)
- **E / Space** — use the station you are standing at
- **P** — pause, **R** — cook another shift after the shift ends

## Play it

Open `game/index.html` in desktop Chrome (or serve `game/` with any static
server). No build step, no network requests, no assets to download — vanilla
JavaScript on a 2D canvas, with tiny WebAudio beeps.

## Files

- `game/index.html` — the page
- `game/src/main.js` — game loop, movement, station actions, scoring, timer
- `game/src/kitchen.js` — station layout and all the drawn food and counters
- `game/src/orders.js` — the order board: tickets, patience, serving value
- `game/src/recipes.js` — ingredients and recipes
- `game/src/input.js` — keyboard + mouse
- `game/src/sound.js` — WebAudio beeps, zero audio assets
- `main.ts` — the make.fun hand-in program (copies `game/` + `screenshots/`
  and writes `dossier.json`)
- `screenshots/` — real renders of the game, taken while playing it
