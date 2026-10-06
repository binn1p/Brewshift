// Customer orders: place an order, and check its status with the order code (FR-13 to FR-19).

const express = require("express");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { makeCode, checkOrder, checkCounterOrder, priceOrder } = require("../lib/orders");
const { loyaltyRules } = require("../lib/customers");
const { currentCustomer } = require("./customers");
const { requireLogin, requireRole } = require("../middleware/auth");

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

      const member = await currentCustomer(req);
      const order = await exclusive(async () => {
        const orders = await readJson("orders", []);
        const code = makeCode(new Set(orders.map((o) => o.code)));
        const saved = {
          id: `o_${code.toLowerCase()}`,
          code,
          customerId: member ? member.id : null,
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

  // An order taken at the counter by a staff member (or the owner). It is paid when sent.
  // A member can be named by phone, and points can be spent off the bill (before tax).
  router.post("/counter", requireLogin, requireRole("staff", "owner"), async (req, res, next) => {
    try {
      const menu = await readJson("menu");
      const checked = checkCounterOrder(req.body, menu);
      if (checked.errors) {
        return res.status(400).json({ error: "Please check the form.", fields: checked.errors });
      }
      const { customerName, payment, cashGiven, customerPhone, usePoints, lines } = checked.value;
      const rules = loyaltyRules(await readJson("settings", {}));

      const order = await exclusive(async () => {
        const orders = await readJson("orders", []);
        const customers = await readJson("customers", []);
        const member = customerPhone ? customers.find((c) => c.phone === customerPhone) : null;
        if (customerPhone && !member) return { error: 404, fields: { customerPhone: "No member with that phone number." } };

        // Points off the bill: whole dollars, at most what the member has, not more than the items
        const itemsCents = lines.reduce((sum, line) => sum + Math.round(line.drink.price * 100) * line.quantity, 0);
        const pointsUsed = member && usePoints ? Math.min(member.points, Math.floor(itemsCents / 100 / rules.pointValue)) : 0;
        const discountCents = Math.round(pointsUsed * rules.pointValue * 100);
        const priced = priceOrder(lines, shop.taxes, discountCents);

        let cashReceived = null;
        let change = null;
        if (payment === "cash") {
          const cents = Math.round(Number(cashGiven) * 100);
          if (!Number.isFinite(cents) || cents < 0 || cents > 100000000) return { error: 400, fields: { cashReceived: "Enter the cash received." } };
          if (cents < priced.totalCents) return { error: 400, fields: { cashReceived: "Not enough cash for this bill." } };
          cashReceived = cents / 100;
          change = (cents - priced.totalCents) / 100;
        }

        const code = makeCode(new Set(orders.map((o) => o.code)));
        const pointsEarned = member ? lines.reduce((sum, line) => sum + line.quantity, 0) * rules.pointsPerDrink : 0;
        const saved = {
          id: `o_${code.toLowerCase()}`,
          code,
          source: "counter",
          takenBy: req.user.id,
          customerId: member ? member.id : null,
          customerName,
          phone: member ? member.phone : null,
          payment,
          cashReceived,
          change,
          pointsUsed,
          discountCents: priced.discountCents,
          pointsEarned,
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
          note: "",
          pickupTime: null,
          status: "received",
          createdAt: new Date().toISOString(),
          history: [],
        };
        // Points are taken and given when the order is sent (paid)
        if (member) {
          member.points = member.points - pointsUsed + pointsEarned;
          await writeJson("customers", customers);
        }
        orders.push(saved);
        await writeJson("orders", orders);
        return { saved };
      });
      if (order.error) return res.status(order.error).json({ error: "Please check the form.", fields: order.fields });

      res.status(201).json({
        code: order.saved.code,
        status: order.saved.status,
        totalCents: order.saved.totalCents,
        change: order.saved.change,
        pointsUsed: order.saved.pointsUsed,
        pointsEarned: order.saved.pointsEarned,
        createdAt: order.saved.createdAt,
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
