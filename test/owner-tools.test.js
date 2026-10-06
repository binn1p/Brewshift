// Tests for correcting punches and managing the menu, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-owner-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@tools.ca";
process.env.OWNER_PASSWORD = "owner-password-4";
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
function emailFor(prefix) {
  counter += 1;
  return `${prefix}${[...String(counter)].map((d) => "abcdefghij"[d]).join("")}@tools.ca`;
}

async function ownerCookie() {
  return (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
}

async function staffMember() {
  counter += 1;
  const email = emailFor("staff");
  const pin = String(600000 + counter);
  await call("POST", "/api/auth/register", { body: { name: "Forgetful", email, password: "a-good-password", pin } });
  const owner = await ownerCookie();
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });
  const kiosk = await call("POST", "/api/kiosk/login", { body: { pin } });
  return { id: pending.id, cookie: kiosk.cookie };
}

// A drink the owner can send in the form
function drinkForm(overrides = {}) {
  return {
    name: { en: "Iced Pandan Coffee", fr: "Café glacé au pandan" },
    viName: "Cà phê lá dứa đá",
    price: 7,
    recipe: { milk: "condensed", sugar: 75, ice: 100 },
    available: true,
    ...overrides,
  };
}

test("a forgotten clock-out is fixed by the owner; the first time is kept", async () => {
  const staff = await staffMember();
  await call("POST", "/api/punches/toggle", { cookie: staff.cookie }); // clock in, forget to clock out
  const mine = (await call("GET", "/api/punches/me", { cookie: staff.cookie })).data.punches;
  const punch = mine[0];

  const corrected = await call("PATCH", `/api/admin/punches/${punch.id}`, {
    cookie: await ownerCookie(),
    body: { at: "2020-01-01T17:00:00.000Z" },
  });
  assert.equal(corrected.status, 200);
  assert.equal(corrected.data.punch.at, "2020-01-01T17:00:00.000Z");
  assert.equal(corrected.data.punch.originalAt, punch.at);
  assert.ok(corrected.data.punch.correctedBy);
});

test("a correction is only for the owner (403 for staff)", async () => {
  const staff = await staffMember();
  await call("POST", "/api/punches/toggle", { cookie: staff.cookie });
  const punch = (await call("GET", "/api/punches/me", { cookie: staff.cookie })).data.punches[0];
  const denied = await call("PATCH", `/api/admin/punches/${punch.id}`, { cookie: staff.cookie, body: { at: "2020-01-01T17:00:00Z" } });
  assert.equal(denied.status, 403);
});

test("a correction cannot be in the future, and needs a real date", async () => {
  const staff = await staffMember();
  await call("POST", "/api/punches/toggle", { cookie: staff.cookie });
  const punch = (await call("GET", "/api/punches/me", { cookie: staff.cookie })).data.punches[0];
  const owner = await ownerCookie();

  const future = await call("PATCH", `/api/admin/punches/${punch.id}`, { cookie: owner, body: { at: "2999-01-01T00:00:00Z" } });
  assert.equal(future.status, 400);

  const notDate = await call("PATCH", `/api/admin/punches/${punch.id}`, { cookie: owner, body: { at: "tomorrow-ish" } });
  assert.equal(notDate.status, 400);
});

test("correcting an unknown punch gets 404", async () => {
  const { status } = await call("PATCH", "/api/admin/punches/p_nothing", { cookie: await ownerCookie(), body: { at: "2020-01-01T00:00:00Z" } });
  assert.equal(status, 404);
});

test("the owner sees the whole menu, and staff cannot change it (403)", async () => {
  const owner = await call("GET", "/api/admin/menu", { cookie: await ownerCookie() });
  assert.equal(owner.status, 200);
  assert.equal(owner.data.length, 7);

  const staff = await staffMember();
  const denied = await call("GET", "/api/admin/menu", { cookie: staff.cookie });
  assert.equal(denied.status, 403);
});

test("a new drink appears on the public menu with a clean id", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/menu", { cookie: owner, body: drinkForm() });
  assert.equal(created.status, 201);
  assert.equal(created.data.id, "iced-pandan-coffee");

  const publicMenu = await call("GET", "/api/menu");
  assert.ok(publicMenu.data.some((d) => d.id === "iced-pandan-coffee"));
});

test("a second drink with the same name gets a new id", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/menu", { cookie: owner, body: drinkForm() });
  assert.equal(created.data.id, "iced-pandan-coffee-2");
});

test("a bad drink is refused with field messages", async () => {
  const { status, data } = await call("POST", "/api/admin/menu", {
    cookie: await ownerCookie(),
    body: drinkForm({ price: -3, name: { en: "", fr: "x" }, recipe: { milk: "soy", sugar: 60, ice: 100 } }),
  });
  assert.equal(status, 400);
  assert.ok(data.fields.price && data.fields.nameEn && data.fields.milk && data.fields.sugar);
});

test("changing a price shows on the public menu", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/menu", { cookie: owner, body: drinkForm({ name: { en: "Price Test", fr: "Test" } }) });
  const updated = await call("PATCH", `/api/admin/menu/${created.data.id}`, { cookie: owner, body: { price: 9.5 } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.price, 9.5);
  const publicMenu = await call("GET", "/api/menu");
  assert.equal(publicMenu.data.find((d) => d.id === created.data.id).price, 9.5);
});

test("turning a drink off hides it from customers but keeps it for the owner", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/menu", { cookie: owner, body: drinkForm({ name: { en: "Off Test", fr: "Test" } }) });
  await call("PATCH", `/api/admin/menu/${created.data.id}`, { cookie: owner, body: { available: false } });

  const publicMenu = await call("GET", "/api/menu");
  assert.ok(!publicMenu.data.some((d) => d.id === created.data.id));

  const ownerMenu = await call("GET", "/api/admin/menu", { cookie: owner });
  assert.equal(ownerMenu.data.find((d) => d.id === created.data.id).available, false);
});

test("a deleted drink is gone", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/menu", { cookie: owner, body: drinkForm({ name: { en: "Delete Me", fr: "Supprimer" } }) });
  const removed = await call("DELETE", `/api/admin/menu/${created.data.id}`, { cookie: owner });
  assert.equal(removed.status, 200);
  const again = await call("DELETE", `/api/admin/menu/${created.data.id}`, { cookie: owner });
  assert.equal(again.status, 404);
});

test("sold out today is saved on the server and shows on the customer menu", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/menu", { cookie: owner, body: drinkForm({ name: { en: "Sold Test", fr: "Test" } }) });
  const today = new Date().toISOString().slice(0, 10);
  const soldOut = await call("PATCH", `/api/admin/menu/${created.data.id}`, { cookie: owner, body: { soldOut: { until: today } } });
  assert.equal(soldOut.status, 200);

  const publicMenu = await call("GET", "/api/menu");
  assert.deepEqual(publicMenu.data.find((d) => d.id === created.data.id).soldOut, { until: today });
});

test("a drink can be saved with an empty story and a cleared label", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/menu", {
    cookie: owner,
    body: drinkForm({ name: { en: "Empty Story", fr: "Vide" }, story: { en: "", fr: "" }, tag: null }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.tag, null);
});

test("home tile choices: anyone can read them, only the owner can change them", async () => {
  const anonymous = await call("GET", "/api/settings/home");
  assert.equal(anonymous.status, 200);
  assert.equal(typeof anonymous.data.seasonalDrink, "string");

  const owner = await ownerCookie();
  const changed = await call("PUT", "/api/admin/settings/home", {
    cookie: owner,
    body: { seasonalDrink: "orange-coffee", promoDrink: "hot-milk-coffee" },
  });
  assert.equal(changed.status, 200);

  const read = await call("GET", "/api/settings/home");
  assert.deepEqual(read.data, { seasonalDrink: "orange-coffee", promoDrink: "hot-milk-coffee" });

  const unknown = await call("PUT", "/api/admin/settings/home", {
    cookie: owner,
    body: { seasonalDrink: "unicorn", promoDrink: "hot-milk-coffee" },
  });
  assert.equal(unknown.status, 400);
  assert.ok(unknown.data.fields.seasonalDrink);

  const staff = await staffMember();
  const denied = await call("PUT", "/api/admin/settings/home", {
    cookie: staff.cookie,
    body: { seasonalDrink: "orange-coffee", promoDrink: "hot-milk-coffee" },
  });
  assert.equal(denied.status, 403);
});
