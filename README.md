# Brewshift

Online pickup ordering and staff time clock for small cafés. The first deployment is
**minh**, a café in Montreal. Built for SOEN 287 (Web Programming, Fall 2026).

## What it does

- **Customers** browse the menu, build a bag, and order for pickup. Accounts are optional
  (they earn points per drink). Order status updates on the confirmation page and the account page.
- **Staff** clock in and out with a 6-digit PIN on a shared counter tablet, see their own hours
  and shifts, take counter orders (cash or card), and work the order queue.
- **The owner** approves staff, manages the menu, shop settings and shifts, corrects punches,
  reads reports, and exports CSV files.

## Tech

- Back end: Node.js and Express, with JSON files in `data/` (no SQL database).
- Passwords and PINs: bcrypt. Sessions: express-session (cookie `httpOnly`, `sameSite=lax`).
- Front end: plain HTML, CSS and JavaScript in `public/`.

## Run it on your computer

Requirements: Node.js 20 or newer.

```zsh
npm install
cp .env.example .env     # then edit .env and fill in real values
npm start                # open http://localhost:3000
```

Stop the server with `Ctrl + C`.

### Demo data (local only)

```zsh
npm run seed             # adds demo staff: Linh 123456 and Bao 246810 (approved), Mai 111222 (waiting)
```

The owner account is created from `OWNER_EMAIL`, `OWNER_PASSWORD` and `OWNER_PIN` in `.env` at
the first start. Demo staff and the owner's PIN are for testing only.

## Configuration

| Where | What |
|---|---|
| `config/shop.json` | Name, address, phone, email, time zone, opening hours, tax rates |
| `.env` | `PORT`, `SESSION_SECRET`, `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_PIN` (never commit it) |
| Settings page (owner) | Hour limits, points, loading time, kiosk questions, home tile drinks |

`SESSION_SECRET` is required when `NODE_ENV=production`.

## Data

Everything the server stores is in `data/` as JSON files:

- `menu.json` is committed (the starting menu).
- `users.json`, `customers.json`, `orders.json`, `punches.json`, `shifts.json`, `settings.json`,
  `home.json` and `data/uploads/` hold real data. They are listed in `.gitignore` and are never committed.

Writes are atomic (a temporary file is renamed over the real one), so a crash cannot leave a half-written file.

## Tests

```zsh
npm test
```

Runs the automated tests in `test/` with Node's built-in test runner. Each test file uses its own
temporary data folder, so the real `data/` files are never changed.

## Project layout

```
config/        shop settings (shop.json)
data/          JSON data (see above)
docs/          requirements spec, journal, design notes
public/        front end: pages, CSS, JavaScript, images
src/
  server.js    starts the app
  app.js       routes and error handling
  routes/      API routes (orders, queue, auth, kiosk, punches, shifts, customers, admin, staff)
  lib/         storage, rules (orders, menu, punches, customers, settings), CSV, uploads
  middleware/  login and role checks
test/          automated tests
tools/         development check page at /dev (not available in production)
```

## Deployment

Planned on Render (not deployed yet). The start command is `npm start`. Set `NODE_ENV=production`, `SESSION_SECRET`,
and the `OWNER_*` variables in the Render dashboard. Check that files in `data/` survive a restart
(see requirement A-5).
