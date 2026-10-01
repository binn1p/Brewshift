# CLAUDE.md

Context for Claude Code working in this repository.

## Project

Brewshift is the SOEN 287 (Web Programming, Fall 2026) course project: a full web app (front end + back end) built October 1 to 31, 2026, while the author learns web development week by week.

It is a **generic café management product**: online pickup ordering plus a staff time clock. It is demoed as one deployed café named exactly **minh** (lowercase, one word), whose name, hours and branding come from a config file.

- Full requirements: `docs/requirements-spec.md`
- Daily journal: `docs/project-journal.md` (filled in each evening)
- GitHub: https://github.com/binn1p/Brewshift

## How to work with the user

- The user is a **complete beginner**. Reply in **Vietnamese**, go slowly, explain simply, and define every technical term.
- Teach rather than just do: explain what each step does and why.
- The user is on a **Mac** (zsh terminal).
- Claude **may run `git commit` and `git push`** on the user's behalf, but must always show what will be committed/pushed and get a quick confirmation first (the commit history is graded, so the user wants to approve each one, not type them by hand).
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

## Keeping this file up to date

- Whenever an important decision is made in a chat (a requirement, folder structure, tech stack, or how the user wants to work), update this file right away.
- Keep it a short summary of key points only. No chat transcripts, no long explanations.
- After updating, show the user the diff and ask to confirm, then commit and push it yourself.

## Current plan (Week 1)

1. Requirements (done: `docs/requirements-spec.md`).
2. Git and GitHub setup.
3. Rough HTML/CSS UI by the end of the week.
