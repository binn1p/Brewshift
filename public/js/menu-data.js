// The menu, from docs/menu.md. In week 2 this moves to data/menu.json and
// is loaded from the server instead.
//
// recipe: the default customize choices (the boxes that start pressed down).
//   ice: null means a hot drink, so no ice choices are shown.
// spot: where the drink sits on the menu canvas, in % of the canvas width
//   (x, w) and height (y). label: which side its name and price go on.
// promo: optional deal, e.g. { buy: 2, pay: 1 } = 2 for 1 (see lineTotal in options.js).
const MENU = [
  {
    id: "iced-milk-coffee",
    name: "Iced Coffee with Milk",
    viName: "Cà phê sữa đá",
    price: 6,
    tag: "2 for 1",
    promo: { buy: 2, pay: 1 },
    recipe: { milk: "condensed", sugar: 100, ice: 100 },
    spot: { x: 6, y: 3, w: 6, label: "right" },
    ingredients: ["Robusta coffee, slow-dripped through a phin", "Sweetened condensed milk", "Ice"],
    story: "The drink every Saigon street corner wakes up to: a phin ticking over a glass, then a long stir until the milk turns the coffee caramel brown.",
  },
  {
    id: "hot-milk-coffee",
    name: "Hot Coffee with Milk",
    viName: "Cà phê sữa nóng",
    price: 6,
    recipe: { milk: "condensed", sugar: 100, ice: null },
    spot: { x: 29, y: 30, w: 17, label: "right" },
    ingredients: ["Robusta coffee, slow-dripped through a phin", "Sweetened condensed milk"],
    story: "The cool-morning version of the classic, kept warm in a small bowl of hot water while it drips.",
  },
  {
    id: "egg-coffee",
    name: "Egg Coffee",
    viName: "Cà phê trứng",
    price: 8,
    tag: "Fall special",
    recipe: { milk: "condensed", sugar: 100, ice: null },
    spot: { x: 56, y: 2, w: 10, label: "right" },
    ingredients: ["Phin coffee", "Egg yolk", "Condensed milk, whipped into a custard cream"],
    story: "Invented in Hà Nội in 1946, when fresh milk was scarce: egg yolk whipped with condensed milk until it tastes like custard, floated on strong coffee.",
  },
  {
    id: "hot-black-coffee",
    name: "Hot Black Coffee",
    viName: "Cà phê đen nóng",
    price: 6,
    recipe: { milk: "none", sugar: 50, ice: null },
    spot: { x: 85, y: 30, w: 10, label: "left" },
    ingredients: ["Robusta coffee, slow-dripped through a phin", "A little sugar"],
    story: "Just coffee and patience. Watch it drip, drop by drop, and the day slows down with it.",
  },
  {
    id: "coconut-coffee",
    name: "Coconut Coffee",
    viName: "Cà phê dừa",
    price: 8,
    recipe: { milk: "coconut", sugar: 75, ice: 100 },
    spot: { x: 10, y: 52, w: 13, label: "right" },
    ingredients: ["Phin coffee", "Coconut milk", "Condensed milk", "Ice"],
    story: "A southern twist: coconut groves meet coffee farms in one glass, creamy and a little tropical.",
  },
  {
    id: "iced-black-coffee",
    name: "Iced Black Coffee",
    viName: "Cà phê đen đá",
    price: 6,
    recipe: { milk: "none", sugar: 50, ice: 100 },
    spot: { x: 37, y: 66, w: 11, label: "right" },
    ingredients: ["Robusta coffee, slow-dripped through a phin", "A little sugar", "Ice"],
    story: "No milk, no hiding. The way old uncles drink it at plastic tables, slowly, between long conversations.",
  },
  {
    id: "orange-coffee",
    name: "Orange Coffee",
    viName: "Cà phê cam",
    price: 8,
    recipe: { milk: "none", sugar: 50, ice: 100 },
    spot: { x: 66, y: 60, w: 11, label: "right" },
    ingredients: ["Fresh-squeezed orange juice", "Phin coffee", "A little honey", "Ice"],
    story: "It sounds strange until the first sip: bright citrus underneath, dark coffee floating on top, like sunrise over a dark river.",
  },
];

function findDrink(id) {
  return MENU.find((drink) => drink.id === id);
}
