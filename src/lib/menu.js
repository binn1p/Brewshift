// Rules for a drink on the menu, used by the owner's menu tools (FR-50).
// Prices are in dollars here and stored as given; orders copy them as cents.

const { isPhotoPath } = require("./uploads");

const MILKS = ["none", "condensed", "fresh", "almond", "oat", "coconut"];

function isText(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

// Checks a drink from the owner's form. Returns { errors } or { value } with only known fields.
function checkDrink(input) {
  const errors = {};
  const body = input && typeof input === "object" ? input : {};

  const name = body.name && typeof body.name === "object" ? body.name : {};
  if (!isText(name.en, 60)) errors.nameEn = "English name is required (60 characters maximum).";
  if (!isText(name.fr, 60)) errors.nameFr = "French name is required (60 characters maximum).";
  if (body.viName !== undefined && !isText(body.viName, 60)) errors.viName = "Vietnamese name is too long.";

  const price = body.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 || price > 50) {
    errors.price = "Price must be a number above 0 and up to 50.";
  }

  const recipe = body.recipe && typeof body.recipe === "object" ? body.recipe : null;
  if (!recipe || !MILKS.includes(recipe.milk)) errors.milk = "Choose a default milk.";
  if (!recipe || ![0, 25, 50, 75, 100].includes(recipe.sugar)) errors.sugar = "Default sugar must be 0, 25, 50, 75 or 100.";
  if (!recipe || !(recipe.ice === null || [0, 25, 50, 75, 100].includes(recipe.ice))) {
    errors.ice = "Default ice must be null (hot drink) or 0, 25, 50, 75 or 100.";
  }

  if (body.available !== undefined && typeof body.available !== "boolean") errors.available = "Available must be yes or no.";

  if (body.promo !== undefined && body.promo !== null) {
    const p = body.promo;
    if (!p || !Number.isInteger(p.buy) || !Number.isInteger(p.pay) || p.buy < 2 || p.pay < 1 || p.pay >= p.buy) {
      errors.promo = "A promo needs whole numbers, like buy 2 pay 1.";
    }
  }

  // Optional text shown to customers
  const pair = (v) => v && typeof v === "object" && typeof v.en === "string" && v.en.length <= 1000 && (v.fr === undefined || (typeof v.fr === "string" && v.fr.length <= 1000));
  if (body.tag !== undefined && body.tag !== null && !(isText(body.tag.en, 40) && typeof body.tag.fr === "string")) {
    errors.tag = "Label needs English and French text (40 characters maximum).";
  }
  if (body.story !== undefined && !pair(body.story)) errors.story = "Story is too long (1000 characters maximum).";
  if (body.ingredients !== undefined) {
    const list = (v) => Array.isArray(v) && v.length <= 20 && v.every((x) => isText(x, 120));
    if (!body.ingredients || !list(body.ingredients.en) || (body.ingredients.fr !== undefined && !list(body.ingredients.fr))) {
      errors.ingredients = "Ingredients must be a list of short lines.";
    }
  }
  // soldOut: null (on sale), { until: null } (sold out until turned back on), { until: "YYYY-MM-DD" } (today only)
  if (body.soldOut !== undefined && body.soldOut !== null) {
    const u = body.soldOut.until;
    if (typeof body.soldOut !== "object" || !(u === null || (typeof u === "string" && /^\d{4}-\d{2}-\d{2}$/.test(u)))) {
      errors.soldOut = "Sold-out state is not valid.";
    }
  }

  for (const key of ["photo", "sidePhoto"]) {
    if (body[key] !== undefined && !isPhotoPath(body[key])) errors[key] = "Photo path is not valid.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  const value = {
    name: { en: name.en.trim(), fr: name.fr.trim() },
    viName: typeof body.viName === "string" ? body.viName.trim() : "",
    price,
    recipe: { milk: recipe.milk, sugar: recipe.sugar, ice: recipe.ice },
    available: body.available !== false,
    promo: body.promo ?? null,
    soldOut: body.soldOut ?? null,
  };
  if (body.tag !== undefined) value.tag = body.tag;
  if (body.photo !== undefined) value.photo = body.photo;
  if (body.sidePhoto !== undefined) value.sidePhoto = body.sidePhoto;
  if (body.story !== undefined) value.story = { en: body.story.en.trim(), fr: (body.story.fr || body.story.en).trim() };
  if (body.ingredients !== undefined) {
    value.ingredients = { en: body.ingredients.en, fr: body.ingredients.fr || body.ingredients.en };
  }
  return { value };
}

// A simple id from the English name: "Iced Milk Coffee" -> "iced-milk-coffee"
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

module.exports = { checkDrink, slugify, MILKS };
