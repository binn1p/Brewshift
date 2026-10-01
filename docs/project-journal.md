# Brewshift — Project Journal

**Course:** SOEN 287, Fall 2026
**Author:** binn1p
**Repository:** https://github.com/binn1p/Brewshift
**Period:** October 1 – October 31, 2026 (then buffer until the November 12 milestone)

This journal records, day by day, what was built, what was learned, and what got in the way. It is the human-readable companion to the Git commit history, and it feeds three parts of the final report: the overview, the limitations section, and the AI collaboration log.

---

## How to use this file

1. At the end of each work day, copy the **Daily entry template** below and paste it at the top of the **Entries** section (newest first).
2. Fill it in in 5 minutes. Short bullet points are fine. Write what is true, including what did not work.
3. If you used AI that day in a way that mattered (it wrote code you kept, explained a concept, or fixed an error), also add a row to the **AI collaboration log** at the bottom.
4. On the last day of each week, fill in the **Weekly summary** for that week.
5. Commit the journal with the rest of the day's work, for example:
   `git commit -m "docs: journal entry for Oct 2"`

---

## Daily entry template

```markdown
### Day N — <Weekday>, <Month> <Day>, 2026

**Time spent:** ~X h
**Goal for today:** <one sentence>

**Done**
- ...

**Learned**
- <concept>: <one-line explanation in my own words>

**Problems and how I solved them**
- Problem: ...
  Fix: ...

**Commits today**
- `<hash>` <message>

**AI used today:** yes / no (if yes, see AI log entry #N)

**Next step**
- ...
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

### Day 1 — Thursday, October 1, 2026

**Time spent:** ~1 h
**Goal for today:** Decide the requirements and set up Git and GitHub.

**Done**
- Read the course brief, the project scope, and my own proposal and pitch.
- Decided the main requirements (see `docs/requirements.md`):
  - The app is in English first. Vietnamese for the owner side and French come later.
  - The product is called **Brewshift**. The first café that uses it, and the one I demo, is called **minh**.
  - Customers order without an account: name and phone number only.
  - Staff register themselves, the owner approves them, and they clock in and out with a personal 6-digit PIN on an iPad at the counter.
  - Instead of a chart, the owner can export all orders and clock-ins as a CSV file.
  - After ordering, the customer sees a confirmation page with an order code and a live status.
- Decided the architecture: client-server. Front end in `public/`, Express server in `src/`, data as JSON files in `data/`, shop details in a config file, hosted on Render at the end.
- Configured Git on my Mac (`user.name`, `user.email`, default branch `main`).
- Created the public repository `binn1p/Brewshift` on GitHub and cloned it with VS Code.
- Made my first two commits: `README.md` and `.gitignore`.

**Learned**
- **Git** saves snapshots of my project (commits). **GitHub** keeps a copy online so others can see it.
- The cycle of a change: edit a file → `git add` (choose what goes in) → `git commit` (save locally with a message) → `git push` (send to GitHub).
- `.gitignore` lists files Git must never upload, like `node_modules/` (heavy libraries) and `.env` (secrets).
- **Client-server:** the browser (client) shows pages and sends requests; the server checks them, does the work, and saves data. The client should never be trusted with prices or times.
- **Product vs deployment:** Brewshift is the generic product. Each café gets its own copy of the app, and its name, hours and colours live in a config file instead of in the code.

**Problems and how I solved them**
- Problem: `git push` failed with `403 Permission to binn1p/Brewshift.git denied to binn1p`. The commit itself had worked; only the upload was blocked.
  Fix: my Mac had an old saved GitHub login without write access. I removed it with `git credential reject`, then pushed with the **Sync** button in VS Code, which signed me in again.

**Commits today**
- `e6fd504` docs: add README
- `ad09dc2` chore: add .gitignore
- `f461f42` docs: add project journal and requirements spec

**AI used today:** yes (see AI log entries #1 and #2)

**Next step**
- Learn what HTML is and write the first page: the **minh** shop page with its name, opening hours and 3 to 5 menu items with prices.

---

## Weekly summaries

### Week 1 (Oct 1 – Oct 7)

**What works now:**
**What I learned this week:**
**What was hardest:**
**What I would do differently:**
**Plan for week 2:**

---

## AI collaboration log

The final report must include 3 to 5 examples of how AI was used. Record them here as they happen, so nothing has to be remembered later. For each one, the important part is the last two columns: what I changed or checked myself, and why.

| # | Date | What I asked | What the AI gave me | What I kept, changed or rejected, and why |
|---|---|---|---|---|
| 1 | Oct 1 | Help turn my proposal and the course brief into a list of requirements and a 4-week plan. | A requirements summary, questions to decide, and a weekly plan. | I made the decisions myself (single café "minh", no customer accounts, PIN clock-in, CSV export instead of a chart). I dropped the multi-shop design from my original proposal, because the course only needs one deployed café. |
| 2 | Oct 1 | My `git push` failed with error 403. | An explanation of the error and the steps to clear the old saved login. | I ran the commands, understood that the commit had succeeded and only the push failed, and fixed it through VS Code. |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
