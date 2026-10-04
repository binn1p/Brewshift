# CLAUDE.md

Context for Claude Code working in this repository.

## Project

Brewshift is the SOEN 287 (Web Programming, Fall 2026) course project: a full web app (front end + back end) built October 1 to 31, 2026, while the author learns web development week by week.

It is a **generic café management product**: online pickup ordering plus a staff time clock. It is demoed as one deployed café named exactly **minh** (lowercase, one word), whose name, hours and branding come from a config file.

- Full requirements: `docs/requirements-spec.md`
- Daily journal: `docs/project-journal.md` (filled in each evening)
- `docs/design-ideas.md`: design inspiration (Myriade-style loading screen, Cộng Cà Phê retro font vibe with Oswald + Be Vietnam Pro, reference café sites, folder-tab home page). Ideas, not decisions.
- GitHub: https://github.com/binn1p/Brewshift

## How to work with the user

- The user is a **complete beginner**. Reply in **Vietnamese**, go slowly, explain simply, and define every technical term.
- Teach rather than just do: explain what each step does and why.
- The user is on a **Mac** (zsh terminal).
- Claude **may run `git commit` and `git push`** on the user's behalf, but must always show what will be committed/pushed and get a quick confirmation first (the commit history is graded, so the user wants to approve each one, not type them by hand). **Exception: `CLAUDE.md` and anything under `docs/`** — Claude commits and pushes those on its own, no confirmation needed. Code/app files (once they exist) still need confirmation.
- Commit messages use prefixes: `docs:`, `chore:`, `feat:` (e.g. `docs: add CLAUDE.md`).

## Key requirements

- UI in **English** by default, with an **EN | FR** switch at the top right of every page (added 2026-10-04): `public/js/i18n.js` holds the strings (`STRINGS`, `t()`, `tr()` for `{en, fr}` data, `data-i18n` attributes in HTML); choice saved in `localStorage` `brewshift-lang`; switching reloads the page. French uses Québec conventions (6,00 $, TPS/TVQ, 14 h). New text must be added in both languages.
- Customers order **without an account** (name + phone) and get a confirmation page with an **order code** and **live status**.
- Staff **self-register**; the owner **approves** them.
- Staff **clock in/out** with a personal **6-digit PIN** on a shared counter iPad (kiosk).
- The owner **exports all orders and clock-ins as CSV**.
- **No** in-app staffing chart.

## Architecture

Client-server web app.

| Path | Contents |
|---|---|
| `public/` | Front end: HTML, CSS, JavaScript served to the browser |
| `src/` | Back end: Node.js + Express server |
| `config/` | Per-shop config, e.g. `shop.json` for minh |
| `data/` | Data stored as JSON files: users, menu, orders, punches |
| `docs/` | Text documents (spec, journal) |
| root | `README.md`, `.gitignore`, `.env.example`, `package.json` |

Hosting: **Render**.

## Branding (minh)

- Logo chosen 2026-10-01: wordmark "minh" (all lowercase), font **Rye** (Google Fonts, free), Old West / vintage poster style. Letters are vector paths, no font install needed.
- Files: `public/images/minh-4-saloon-light.svg` (light backgrounds, espresso `#3A2318`) and `public/images/minh-4-saloon-dark.svg` (dark backgrounds, mustard `#E0A93B`).
- Palette idea: espresso `#3A2318`, cream `#F3E6CF`, burnt orange `#D2652D`, mustard `#E0A93B`, brick red `#A63A2A`, olive `#6E7B3A`.
- Rye is decorative and hard to read small: logo and big titles only, never body text. Keep the logo at least ~28px tall.
- The logo is per-shop branding of the minh deployment; Brewshift code stays generic (later the logo path comes from `config/shop.json`).

## Fonts (minh, decided 2026-10-03)

- **Rye**: logo and a few big decorative titles only; use sparingly.
- **Oswald**: headings, including the folder-tab ear labels (ABOUT, MENU, ORDER).
- **Be Vietnam Pro**: body text (dish descriptions, prices, forms); renders Vietnamese diacritics correctly.
- All three are free from Google Fonts, loaded with one `<link>` line in the HTML `<head>`.

## Home page layout idea (minh, 2026-10-01)

- Yellow background, "minh" logo centered at top, LOG IN link top right.
- Below: overlapping folder-style tabs stacked like file folders, each with a rounded "ear" label (About Us brown, View Our Menu pink, later Order). Colors yellow/pink/brown, retro.
- Week 1: look in CSS only (`border-radius`, `position`, `z-index`). Week 2: click a tab to bring it to the front with a little JavaScript.
- Phones: media query moves ears to the right side edge, panels still stacked, vertical labels via `writing-mode`; short labels (ABOUT, MENU, ORDER), narrow ears.
- Details: `docs/design-ideas.md` section 4.
- **Built 2026-10-02:** `public/index.html` + `public/css/style.css`, static (no JS yet). Exact colors picked: `--color-bg: #F2C14E` (poster yellow), `--color-pink: #CC6B73` (Menu tab, new — not in the earlier palettes), `--color-brown`/`--color-cream` reuse the branding palette above. Shows About + Menu sections stacked (no Order section yet); content (story, hours, 5 menu items) hardcoded from `docs/shop-profile.md` and `docs/menu.md` — will move to `config/shop.json`/`data/menu.json` in week 2.
- This is **idea 1**, kept on git branch `idea-1` (not merged; not chosen).

## Home page idea 2 — CHOSEN (merged into `main` 2026-10-03)

- Chosen design; built on branch `idea-2`, merged into `main`. Work on the front end continues on `main` from here.
- Loading screen: espresso background, still mustard logo, coffee beans falling behind (JS spawns them), fades out after load.
- Main page (from the user's sketch): seasonal-vibe photo as page background; big rounded cream card (max 1320px) with logo top center, LOG IN top right; bento grid of rounded tiles, each a link that scales up slightly on hover: **Menu** (L-shape, photo bg) → menu page; **Seasonal drink** (one photo cut into an L interlocking with Menu, all corners rounded; `main.js` computes the `clip-path`) → that drink's page; **Promo** (top right) → promotions page; **About minh** (bottom right) → about page.
- Photos: `public/images/backgrounds/` (Unsplash, credits in `CREDITS.md`), color-graded in CSS with one shared warm tint (`--grade`, `background-blend-mode: color`).
- Coffee bean art: `public/images/bean.svg`, retro poster style (flat colors, ink outline, halftone dots, off-register brick-red shadow). Used for loading screen, decor and cart button.
- Card background decor: beans scattered randomly; chosen by `<body data-decor="beans">` and the `DECOR` list in `main.js`, so seasonal sets (F1, maple leaves, snowflakes…) can be added later. Beans are the default.
- Cart: `public/js/cart.js`, on every page. Draggable coffee bean button (count badge only), fixed above everything, position remembered; opens a `<dialog>` bag (blurred backdrop). Lines show qty, customize chips with icons, an Edit button (reopens the drink window with current choices, Save keeps you in the bag), promo prices (full price struck through + faded), subtotal, GST 5% + QST 9.975%, total. Required pickup name + phone (10 digits) before Checkout; payment comes later. Stored in `localStorage` (`brewshift-cart`, `brewshift-pickup-name`, `brewshift-pickup-phone`).
- Menu page (`menu.html`, built 2026-10-04): a "canvas" — the drink side photos with backgrounds removed (`public/images/menu/cutout/*.png`, cut with macOS Vision) placed at hand-picked % spots (`spot` in `js/menu-data.js`), name/Vietnamese name/price beside each; hover scales up; phones get a zig-zag list. Clicking opens the drink window.
- Drink window (`js/drink-window.js`): left = side photo, ingredients, story; right = press-down boxes (radio buttons) for milk (none/condensed/fresh/almond +0.75/oat +0.75/coconut +0.50), sugar 0–100%, ice 0–100% (iced drinks only), note, quantity, Add to bag. Boxes matching the drink's `recipe` start pressed. Only a light dim behind it.
- Promo: Iced Coffee with Milk is "2 for 1" (`promo: {buy: 2, pay: 1}`; `lineTotal` in `js/options.js`). Home promo tile opens it with qty 2. Always on for now (the "weekdays 2–4 pm" check belongs on the server later).
- Every page's cream card is the same size: `--row-1`/`--row-2` on `.card` drive the home grid, the menu canvas and the About grid.
- Home tiles: Menu = espresso tile with a tilted polaroid of the menu (`images/backgrounds/menu-snapshot.jpg`, regenerate when the menu changes); seasonal = egg coffee top photo → `menu.html?drink=egg-coffee`; promo → `menu.html?drink=iced-milk-coffee&qty=2`; About → `about.html`.
- About page (`about.html`): random shop photo each visit, founding story + rain quote, Visit us (address, hours, phone, email, social buttons — links are placeholders), Where we're going.
- JS files: `decor.js` (every page), `home.js` (loading screen + L shapes), `options.js` (icons, milks, taxes, prices), `menu-data.js` (7 drinks), `cart.js`, `drink-window.js`, `menu.js`, `about.js`.
- An earlier list-style menu/drink-page experiment is kept in `git stash` (not used).

## Staff side (built 2026-10-04, front end only)

- `kiosk.html` (shared counter iPad, from the user's sketch): date + big live clock, "Employee code" with 6 display boxes (masked), a daily "weird question" A/B poll with tally marks. Correct code → welcome dialog ("Hi Linh, welcome in!…") → `staff.html`. Pending staff get an "awaiting approval" message. Wrong code just shows a message — no lockout (FR-34 removed by the user).
- `staff.html` (from sketch): name, status, today's shift, big Clock in / Clock out button; week view S–S with hours worked per day + scheduled shift, prev/next week; next 3 shifts; Download CSV (full hour log) and Print (this week). Shows only the signed-in person's data; Done or 2 idle minutes → back to kiosk. Who is signed in: `sessionStorage` `brewshift-staff-id`.
- Flow confirmed by the user: enter code → welcome → personal page → tap Clock in/out (spec v1.2 updated FR-30/31/33 to match).
- Data: `js/store.js` is a temporary localStorage store (`brewshift-db-v1`) with `users`, `punches`, `shifts` (schedule for ALL staff, filtered per person), `votes`; demo data built around today. Pages only call its functions (`findUserByPin`, `togglePunch`, `getShifts`, `getWorkSessions`…) so week 2 can swap in server calls. Demo PINs are plain text (123456 Linh, 246810 Bao, 111222 Mai pending) — the server must keep bcrypt hashes and use server time.
- Planned later: owner side to manage everyone's schedule (shifts), approve staff, weekly hours table, CSV export.
- Kiosk has an on-screen 0–9 keypad (+ Clear, ⌫) for the iPad; the six boxes are display-only so the iPad keyboard never opens. Upright iPad (≤1000px): clock, code + keypad, poll stacked.

## Manager side (built 2026-10-04, front end only)

- Manager code **111111** (Kim Vo, demo) on the kiosk → welcome → `dashboard.html`. Managers clock in/out from the dashboard chip. `js/admin.js` guards every manager page (non-managers go back to the kiosk; 5 idle minutes → kiosk).
- Dashboard (from the user's sketch, same cream card, hover zoom): two pairs of interlocking L tiles — Sales + Order log, Menu + Shifts — then Employees, Photos, Stock (split from Settings), Settings. L shapes come from `js/shapes.js` (`data-shape-grid` + `data-cut="cols rows"`), also used by the home page.
- `sales.html`: day/week/month, totals (before tax, taxes, orders, average, drinks, lost), bar chart by hour/day, top drinks, CSV report + print.
- `orders.html`: day/week/month log, status filter (received, in progress, ready, picked up, cancelled, not picked up, surplus), status editable, CSV + print.
- `menu-admin.html`: on menu / sold out today / sold out until turned back on / hidden; edit or add drinks (photos upload or from library, EN/FR names, Vietnamese name, price, label, 2-for-1 promo, default choices, ingredients, story). New drinks (no `spot`) appear in a grid below the menu canvas.
- `shifts.html`: weekly grid (morning/afternoon from opening hours), drag or tap-to-assign, free-time highlight, confirm to override availability or weekly limit, roster with hours vs limit, copy last week, week CSV, 2-week payroll CSV (actual punches), "Text schedules" opens the phone's Messages app per person (`sms:` link; real sending needs a paid SMS service).
- `employees.html`: active/pending/inactive/all; name, birth date/age, phone, email, 6-digit code (unique), staff/manager, part/full-time, local/international, status, weekly availability. Limits from Settings: international 24 h, part-time 30 h, full-time 40 h.
- `photos.html`: built-in photos + uploads (shrunk, stored in localStorage `brewshift-photos`; server later). `stock.html`: quantities with −/+, reorder level, "Low" badge, CSV. `settings.html`: shop info + hours + socials (About page), taxes (bag), hour limits, pay period start, seasonal/promo home tiles, loading time, decor, reset demo data.
- Data: `js/store.js` now uses `brewshift-db-v2` with users (with details), punches, shifts, menu (seeded from `MENU_SEED`), orders (45 days of demo orders), stock, settings. Checkout now saves a real order and shows its code. Manager strings live in `js/i18n-admin.js`.

- Idea noted, not built: walk-in counter orders (FR-45, Should) reusing menu + drink window + cart, same queue as online orders — only after all Must items.

## Menu (minh)

- Menu (updated 2026-10-04): 7 simple Vietnamese coffees, CAD 6–8: iced/hot black coffee, iced/hot milk coffee, orange coffee, coconut coffee, egg coffee. Full list in `docs/menu.md`; later becomes `data/menu.json`.
- Drink illustrations: an SVG set was tried on 2026-10-03, then removed.
- Drink photos (2026-10-04): real Unsplash photos in `public/images/menu/`, 2 per drink: `<drink>-top.jpg` (angled top-down, for the white menu canvas; click opens product info) and `<drink>-side.jpg` (side view). Names: iced-black-coffee, hot-black-coffee, iced-milk-coffee, hot-milk-coffee, orange-coffee, coconut-coffee, egg-coffee. Pre-graded in the file (warm faded retro, kept bright for product shots), credits in `CREDITS.md` there.

## Keeping this file up to date

- Whenever an important decision is made in a chat (a requirement, folder structure, tech stack, or how the user wants to work), update this file right away.
- Keep it a short summary of key points only. No chat transcripts, no long explanations.
- After updating, commit and push it yourself right away — no need to ask first.

## Keeping the journal up to date

`docs/project-journal.md` is a graded self-reflection document (it feeds the final report, including the AI collaboration log), so it must stay in the user's own voice — Claude does not write it end to end.

- After work happens in a session, Claude fills in only the **factual/technical** parts of the current day's entry: `Done`, `Commits`, `AI used`, and the first three columns of new `AI collaboration log` rows (`Date`, `What I asked`, `What the AI gave me`).
- Claude leaves `Learned` and the AI log's last column ("what I kept, changed or rejected, and why") blank (`_(fill in yourself)_`) for the user to write themselves — those are the parts meant to show the user's own understanding. The user fills these with just one short line each time, not a long write-up.
- Keep the whole journal in **one-liner style** per the template in the file: each field is a single line, semicolon-separated for multiple items, so 31 days of entries don't balloon.
- Like `CLAUDE.md`, Claude commits and pushes these factual journal updates itself, no confirmation needed.

## Current plan (Week 1)

1. Requirements (done: `docs/requirements-spec.md`).
2. Git and GitHub setup.
3. Rough HTML/CSS UI by the end of the week.
