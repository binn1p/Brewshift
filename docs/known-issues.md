# Known issues (to fix later)

## Open

1. **Online card payment (Stripe) has no webhook yet.**
   - The order is only saved when the customer's browser comes back to `order-paid.html` and calls `GET /api/payments/confirm/:sessionId`. If Stripe charges the card but the browser never returns (closed tab, crash, lost connection), the payment goes through on Stripe's side but no order is ever saved.
   - Fix: add a Stripe webhook (`checkout.session.completed`) that saves the order server-side too, using the same "already have this `stripeSessionId`?" check so it can't create a duplicate.
   - Render's free plan also still loses all data (including paid orders) on redeploy without a persistent disk — see the README.

## Fixed

- Seasonal label on the menu follows the Settings choice (commit 4d10e9e).
- Egg Coffee's old "Fall special" label is removed automatically on the next start (commit 6967cc7).

