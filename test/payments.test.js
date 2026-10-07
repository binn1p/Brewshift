// Tests for the optional Stripe payment routes, run with: npm test
// No STRIPE_SECRET_KEY is set here, so these only check the "not set up" path: the shop must
// keep working (pay at pickup) when online card payment has not been configured. The actual
// Stripe Checkout flow needs a real test-mode key and is checked by hand (see the README).

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-pay-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
delete process.env.STRIPE_SECRET_KEY;
fs.copyFileSync(path.join(__dirname, "..", "data", "menu.json"), path.join(tempData, "menu.json"));

const { loadShop } = require("../src/lib/shop");
const { createApp } = require("../src/app");

let server;
let base;

before(async () => {
  server = createApp(loadShop()).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(tempData, { recursive: true, force: true });
});

async function post(url, body) {
  const response = await fetch(base + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}

async function get(url) {
  const response = await fetch(base + url);
  return { status: response.status, data: await response.json() };
}

const order = { name: "Alex", phone: "5145550123", items: [{ id: "hot-black-coffee", quantity: 1 }] };

test("without a Stripe key, starting an online payment is refused cleanly (503), not a crash", async () => {
  const { status, data } = await post("/api/payments/checkout-session", order);
  assert.equal(status, 503);
  assert.match(data.error, /not set up/);
});

test("without a Stripe key, confirming a payment is refused the same way", async () => {
  const { status, data } = await get("/api/payments/confirm/cs_test_doesnotexist");
  assert.equal(status, 503);
  assert.match(data.error, /not set up/);
});

test("pay-at-pickup orders still work when online payment is not configured", async () => {
  const { status, data } = await post("/api/orders", order);
  assert.equal(status, 201);
  assert.ok(data.code);
});
