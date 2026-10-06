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

  const checkedLines = checkLines(input.items, menu);
  if (checkedLines.error) errors.items = checkedLines.error;

  if (Object.keys(errors).length > 0) return { errors };
  return { value: { name, phone, note, pickupTime, lines: checkedLines.lines } };
}

// Checks the list of drinks in a bag. Returns { error } or { lines }.
function checkLines(items, menu) {
  if (!Array.isArray(items) || items.length === 0) return { error: "Your bag is empty." };
  if (items.length > MAX_LINES) return { error: `An order can have at most ${MAX_LINES} lines.` };
  const lines = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const drink = menu.find((d) => d.id === item?.id);
    if (!drink) return { error: `Item ${index + 1} is not on the menu or not available.` };
    const quantity = item.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { error: `Quantity for ${drink.id} must be a whole number from 1 to ${MAX_QUANTITY}.` };
    }
    const options = checkOptions(item.options ?? {}, drink);
    if (options.error) return { error: options.error };
    lines.push({ drink, quantity, options: options.value });
  }
  return { lines };
}

// Checks an order taken at the counter: the name, how it is paid, the bag, and
// optionally a member (by phone) and whether to spend points. The price is worked out
// by the route, because points change it. Returns { errors } or { value }.
function checkCounterOrder(body, menu) {
  const input = body && typeof body === "object" ? body : {};
  const errors = {};
  const customerName = typeof input.customerName === "string" ? input.customerName.trim() : "";
  if (!customerName || customerName.length > 40) errors.customerName = "Please enter the customer's name (40 characters maximum).";
  if (input.payment !== "cash" && input.payment !== "card") errors.payment = "Choose cash or card.";
  const checkedLines = checkLines(input.items, menu);
  if (checkedLines.error) errors.items = checkedLines.error;
  let customerPhone = null;
  if (input.customerPhone !== undefined && input.customerPhone !== null && input.customerPhone !== "") {
    customerPhone = String(input.customerPhone).replace(/\D/g, "").slice(-10);
    if (customerPhone.length !== 10) errors.customerPhone = "Enter a 10-digit phone number.";
  }
  if (Object.keys(errors).length > 0) return { errors };
  return {
    value: {
      customerName,
      payment: input.payment,
      cashGiven: input.cashReceived === undefined || input.cashReceived === null ? null : Number(input.cashReceived),
      customerPhone,
      usePoints: input.usePoints === true,
      lines: checkedLines.lines,
    },
  };
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
function priceOrder(lines, taxRates, discountCents = 0) {
  const priced = lines.map(({ drink, quantity, options }) => {
    const unitCents = Math.round(drink.price * 100) + MILK_EXTRA_CENTS[options.milk];
    const free = drink.promo ? Math.floor(quantity / drink.promo.buy) * (drink.promo.buy - drink.promo.pay) : 0;
    const lineCents = unitCents * (quantity - free);
    return { drink, quantity, options, unitCents, lineCents };
  });

  const itemsCents = priced.reduce((sum, line) => sum + line.lineCents, 0);
  // Points come off before tax, and never below zero
  const subtotalCents = Math.max(0, itemsCents - discountCents);
  const taxes = [
    { label: "GST", cents: Math.round((subtotalCents * taxRates.gst) / 100) },
    { label: "QST", cents: Math.round((subtotalCents * taxRates.qst) / 100) },
  ];
  const totalCents = subtotalCents + taxes.reduce((sum, tax) => sum + tax.cents, 0);
  return { lines: priced, itemsCents, discountCents: itemsCents - subtotalCents, subtotalCents, taxes, totalCents };
}

module.exports = { makeCode, checkOrder, checkCounterOrder, checkLines, priceOrder };
