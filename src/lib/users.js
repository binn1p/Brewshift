// Staff and owner accounts in data/users.json.
// Passwords and PINs are stored only as bcrypt hashes (FR-23), never as plain text.

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { readJson, writeJson, exclusive } = require("./storage");

const SALT_ROUNDS = 10;

// What the browser may see about a person. Never the hashes.
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    birthDate: user.birthDate || "",
    phone: user.phone || "",
    type: user.type || "part",
    residency: user.residency || "local",
    availability: user.availability || {},
  };
}

async function readUsers() {
  return readJson("users", []);
}

function findByEmail(users, email) {
  return users.find((user) => user.email === email) || null;
}

// A PIN must be unique (FR-24). bcrypt hashes cannot be compared directly,
// so each stored hash is checked. Fine for a café-sized staff list.
async function pinIsTaken(users, pin, exceptId) {
  for (const user of users) {
    if (user.id === exceptId) continue;
    if (await bcrypt.compare(pin, user.pinHash)) return true;
  }
  return false;
}

// Creates the owner from environment variables at startup (FR-25), if not there yet.
// With reset = true (RESET_OWNER=yes on Render), an existing owner with this email gets the
// new PIN and password from the environment. Remove RESET_OWNER again after signing in.
async function ensureOwner({ email, password, pin, name, reset = false }) {
  if (!email || !password || !pin) return;
  await exclusive(async () => {
    const users = await readUsers();
    const existing = findByEmail(users, email.toLowerCase());
    if (existing && !reset) return;
    if (existing) {
      existing.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      existing.pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
      existing.role = "owner";
      existing.status = "approved";
      if (name) existing.name = name;
      await writeJson("users", users);
      return;
    }
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
