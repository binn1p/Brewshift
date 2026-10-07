// Optional online card payment for a pickup order, through Stripe Checkout.
// The order itself is only saved once Stripe confirms the payment, so a cancelled or
// abandoned checkout never creates an order. This is a test-mode feature: it needs
// STRIPE_SECRET_KEY, and never runs real charges unless that key is a live key.
// Pay-at-pickup orders (POST /api/orders) are unaffected and remain the default.

const express = require("express");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { makeCode, checkOrder, priceOrder } = require("../lib/orders");
const { getStripe } = require("../lib/stripe");

// shop: the settings from config/shop.json (used for the tax rates)
function paymentsRouter(shop) {
  const router = express.Router();

  // Start a Stripe Checkout session. The checked order is kept in the session's metadata
  // until payment is confirmed; our server never stores a card number.
  router.post("/checkout-session", async (req, res, next) => {
    try {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ error: "Online card payment is not set up on this server." });

      const menu = await readJson("menu");
      const checked = checkOrder(req.body, menu);
      if (checked.errors) {
        return res.status(400).json({ error: "Please check the form.", fields: checked.errors });
      }
      const { name, phone, note, pickupTime, lines } = checked.value;
      const priced = priceOrder(lines, shop.taxes);

      // Rebuilt from the browser's item list when payment is confirmed, not from this pricing
      const payload = JSON.stringify({ name, phone, note, pickupTime, items: req.body.items });
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
        metadata: { orderPayload: payload },
        line_items: [
          // One line per drink, already priced with its promo (so amounts add up correctly
          // even with a "2 for 1" deal), plus the taxes as their own lines.
          ...priced.lines.map((line) => ({
            price_data: {
              currency: "cad",
              unit_amount: line.lineCents,
              product_data: { name: `${line.quantity} × ${line.drink.name.en}` },
            },
            quantity: 1,
          })),
          ...priced.taxes.map((tax) => ({
            price_data: { currency: "cad", unit_amount: tax.cents, product_data: { name: tax.label } },
            quantity: 1,
          })),
        ],
      });

      res.json({ url: session.url });
    } catch (error) {
      next(error);
    }
  });

  // After Stripe sends the customer back: confirm the payment really went through, then
  // save the order (once — reloading this page does not create a second order).
  router.get("/confirm/:sessionId", async (req, res, next) => {
    try {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ error: "Online card payment is not set up on this server." });

      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
      if (session.payment_status !== "paid") {
        return res.status(402).json({ error: "This payment was not completed." });
      }

      const result = await exclusive(async () => {
        const orders = await readJson("orders", []);
        const already = orders.find((o) => o.stripeSessionId === session.id);
        if (already) return { order: already };

        const payload = JSON.parse(session.metadata.orderPayload);
        const menu = await readJson("menu");
        const checked = checkOrder(payload, menu);
        if (checked.errors) return { error: 500, message: "The menu changed since checkout started; please contact the café." };
        const priced = priceOrder(checked.value.lines, shop.taxes);

        const code = makeCode(new Set(orders.map((o) => o.code)));
        const saved = {
          id: `o_${code.toLowerCase()}`,
          code,
          customerName: checked.value.name,
          phone: checked.value.phone,
          source: "online",
          takenBy: null,
          payment: "card",
          stripeSessionId: session.id,
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
          note: checked.value.note,
          pickupTime: checked.value.pickupTime,
          status: "received",
          createdAt: new Date().toISOString(),
          history: [],
        };
        orders.push(saved);
        await writeJson("orders", orders);
        return { order: saved };
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

module.exports = { paymentsRouter };
