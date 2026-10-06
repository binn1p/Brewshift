// The order queue for staff: open orders, oldest first (FR-42), and moving an
// order along received → in progress → ready → picked up (FR-43).

const express = require("express");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { requireLogin, requireRole } = require("../middleware/auth");

const NEXT = { received: "in_progress", in_progress: "ready", ready: "picked_up" };
const OPEN = ["received", "in_progress", "ready"];

function queueRouter() {
  const router = express.Router();
  router.use(requireLogin, requireRole("staff", "owner"));

  // Open orders, oldest first
  router.get("/", async (req, res, next) => {
    try {
      const orders = await readJson("orders", []);
      const open = orders
        .filter((o) => OPEN.includes(o.status))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((o) => ({
          code: o.code,
          source: "online",
          customerName: o.customerName,
          items: o.items.map((i) => ({ name: i.name, quantity: i.quantity, options: i.options })),
          status: o.status,
          pickupTime: o.pickupTime,
          createdAt: o.createdAt,
        }));
      res.json(open);
    } catch (error) {
      next(error);
    }
  });

  // Move one order to its next status. Each change is logged with who made it.
  router.post("/:code/status", async (req, res, next) => {
    try {
      const code = String(req.params.code).toUpperCase();
      const wanted = req.body?.status;
      const result = await exclusive(async () => {
        const orders = await readJson("orders", []);
        const order = orders.find((o) => o.code === code);
        if (!order) return { error: 404, message: "No order with that code." };
        if (NEXT[order.status] !== wanted) {
          return { error: 409, message: `An order that is ${order.status} cannot become ${wanted}.` };
        }
        order.history = order.history || [];
        order.history.push({ at: new Date().toISOString(), by: req.user.id, from: order.status, to: wanted });
        order.status = wanted;
        await writeJson("orders", orders);
        return { order };
      });
      if (result.error) return res.status(result.error).json({ error: result.message });
      res.json({ code: result.order.code, status: result.order.status });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { queueRouter };
