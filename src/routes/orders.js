// Customer orders: place an order, and check its status with the order code (FR-13 to FR-19).

const express = require("express");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { makeCode, checkOrder, priceOrder } = require("../lib/orders");

// shop: the settings from config/shop.json (used for the tax rates)
function ordersRouter(shop) {
  const router = express.Router();

  // Place an order. The browser sends what the customer chose; the server
  // checks it, prices it, and returns the order code.
  router.post("/", async (req, res, next) => {
    try {
      const menu = await readJson("menu");
      const checked = checkOrder(req.body, menu);
      if (checked.errors) {
        return res.status(400).json({ error: "Please check the form.", fields: checked.errors });
      }

      const { name, phone, note, pickupTime, lines } = checked.value;
      const priced = priceOrder(lines, shop.taxes);

      const order = await exclusive(async () => {
        const orders = await readJson("orders", []);
        const code = makeCode(new Set(orders.map((o) => o.code)));
        const saved = {
          id: `o_${code.toLowerCase()}`,
          code,
          customerName: name,
          phone,
          items: priced.lines.map((line) => ({
            menuItemId: line.drink.id,
            name: line.drink.name.en,
            quantity: line.quantity,
            options: line.options,
            unitPriceCents: line.unitCents,
            lineCents: line.lineCents,
          })),
          subtotalCents: priced.subtotalCents,
          taxes: priced.taxes,
          totalCents: priced.totalCents,
          note,
          pickupTime,
          status: "received",
          createdAt: new Date().toISOString(),
        };
        orders.push(saved);
        await writeJson("orders", orders);
        return saved;
      });

      // Answer the customer with what they need: no phone number
      res.status(201).json({
        code: order.code,
        status: order.status,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
      });
    } catch (error) {
      next(error);
    }
  });

  // Order status for the confirmation page (FR-17, FR-19). Shows items and status only.
  router.get("/:code", async (req, res, next) => {
    try {
      const code = String(req.params.code).toUpperCase();
      const orders = await readJson("orders", []);
      const order = orders.find((o) => o.code === code);
      if (!order) return res.status(404).json({ error: "No order with that code." });

      res.json({
        code: order.code,
        status: order.status,
        pickupTime: order.pickupTime,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
        totalCents: order.totalCents,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { ordersRouter };
