# Known issues (to fix later)

## Open

1. **Online and counter-QR card payment (Stripe) has no webhook yet.**
   - The order is only saved when a browser calls `GET /api/payments/confirm/:sessionId` — the customer's own browser for a website checkout, or the counter screen's polling for a QR sale. If Stripe charges the card but nobody's browser ever asks (closed tab, crashed phone, lost connection before the counter screen's next poll), the payment goes through on Stripe's side but no order is ever saved.
   - Fix: add a Stripe webhook (`checkout.session.completed`) that saves the order server-side too, using the same "already have this `stripeSessionId`?" check so it can't create a duplicate.
   - Render's free plan also still loses all data (including paid orders) on redeploy without a persistent disk — see the README.
2. **Counter QR payments skip member lookup and points.** Cash and card at the counter can look up a member by phone and spend their points (FR-?); the QR choice does not yet ask for a phone number, so a member paying by QR earns or spends no points for that sale. Minor, since cash/card remain available for members who want that.

## Fixed

- Seasonal label on the menu follows the Settings choice (commit 4d10e9e).
- Egg Coffee's old "Fall special" label is removed automatically on the next start (commit 6967cc7).
- Stripe Checkout Sessions no longer accept `payment_method_types`; Stripe changed this (commit a10385f).
- A card-paid online order was not linked to the signed-in member's account, so it never showed on the account page's order list (fixed alongside the counter QR feature).

