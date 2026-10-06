// Member accounts on the website (added in spec v1.8): sign up, log in, my points and orders.
// Staff can look a member up by phone at the counter. A member's session holds customerId,
// separate from a staff session (userId).

const express = require("express");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { checkSignup, publicCustomer, normalizePhone, newCustomer, bcrypt } = require("../lib/customers");
const { requireLogin, requireRole } = require("../middleware/auth");

// The signed-in member, or null
async function currentCustomer(req) {
  const id = req.session?.customerId;
  if (!id) return null;
  return (await readJson("customers", [])).find((c) => c.id === id) || null;
}

function customersRouter() {
  const router = express.Router();

  router.post("/register", async (req, res, next) => {
    try {
      const checked = checkSignup(req.body);
      if (checked.errors) return res.status(400).json({ error: "Please check the form.", fields: checked.errors });

      const hashed = await newCustomer(checked.value);
      const result = await exclusive(async () => {
        const customers = await readJson("customers", []);
        if (customers.some((c) => c.email === checked.value.email)) return { error: 409, message: "An account with this email already exists." };
        if (customers.some((c) => c.phone === checked.value.phone)) return { error: 409, message: "An account with this phone number already exists." };
        customers.push(hashed);
        await writeJson("customers", customers);
        return { customer: hashed };
      });
      if (result.error) return res.status(result.error).json({ error: result.message });

      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.customerId = hashed.id;
        res.status(201).json({ customer: publicCustomer(hashed) });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const customer = (await readJson("customers", [])).find((c) => c.email === email);
      const matches = customer && password && (await bcrypt.compare(password, customer.passwordHash));
      if (!matches) return res.status(401).json({ error: "Wrong email or password." });

      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.customerId = customer.id;
        res.json({ customer: publicCustomer(customer) });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", (req, res, next) => {
    req.session.customerId = null;
    res.json({ ok: true });
  });

  router.get("/me", async (req, res, next) => {
    try {
      const customer = await currentCustomer(req);
      if (!customer) return res.status(401).json({ error: "Please log in." });
      res.json({ customer: publicCustomer(customer) });
    } catch (error) {
      next(error);
    }
  });

  // Whether the member wants promo emails
  router.put("/promos", async (req, res, next) => {
    try {
      const customer = await currentCustomer(req);
      if (!customer) return res.status(401).json({ error: "Please log in." });
      if (typeof req.body?.promos !== "boolean") return res.status(400).json({ error: "Promos must be yes or no." });
      const updated = await exclusive(async () => {
        const customers = await readJson("customers", []);
        const mine = customers.find((c) => c.id === customer.id);
        mine.promos = req.body.promos;
        await writeJson("customers", customers);
        return mine;
      });
      res.json({ customer: publicCustomer(updated) });
    } catch (error) {
      next(error);
    }
  });

  // My orders, with their status and the points involved
  router.get("/orders", async (req, res, next) => {
    try {
      const customer = await currentCustomer(req);
      if (!customer) return res.status(401).json({ error: "Please log in." });
      const mine = (await readJson("orders", []))
        .filter((o) => o.customerId === customer.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((o) => ({
          code: o.code,
          status: o.status,
          createdAt: o.createdAt,
          pickupTime: o.pickupTime,
          items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })),
          totalCents: o.totalCents,
          pointsUsed: o.pointsUsed || 0,
          pointsEarned: o.pointsEarned || 0,
        }));
      res.json(mine);
    } catch (error) {
      next(error);
    }
  });

  // Staff at the counter: find a member by phone (their name and points only)
  const staffOnly = [requireLogin, requireRole("staff", "owner")];
  router.get("/lookup", ...staffOnly, async (req, res, next) => {
    try {
      const phone = normalizePhone(req.query.phone);
      if (!phone) return res.status(400).json({ error: "Enter a 10-digit phone number." });
      const customer = (await readJson("customers", [])).find((c) => c.phone === phone);
      if (!customer) return res.status(404).json({ error: "No member with that phone number." });
      res.json({ id: customer.id, name: customer.name, points: customer.points });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { customersRouter, currentCustomer };
