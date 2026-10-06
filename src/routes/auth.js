// Staff registration, log in and log out (FR-20 to FR-22).
// A new registration is "pending" until the owner approves it (FR-21).

const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { SALT_ROUNDS, publicUser, readUsers, findByEmail, pinIsTaken } = require("../lib/users");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkRegistration(body) {
  const errors = {};
  const input = body && typeof body === "object" ? body : {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const pin = typeof input.pin === "string" ? input.pin : String(input.pin ?? "");

  if (!name || name.length > 60) errors.name = "Please enter your name (60 characters maximum).";
  if (!EMAIL_PATTERN.test(email) || email.length > 120) errors.email = "Please enter a valid email address.";
  if (password.length < 8 || password.length > 100) errors.password = "Password must be 8 to 100 characters.";
  if (!/^\d{6}$/.test(pin)) errors.pin = "Your PIN must be exactly 6 digits.";

  if (Object.keys(errors).length > 0) return { errors };
  return { value: { name, email, password, pin } };
}

function authRouter() {
  const router = express.Router();

  // Register as staff. The account waits for the owner's approval.
  router.post("/register", async (req, res, next) => {
    try {
      const checked = checkRegistration(req.body);
      if (checked.errors) {
        return res.status(400).json({ error: "Please check the form.", fields: checked.errors });
      }
      const { name, email, password, pin } = checked.value;

      // Hash first (slow), then check and save in one step so two sign-ups cannot clash
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

      const result = await exclusive(async () => {
        const users = await readJson("users", []);
        if (findByEmail(users, email)) return { error: 409, message: "An account with this email already exists." };
        if (await pinIsTaken(users, pin)) return { error: 409, message: "This PIN is already used. Please choose another." };

        const user = {
          id: `u_${crypto.randomBytes(4).toString("hex")}`,
          name,
          email,
          passwordHash,
          pinHash,
          role: "staff",
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        await writeJson("users", users);
        return { user };
      });

      if (result.error) return res.status(result.error).json({ error: result.message });
      res.status(201).json({ user: publicUser(result.user), message: "Thanks! The owner will approve your account." });
    } catch (error) {
      next(error);
    }
  });

  // Log in with email and password. Only approved people get a session.
  router.post("/login", async (req, res, next) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const user = findByEmail(await readUsers(), email);
      const matches = user && password && (await bcrypt.compare(password, user.passwordHash));

      if (!matches) return res.status(401).json({ error: "Wrong email or password." });
      if (user.status !== "approved") {
        return res.status(403).json({ error: "Your account is waiting for approval." });
      }

      // Only the staff part of the session is set; a member signed in on this browser stays signed in
      req.session.userId = user.id;
      res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", (req, res, next) => {
    // Only the staff part of the session is cleared; a member signed in here stays signed in
    delete req.session.userId;
    res.json({ ok: true });
  });

  // Who is signed in (used by pages to show the right menu)
  router.get("/me", async (req, res, next) => {
    try {
      const id = req.session?.userId;
      const user = id ? (await readUsers()).find((u) => u.id === id) : null;
      if (!user || user.status !== "approved") return res.status(401).json({ error: "Please log in." });
      res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { authRouter, checkRegistration };
