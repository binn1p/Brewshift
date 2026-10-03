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

- UI in **English** first.
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
- This is **idea 1**, kept on git branch `idea-1` (not merged into `main`).

## Home page idea 2 (branch `idea-2`, 2026-10-03)

- Alternative design on branch `idea-2`; `main` holds docs only until one idea is picked.
- Loading screen: espresso background, still mustard logo, CSS coffee beans falling behind (JS spawns them), fades out after load.
- Main page (from the user's sketch): seasonal-vibe photo as page background; big rounded cream card with logo top center, LOG IN top right; bento grid of rounded tiles, each a link: **Menu** (tall left, photo bg) → menu page; **Seasonal drink** (L-shape interlocking with Menu, photo at bottom) → that drink's page; **Promo** (top right) → promotions page; **About minh** (bottom right) → about page.
- Photos: `public/images/backgrounds/` (Unsplash, credits in `CREDITS.md`).
- Planned next: menu page where each item has a quantity control to add straight to the cart; clicking an item opens its own product page (ingredients, inspiration) that can also add to cart; both open a customize pop-up with an X to go back to the menu; a draggable coffee-bean-shaped cart button with a bag icon on every page; About and Promo pages (designed later).
- Login: customers can log in for loyalty points; the owner logging in goes to an owner monitor/dashboard (later).

## Menu (minh)

- Menu (2026-10-01): 13 Vietnamese coffee drinks, prices in CAD (5–9). Full list in `docs/menu.md`; later becomes `data/menu.json`.

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
