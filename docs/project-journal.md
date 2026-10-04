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
| 1 | Oct 1 – Oct 7 | Requirements, Git/GitHub, static HTML/CSS | In progress |
| 2 | Oct 8 – Oct 14 | JavaScript DOM, Node + Express, menu and orders API | Not started |
| 3 | Oct 15 – Oct 21 | Authentication, roles, clock in/out | Not started |
| 4 | Oct 22 – Oct 31 | Owner dashboard, validation, security, deployment | Not started |

---

## Entries

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
