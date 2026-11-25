// recipes.js — every ingredient and dish in Rush Hour Kitchen.
// An item id is a plain string: "tomato", "tomato_chopped", "patty_cooked"...
// A recipe is the exact multiset of item ids a finished plate must hold.

const INGREDIENTS = {
  tomato:         { name: "Tomato",  color: "#e64533", chopsTo: "tomato_chopped",  raw: true },
  tomato_chopped: { name: "Chopped Tomato", color: "#ff7a5c", chopsTo: null, raw: false },
  lettuce:        { name: "Lettuce", color: "#58b368", chopsTo: "lettuce_chopped", raw: true },
  lettuce_chopped:{ name: "Chopped Lettuce", color: "#8fd694", chopsTo: null, raw: false },
  cheese:         { name: "Cheese",  color: "#f2c230", chopsTo: null, raw: false },
  bread:          { name: "Bread",   color: "#d9a05b", chopsTo: null, raw: false },
  patty:          { name: "Raw Patty", color: "#b06a5a", grillsTo: "patty_cooked", raw: true },
  patty_cooked:   { name: "Grilled Patty", color: "#7a4a2b", grillsTo: null, raw: false },
};

const BIN_KINDS = ["tomato", "lettuce", "cheese", "bread", "patty"];

const RECIPES = [
  { id: "salad",  name: "Garden Salad",   items: ["tomato_chopped", "lettuce_chopped"],        price: 100 },
  { id: "melt",   name: "Cheesy Melt",    items: ["bread", "cheese", "tomato_chopped"],        price: 130 },
  { id: "burger", name: "Classic Burger", items: ["bread", "patty_cooked", "cheese"],          price: 160 },
  { id: "double", name: "Double Stack",   items: ["bread", "patty_cooked", "patty_cooked", "cheese"], price: 220 },
];

// The Double Stack only shows up once the rush is on (after 60 s of shift).
function recipesAvailable(elapsedSeconds) {
  return elapsedSeconds < 60 ? RECIPES.slice(0, 3) : RECIPES;
}

function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const count = {};
  for (const x of a) count[x] = (count[x] || 0) + 1;
  for (const x of b) {
    if (!count[x]) return false;
    count[x]--;
  }
  return true;
}

function recipeById(id) {
  return RECIPES.find(function (r) { return r.id === id; }) || null;
}

function itemLabel(itemId) {
  const def = INGREDIENTS[itemId];
  return def ? def.name : itemId;
}

// A plate is "ready to serve" when its items exactly match a live order.
function matchingOrderForPlate(items, orders) {
  for (const order of orders) {
    if (sameMultiset(items, order.recipe.items)) return order;
  }
  return null;
}

function isSubsetOfSomeRecipe(items, orders) {
  // True when `items` could still grow into at least one live order's dish.
  for (const order of orders) {
    const need = order.recipe.items.slice();
    let ok = true;
    for (const it of items) {
      const i = need.indexOf(it);
      if (i < 0) { ok = false; break; }
      need.splice(i, 1);
    }
    if (ok) return true;
  }
  return false;
}
