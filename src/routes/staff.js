// Owner tools for staff accounts: see who is waiting, approve or reject (FR-51).
// Only the owner can use these routes (FR-58, NFR-S1).

const express = require("express");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { publicUser, readUsers, pinIsTaken, SALT_ROUNDS } = require("../lib/users");
const { checkDetails } = require("../lib/staff-details");
const { requireLogin, requireRole } = require("../middleware/auth");

function staffRouter() {
  const router = express.Router();
  router.use(requireLogin, requireRole("owner"));

  // Accounts waiting for approval
  router.get("/pending", async (req, res, next) => {
    try {
      const users = await readJson("users", []);
      res.json(users.filter((u) => u.status === "pending").map(publicUser));
    } catch (error) {
      next(error);
    }
  });

  // Approve or reject one pending account
  async function decide(req, res, next, status) {
    try {
      const result = await exclusive(async () => {
        const users = await readJson("users", []);
        const user = users.find((u) => u.id === req.params.id);
        if (!user) return { error: 404, message: "No account with that id." };
        if (user.status !== "pending") return { error: 409, message: "This account has already been decided." };
        user.status = status;
        await writeJson("users", users);
        return { user };
      });
      if (result.error) return res.status(result.error).json({ error: result.message });
      res.json({ user: publicUser(result.user) });
    } catch (error) {
      next(error);
    }
  }

  // Add a person (owner). They are approved or waiting as the owner chooses.
  router.post("/", async (req, res, next) => {
    try {
      const checked = checkDetails(req.body, { isNew: true });
      if (checked.errors) return res.status(400).json({ error: "Please check the form.", fields: checked.errors });
      const v = checked.value;
      // Nobody signs in with a password for these accounts: they use the PIN on the kiosk
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), SALT_ROUNDS);
      const pinHash = await bcrypt.hash(v.pin, SALT_ROUNDS);
      const result = await exclusive(async () => {
        const users = await readUsers();
        if (v.email && users.some((u) => u.email === v.email.toLowerCase())) return { error: 409, message: "An account with this email already exists." };
        if (await pinIsTaken(users, v.pin)) return { error: 409, message: "This PIN is already used. Please choose another." };
        const user = {
          id: `u_${crypto.randomBytes(4).toString("hex")}`,
          name: v.name,
          email: v.email.toLowerCase(),
          passwordHash,
          pinHash,
          role: v.role,
          status: v.status,
          birthDate: v.birthDate,
          phone: v.phone,
          type: v.type,
          residency: v.residency,
          availability: v.availability,
          createdAt: new Date().toISOString(),
        };
        users.push(user);
        await writeJson("users", users);
        return { user };
      });
      if (result.error) return res.status(result.error).json({ error: result.message });
      res.status(201).json({ user: publicUser(result.user) });
    } catch (error) {
      next(error);
    }
  });

  // Edit a person's details, status and access (owner). A PIN is changed only if one is sent.
  router.put("/:id", async (req, res, next) => {
    try {
      const checked = checkDetails(req.body, { isNew: false });
      if (checked.errors) return res.status(400).json({ error: "Please check the form.", fields: checked.errors });
      const v = checked.value;
      const pinHash = v.pin ? await bcrypt.hash(v.pin, SALT_ROUNDS) : null;
      const result = await exclusive(async () => {
        const users = await readUsers();
        const user = users.find((u) => u.id === req.params.id);
        if (!user) return { error: 404, message: "No account with that id." };
        if (user.id === req.user.id && v.role !== "owner") return { error: 400, message: "You cannot take away your own manager access." };
        if (v.email && users.some((u) => u.id !== user.id && u.email === v.email.toLowerCase())) return { error: 409, message: "An account with this email already exists." };
        if (v.pin && (await pinIsTaken(users, v.pin, user.id))) return { error: 409, message: "This PIN is already used. Please choose another." };
        Object.assign(user, {
          name: v.name,
          email: v.email.toLowerCase(),
          role: v.role,
          status: v.status,
          birthDate: v.birthDate,
          phone: v.phone,
          type: v.type,
          residency: v.residency,
          availability: v.availability,
        });
        if (pinHash) user.pinHash = pinHash;
        await writeJson("users", users);
        return { user };
      });
      if (result.error) return res.status(result.error).json({ error: result.message });
      res.json({ user: publicUser(result.user) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/approve", (req, res, next) => decide(req, res, next, "approved"));
  router.post("/:id/reject", (req, res, next) => decide(req, res, next, "rejected"));

  // Everyone, with their status and details (managers included)
  router.get("/", async (req, res, next) => {
    try {
      const users = await readJson("users", []);
      res.json(users.map(publicUser));
    } catch (error) {
      next(error);
    }
  });

  // Block an approved staff member at once: their login and PIN stop working (FR-52)
  router.post("/:id/deactivate", async (req, res, next) => {
    try {
      const result = await exclusive(async () => {
        const users = await readJson("users", []);
        const user = users.find((u) => u.id === req.params.id);
        if (!user || user.role === "owner") return { error: 404, message: "No staff account with that id." };
        if (user.status !== "approved") return { error: 409, message: "Only approved staff can be deactivated." };
        user.status = "inactive";
        await writeJson("users", users);
        return { user };
      });
      if (result.error) return res.status(result.error).json({ error: result.message });
      res.json({ user: publicUser(result.user) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { staffRouter };
