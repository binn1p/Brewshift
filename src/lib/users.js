// Staff and owner accounts in data/users.json.
// Passwords and PINs are stored only as bcrypt hashes (FR-23), never as plain text.

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { readJson, writeJson, exclusive } = require("./storage");

const SALT_ROUNDS = 10;

// What the browser may see about a person. Never the hashes.
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt };
}

async function readUsers() {
  return readJson("users", []);
}

function findByEmail(users, email) {
  return users.find((user) => user.email === email) || null;
}

// A PIN must be unique (FR-24). bcrypt hashes cannot be compared directly,
// so each stored hash is checked. Fine for a café-sized staff list.
async function pinIsTaken(users, pin) {
  for (const user of users) {
    if (await bcrypt.compare(pin, user.pinHash)) return true;
  }
  return false;
}

// Creates the owner from environment variables at startup (FR-25), if not there yet.
async function ensureOwner({ email, password, pin, name }) {
  if (!email || !password || !pin) return;
  await exclusive(async () => {
    const users = await readUsers();
    if (findByEmail(users, email.toLowerCase())) return;
    users.push({
      id: `u_${crypto.randomBytes(4).toString("hex")}`,
      name: name || "Owner",
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
      pinHash: await bcrypt.hash(pin, SALT_ROUNDS),
      role: "owner",
      status: "approved",
      createdAt: new Date().toISOString(),
    });
    await writeJson("users", users);
  });
}

module.exports = { SALT_ROUNDS, publicUser, readUsers, findByEmail, pinIsTaken, ensureOwner };
