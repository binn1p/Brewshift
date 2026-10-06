// Tests for the owner's employee details, stock and photo library, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-owner-data-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@ownerdata.ca";
process.env.OWNER_PASSWORD = "owner-password-10";
process.env.OWNER_PIN = "111111";
fs.copyFileSync(path.join(__dirname, "..", "data", "menu.json"), path.join(tempData, "menu.json"));

const { loadShop } = require("../src/lib/shop");
const { createApp } = require("../src/app");
const { ensureOwner } = require("../src/lib/users");

let server;
let base;

before(async () => {
  await ensureOwner({ email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD, pin: process.env.OWNER_PIN, name: "Kim Vo" });
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

const availability = { 0: null, 1: ["09:00", "17:00"], 2: ["09:00", "17:00"], 3: null, 4: null, 5: null, 6: null };

function person(overrides = {}) {
  return {
    name: "Nadia Roy",
    birthDate: "2004-06-02",
    phone: "(514) 555-0177",
    email: "",
    pin: "772211",
    role: "staff",
    status: "approved",
    type: "part",
    residency: "local",
    availability,
    ...overrides,
  };
}

test("the owner adds a person with details, and they show in the staff list", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/staff", { cookie: owner, body: person() });
  assert.equal(created.status, 201);
  assert.equal(created.data.user.birthDate, "2004-06-02");
  assert.equal(created.data.user.phone, "5145550177");
  assert.equal(created.data.user.pinHash, undefined);

  const list = await call("GET", "/api/staff", { cookie: owner });
  const found = list.data.find((u) => u.id === created.data.user.id);
  assert.equal(found.type, "part");
  assert.equal(found.availability[1][0], "09:00");
});

test("a PIN already used by someone else is refused (409)", async () => {
  const owner = await ownerCookie();
  await call("POST", "/api/staff", { cookie: owner, body: person({ pin: "772212" }) });
  const { status, data } = await call("POST", "/api/staff", { cookie: owner, body: person({ name: "Copy", pin: "772212" }) });
  assert.equal(status, 409);
  assert.match(data.error, /PIN/);
});

test("a new person needs a 6-digit PIN and a valid day slot", async () => {
  const owner = await ownerCookie();
  const { status, data } = await call("POST", "/api/staff", {
    cookie: owner,
    body: person({ pin: "12", availability: { 1: ["17:00", "09:00"] } }),
  });
  assert.equal(status, 400);
  assert.ok(data.fields.pin && data.fields.availability);
});

test("the owner edits details without changing the PIN, and a PIN can be changed", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/staff", { cookie: owner, body: person({ name: "Edit Me", pin: "772213" }) });
  const id = created.data.user.id;

  const edited = await call("PUT", `/api/staff/${id}`, { cookie: owner, body: person({ name: "Edit Me", pin: undefined, type: "full" }) });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.user.type, "full");

  // Still signs in with the old PIN on the kiosk
  const kiosk = await call("POST", "/api/kiosk/login", { body: { pin: "772213" } });
  assert.equal(kiosk.status, 200);

  const newPin = await call("PUT", `/api/staff/${id}`, { cookie: owner, body: person({ name: "Edit Me", pin: "772214" }) });
  assert.equal(newPin.status, 200);
  const oldPin = await call("POST", "/api/kiosk/login", { body: { pin: "772213" } });
  assert.equal(oldPin.status, 401);
});

test("the owner cannot take away their own manager access", async () => {
  const owner = await ownerCookie();
  const me = (await call("GET", "/api/auth/me", { cookie: owner })).data.user;
  const { status } = await call("PUT", `/api/staff/${me.id}`, { cookie: owner, body: person({ name: me.name, role: "staff", pin: undefined }) });
  assert.equal(status, 400);
});

test("staff cannot add or edit people (403)", async () => {
  const owner = await ownerCookie();
  const created = await call("POST", "/api/staff", { cookie: owner, body: person({ name: "Staffer", pin: "772215" }) });
  const kiosk = await call("POST", "/api/kiosk/login", { body: { pin: "772215" } });
  const add = await call("POST", "/api/staff", { cookie: kiosk.cookie, body: person({ pin: "772216" }) });
  assert.equal(add.status, 403);
  const edit = await call("PUT", `/api/staff/${created.data.user.id}`, { cookie: kiosk.cookie, body: person({ pin: undefined }) });
  assert.equal(edit.status, 403);
});

test("stock: add, change the count, edit and delete an item", async () => {
  const owner = await ownerCookie();
  const added = await call("POST", "/api/admin/stock", {
    cookie: owner,
    body: { name: { en: "Milk", fr: "Lait" }, unit: "L", qty: 5, min: 2 },
  });
  assert.equal(added.status, 201);

  const changed = await call("PUT", `/api/admin/stock/${added.data.id}`, {
    cookie: owner,
    body: { name: { en: "Milk", fr: "Lait" }, unit: "L", qty: 1, min: 2 },
  });
  assert.equal(changed.data.qty, 1);

  const removed = await call("DELETE", `/api/admin/stock/${added.data.id}`, { cookie: owner });
  assert.equal(removed.status, 200);
  const list = await call("GET", "/api/admin/stock", { cookie: owner });
  assert.ok(!list.data.some((s) => s.id === added.data.id));
});

test("stock needs a name and non-negative numbers", async () => {
  const owner = await ownerCookie();
  const { status, data } = await call("POST", "/api/admin/stock", { cookie: owner, body: { name: {}, qty: -1, min: 0 } });
  assert.equal(status, 400);
  assert.ok(data.fields.name && data.fields.qty);
});

test("photo library: an uploaded photo is listed, recategorised and deleted", async () => {
  const owner = await ownerCookie();
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const upload = await call("POST", "/api/admin/uploads", { cookie: owner, body: { dataUrl: png } });
  const added = await call("POST", "/api/admin/photos", { cookie: owner, body: { url: upload.data.url, category: "shop" } });
  assert.equal(added.status, 201);

  const listed = await call("GET", "/api/admin/photos", { cookie: owner });
  assert.ok(listed.data.some((p) => p.id === added.data.id && p.category === "shop"));

  const moved = await call("PATCH", `/api/admin/photos/${added.data.id}`, { cookie: owner, body: { category: "product" } });
  assert.equal(moved.data.category, "product");

  const removed = await call("DELETE", `/api/admin/photos/${added.data.id}`, { cookie: owner });
  assert.equal(removed.status, 200);
  assert.ok(!fs.existsSync(path.join(tempData, "uploads", path.basename(upload.data.url))));
});

test("a photo must be uploaded first, so only our own addresses are accepted", async () => {
  const owner = await ownerCookie();
  const { status } = await call("POST", "/api/admin/photos", { cookie: owner, body: { url: "https://elsewhere.example/x.png", category: "shop" } });
  assert.equal(status, 400);
});
