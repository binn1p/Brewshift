// Member accounts on the website, kept in data/customers.json.
// Members sign up with name, email, phone, password and promo choice. They earn points
// per drink and can spend them at the counter. Passwords are stored only as bcrypt hashes.

const crypto = require("crypto");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_LOYALTY = { pointsPerDrink: 1, pointValue: 1 };

// What the browser may see about a member. Never the hash.
function publicCustomer(customer) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, promos: customer.promos, points: customer.points };
}

// "(514) 555-0123" → "5145550123"; null if it is not a North American number
function normalizePhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
}

// Checks the sign-up form. Returns { errors } or { value }.
function checkSignup(body) {
  const errors = {};
  const input = body && typeof body === "object" ? body : {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = normalizePhone(input.phone);
  const password = typeof input.password === "string" ? input.password : "";

  if (!name || name.length > 60) errors.name = "Please enter your name (60 characters maximum).";
  if (!EMAIL_PATTERN.test(email) || email.length > 120) errors.email = "Please enter a valid email address.";
  if (!phone) errors.phone = "Please enter a 10-digit phone number.";
  if (password.length < 8 || password.length > 100) errors.password = "Password must be 8 to 100 characters.";
  if (Object.keys(errors).length > 0) return { errors };
  return { value: { name, email, phone, password, promos: input.promos === true } };
}

// Points rules from the settings (the browser's defaults fill in what the owner has not set)
function loyaltyRules(settings) {
  return { ...DEFAULT_LOYALTY, ...(settings?.loyalty || {}) };
}

// A new member record. The password is hashed here, never stored as typed.
async function newCustomer(value) {
  return {
    id: `c_${crypto.randomBytes(4).toString("hex")}`,
    name: value.name,
    email: value.email,
    phone: value.phone,
    passwordHash: await bcrypt.hash(value.password, SALT_ROUNDS),
    promos: value.promos,
    points: 0,
    createdAt: new Date().toISOString(),
  };
}

module.exports = { checkSignup, publicCustomer, normalizePhone, loyaltyRules, newCustomer, bcrypt };
