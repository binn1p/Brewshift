# Brewshift — Software Requirements Specification

| | |
|---|---|
| **Product** | Brewshift: online pickup ordering and staff time clock for small cafés |
| **First deployment** | minh (café, Montreal) |
| **Course** | SOEN 287 — Web Programming, Fall 2026 |
| **Author** | binn1p |
| **Version** | 1.0 |
| **Date** | October 1, 2026 |
| **Status** | Approved baseline |

### Revision history

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-10-01 | binn1p | Initial baseline from the approved proposal and the requirement decisions of Oct 1. |
| 1.1 | 2026-10-04 | binn1p | Removed FR-34 (kiosk lockout after wrong PINs). |
| 1.2 | 2026-10-04 | binn1p | Kiosk flow: PIN → welcome → personal staff page with a Clock in/out button (FR-30, FR-31, FR-33). |
| 1.3 | 2026-10-04 | binn1p | Added FR-45 (walk-in counter orders, Should); FR-30 now an on-screen 0–9 keypad. |
| 1.4 | 2026-10-04 | binn1p | English/French switch on every page (English by default); French removed from out of scope. |
| 1.5 | 2026-10-04 | binn1p | Front end for the manager side built from the user's sketch: managers sign in with their code on the kiosk; dashboard with sales (day/week/month + report), order log, menu manager (sold out, add/edit drinks), weekly shift builder with availability and hour-limit warnings, employees, photos, stock and settings. "Owner" in this document means any approved user with the manager role. Server-side rules (FR-15, FR-23, FR-32, FR-58) still to be done in weeks 2–4. |
| 1.6 | 2026-10-04 | binn1p | Vietnamese (VI) added to the kiosk, staff page and all manager pages; kiosk questions editable in Settings. |
| 1.7 | 2026-10-04 | binn1p | FR-45 built as a front end: after the PIN, a start page offers clock in/out, counter orders and (managers) the dashboard. Counter orders record who took them and cash/card payment; bill and receipt printing (browser print as a stand-in). Only managers edit or delete sent orders, and every change is kept in the order log. Refunds and card processing (Stripe) remain out of scope for now. |
| 1.8 | 2026-10-04 | binn1p | Cash keypad with change at the counter; current-orders board for all staff (Start → Ready → Finish, sorted by pickup time or arrival); optional pickup time on online orders; optional member accounts with points (earn per drink, spend at the counter, values set in Settings), account page with live order status and history. |
| 1.9 | 2026-10-07 | binn1p | Added FR-19a: customers may optionally pay online by card (Stripe Checkout, test mode) instead of at pickup. Payment at the counter remains the default and does not require this. A-1 and the "Online payment" out-of-scope row updated to match; no real charges are processed (test-mode Stripe keys only). |

---

## 1. Introduction

### 1.1 Purpose

This document specifies what Brewshift must do and the qualities it must have. It is the reference for design, implementation, testing and the final demo. Any change to scope is recorded in the revision history above.

### 1.2 Product scope

Small cafés take pickup orders by phone or at the counter and track staff hours on paper. Brewshift replaces both with one web application:

- **Customers** browse the menu, build an order, and place it for pickup without creating an account.
- **Staff** clock in and out with a personal PIN on a shared counter tablet, see their own hours, and work through the order queue.
- **The owner** manages the menu and staff, sees all orders and hours, is warned when someone approaches an hours limit, and exports the data for analysis.

Brewshift is a **generic product**. Each café runs its own deployment, with its name, hours and branding read from a configuration file. The café **minh** is the first deployment and the one demonstrated for the course.

### 1.3 Definitions and acronyms

| Term | Meaning |
|---|---|
| Owner | The café's manager. One per deployment. Full access. |
| Staff | An employee approved by the owner. |
| Customer | A member of the public placing a pickup order. Has no account. |
| Punch | A single clock-in or clock-out event recorded by the server. |
| Kiosk | The shared tablet at the counter used for clocking in and out. |
| Order code | A short random code identifying one order, given to the customer. |
| Deployment | One running copy of Brewshift for one café, with its own data. |
| CRUD | Create, Read, Update, Delete. |
| CSV | Comma-separated values: a plain table file that opens in Excel or Google Sheets. |
| XSS | Cross-site scripting: an attack where user-entered text runs as code in another user's browser. |
| MoSCoW | Priority scale: **Must**, **Should**, **Could**, **Won't (this version)**. |

### 1.4 References

1. SOEN 287 Fall 2026 Course Project brief (`CourseProject2026.pdf`)
2. SOEN 287 Project Scope (`SOEN287_Project_Scope.pdf`)
3. Brewshift Proposal and Pitch (approved September 24, 2026)
4. Brewshift architecture diagram (project artifact, October 1, 2026)

---

## 2. Overall description

### 2.1 Product perspective

Brewshift is a standalone client-server web application.

```
 Browser (customer, staff, owner, kiosk)
        │  HTML / CSS / JavaScript from public/
        │  fetch('/api/...')  ⇄  JSON
        ▼
 Express server (src/)
   ├─ routes          menu, orders, auth, punches, staff, export
   ├─ middleware      requireLogin, requireRole, validation
   └─ storage layer   atomic read/write of JSON files
        ▼
 data/*.json  +  config/shop.json
```

### 2.2 User classes

| User class | How they access | Account | Technical skill |
|---|---|---|---|
| Customer | Phone or computer, public shop page | None (name + phone per order) | Any |
| Staff | Kiosk for punches; own login for the staff page | Self-registered, owner-approved | Basic |
| Owner | Computer or tablet | Created at setup | Basic |

### 2.3 Operating environment

- Current versions of Chrome, Safari and Firefox on desktop and mobile; Safari on iPad for the kiosk.
- Server: Node.js (LTS) with Express, hosted on Render.
- Storage: JSON files on the server's disk. No SQL database (course constraint).

### 2.4 Constraints

| ID | Constraint | Source |
|---|---|---|
| C-1 | Data is stored in JSON files only; no SQL database. | Course brief |
| C-2 | Back end in Node.js; front end in HTML, CSS and vanilla JavaScript. | Proposal |
| C-3 | Passwords must be hashed (bcrypt). | Course brief |
| C-4 | Authentication uses server sessions (`express-session`). | Course brief, proposal |
| C-5 | The application must be deployed online and reachable by URL. | Course scope |
| C-6 | No secrets in source code; configuration through environment variables. | Course brief |
| C-7 | Commit history must show steady, incremental work; release tagged `final`. | Course brief |

### 2.5 Assumptions and dependencies

| ID | Assumption |
|---|---|
| A-1 | Payment happens in person at pickup by default; Brewshift does not store card numbers. Since v1.9, a customer may optionally pay online by card through Stripe Checkout (test mode), which keeps card handling off our server entirely. |
| A-2 | Each deployment serves exactly one café, so data needs no shop identifier. |
| A-3 | Staff PINs are unique within a deployment, so a PIN alone identifies the person at the kiosk. |
| A-4 | Times are stored in UTC and displayed in the café's time zone from `config/shop.json` (America/Toronto for minh). |
| A-5 | The hosting plan keeps files written to disk between restarts. To be verified in week 4. |

---

## 3. Functional requirements

Priority uses MoSCoW. "Week" is the planned delivery week.

### 3.1 Shop configuration

| ID | Requirement | Priority | Week |
|---|---|---|---|
| FR-01 | The system shall read the café's name, address, opening hours, time zone and colours from `config/shop.json`. No café-specific value is written in the code. | Must | 2 |
| FR-02 | The public pages shall display the café name and opening hours from the configuration. | Must | 2 |

### 3.2 Menu and ordering (customer, no login)

| ID | Requirement | Priority | Week |
|---|---|---|---|
| FR-10 | The public shop page shall list available menu items with name, description and price. | Must | 1–2 |
| FR-11 | The customer shall be able to add items to a cart, change quantities and remove items. | Must | 2 |
| FR-12 | The cart total shall update immediately in the page whenever the cart changes. | Must | 2 |
| FR-13 | To place an order the customer shall enter a name and a phone number; an optional note is allowed. | Must | 2 |
| FR-14 | The customer could choose a requested pickup time within opening hours. | Could | 2 |
| FR-15 | The server shall compute the order total from its own menu prices and ignore any price sent by the browser. | Must | 2 |
| FR-16 | The server shall reject an order that is empty, contains unknown or unavailable items, or has invalid quantities. | Must | 2 |
| FR-17 | After a successful order, the customer shall see a confirmation page with the order code, items, total and current status. | Must | 2 |
| FR-18 | The confirmation page shall refresh the order status automatically (received → in progress → ready). | Must | 4 |
| FR-19 | The order status page shall show the status and items only, never the customer's phone number. | Must | 2 |
| FR-19a | The customer could pay online by card at checkout, through Stripe Checkout, instead of paying at pickup. Pay at pickup remains the default and needs no payment service. The server never stores a card number. | Could | 4 |

### 3.3 Accounts and authentication (staff and owner)

| ID | Requirement | Priority | Week |
|---|---|---|---|
| FR-20 | A new staff member shall be able to register with name, email, password and a 6-digit PIN. | Must | 3 |
| FR-21 | A new registration shall have status **pending** and shall not be able to log in or clock in until the owner approves it. | Must | 3 |
| FR-22 | Staff and owner shall log in with email and password and log out explicitly. | Must | 3 |
| FR-23 | Passwords and PINs shall be stored only as bcrypt hashes. | Must | 3 |
| FR-24 | The system shall reject a registration whose PIN is already used by another staff member. | Must | 3 |
| FR-25 | The owner account shall be created at setup from environment variables or a setup script, not through public registration. | Must | 3 |

### 3.4 Time clock (kiosk)

| ID | Requirement | Priority | Week |
|---|---|---|---|
| FR-30 | The kiosk page shall offer an on-screen 0–9 keypad (with delete and clear) and six boxes showing the digits entered, for a 6-digit PIN. | Must | 3 |
| FR-31 | A valid PIN of an approved staff member shall show a welcome message and open that person's staff page, where one button records a clock-in if they are clocked out, or a clock-out if they are clocked in. | Must | 3 |
| FR-32 | The time of every punch shall come from the server clock; any time sent by the browser is ignored. | Must | 3 |
| FR-33 | The staff page shall confirm each punch with the action and the time. | Must | 3 |
| ~~FR-34~~ | ~~After 5 consecutive wrong PINs, the kiosk shall refuse PIN entry for 5 minutes.~~ Removed 2026-10-04: a wrong PIN only shows a message. | — | — |

### 3.5 Staff page (login as staff)

| ID | Requirement | Priority | Week |
|---|---|---|---|
| FR-40 | A staff member shall see their own punches and their total hours for the current week. | Must | 3 |
| FR-41 | A staff member shall not be able to view, create, edit or delete another person's punches. | Must | 3 |
| FR-42 | A staff member shall see the queue of open orders, oldest first. | Must | 4 |
| FR-43 | A staff member shall be able to move an order from received to in progress to ready. | Must | 4 |
| FR-44 | The order queue shall refresh automatically without reloading the page. | Should | 4 |
| FR-45 | Staff should be able to take a walk-in order at the counter by reusing the menu, drink window and cart on the iPad, entering the customer's name; the order joins the same queue as online orders. To do only after all Must items are done. | Should | 4+ |

### 3.6 Owner dashboard (login as owner)

| ID | Requirement | Priority | Week |
|---|---|---|---|
| FR-50 | The owner shall be able to create, view, edit and delete menu items, and mark an item unavailable. | Must | 4 |
| FR-51 | The owner shall see pending staff registrations and approve or reject each one. | Must | 3 |
| FR-52 | The owner shall be able to deactivate a staff member, which immediately blocks their login and PIN. | Should | 4 |
| FR-53 | The owner shall see all orders, filterable by date and status. | Must | 4 |
| FR-54 | The owner shall see a weekly hours table for all staff. | Must | 4 |
| FR-55 | In that table, a staff member's weekly total shall be highlighted at **24 hours or more** (student work limit) and highlighted more strongly at **40 hours or more** (overtime). | Must | 4 |
| FR-56 | The owner shall be able to correct a punch (for example a forgotten clock-out). The original value and the correction time shall be kept. | Should | 4 |
| FR-57 | The owner shall be able to export all orders, and separately all punches, as CSV files for a chosen date range. | Must | 4 |
| FR-58 | Only the owner shall be able to use the export. | Must | 4 |

---

## 4. Non-functional requirements

### 4.1 Security

| ID | Requirement |
|---|---|
| NFR-S1 | Every API route that reads or changes private data shall check the session and the role on the server (`requireLogin`, `requireRole`). |
| NFR-S2 | Every form shall be validated on the server: required fields, types, lengths, and allowed values. Client-side validation is for convenience only. |
| NFR-S3 | Text entered by users (names, notes, menu items) shall be displayed with `textContent` or escaped, never inserted as HTML, to prevent XSS. |
| NFR-S4 | The session secret and owner credentials shall come from environment variables. `.env` is listed in `.gitignore`; `.env.example` documents the variable names only. |
| NFR-S5 | Session cookies shall be `httpOnly`, `sameSite=lax`, and `secure` in production. |
| NFR-S6 | Order codes shall be random and hard to guess, so one customer cannot look up other orders by trying nearby codes. |
| NFR-S7 | Debug output and stack traces shall not be shown to users in production. |

### 4.2 Reliability

| ID | Requirement |
|---|---|
| NFR-R1 | The server shall not crash on missing, malformed or unexpected input; it returns a clear error with an appropriate HTTP status code (400, 401, 403, 404). |
| NFR-R2 | JSON files shall be written atomically (write to a temporary file, then rename) so a crash cannot leave a half-written file. |

### 4.3 Usability and accessibility

| ID | Requirement |
|---|---|
| NFR-U1 | Pages shall be responsive and designed mobile-first; the shop page and kiosk are fully usable on a phone and an iPad. |
| NFR-U2 | HTML shall be semantic (`header`, `nav`, `main`, `section`, `footer`) and pass the W3C validator without errors. |
| NFR-U3 | Every form input shall have an associated `<label>`. |
| NFR-U4 | Error messages shall be shown next to the relevant field in plain language. |
| NFR-U5 | The interface language is English. All interface text shall be kept in one place per page so it can be translated later. |

### 4.4 Maintainability

| ID | Requirement |
|---|---|
| NFR-M1 | Code is organised by responsibility: `public/` (front end), `src/routes`, `src/middleware`, `src/lib` (storage), `data/`, `config/`. |
| NFR-M2 | The README explains how to install, configure and run the project locally. |
| NFR-M3 | Real data files are excluded from Git; only seed (sample) data is committed. |

### 4.5 Performance

| ID | Requirement |
|---|---|
| NFR-P1 | With seed data, each page shall load and become usable within 2 seconds on a typical broadband connection. |

---

## 5. Data model

All files live in `data/` and contain a JSON array. IDs are generated by the server.

**`users.json`**
```json
{ "id": "u_8f3k", "name": "Linh Tran", "email": "linh@example.com",
  "passwordHash": "$2b$10$...", "pinHash": "$2b$10$...",
  "role": "staff", "status": "approved", "createdAt": "2026-10-15T14:02:00Z" }
```
`role`: `owner` | `staff`. `status`: `pending` | `approved` | `rejected` | `inactive`.

**`menu.json`**
```json
{ "id": "m_01", "name": "Cà phê sữa đá", "description": "Vietnamese iced coffee with condensed milk",
  "priceCents": 550, "category": "Coffee", "available": true }
```
Prices are stored in cents to avoid rounding errors.

**`orders.json`**
```json
{ "id": "o_x7q2", "code": "K7Q2M", "customerName": "Alex", "phone": "5145550123",
  "items": [ { "menuItemId": "m_01", "name": "Cà phê sữa đá", "quantity": 2, "unitPriceCents": 550 } ],
  "totalCents": 1100, "note": "less ice", "pickupTime": null,
  "status": "received", "createdAt": "2026-10-10T13:20:00Z" }
```
`status`: `received` | `in_progress` | `ready`. Item names and prices are copied into the order so later menu changes do not alter past orders.

**`punches.json`**
```json
{ "id": "p_91a", "userId": "u_8f3k", "type": "in", "at": "2026-10-16T12:00:05Z",
  "correctedBy": null, "originalAt": null }
```

**`config/shop.json`**
```json
{ "name": "minh", "address": "Montreal, QC", "timeZone": "America/Toronto",
  "hours": { "mon": ["07:00", "17:00"], "sun": null },
  "colors": { "primary": "#6b4f3a" } }
```

---

## 6. Use cases (main flows)

**UC-1 Place a pickup order** — Customer
1. Customer opens the shop page and adds items to the cart; the total updates live.
2. Customer enters name and phone, then submits.
3. Server validates, computes the total from the menu, saves the order, and returns the order code.
4. Customer sees the confirmation page; the status updates by itself until "ready".
*Alternative:* invalid phone or empty cart → the form shows the error and nothing is saved.

**UC-2 Clock in or out** — Staff at the kiosk
1. Staff enters their PIN.
2. Server finds the approved staff member, records a punch with the server time, and returns it.
3. Kiosk shows "Linh, clocked in at 8:02".
*Alternative:* wrong PIN → error; after 5 wrong attempts the keypad locks for 5 minutes.

**UC-3 Approve a new staff member** — Owner
1. Staff registers; the account is pending.
2. Owner opens the dashboard, sees the pending request, and approves it.
3. The staff member can now log in and clock in.

**UC-4 Prepare an order** — Staff
1. Staff opens the order queue and marks an order "in progress", then "ready".
2. The customer's confirmation page changes to "ready".

**UC-5 Review hours and export** — Owner
1. Owner opens the weekly hours table; totals at 24 h or more and 40 h or more are highlighted.
2. Owner selects a date range and downloads orders and punches as CSV.

---

## 7. Out of scope for version 1

| Item | Reason |
|---|---|
| Real online payment | ~~Payment at the counter; avoids handling card data.~~ Optional test-mode Stripe Checkout added in v1.9 (FR-19a). Still out of scope: real (live) charges, refunds, and webhooks for payment reliability. |
| Several cafés in one deployment | Each café gets its own deployment (A-2). |
| Chart of orders per hour vs. staff on shift | Replaced by CSV export (FR-57) for external analysis. |
| Drag-and-drop shift scheduling | Beyond the course scope. |
| Vietnamese interface for customers | Planned after version 1. French was added in v1.4; staff and manager pages got Vietnamese in v1.6. |
| Customer accounts and order history | ~~Not needed for pickup ordering.~~ Added in v1.8 as optional member accounts (points); ordering still works without an account. |

---

## 8. Course requirement traceability

| Course requirement | Covered by |
|---|---|
| Public page without login | FR-10 to FR-19 |
| Registration and login with hashed passwords | FR-20 to FR-25, NFR-S4 |
| Dashboard with CRUD on the user's data | FR-50, FR-51, FR-56 |
| Per-user data isolation | FR-41, FR-58, NFR-S1 |
| At least one dynamic JavaScript / DOM feature | FR-12, FR-18, FR-44 |
| Server-side validation of every form | FR-16, NFR-S2 |
| File / JSON storage, no SQL | C-1, NFR-R2, section 5 |
| Sessions or JWT | C-4, NFR-S5 |
| Semantic, valid, responsive, accessible HTML/CSS | NFR-U1 to NFR-U3 |
| No secrets in code, no debug in production, no crashes | NFR-S4, NFR-S7, NFR-R1 |
| Deployed online | C-5 |

---

## 9. Acceptance checklist for the demo

- [ ] A customer can order from a phone and watch the status change to ready.
- [ ] Changing a price in the browser's developer tools does not change the stored total.
- [ ] A pending staff member cannot clock in; after approval they can.
- [ ] A staff member's request for another person's punches returns 403.
- [ ] A note containing `<script>alert(1)</script>` is shown as plain text.
- [ ] A staff member above 24 h in the week is highlighted on the owner dashboard.
- [ ] The owner can download a CSV that opens correctly in a spreadsheet.
- [ ] The app is reachable at its public URL.
