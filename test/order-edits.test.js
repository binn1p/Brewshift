// Tests for the owner editing or deleting an order, and today's orders for staff, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-edit-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@edits.ca";
process.env.OWNER_PASSWORD = "owner-password-9";
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

async function ownerCookie() {
  return (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
}

async function staffCookie(pin) {
  return (await call("POST", "/api/kiosk/login", { body: { pin } })).cookie;
}

// Staff member approved by the owner, with a PIN
async function approvedStaff(pin) {
  const email = `edit${pin}@edits.ca`;
  await call("POST", "/api/auth/register", { body: { name: "Edit Staff", email, password: "a-good-password", pin } });
  const owner = await ownerCookie();
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });
  return staffCookie(pin);
}

test("the owner changes the drinks of an order and the total is worked out again", async () => {
  const placed = await call("POST", "/api/orders", { body: { name: "Editable", phone: "5145550123", items: [{ id: "hot-black-coffee", quantity: 1 }] } });
  assert.equal(placed.data.totalCents, 690);

  const edited = await call("PATCH", `/api/admin/orders/${placed.data.code}`, {
    cookie: await ownerCookie(),
    body: { lines: [{ id: "hot-black-coffee", qty: 2 }] },
  });
  assert.equal(edited.status, 200);
  // 2 × 600 = 1200; GST 60; QST 120 (9.975% of 1200 = 119.7 → 120); total 1380
  assert.equal(edited.data.totalCents, 1380);
});

test("an order edit is kept in its history with who made it", async () => {
  const placed = await call("POST", "/api/orders", { body: { name: "History", phone: "5145550124", items: [{ id: "hot-black-coffee", quantity: 1 }] } });
  await call("PATCH", `/api/admin/orders/${placed.data.code}`, { cookie: await ownerCookie(), body: { lines: [{ id: "hot-black-coffee", qty: 3 }] } });
  const orders = JSON.parse(fs.readFileSync(path.join(tempData, "orders.json"), "utf8"));
  const saved = orders.find((o) => o.code === placed.data.code);
  assert.equal(saved.history.at(-1).action, "edited");
  assert.ok(saved.history.at(-1).by);
});

test("the owner deletes an order: it stays in the log with status deleted", async () => {
  const placed = await call("POST", "/api/orders", { body: { name: "Gone", phone: "5145550125", items: [{ id: "hot-black-coffee", quantity: 1 }] } });
  const removed = await call("PATCH", `/api/admin/orders/${placed.data.code}`, { cookie: await ownerCookie(), body: { status: "deleted" } });
  assert.equal(removed.status, 200);
  assert.equal(removed.data.status, "deleted");
});

test("only the owner can edit an order (403 for staff)", async () => {
  const placed = await call("POST", "/api/orders", { body: { name: "Protected", phone: "5145550126", items: [{ id: "hot-black-coffee", quantity: 1 }] } });
  const cookie = await approvedStaff("930001");
  const { status } = await call("PATCH", `/api/admin/orders/${placed.data.code}`, { cookie, body: { status: "deleted" } });
  assert.equal(status, 403);
});

test("staff see today's orders, but not the ones from other days", async () => {
  const placed = await call("POST", "/api/orders", { body: { name: "Today", phone: "5145550127", items: [{ id: "hot-black-coffee", quantity: 1 }] } });
  const cookie = await approvedStaff("930002");
  const today = await call("GET", "/api/queue/today", { cookie });
  assert.equal(today.status, 200);
  assert.ok(today.data.some((o) => o.code === placed.data.code));

  // An order from another day is not in today's list
  const orders = JSON.parse(fs.readFileSync(path.join(tempData, "orders.json"), "utf8"));
  orders.push({ ...orders[0], id: "o_old", code: "OLD01", createdAt: "2020-01-01T12:00:00.000Z" });
  fs.writeFileSync(path.join(tempData, "orders.json"), JSON.stringify(orders));
  const again = await call("GET", "/api/queue/today", { cookie });
  assert.ok(!again.data.some((o) => o.code === "OLD01"));
});
