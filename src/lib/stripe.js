// Optional online card payment, through Stripe Checkout (test mode by default).
// Nothing here runs unless STRIPE_SECRET_KEY is set: without it, the payment routes
// answer 503 and the shop works exactly as before (pay at pickup only).

let client = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) client = require("stripe")(process.env.STRIPE_SECRET_KEY);
  return client;
}

module.exports = { getStripe };
