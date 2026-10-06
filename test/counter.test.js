// Tests for orders taken at the counter, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-counter-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@counter.ca";
process.env.OWNER_PASSWORD = "owner-password-7";
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
async function staffCookie() {
  counter += 1;
  const email = `staff${[...String(counter)].map((d) => "abcdefghij"[d]).join("")}@counter.ca`;
  const pin = String(800000 + counter);
  await call("POST", "/api/auth/register", { body: { name: "Counter Staff", email, password: "a-good-password", pin } });
  const owner = (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });
  return (await call("POST", "/api/kiosk/login", { body: { pin } })).cookie;
}

// A hot black coffee at $6 is the simplest bag.
// Total with taxes: 600 + GST 30 + QST 60 = 690 cents ($6.90).
const BLACK = { customerName: "Walk-in", payment: "cash", items: [{ id: "hot-black-coffee", quantity: 1 }] };

test("a cash order needs a staff login", async () => {
  const { status } = await call("POST", "/api/orders/counter", { body: { ...BLACK, cashReceived: 10 } });
  assert.equal(status, 401);
});

test("a cash order is priced by the server and gives the change", async () => {
  const cookie = await staffCookie();
  const { status, data } = await call("POST", "/api/orders/counter", { cookie, body: { ...BLACK, cashReceived: 10 } });
  assert.equal(status, 201);
  assert.equal(data.totalCents, 690);
  assert.equal(data.change, 3.1);
  assert.match(data.code, /^[A-Z2-9]{5}$/);
});

test("cash that does not cover the bill is refused", async () => {
  const cookie = await staffCookie();
  const { status, data } = await call("POST", "/api/orders/counter", { cookie, body: { ...BLACK, cashReceived: 5 } });
  assert.equal(status, 400);
  assert.match(data.fields.cashReceived, /Not enough/);
});

test("a card order has no cash and no change", async () => {
  const cookie = await staffCookie();
  const { status, data } = await call("POST", "/api/orders/counter", { cookie, body: { ...BLACK, payment: "card" } });
  assert.equal(status, 201);
  assert.equal(data.change, null);
});

test("the counter order records who took it and how it was paid", async () => {
  const cookie = await staffCookie();
  const { data } = await call("POST", "/api/orders/counter", { cookie, body: { ...BLACK, customerName: "Mai", payment: "card" } });
  const orders = JSON.parse(fs.readFileSync(path.join(tempData, "orders.json"), "utf8"));
  const saved = orders.find((o) => o.code === data.code);
  assert.equal(saved.source, "counter");
  assert.equal(saved.payment, "card");
  assert.equal(saved.customerName, "Mai");
  assert.ok(saved.takenBy);
  assert.equal(saved.phone, null);
});

test("a counter order shows in the queue as a counter order", async () => {
  const cookie = await staffCookie();
  const { data } = await call("POST", "/api/orders/counter", { cookie, body: { ...BLACK, customerName: "Queue Test", payment: "card" } });
  const queue = await call("GET", "/api/queue", { cookie });
  const found = queue.data.find((o) => o.code === data.code);
  assert.ok(found);
  assert.equal(found.source, "counter");
});

test("a bag with an unknown drink or no name is refused", async () => {
  const cookie = await staffCookie();
  const { status, data } = await call("POST", "/api/orders/counter", {
    cookie,
    body: { customerName: "", payment: "card", items: [{ id: "unicorn", quantity: 1 }] },
  });
  assert.equal(status, 400);
  assert.ok(data.fields.customerName && data.fields.items);
});
