// Rules for placing an order: checking what the browser sent (NFR-S2) and
// computing the price from the server's own menu (FR-15).
// The browser's prices are never read.

const crypto = require("crypto");

// Extra cost of each milk, in cents. Must match public/js/options.js (MILKS).
const MILK_EXTRA_CENTS = { none: 0, condensed: 0, fresh: 0, almond: 75, oat: 75, coconut: 50 };
const SUGAR_LEVELS = [0, 25, 50, 75, 100];
const ICE_LEVELS = [0, 25, 50, 75, 100];
const MAX_LINES = 20;
const MAX_QUANTITY = 20;

// Letters and digits without look-alikes (no 0/O, 1/I), so a code is easy to read aloud
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(existingCodes) {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join("");
  } while (existingCodes.has(code));
  return code;
}

// "(514) 555-0123" → "5145550123"; returns null if it is not a North American number
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
}

// Checks the body of POST /api/orders. Returns { errors } or { value }.
function checkOrder(body, menu) {
  const errors = {};
  const input = body && typeof body === "object" ? body : {};

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) errors.name = "Please enter your name.";
  else if (name.length > 40) errors.name = "Name is too long (40 characters maximum).";

  const phone = normalizePhone(input.phone ?? "");
  if (!phone) errors.phone = "Please enter a 10-digit phone number.";

  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 200) errors.note = "Note is too long (200 characters maximum).";

  // Pickup time: empty, or "HH:MM" (checked against opening hours later)
  let pickupTime = null;
  if (input.pickupTime) {
    if (typeof input.pickupTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.pickupTime)) {
      pickupTime = input.pickupTime;
    } else {
      errors.pickupTime = "Pickup time must look like 14:30.";
    }
  }

  const lines = [];
  if (!Array.isArray(input.items) || input.items.length === 0) {
    errors.items = "Your bag is empty.";
  } else if (input.items.length > MAX_LINES) {
    errors.items = `An order can have at most ${MAX_LINES} lines.`;
  } else {
    input.items.forEach((item, index) => {
      const drink = menu.find((d) => d.id === item?.id);
      if (!drink) {
        errors.items = `Item ${index + 1} is not on the menu or not available.`;
        return;
      }
      const quantity = item.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        errors.items = `Quantity for ${drink.id} must be a whole number from 1 to ${MAX_QUANTITY}.`;
        return;
      }
      const options = checkOptions(item.options ?? {}, drink);
      if (options.error) {
        errors.items = options.error;
        return;
      }
      lines.push({ drink, quantity, options: options.value });
    });
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { value: { name, phone, note, pickupTime, lines } };
}

// Customize choices for one drink: milk, sugar and (iced drinks only) ice.
function checkOptions(options, drink) {
  if (typeof options !== "object" || Array.isArray(options)) {
    return { error: "Options must be an object." };
  }
  const milk = options.milk ?? drink.recipe.milk;
  if (!(milk in MILK_EXTRA_CENTS)) return { error: `Unknown milk choice: ${milk}.` };

  const sugar = options.sugar ?? drink.recipe.sugar;
  if (!SUGAR_LEVELS.includes(sugar)) return { error: "Sugar must be 0, 25, 50, 75 or 100." };

  let ice = null;
  if (drink.recipe.ice !== null) {
    ice = options.ice ?? drink.recipe.ice;
    if (!ICE_LEVELS.includes(ice)) return { error: "Ice must be 0, 25, 50, 75 or 100." };
  }

  const note = typeof options.note === "string" ? options.note.trim().slice(0, 100) : "";
  return { value: { milk, sugar, ice, note } };
}

// Price of the whole order, in cents, with the same promo rule as the browser
// (a promo like { buy: 2, pay: 1 } makes every second drink free).
function priceOrder(lines, taxRates) {
  const priced = lines.map(({ drink, quantity, options }) => {
    const unitCents = Math.round(drink.price * 100) + MILK_EXTRA_CENTS[options.milk];
    const free = drink.promo ? Math.floor(quantity / drink.promo.buy) * (drink.promo.buy - drink.promo.pay) : 0;
    const lineCents = unitCents * (quantity - free);
    return { drink, quantity, options, unitCents, lineCents };
  });

  const subtotalCents = priced.reduce((sum, line) => sum + line.lineCents, 0);
  const taxes = [
    { label: "GST", cents: Math.round((subtotalCents * taxRates.gst) / 100) },
    { label: "QST", cents: Math.round((subtotalCents * taxRates.qst) / 100) },
  ];
  const totalCents = subtotalCents + taxes.reduce((sum, tax) => sum + tax.cents, 0);
  return { lines: priced, subtotalCents, taxes, totalCents };
}

module.exports = { makeCode, checkOrder, priceOrder };
