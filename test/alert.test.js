// Tests for the public "are there new orders" check used by the shop screens, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-alert-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@alert.ca";
process.env.OWNER_PASSWORD = "owner-password-12";
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

async function get(url) {
  const response = await fetch(base + url);
  return { status: response.status, data: await response.json() };
}

async function placeOrder(name) {
  const response = await fetch(`${base}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone: "5145550123", items: [{ id: "hot-black-coffee", quantity: 1 }] }),
  });
  return response.json();
}

test("no one needs to log in to check for new orders", async () => {
  const before = new Date(Date.now() - 1000).toISOString();
  const { status } = await get(`/api/queue/alert?since=${encodeURIComponent(before)}`);
  assert.equal(status, 200);
});

test("an order placed after 'since' counts; nothing private is sent back", async () => {
  const since = new Date(Date.now() - 1000).toISOString();
  await placeOrder("Alert Test");
  const { data } = await get(`/api/queue/alert?since=${encodeURIComponent(since)}`);
  assert.equal(data.count, 1);
  assert.ok(data.latestAt);
  assert.ok(!JSON.stringify(data).includes("Alert Test"));
});

test("an order placed before 'since' does not count", async () => {
  await placeOrder("Old Order");
  const since = new Date(Date.now() + 1000).toISOString();
  const { data } = await get(`/api/queue/alert?since=${encodeURIComponent(since)}`);
  assert.equal(data.count, 0);
});

test("a missing or broken 'since' answers with no new orders, not an error", async () => {
  assert.deepEqual((await get("/api/queue/alert")).data, { count: 0, latestAt: null });
  assert.deepEqual((await get("/api/queue/alert?since=not-a-date")).data, { count: 0, latestAt: null });
});
