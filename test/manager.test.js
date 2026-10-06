// Tests for the order queue, owner reports, CSV exports and deactivating staff, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-mgr-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@manager.ca";
process.env.OWNER_PASSWORD = "owner-password-3";
process.env.OWNER_PIN = "111111";
fs.copyFileSync(path.join(__dirname, "..", "data", "menu.json"), path.join(tempData, "menu.json"));

const { loadShop } = require("../src/lib/shop");
const { createApp } = require("../src/app");
const { ensureOwner } = require("../src/lib/users");
const { startOfWeek } = require("../src/lib/punches");

let server;
let base;
const shop = loadShop();

before(async () => {
  await ensureOwner({ email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD, pin: process.env.OWNER_PIN });
  server = createApp(shop).listen(0);
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
  const type = response.headers.get("content-type") || "";
  const text = await response.text();
  return {
    status: response.status,
    data: type.includes("json") && text ? JSON.parse(text) : text,
    headers: response.headers,
    cookie: setCookie ? setCookie.split(";")[0] : null,
  };
}

let counter = 0;
function emailFor(prefix) {
  counter += 1;
  return `${prefix}${[...String(counter)].map((d) => "abcdefghij"[d]).join("")}@manager.ca`;
}

async function ownerCookie() {
  return (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
}

// Register, approve as owner, then log in as that staff member; returns { id, cookie }
async function staffMember(name = "Staff") {
  counter += 1;
  const email = emailFor("staff");
  const pin = String(500000 + counter);
  await call("POST", "/api/auth/register", { body: { name, email, password: "a-good-password", pin } });
  const owner = await ownerCookie();
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });
  const login = await call("POST", "/api/auth/login", { body: { email, password: "a-good-password" } });
  return { id: pending.id, cookie: login.cookie, pin, email };
}

// A customer places a simple order; returns the code
async function placeOrder(name) {
  const { data } = await call("POST", "/api/orders", {
    body: { name, phone: "5145550123", items: [{ id: "hot-black-coffee", quantity: 1 }] },
  });
  return data.code;
}

test("the queue lists open orders, oldest first, and needs a staff login", async () => {
  const anonymous = await call("GET", "/api/queue");
  assert.equal(anonymous.status, 401);

  const staff = await staffMember();
  const first = await placeOrder("First");
  await new Promise((r) => setTimeout(r, 5));
  const second = await placeOrder("Second");

  const { status, data } = await call("GET", "/api/queue", { cookie: staff.cookie });
  assert.equal(status, 200);
  const codes = data.map((o) => o.code);
  assert.ok(codes.indexOf(first) < codes.indexOf(second));
  assert.ok(data.every((o) => o.phone === undefined));
});

test("staff move an order received → in progress → ready → picked up", async () => {
  const staff = await staffMember();
  const code = await placeOrder("Walker");
  const steps = ["in_progress", "ready", "picked_up"];
  for (const status of steps) {
    const { status: code200, data } = await call("POST", `/api/queue/${code}/status`, { cookie: staff.cookie, body: { status } });
    assert.equal(code200, 200);
    assert.equal(data.status, status);
  }
  const after = await call("GET", `/api/orders/${code}`);
  assert.equal(after.data.status, "picked_up");
});

test("skipping a step is refused (409)", async () => {
  const staff = await staffMember();
  const code = await placeOrder("Skipper");
  const { status, data } = await call("POST", `/api/queue/${code}/status`, { cookie: staff.cookie, body: { status: "ready" } });
  assert.equal(status, 409);
  assert.match(data.error, /cannot become/);
});

test("a status change is logged with who made it", async () => {
  const staff = await staffMember();
  const code = await placeOrder("Logged");
  await call("POST", `/api/queue/${code}/status`, { cookie: staff.cookie, body: { status: "in_progress" } });
  const orders = JSON.parse(fs.readFileSync(path.join(tempData, "orders.json"), "utf8"));
  const order = orders.find((o) => o.code === code);
  assert.equal(order.history.length, 1);
  assert.equal(order.history[0].by, staff.id);
  assert.equal(order.history[0].after.status, "in_progress");
});

test("the owner sees every order with phone numbers, staff cannot (403)", async () => {
  const staff = await staffMember();
  const code = await placeOrder("Owned");
  const owner = await call("GET", "/api/admin/orders", { cookie: await ownerCookie() });
  assert.equal(owner.status, 200);
  assert.ok(owner.data.some((o) => o.code === code && o.phone === "5145550123"));

  const denied = await call("GET", "/api/admin/orders", { cookie: staff.cookie });
  assert.equal(denied.status, 403);
});

test("order list filters by status", async () => {
  const code = await placeOrder("Filtered");
  const staff = await staffMember();
  await call("POST", `/api/queue/${code}/status`, { cookie: staff.cookie, body: { status: "in_progress" } });
  const { data } = await call("GET", "/api/admin/orders?status=in_progress", { cookie: await ownerCookie() });
  assert.ok(data.length >= 1);
  assert.ok(data.every((o) => o.status === "in_progress"));
});

test("the orders CSV downloads with a header row and accents readable in Excel", async () => {
  await placeOrder("Csv Tester");
  const cookie = await ownerCookie();
  const response = await fetch(`${base}/api/admin/export/orders.csv`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/csv/);
  assert.match(response.headers.get("content-disposition"), /attachment; filename="brewshift-orders-all.csv"/);
  // The first three bytes are the BOM (EF BB BF), which tells Excel the file is UTF-8
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const text = bytes.toString("utf8");
  assert.ok(text.slice(1).startsWith("Code,Received,Customer,Phone"));
  assert.ok(text.includes("Csv Tester"));
});

test("CSV cells with commas and quotes are escaped", async () => {
  const { toCsv } = require("../src/lib/csv");
  const csv = toCsv([{ key: "a", title: "A" }], [{ a: 'say "hi", friend' }]);
  assert.equal(csv, 'A\r\n"say ""hi"", friend"\r\n');
});

test("the CSV can be limited to a date range", async () => {
  const response = await call("GET", "/api/admin/export/orders.csv?from=2000-01-01&to=2000-01-02", { cookie: await ownerCookie() });
  assert.match(response.headers.get("content-disposition"), /2000-01-01_to_2000-01-02/);
  assert.equal(response.data.trim().split("\r\n").length, 1); // header only
});

test("the punches CSV is owner-only and has names", async () => {
  const staff = await staffMember("Named Person");
  const kioskCookie = (await call("POST", "/api/kiosk/login", { body: { pin: staff.pin } })).cookie;
  await call("POST", "/api/punches/toggle", { cookie: kioskCookie });

  const denied = await call("GET", "/api/admin/export/punches.csv", { cookie: staff.cookie });
  assert.equal(denied.status, 403);

  const owner = await call("GET", "/api/admin/export/punches.csv", { cookie: await ownerCookie() });
  assert.equal(owner.status, 200);
  assert.match(owner.data, /Named Person,Clock in/);
});

test("the hours table shows each staff member's week, flagging 24 h and up", async () => {
  const staff = await staffMember("Long Shifts");
  // 25 hours inside the current week (from Sunday midnight Toronto time)
  const start = startOfWeek(new Date(), shop.timeZone).getTime();
  const punchFile = path.join(tempData, "punches.json");
  const punches = fs.existsSync(punchFile) ? JSON.parse(fs.readFileSync(punchFile, "utf8")) : [];
  punches.push(
    { id: "p_test1", userId: staff.id, type: "in", at: new Date(start + 1 * 3600000).toISOString(), correctedBy: null, originalAt: null },
    { id: "p_test2", userId: staff.id, type: "out", at: new Date(start + 26 * 3600000).toISOString(), correctedBy: null, originalAt: null }
  );
  fs.writeFileSync(path.join(tempData, "punches.json"), JSON.stringify(punches));

  const { data } = await call("GET", "/api/admin/hours", { cookie: await ownerCookie() });
  const row = data.find((r) => r.id === staff.id);
  assert.equal(row.hours, 25);
  assert.equal(row.flag, "student-limit");
});

test("the hours table is owner-only", async () => {
  const staff = await staffMember();
  const { status } = await call("GET", "/api/admin/hours", { cookie: staff.cookie });
  assert.equal(status, 403);
});

test("deactivating a staff member blocks their login and PIN at once", async () => {
  const staff = await staffMember("Leaving");
  const owner = await ownerCookie();

  const before = await call("GET", "/api/auth/me", { cookie: staff.cookie });
  assert.equal(before.status, 200);

  const deactivated = await call("POST", `/api/staff/${staff.id}/deactivate`, { cookie: owner });
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.data.user.status, "inactive");

  const after = await call("GET", "/api/auth/me", { cookie: staff.cookie });
  assert.equal(after.status, 401);

  const pin = await call("POST", "/api/kiosk/login", { body: { pin: staff.pin } });
  assert.equal(pin.status, 403);
});

test("the staff list leaves out the owner account", async () => {
  const owner = await ownerCookie();
  const list = await call("GET", "/api/staff", { cookie: owner });
  assert.equal(list.status, 200);
  assert.ok(list.data.every((u) => u.role !== "owner"));
});
