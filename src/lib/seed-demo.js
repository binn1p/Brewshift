// Demo staff for trying the kiosk: run once with `npm run seed`.
// Adds Linh and Bao (approved) and Mai (waiting for approval) if they are not there yet.
// Demo only: the PINs and passwords below are public, so never use this in production.

require("dotenv").config();
const crypto = require("crypto");
const { writeJson, exclusive } = require("./storage");
const { SALT_ROUNDS, findByEmail, readUsers } = require("./users");
const bcrypt = require("bcrypt");

const DEMO = [
  { name: "Linh Tran", email: "linh@example.com", pin: "123456", status: "approved" },
  { name: "Bao Nguyen", email: "bao@example.com", pin: "246810", status: "approved" },
  { name: "Mai Le", email: "mai@example.com", pin: "111222", status: "pending" },
];
const PASSWORD = "coffee123";

async function seedDemo() {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const added = [];
  await exclusive(async () => {
    const users = await readUsers();
    for (const person of DEMO) {
      if (findByEmail(users, person.email)) continue;
      users.push({
        id: `u_${crypto.randomBytes(4).toString("hex")}`,
        name: person.name,
        email: person.email,
        passwordHash,
        pinHash: await bcrypt.hash(person.pin, SALT_ROUNDS),
        role: "staff",
        status: person.status,
        createdAt: new Date().toISOString(),
      });
      added.push(`${person.name} (PIN ${person.pin}, ${person.status})`);
    }
    await writeJson("users", users);
  });
  return added;
}

if (require.main === module) {
  seedDemo().then((added) => {
    console.log(added.length ? `Added: ${added.join("; ")}` : "Demo staff already exist.");
    console.log(`Demo password for all of them: ${PASSWORD}`);
  });
}

module.exports = { seedDemo };
