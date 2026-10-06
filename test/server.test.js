// Tests for the server, run with: npm test
// They start the real app on a random port, using a temporary data folder,
// so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Must be set before the app loads, so storage uses the temporary folder
const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-test-"));
process.env.DATA_DIR = tempData;
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

// Send a JSON body to the server and return status and parsed answer
async function post(url, body) {
  const response = await fetch(base + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

async function get(url) {
  const response = await fetch(base + url);
  return { status: response.status, data: await response.json() };
}

// A valid order: 1 hot milk coffee + 2 iced milk coffees with almond milk
// (2 for 1 promo). Expected total: 1466 cents (see the check below).
const validOrder = {
  name: "Alex",
  phone: "(514) 555-0123",
  pickupTime: "14:30",
  items: [
    { id: "hot-milk-coffee", quantity: 1, options: { milk: "condensed", sugar: 100, ice: null, note: "" } },
    { id: "iced-milk-coffee", quantity: 2, options: { milk: "almond", sugar: 50, ice: 75, note: "extra ice" } },
  ],
};

test("health check answers ok", async () => {
  const { status, data } = await get("/api/health");
  assert.equal(status, 200);
  assert.equal(data.ok, true);
});

test("shop info comes from config/shop.json", async () => {
  const { status, data } = await get("/api/shop");
  assert.equal(status, 200);
  assert.equal(data.name, "minh");
});

test("menu returns the drinks on sale", async () => {
  const { status, data } = await get("/api/menu");
  assert.equal(status, 200);
  assert.equal(data.length, 7);
});

test("a valid order is saved and priced by the server", async () => {
  const { status, data } = await post("/api/orders", validOrder);
  assert.equal(status, 201);
  assert.match(data.code, /^[A-Z2-9]{5}$/);
  // Subtotal 600 + (600 + 75 almond) × 2 with 2-for-1 = 1275
  // GST 5% = 64, QST 9.975% = 127, total 1466
  assert.equal(data.totalCents, 1466);
});

test("prices sent by the browser are ignored", async () => {
  const tampered = { ...validOrder, price: 0, totalCents: 1, items: validOrder.items.map((i) => ({ ...i, unitPriceCents: 1 })) };
  const { status, data } = await post("/api/orders", tampered);
  assert.equal(status, 201);
  assert.equal(data.totalCents, 1466);
});

test("an empty bag is refused", async () => {
  const { status, data } = await post("/api/orders", { ...validOrder, items: [] });
  assert.equal(status, 400);
  assert.ok(data.fields.items);
});

test("a missing name and a short phone number are refused", async () => {
  const { status, data } = await post("/api/orders", { ...validOrder, name: "", phone: "123" });
  assert.equal(status, 400);
  assert.ok(data.fields.name);
  assert.ok(data.fields.phone);
});

test("an unknown drink is refused", async () => {
  const { status, data } = await post("/api/orders", {
    ...validOrder,
    items: [{ id: "unicorn-latte", quantity: 1 }],
  });
  assert.equal(status, 400);
  assert.ok(data.fields.items);
});

test("a quantity above 20 is refused", async () => {
  const { status } = await post("/api/orders", {
    ...validOrder,
    items: [{ id: "hot-black-coffee", quantity: 99 }],
  });
  assert.equal(status, 400);
});

test("broken JSON gets a clear 400, not a crash", async () => {
  const { status, data } = await post("/api/orders", "{bad");
  assert.equal(status, 400);
  assert.match(data.error, /JSON/);
});

test("an order can be looked up by its code, without the phone number", async () => {
  const placed = await post("/api/orders", validOrder);
  const { status, data } = await get(`/api/orders/${placed.data.code}`);
  assert.equal(status, 200);
  assert.equal(data.status, "received");
  assert.equal(data.totalCents, 1466);
  assert.equal(data.phone, undefined);
  assert.equal(data.customerName, undefined);
  assert.ok(!JSON.stringify(data).includes("5145550123"));
});

test("an unknown order code gets 404", async () => {
  const { status } = await get("/api/orders/ZZZZZ");
  assert.equal(status, 404);
});

test("unknown API addresses get a JSON 404", async () => {
  const { status, data } = await get("/api/nothing-here");
  assert.equal(status, 404);
  assert.equal(data.error, "Not found");
});
