// Owner tools for staff accounts: see who is waiting, approve or reject (FR-51).
// Only the owner can use these routes (FR-58, NFR-S1).

const express = require("express");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { publicUser } = require("../lib/users");
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

  router.post("/:id/approve", (req, res, next) => decide(req, res, next, "approved"));
  router.post("/:id/reject", (req, res, next) => decide(req, res, next, "rejected"));

  // Everyone except the owner, with their status
  router.get("/", async (req, res, next) => {
    try {
      const users = await readJson("users", []);
      res.json(users.filter((u) => u.role !== "owner").map(publicUser));
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
