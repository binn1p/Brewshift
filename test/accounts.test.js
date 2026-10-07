// Tests for member accounts and points, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-acct-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@accounts.ca";
process.env.OWNER_PASSWORD = "owner-password-8";
process.env.OWNER_PIN = "111111";
fs.copyFileSync(path.join(__dirname, "..", "data", "menu.json"), path.join(tempData, "menu.json"));

const { loadShop } = require("../src/lib/shop");
const { createApp } = require("../src/app");
const { ensureOwner } = require("../src/lib/users");

let server;
let base;

before(async () => {
  await ensureOwner({ email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD, pin: process.env.OWNER_PIN });
  server = createApp(loadShop()).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(tempData, { recursive: true, force: true });
});

async function call(method, url, { body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const setCookie = response.headers.get("set-cookie");
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null, cookie: setCookie ? setCookie.split(";")[0] : null };
}

let counter = 0;
function letters(n) {
  return [...String(n)].map((d) => "abcdefghij"[d]).join("");
}

// A new member: signs up and returns the session cookie and the phone number used
async function newMember() {
  counter += 1;
  const phone = `514555${String(1000 + counter).padStart(4, "0")}`;
  const email = `member${letters(counter)}@accounts.ca`;
  const signup = await call("POST", "/api/customers/register", {
    body: { name: `Member ${counter}`, email, phone, password: "coffee-secret", promos: true },
  });
  return { cookie: signup.cookie, phone, email, id: signup.data.customer.id };
}

async function staffCookie() {
  counter += 1;
  const email = `staff${letters(counter)}@accounts.ca`;
  const pin = String(900000 + counter);
  await call("POST", "/api/auth/register", { body: { name: "Till Staff", email, password: "a-good-password", pin } });
  const owner = (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });
  return (await call("POST", "/api/kiosk/login", { body: { pin } })).cookie;
}

test("sign up creates an account, never returns the password", async () => {
  const member = await newMember();
  const me = await call("GET", "/api/customers/me", { cookie: member.cookie });
  assert.equal(me.status, 200);
  assert.equal(me.data.customer.passwordHash, undefined);
  assert.equal(me.data.customer.points, 0);
});

test("a second account with the same email or phone is refused", async () => {
  const first = await newMember();
  const sameEmail = await call("POST", "/api/customers/register", {
    body: { name: "Copy", email: first.email, phone: "5145559999", password: "coffee-secret" },
  });
  assert.equal(sameEmail.status, 409);
  const samePhone = await call("POST", "/api/customers/register", {
    body: { name: "Copy", email: "other@accounts.ca", phone: first.phone, password: "coffee-secret" },
  });
  assert.equal(samePhone.status, 409);
});

test("bad sign-up details are refused with field messages", async () => {
  const { status, data } = await call("POST", "/api/customers/register", {
    body: { name: "", email: "nope", phone: "123", password: "short" },
  });
  assert.equal(status, 400);
  assert.ok(data.fields.name && data.fields.email && data.fields.phone && data.fields.password);
});

test("log in, log out, and the wrong password", async () => {
  const member = await newMember();
  const wrong = await call("POST", "/api/customers/login", { body: { email: member.email, password: "nope-nope" } });
  assert.equal(wrong.status, 401);

  const right = await call("POST", "/api/customers/login", { body: { email: member.email, password: "coffee-secret" } });
  assert.equal(right.status, 200);
  const signedIn = await call("GET", "/api/customers/me", { cookie: right.cookie });
  assert.equal(signedIn.status, 200);

  await call("POST", "/api/customers/logout", { cookie: right.cookie });
  const after = await call("GET", "/api/customers/me", { cookie: right.cookie });
  assert.equal(after.status, 401);
});

test("the member can change the promo choice", async () => {
  const member = await newMember();
  const { status, data } = await call("PUT", "/api/customers/promos", { cookie: member.cookie, body: { promos: false } });
  assert.equal(status, 200);
  assert.equal(data.customer.promos, false);
});

test("staff can find a member by phone; a member's own login cannot", async () => {
  const member = await newMember();
  const staff = await staffCookie();
  const found = await call("GET", `/api/customers/lookup?phone=${member.phone}`, { cookie: staff });
  assert.equal(found.status, 200);
  assert.equal(found.data.id, member.id);
  assert.equal(found.data.email, undefined);

  const asMember = await call("GET", `/api/customers/lookup?phone=${member.phone}`, { cookie: member.cookie });
  assert.equal(asMember.status, 401);
});

test("an online order by a signed-in member earns points at pickup", async () => {
  const member = await newMember();
  const placed = await call("POST", "/api/orders", {
    cookie: member.cookie,
    body: { name: "Member", phone: member.phone, items: [{ id: "hot-black-coffee", quantity: 2 }] },
  });
  assert.equal(placed.status, 201);

  const staff = await staffCookie();
  await call("POST", `/api/queue/${placed.data.code}/status`, { cookie: staff, body: { status: "in_progress" } });
  await call("POST", `/api/queue/${placed.data.code}/status`, { cookie: staff, body: { status: "ready" } });
  // Online orders are "pay at pickup" by default: collected here, like at the counter
  await call("POST", `/api/queue/${placed.data.code}/status`, { cookie: staff, body: { status: "picked_up", payment: "card" } });

  const found = await call("GET", `/api/customers/lookup?phone=${member.phone}`, { cookie: staff });
  assert.equal(found.data.points, 2);

  const mine = await call("GET", "/api/customers/orders", { cookie: member.cookie });
  assert.equal(mine.data[0].code, placed.data.code);
  assert.equal(mine.data[0].pointsEarned, 2);
});

test("at the counter, points come off the bill before tax", async () => {
  const member = await newMember();
  // Give the member 2 points through an online pickup (2 drinks)
  const placed = await call("POST", "/api/orders", {
    cookie: member.cookie,
    body: { name: "Member", phone: member.phone, items: [{ id: "hot-black-coffee", quantity: 2 }] },
  });
  const staff = await staffCookie();
  for (const status of ["in_progress", "ready"]) {
    await call("POST", `/api/queue/${placed.data.code}/status`, { cookie: staff, body: { status } });
  }
  // Online order, pay at pickup: collected here
  await call("POST", `/api/queue/${placed.data.code}/status`, { cookie: staff, body: { status: "picked_up", payment: "card" } });

  // Now a $6 coffee at the counter: 2 points = $2 off before tax
  // subtotal 600 - 200 = 400; GST 20; QST 40 (9.975% of 400 = 39.9 → 40); total 460
  const sale = await call("POST", "/api/orders/counter", {
    cookie: staff,
    body: {
      customerName: "Member", payment: "card", customerPhone: member.phone, usePoints: true,
      items: [{ id: "hot-black-coffee", quantity: 1 }],
    },
  });
  assert.equal(sale.status, 201);
  assert.equal(sale.data.pointsUsed, 2);
  assert.equal(sale.data.totalCents, 460);
  assert.equal(sale.data.pointsEarned, 1);

  const found = await call("GET", `/api/customers/lookup?phone=${member.phone}`, { cookie: staff });
  assert.equal(found.data.points, 1); // 2 - 2 used + 1 earned
});

test("points are not spent unless asked, and never more than the member has", async () => {
  const member = await newMember();
  const staff = await staffCookie();
  const sale = await call("POST", "/api/orders/counter", {
    cookie: staff,
    body: { customerName: "No Points", payment: "card", customerPhone: member.phone, usePoints: true, items: [{ id: "hot-black-coffee", quantity: 1 }] },
  });
  assert.equal(sale.status, 201);
  assert.equal(sale.data.pointsUsed, 0);
  assert.equal(sale.data.totalCents, 690);
});

test("a member number that does not exist is refused at the counter", async () => {
  const staff = await staffCookie();
  const { status, data } = await call("POST", "/api/orders/counter", {
    cookie: staff,
    body: { customerName: "Ghost", payment: "card", customerPhone: "5145550000", items: [{ id: "hot-black-coffee", quantity: 1 }] },
  });
  assert.equal(status, 404);
  assert.ok(data.fields.customerPhone);
});

test("the owner changing an order's status is seen by the member's tracking", async () => {
  const member = await newMember();
  const placed = await call("POST", "/api/orders", {
    cookie: member.cookie,
    body: { name: "Tracker", phone: member.phone, items: [{ id: "hot-black-coffee", quantity: 1 }] },
  });
  const owner = (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;

  const changed = await call("POST", `/api/admin/orders/${placed.data.code}/status`, { cookie: owner, body: { status: "in_progress" } });
  assert.equal(changed.status, 200);

  const mine = await call("GET", "/api/customers/orders", { cookie: member.cookie });
  assert.equal(mine.data.find((o) => o.code === placed.data.code).status, "in_progress");
});

test("the owner's status change accepts only known statuses", async () => {
  const owner = (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
  const member = await newMember();
  const placed = await call("POST", "/api/orders", {
    cookie: member.cookie,
    body: { name: "Bad Status", phone: member.phone, items: [{ id: "hot-black-coffee", quantity: 1 }] },
  });
  const { status } = await call("POST", `/api/admin/orders/${placed.data.code}/status`, { cookie: owner, body: { status: "flying" } });
  assert.equal(status, 400);
});

test("a staff sign-in, sign-out or kiosk visit does not sign the member out, and the reverse", async () => {
  const member = await newMember();
  // A staff member with a known PIN, approved by the owner
  const email = `split${letters(counter + 500)}@accounts.ca`;
  const pin = "654321";
  await call("POST", "/api/auth/register", { body: { name: "Split Staff", email, password: "a-good-password", pin } });
  const owner = (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });

  // Staff signs in on the kiosk in the same browser (same cookie)
  const kiosk = await call("POST", "/api/kiosk/login", { body: { pin }, cookie: member.cookie });
  assert.equal(kiosk.status, 200);
  const staffNow = await call("GET", "/api/auth/me", { cookie: member.cookie });
  assert.equal(staffNow.status, 200);

  // Staff leaves (kiosk visit logs them out): the member is still signed in
  await call("POST", "/api/auth/logout", { cookie: member.cookie });
  const stillMember = await call("GET", "/api/customers/me", { cookie: member.cookie });
  assert.equal(stillMember.status, 200);
  const staffGone = await call("GET", "/api/auth/me", { cookie: member.cookie });
  assert.equal(staffGone.status, 401);
});
