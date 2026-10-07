# Brewshift: test cases

Live site: https://brewshift.onrender.com

Read this first:
- Everything you do on the live site is **real data**. Keep test orders small and clearly named (for example "Test Web").
- Do not share PINs or passwords in writing. Ask the owner for the owner code.
- Staff accounts are stored on the server disk. If the site is redeployed without a persistent disk, staff accounts are lost and must be created again.
- Use a computer browser for the manager pages, and a phone or tablet width for the customer pages.

Result column: write **Pass**, **Fail** (with what you saw), or **Skip** (with why).

## 1. Server basics

| ID | Steps | Expected |
|---|---|---|
| S-1 | Open `/api/health` | `{"ok":true,...}` |
| S-2 | Open `/api/shop` | Shop name, address, hours, taxes |
| S-3 | Open `/api/menu` | 7 drinks with prices |
| S-4 | Open `/dev/` | Not found (the check page is off in production) |

## 2. Customer: menu and bag

| ID | Steps | Expected |
|---|---|---|
| C-1 | Open `menu.html`, click a drink | The drink window opens with photo, ingredients and story |
| C-2 | Change milk, sugar and ice, then **Add to bag** | The bag shows the drink with the chosen options |
| C-3 | Change the quantity in the bag with − and + | Line total and bag total update at once |
| C-4 | Add Iced Coffee with Milk with quantity 2 | Price for 1 is free (2 for 1) |
| C-5 | Remove a drink from the bag | It disappears; an empty bag shows no checkout |
| C-6 | Refresh the page | The bag is still there |

## 3. Customer: placing an order

| ID | Steps | Expected |
|---|---|---|
| C-7 | In the bag, leave the name empty, press **Checkout** | The form asks for a name |
| C-8 | Enter phone `514 555 0199` (wrong length, e.g. `123`) | Message: 10-digit phone number |
| C-9 | Enter name and a valid phone, press **Checkout** | An order code appears (5 letters and digits) and the total |
| C-10 | Look at the confirmation | "Status: received" appears |
| C-11 | Keep the confirmation open for 15 seconds, then change the status (see M-3) | The status updates on its own |
| C-12 | Pick a pickup time in the past | Message: pickup time must be at least 5 minutes from now |
| C-13 | At checkout, choose **Pay online now (card)**, press Checkout (needs `STRIPE_SECRET_KEY` set on the server) | Goes to Stripe's own payment page |
| C-14 | On Stripe's test page, use test card `4242 4242 4242 4242`, any future expiry, any CVC | Payment succeeds, returns to `order-paid.html` with an order code and live status |
| C-15 | On Stripe's test page, use test card `4000 0000 0000 0002` (always declined) | Stripe shows the decline; no order is created |
| C-16 | On the Stripe page, press Back or close the tab instead of paying | Back on `menu.html`; the bag still has the items; no order was created |
| C-17 | Reload `order-paid.html` after a successful payment (same `session_id` in the address bar) | Same order code shown again; `docs/known-issues.md`'s note on this: it is not saved twice |
| C-18 | Without `STRIPE_SECRET_KEY` set, choose **Pay online now** | Message that online payment isn't available; pay at pickup still works |

## 4. Customer: order tracking and accounts

| ID | Steps | Expected |
|---|---|---|
| A-1 | Open `login.html`, press **Create an account** | The sign-up form opens |
| A-2 | Sign up with a new email, phone and password | You arrive on the account page |
| A-3 | Sign up again with the same email | Message: email already used |
| A-4 | Sign up again with the same phone but a new email | Message: phone already used |
| A-5 | Log in with the wrong password | "Wrong email or password" |
| A-6 | Log in with the right password | The account page shows name, points and orders |
| A-7 | Place an order while logged in (C-9) | The order appears under "Your orders" |
| A-8 | Let the owner mark that order ready, then picked up (M-3, Q-2) | Points go up by the number of drinks |
| A-9 | Change the promo choice and reload | The choice is kept |
| A-10 | Press **Log out** | Back on the login page; the account page no longer opens |
| A-11 | While logged in, go to the menu, then back to the account | You stay logged in |

## 5. Staff: kiosk and clock

| ID | Steps | Expected |
|---|---|---|
| K-1 | Open `kiosk.html`, type a wrong code (000000) | "That code doesn't match" |
| K-2 | Type a staff code of a pending person | Message that the account is waiting for approval, with the first name |
| K-3 | Type a correct staff code | Welcome message, then the choice page |
| K-4 | On the choice page, press **Clock in / out** | Staff page shows "clocked in" and a time |
| K-5 | Press the clock button again | Clocked out, with the hours of that shift |
| K-6 | Look at the week view | Today shows the hours |
| K-7 | Press **Download CSV** and **Print** | A file downloads / the print window opens |
| K-8 | Press **Done** | Back to the kiosk; you must type the code again |
| K-9 | Type the owner code on the kiosk | Welcome, then the choice page with a **Manager** tile |

## 6. Staff: order queue and counter

| ID | Steps | Expected |
|---|---|---|
| Q-1 | From the choice page, press **Orders** | Open orders, oldest first |
| Q-2 | On an order, press **Start**, then **Ready**, then **Finish** | Each step changes the status; the finished order leaves the list |
| Q-3 | Open the same queue in two tabs; finish an order in one | In the other, the next press shows that the order already changed |
| Q-4 | Press **Take an order** from the choice page | The counter page opens with the menu |
| Q-5 | Add drinks, enter the customer name, choose **Cash** | The total with taxes shows; the cash keypad appears |
| Q-6 | Type less cash than the total | Send is blocked, with how much is missing |
| Q-7 | Type more cash, press **Send order** | Order code and change are shown |
| Q-8 | Press **Print receipt** | Receipt print window opens |
| Q-9 | Choose **Card**, send an order | No change is asked |
| Q-10 | Type a member's phone number (of a member from section 4) | Member found, with points; a checkbox to use points |
| Q-11 | Tick the points box and send | The total is lower; the member's points go down |
| Q-12 | Press **Today's orders** | The orders of today appear, including the ones you just took |
| Q-13 | At the counter, add drinks, enter a name, choose **QR code (Stripe)**, press Send order (needs `STRIPE_SECRET_KEY` set) | A QR code and a link appear; the screen says it is waiting |
| Q-14 | On a phone, scan the QR code, pay with test card `4242 4242 4242 4242` | Within a few seconds, the counter screen shows the order code and receipt options by itself |
| Q-15 | Start a QR payment, then press **Cancel** before paying | Back to the counter screen with the same bag; no order was created |
| Q-16 | Check the order log after Q-14 | The order shows source "counter", payment "card", and who took it |

## 7. Manager: menu, settings and stock

| ID | Steps | Expected |
|---|---|---|
| M-1 | Owner: open **Menu** | All 7 drinks, with availability choices |
| M-2 | Change a price, then open the customer menu | The new price shows on the customer menu |
| M-3 | Set a drink **Sold out today**, then open the customer menu | It shows as sold out |
| M-4 | Add a new drink with a name, price and default choices | It appears on the customer menu |
| M-5 | Upload a photo for a drink | The photo shows on the customer menu |
| M-6 | Open **Settings**, change the shop phone | The change is saved and shows after reload |
| M-7 | Change the home tile drinks | The home page shows the new drinks |
| M-8 | Open **Stock**, add an item, press − and + | The count changes; a low item shows "Low" |
| M-9 | Open **Photos**, upload a photo, change its category, delete it | Each change is saved |

## 8. Manager: orders, reports and staff

| ID | Steps | Expected |
|---|---|---|
| O-1 | Open **Orders** (order log) | All orders, with status, payment and who took them |
| O-2 | Change an order's status in the list | Saved; the history shows the change with a name |
| O-3 | Open an order's edit window, remove a drink, save | The total is worked out again; the history shows the edit |
| O-4 | Delete an order | It stays in the log with status "deleted" |
| O-5 | Open **Sales** (day, week, month) | Totals, a chart, and the top drinks |
| O-6 | Download the sales CSV | The file opens in Excel with accents correct |
| O-7 | Open **Employees**, press **Add** | A form to add a person |
| O-8 | Add a person with a PIN already used | Message: PIN already used |
| O-9 | Add a new person with name, PIN and status approved | They appear in the list; they can clock in with their PIN |
| O-10 | Edit a person's phone, type or availability | Saved after reload |
| O-11 | Approve a pending person | Status changes to approved |
| O-12 | Open **Shifts**, press a free slot for a staff member | The shift appears in the week |
| O-13 | Change a shift's times | Saved |
| O-14 | Delete a shift | Gone |
| O-15 | Press **Copy last week** | Last week's shifts appear in this week |
| O-16 | Open **Hours** (weekly table) | Each staff member's hours; 24 h or more is highlighted |
| O-17 | Download the orders CSV and the punches CSV from the dashboard | Each file downloads |
| O-18 | Correct a punch (set a clock-out time) | Saved; the original time is kept in the history |

## 9. Security and access

| ID | Steps | Expected |
|---|---|---|
| X-1 | Open `queue.html` in a private window without a code | Goes to the kiosk |
| X-2 | Open `admin` pages (for example `employees.html`) as staff | Staff are not allowed (back to the kiosk or an error) |
| X-3 | Sign up as a customer, then try to open a staff page | Not allowed |
| X-4 | Put `<script>alert(1)</script>` as the customer name, then look at the order log | The text shows as plain text; no alert |
| X-5 | Change the price in the browser (DevTools) before checkout | The total charged is still the menu price |
| X-6 | Open `/api/admin/orders` in a private window | Error "Please log in" |

## 10. Things that are known not to work yet

- Some manager pages may still show data saved in the browser.
- The owner code can only be reset with `RESET_OWNER` on Render (see the README).
- Staff accounts are lost on redeploy unless the server has a persistent disk.
