// The counter tablet: a staff member or the manager types their 6-digit PIN (FR-30, FR-31).
// A correct PIN of an approved person starts a session, like a log in.

const express = require("express");
const bcrypt = require("bcrypt");
const { readJson } = require("../lib/storage");
const { publicUser, readUsers } = require("../lib/users");
const { currentState } = require("../lib/punches");

// Find who owns a PIN. Returns the user, or null. Each account's hash is checked,
// since bcrypt hashes cannot be searched directly.
async function findByPin(pin) {
  const users = await readUsers();
  for (const user of users) {
    if (await bcrypt.compare(pin, user.pinHash)) return user;
  }
  return null;
}

function kioskRouter() {
  const router = express.Router();

  router.post("/login", async (req, res, next) => {
    try {
      const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: "Your PIN is 6 digits." });
      }

      const user = await findByPin(pin);
      if (!user) return res.status(401).json({ error: "This PIN is not recognised." });
      if (user.status === "pending") {
        return res.status(403).json({ error: "Your account is waiting for approval." });
      }
      if (user.status !== "approved") {
        return res.status(403).json({ error: "This account is not active." });
      }

      const punches = (await readJson("punches", [])).filter((p) => p.userId === user.id);
      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.userId = user.id;
        res.json({ user: publicUser(user), state: currentState(punches) });
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { kioskRouter };
