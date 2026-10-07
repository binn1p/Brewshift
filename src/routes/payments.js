// Optional online card payment, through Stripe Checkout: either a customer paying at
// checkout on the website, or a counter sale paid by the customer's own phone, scanning a
// QR code instead of tapping a physical card machine. The order itself is only saved once
// Stripe confirms the payment, so a cancelled or abandoned checkout never creates an order.
// This is a test-mode feature: it needs STRIPE_SECRET_KEY, and never runs real charges
// unless that key is a live key. Pay-at-pickup and cash/card-at-counter are unaffected.

const express = require("express");
const QRCode = require("qrcode");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { makeCode, checkOrder, checkLines, priceOrder } = require("../lib/orders");
const { getStripe } = require("../lib/stripe");
const { currentCustomer } = require("./customers");
const { requireLogin, requireRole } = require("../middleware/auth");

// shop: the settings from config/shop.json (used for the tax rates)
function paymentsRouter(shop) {
  const router = express.Router();

  // Start a Stripe Checkout session for an online (website) order. The checked order is kept
  // in the session's metadata until payment is confirmed; our server never stores a card number.
  router.post("/checkout-session", async (req, res, next) => {
    try {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ error: "Online card payment is not set up on this server." });

      const menu = await readJson("menu");
      const checked = checkOrder(req.body, menu);
      if (checked.errors) {
        return res.status(400).json({ error: "Please check the form.", fields: checked.errors });
      }
      const { lines } = checked.value;
      const priced = priceOrder(lines, shop.taxes);

      // Rebuilt from the browser's item list when payment is confirmed, not from this pricing
      const payload = JSON.stringify({ name: checked.value.name, phone: checked.value.phone, note: checked.value.note, pickupTime: checked.value.pickupTime, items: req.body.items });
      if (payload.length > 450) {
        return res.status(400).json({ error: "This order has too many lines to pay online. Please remove some, or pay at pickup." });
      }

      const origin = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        // Which payment methods show (card, etc.) is now chosen in the Stripe Dashboard,
        // not here: https://dashboard.stripe.com/settings/payment_methods
        success_url: `${origin}/order-paid.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/menu.html`,
        metadata: { kind: "online", orderPayload: payload },
        line_items: lineItems(priced),
      });

      res.json({ url: session.url });
    } catch (error) {
      next(error);
    }
  });

  // Start a Stripe Checkout session for a counter sale, paid by the customer's own phone
  // (a QR code of the link, shown on the counter screen) instead of a card machine.
  router.post("/checkout-session/counter", requireLogin, requireRole("staff", "owner"), async (req, res, next) => {
    try {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ error: "Online card payment is not set up on this server." });

      const customerName = typeof req.body?.customerName === "string" ? req.body.customerName.trim() : "";
      if (!customerName || customerName.length > 40) {
        return res.status(400).json({ error: "Please check the form.", fields: { customerName: "Please enter the customer's name." } });
      }
      const menu = await readJson("menu");
      const checkedLines = checkLines(req.body.items, menu);
      if (checkedLines.error) return res.status(400).json({ error: "Please check the form.", fields: { items: checkedLines.error } });
      const priced = priceOrder(checkedLines.lines, shop.taxes);

      const payload = JSON.stringify({ customerName, items: req.body.items });
      if (payload.length > 450) {
        return res.status(400).json({ error: "This order has too many lines to pay by QR code. Please use cash or card instead." });
      }

      const origin = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${origin}/order-paid.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/index.html`,
        metadata: { kind: "counter", takenBy: req.user.id, orderPayload: payload },
        line_items: lineItems(priced),
      });

      // A QR code of the payment link, drawn here (not by a third-party service), so the
      // customer's phone number or any other detail never leaves this server
      const qr = await QRCode.toDataURL(session.url, { margin: 1, width: 300 });
      res.json({ sessionId: session.id, url: session.url, qr });
    } catch (error) {
      next(error);
    }
  });

  // After Stripe sends the customer back, or while the counter screen is waiting: confirm the
  // payment really went through, then save the order (once — asking again does not create a
  // second order). 402 means "not paid (yet)", which for a QR sale is still a normal thing to see
  // while waiting, not an error.
  router.get("/confirm/:sessionId", async (req, res, next) => {
    try {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ error: "Online card payment is not set up on this server." });

      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "This payment was not completed." });
      }

      // The member signed in on this browser, if any (website checkout only)
      const member = session.metadata.kind === "counter" ? null : await currentCustomer(req);

      const result = await exclusive(async () => {
        const orders = await readJson("orders", []);
        const already = orders.find((o) => o.stripeSessionId === session.id);
        if (already) return { order: already };

        const menu = await readJson("menu");
        const saved =
          session.metadata.kind === "counter"
            ? buildCounterOrder(session, menu, shop, orders)
            : buildOnlineOrder(session, menu, shop, orders, member);
        if (saved.error) return saved;

        orders.push(saved.order);
        await writeJson("orders", orders);
        return saved;
      });

      if (result.error) return res.status(result.error).json({ error: result.message });
      res.json({
        code: result.order.code,
        status: result.order.status,
        totalCents: result.order.totalCents,
        createdAt: result.order.createdAt,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

// One Stripe line item per drink, already priced with its promo (so amounts add up correctly
// even with a "2 for 1" deal), plus the taxes as their own lines.
function lineItems(priced) {
  return [
    ...priced.lines.map((line) => ({
      price_data: { currency: "cad", unit_amount: line.lineCents, product_data: { name: `${line.quantity} × ${line.drink.name.en}` } },
      quantity: 1,
    })),
    ...priced.taxes.map((tax) => ({
      price_data: { currency: "cad", unit_amount: tax.cents, product_data: { name: tax.label } },
      quantity: 1,
    })),
  ];
}

function buildOnlineOrder(session, menu, shop, orders, member) {
  const payload = JSON.parse(session.metadata.orderPayload);
  const checked = checkOrder(payload, menu);
  if (checked.errors) return { error: 500, message: "The menu changed since checkout started; please contact the café." };
  const priced = priceOrder(checked.value.lines, shop.taxes);
  const code = makeCode(new Set(orders.map((o) => o.code)));
  return {
    order: {
      id: `o_${code.toLowerCase()}`,
      code,
      customerId: member ? member.id : null,
      customerName: checked.value.name,
      phone: checked.value.phone,
      source: "online",
      takenBy: null,
      payment: "card",
      stripeSessionId: session.id,
      items: itemsFrom(priced),
      subtotalCents: priced.subtotalCents,
      taxes: priced.taxes,
      totalCents: priced.totalCents,
      note: checked.value.note,
      pickupTime: checked.value.pickupTime,
      status: "received",
      createdAt: new Date().toISOString(),
      history: [],
    },
  };
}

function buildCounterOrder(session, menu, shop, orders) {
  const payload = JSON.parse(session.metadata.orderPayload);
  const checkedLines = checkLines(payload.items, menu);
  if (checkedLines.error) return { error: 500, message: "The menu changed since this QR code was made; please contact the café." };
  const priced = priceOrder(checkedLines.lines, shop.taxes);
  const code = makeCode(new Set(orders.map((o) => o.code)));
  return {
    order: {
      id: `o_${code.toLowerCase()}`,
      code,
      customerId: null,
      customerName: payload.customerName,
      phone: null,
      source: "counter",
      takenBy: session.metadata.takenBy,
      payment: "card",
      stripeSessionId: session.id,
      items: itemsFrom(priced),
      subtotalCents: priced.subtotalCents,
      taxes: priced.taxes,
      totalCents: priced.totalCents,
      note: "",
      pickupTime: null,
      status: "received",
      createdAt: new Date().toISOString(),
      history: [],
    },
  };
}

function itemsFrom(priced) {
  return priced.lines.map((line) => ({
    menuItemId: line.drink.id,
    name: line.drink.name.en,
    quantity: line.quantity,
    options: line.options,
    unitPriceCents: line.unitCents,
    lineCents: line.lineCents,
  }));
}

module.exports = { paymentsRouter };
