# Brewshift — Project Journal

**Course:** SOEN 287, Fall 2026
**Author:** binn1p
**Repository:** https://github.com/binn1p/Brewshift
**Period:** October 1 – October 31, 2026 (then buffer until the November 12 milestone)

This journal records, day by day, what was built, what was learned, and what got in the way. It is the human-readable companion to the Git commit history, and it feeds three parts of the final report: the overview, the limitations section, and the AI collaboration log.

---

## How to use this file

1. At the end of each work day, copy the **Daily entry template** below and paste it at the top of the **Entries** section (newest first).
2. Keep every field to **one line** — one-liners, semicolon-separated if there are several items. This keeps the journal from ballooning over 31 days.
3. Fill in `Learned` yourself, in your own words — Claude will fill in the factual/technical fields (`Done`, `Commits`, `AI used`) but leaves this one for you.
4. If you used AI that day in a way that mattered (it wrote code you kept, explained a concept, or fixed an error), also add a row to the **AI collaboration log** at the bottom — one-liners there too, except the last column (`what I kept/changed/rejected and why`), which stays yours to write.
5. On the last day of each week, fill in the **Weekly summary** for that week.
6. Commit the journal with the rest of the day's work, for example:
   `git commit -m "docs: journal entry for Oct 2"`

---

## Daily entry template

```markdown
### Day N — <Weekday>, <Month> <Day>, 2026 (~X h)

- **Goal:** <one sentence>
- **Done:** <item>; <item>; <item>
- **Learned:** <one-liner>; <one-liner>
- **Problem:** <issue> → <fix>
- **Commits:** `<hash>` <message>; `<hash>` <message>
- **AI used:** yes/no — <one-line what for> (log #N)
- **Next:** <one sentence>
```

---

## Progress overview

| Week | Dates | Theme | Status |
|---|---|---|---|
| 1 | Oct 1 – Oct 7 | Requirements, Git/GitHub, static HTML/CSS | Done |
| 2 | Oct 8 – Oct 14 | JavaScript DOM, Node + Express, menu and orders API | Done (ahead of schedule, see Day 5–6) |
| 3 | Oct 15 – Oct 21 | Authentication, roles, clock in/out | Done (ahead of schedule, see Day 6) |
| 4 | Oct 22 – Oct 31 | Owner dashboard, validation, security, deployment | In progress (deployed to Render; disk/security polish ongoing) |

---

## Entries

### Day 7 — Wednesday, October 7, 2026 (~_ h, in progress)

- **Goal:** Fix what broke on the live Render site, write it down, and add two small staff requests.
- **Done:** Wrote `docs/test-cases.md` (about 90 test cases across the whole app) and `docs/known-issues.md`; owner can now clock a staff member in or out at a chosen time, not only "right now", for someone who forgot; a small banner shows on every shop screen (not the customer-facing ones) when a new order comes in, and tapping it opens Orders — asking for the kiosk code first if nobody is signed in yet.
- **Learned:** _(fill in yourself)_
- **Problem:** Render's free plan has no persistent disk, so staff accounts and orders are lost every time the site redeploys or wakes up from sleep → documented in `docs/known-issues.md` and the README; fixing it for real needs a paid disk, which is my call to make.
- **Commits:** `bfeec32` feat: owner can set the exact punch time; new-order banner on every shop screen
- **AI used:** yes — attendance box with a time picker, the public "new orders since X" check, and the banner shown everywhere except the customer pages (log #18)
- **Next:** Decide about a Render persistent disk, check that data survives a restart (A-5), keep testing the live site with `docs/test-cases.md`.

### Day 6 — Tuesday, October 6, 2026 (~_ h)

- **Goal:** Turn every remaining front-end page into something that actually talks to a server, then put it online.
- **Done:** Built essentially the whole back end this day — café config, atomic JSON storage, the menu API; online orders priced and checked server-side with a live status that updates by itself; an automated test suite (`npm test`, grew to 133 tests by day's end); staff registration/approval with bcrypt passwords and PINs and real sessions; kiosk PIN login and clock in/out wired to the server; the order queue, CSV exports, and owner edits/deletes on orders with a change history; menu management (add/edit drinks, sold out, uploaded photos) and shop settings moved off the browser and onto the server; member accounts with points, spent at the counter and earned when an online order is picked up; work shifts (plan, edit, copy last week) and staff details/stock/photo library also moved to the server; deployed the whole thing to Render, with a `RESET_OWNER` escape hatch for when I lost track of my own PIN.
- **Learned:** _(fill in yourself)_
- **Problem:** Several things only showed up once I started clicking around the live site → fixed each: the kiosk's "wrong code" message never appeared because of an undefined variable; logging in as one role (staff vs. member) was silently signing the other one out, because the server was replacing the whole session; the shift planner let me schedule myself (the owner) like a staff member and the server rejected it, so the roster now only lists staff; a leftover "Fall special" label stayed stuck on Egg Coffee after I started choosing the seasonal drink in Settings, fixed with a one-time cleanup on server start.
- **Commits:** `e6e759f` feat: shop settings from config/shop.json, served at /api/shop; `ba28f83` feat: JSON storage with atomic writes, menu data and GET /api/menu; `5cd44af` feat: place and look up orders on the server, with a dev check page; `fda15f8` feat: send online checkout to the server, keep the order code from it; `dbf882c` test: automated tests for the order API, npm test; `7a8709f` feat: live order status on the confirmation page; `aa4a03e` docs: journal reflections for Oct 4; `3a4f2ef` feat: staff registration, bcrypt login, sessions and owner approval; `1d18622` feat: kiosk PIN login, clock in/out with server time, own weekly hours; `5f74330` feat: order queue, owner order list and hours, CSV exports, deactivate staff; `88cc87d` feat: owner can correct punches and manage the menu on the server; `18a37ce` feat: work schedule on the server (owner plans, staff see their own); `a0f49d8` feat: kiosk and staff page use the server (PIN login, clock in/out, hours, shifts); `5177c25` fix: kiosk shake used an undefined variable, so wrong PIN messages never showed; `37c5a3a` feat: menu, photos and home tile choices use the server; `4ecdd5a` feat: shop settings are saved on the server and shared by every page; `3e87451` feat: order queue uses the server (start, ready, finish, options shown); `7beb802` feat: member accounts and points on the server; counter orders use them; `8bb4619` feat: member login, account page, counter checkout and order status use the server; `f31a0aa` docs: README with setup, configuration, data, tests and deployment plan; `6500d9f` feat: work shifts use the server (staff list, plan, change, delete, copy last week); `1a7b293` feat: order pages use the server (log, reports, counter today, edits, deletes, history); `e60802a` feat: staff details, stock and photo library use the server; `77eae0f` feat: production-ready start: trust Render's proxy, copy the starting menu to the data folder; `6492944` docs: record the live Render address and how it is run; `8d4f290` docs: README records the live Render address; `2faa433` feat: RESET_OWNER replaces the owner's PIN and password from the environment; `9a28b41` fix: shift roster lists staff only; manager pages check the session on open; `3379ca5` docs: test cases for the live site; `25e2e8f` docs: note known issue with the seasonal drink setting; `e31f89b` docs: correct the seasonal tag known issue; `4d10e9e` fix: seasonal label follows the Settings choice; promo tile follows the 2-for-1 drinks; `144abde` docs: note the Fall special label to remove from the live menu; `52627ec` docs: known issues updated after the seasonal label fix; `6967cc7` fix: remove the old Fall special label on start; owner sees who is clocked in
- **AI used:** yes — basically the entire back end and the Render deployment this day (log #14–#17)
- **Next:** Deploy to Render, pick a database for sessions/disk, and keep fixing whatever breaks on the live site.

### Day 5 — Monday, October 5, 2026 (~_ h)

- **Goal:** Start the actual server: something that runs and serves the pages.
- **Done:** Node.js + Express skeleton with a `/api/health` check, serving everything in `public/`; updated the plan in `CLAUDE.md` to tuần 2 (server-side ordering) now that the front end was far enough along.
- **Learned:** _(fill in yourself)_
- **Problem:** None worth noting.
- **Commits:** `bd2c2b7` feat: express server skeleton with health check; `fa97fc3` docs: update current plan to week 2 (server ordering)
- **AI used:** yes — server skeleton and updating the week plan (log #13)
- **Next:** Read the café's settings from a config file, then serve the menu from the server instead of the browser.

### Day 4 — Sunday, October 4, 2026 (~_ h)

- **Goal:** Finish the customer side of the front end.
- **Done:** Cut the menu to 7 drinks and added real drink photos; removed drink backgrounds with macOS Vision; built the canvas menu page from my sketch (drinks at chosen spots, hover zoom, phone zig-zag); drink window with photo/ingredients/story and press-down customize boxes with icons (milk, sugar %, ice %, note, quantity); 2-for-1 promo with struck-through prices; bag with icon chips, Edit, subtotal + GST/QST + total, required pickup name and phone; menu snapshot polaroid on the home Menu tile; egg coffee on the seasonal tile; About page; all cards the same size; split JS into small files; staff kiosk from my sketch (clock, 6-digit code, welcome, daily A/B poll with tallies) and staff page (clock in/out, week hours, next shifts, CSV + print) on a temporary localStorage data store; dropped the wrong-PIN lockout (FR-34).
- **Learned:** _(Server backbone)_
- **Problem:** A photo URL set from JS inside a CSS variable loaded from the wrong folder → used a full URL built with `new URL(...)`; menu snapshot text clashed with the tile title → showed it as a small tilted polaroid instead.
- **Commits:** `8ba36ea` docs: cut menu to 7 drinks; `28b286c` feat: egg coffee as the seasonal tile, 7-drink menu copy; `e30c359` docs: note menu photos, fill in my journal reflections; `d9488a5` feat: add menu drink photos; `193e873` feat: canvas menu, drink window with customize and edit, promo, taxed cart with pickup name and phone, about page; `1630681` feat: staff kiosk with PIN, welcome and daily poll; staff page with clock in/out, week hours, next shifts, CSV and print
- **AI used:** yes — background removal script, canvas menu, drink window, cart edit/tax/pickup form, About page, kiosk + staff page + data store (log #9–#12)
- **Next:** Owner side (approve staff, everyone's schedule, weekly hours, CSV), then the Node + Express back end.

### Day 3 — Saturday, October 3, 2026 (~_ h)

- **Goal:** Start a second home page design (idea 2) on its own branch, beginning with a loading screen.
- **Done:** Created branch `idea-2` from `main`; built a loading screen (espresso background, mustard minh logo with a pulse, 24 CSS coffee beans falling via `@keyframes`, fades out after page load, min 1.8 s, beans hidden for reduced-motion users); placeholder home page in Cộng-style Oswald/Be Vietnam Pro on cream; logo made still; home page from my sketch (CSS Grid bento, Menu + seasonal drink as interlocking L shapes cut with JS `clip-path`, hover scale, Unsplash photos color-graded in CSS); random coffee-bean decor (seasonal sets later); draggable coffee-bean cart button on every page opening a `<dialog>` cart window (localStorage); redrew the bean as a retro poster-style SVG.
- **Learned:** _dynamic grid-shape_
- **Problem:** Page loads too fast for the loading screen to be seen → added a minimum display time (`MIN_SHOW_MS`); hover brightness turned the L-shape's cream ring white → replaced the two-piece L with one `clip-path` shape.
- **Commits:** `28d7f03` feat: idea 2 loading screen (logo + falling coffee beans); `ee9d80a` feat: keep minh logo still on loading screen; `2169f66` feat: idea 2 home page with L-shaped tiles, bean decor and draggable cart (all on branch `idea-2`); `78c082e` docs: journal entry for Oct 3; `392d303` docs: record font decision; `5da5cd8` docs: record home page idea 2 plan
- **AI used:** yes — loading screen, home page layout from sketch, cart button/window, bean SVG (log #6–#8)
- **Next:** Menu page with quantity controls that add to the cart.

### Day 1 — Thursday, October 1, 2026 (~1 h)

- **Goal:** Decide the requirements and set up Git and GitHub.
- **Done:** Read course brief/proposal; decided requirements (see `docs/requirements-spec.md` — English UI first, no customer accounts, PIN clock-in, CSV export instead of a chart, order code + live status); decided client-server architecture (`public/`, `src/`, `data/`, config file, hosted on Render); set up Git + GitHub repo `binn1p/Brewshift`; added `CLAUDE.md` and tuned Claude's commit/push rules (auto for `CLAUDE.md` and `docs/`, ask first for everything else) and journal auto-fill rules; wrote `docs/design.md` (minh color palette) and `docs/design-ideas.md` (Myriade loading screen, Cộng Cà Phê vibe/fonts, % Arabica minimal layout, reference sites); reworked the journal into one-liner style.
- **Learned:** _ git/GitHub basics — see commit history for what was covered
- **Problem:** `git push` failed with 403 (stale saved GitHub login) → cleared it with `git credential reject`, re-signed in via VS Code Sync.
- **Commits:** `e6fd504` docs: add README; `ad09dc2` chore: add .gitignore; `f461f42` docs: add project journal and requirements spec; `bf7bef5` docs: fill in day 1 commits; `b9b5889` docs: add CLAUDE.md; `3c86e3d` docs: let Claude auto-commit CLAUDE.md changes; `6cd0e9a` docs: add color palette for minh branding; `0d55e17` docs: translate design ideas to English; `70f33ac` docs: add % Arabica minimal image-heavy idea; `918ceb6` docs: add journal auto-update rule; `0733f24` docs: auto-commit journal facts; fill in day 1 journal; `22a6f7f` docs: condense journal and AI log to one-liner style; `a36c2fc` docs: auto-commit all docs/ changes, note one-line fill-in
- **AI used:** yes — requirements planning, git 403 fix, design palette/ideas docs (log #1–#5)
- **Next:** Learn HTML and write the first page: the **minh** shop page with name, hours, and 3–5 menu items with prices.

---

## Weekly summaries

### Week 1 (Oct 1 – Oct 7)

**What works now:** Github/Git
**What I learned this week:**Github/Git
**What was hardest:**Setting Github to work automaticaly
**What I would do differently:**Have a more systematic naming style
**Plan for week 2:**Responsive and more logic work between webs

---

## AI collaboration log

The final report must include 3 to 5 examples of how AI was used. Record them here as they happen, so nothing has to be remembered later. Keep each cell to one line; the last column (what I changed or checked myself, and why) is the important one and stays in my own words.

| # | Date | What I asked | What the AI gave me | What I kept, changed or rejected, and why |
|---|---|---|---|---|
| 1 | Oct 1 | Turn proposal + course brief into requirements and a 4-week plan. | Requirements summary, open questions, weekly plan. | to be more like real-life project |
| 2 | Oct 1 | `git push` failed with error 403. | Explained the cause, steps to clear the stale login. | fix error while setting up Git/Github |
| 3 | Oct 1 | Save a 4-color palette (screenshot) for later design use. | `docs/design.md` with hex/RGB, suggested use per color, CSS variables example. | Go with warm-vibe retro |
| 4 | Oct 1 | Rewrite `docs/design-ideas.md` in English. | Full English translation, same content. | Easier to read |
| 5 | Oct 1 | Is high-quality photos alone enough for a % Arabica-style minimal homepage? Add that idea to the design doc. | Checked arabica.com, explained compression/responsive images/color grading also matter, added a "% Arabica" section. | Getting ideas |
| 6 | Oct 3 | Make branch idea 2, starting with a dark loading screen with the logo and falling coffee beans. | `idea-2` branch with preloader HTML, CSS bean shapes/animations, JS that spawns random beans and fades the screen out. | decided to go with this one idea |
| 7 | Oct 3 | Build the home page from my hand-drawn sketch (bento tiles, L-shaped seasonal tile, photos), then make the L one photo, round all corners, add hover zoom and match photo colors. | CSS Grid layout, JS that computes a rounded L `clip-path` from the grid sizes, shared CSS color-grade layer. | trying different dynamic shape |
| 8 | Oct 3 | Add coffee-bean decor, a draggable coffee-bean cart button on every page that opens a cart window, and make the bean look retro. | `cart.js` (drag vs click, saved position, `<dialog>` with blurred backdrop, localStorage cart), `DECOR` list for seasonal decor, retro `bean.svg`. | make one element that exist in all page |
| 9 | Oct 4 | Turn my canvas sketch into a menu page using the side photos with the backgrounds removed. | Swift script using macOS Vision to cut out the drinks; menu page placing them at % spots with names/prices; phone zig-zag layout. | Hover box|
| 10 | Oct 4 | Click a drink → window with photo, ingredients, story and press-down customize boxes with icons; 2-for-1 promo; bag with chips, edit, taxes. | `drink-window.js`, `options.js` (icons, milk prices, GST/QST, `lineTotal`), updated `cart.js`. | _a tag_ |
| 11 | Oct 4 | Menu snapshot on the home page, About page in the same card size, required pickup name + phone in the bag. | Polaroid snapshot tile, `about.html` with random shop photo, name/phone form with validation. |  |
| 12 | Oct 4 | Build the staff kiosk and staff page from my two sketches, and a way to store staff, hours and everyone's schedule. | `kiosk.html`/`kiosk.js` (clock, PIN boxes, welcome, poll), `staff.html`/`staff.js` (punch button, week hours, next shifts, CSV/print), `store.js` data store shaped like the future `data/*.json`. | 
| 13 | Oct 5 | Build the server from scratch: Express skeleton, then config, atomic storage and the menu/orders APIs with tests. | Full Node/Express back end, JSON storage with atomic writes, `npm test` suite, a dev check page at `/dev`. | |
| 14 | Oct 6 | Add staff login (bcrypt, sessions), kiosk PIN, clock in/out, and the order queue/counter orders — all on the server. | Auth/session/role middleware, kiosk and punches routes, queue and counter-order routes with points and cash/change, each with tests. | |
| 15 | Oct 6 | Move menu management, shop settings, member accounts/points, shifts, employees, stock and photos off the browser and onto the server. | New routes and validation for each, plus a `syncX()` bridge in `api.js` that copies server data into the existing browser store so the old pages kept working. | |
| 16 | Oct 6 | Deploy to Render and fix what broke there: kiosk did nothing on a wrong PIN, logging in as one role signed the other one out, shift planning failed for my own (owner) account. | Found each root cause (undefined variable, session being replaced on login, owner listed like staff) and fixed them, with tests. | |
| 17 | Oct 6–7 | Explain Render vs. Vercel for this app, walk through the Render setup fields, and add a way to reset the owner's PIN after I lost track of it. | Step-by-step Render guide and a `RESET_OWNER` start-up option that replaces the owner's PIN/password from the environment once. | |
| 18 | Oct 7 | Let me clock someone in/out at a chosen time, and add a new-order banner on every shop screen that jumps to Orders (asking for the kiosk code first if needed). | Attendance box with a time picker, a public "new orders since X" check, and a banner shown everywhere except the customer pages. | |
