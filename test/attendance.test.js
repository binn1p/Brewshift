// Tests for the owner's who-is-clocked-in list and clocking someone in or out, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-att-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@attendance.ca";
process.env.OWNER_PASSWORD = "owner-password-11";
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

// An approved staff member with a PIN; returns their id and kiosk cookie
async function staff(pin) {
  const email = `att${pin}@attendance.ca`;
  await call("POST", "/api/auth/register", { body: { name: `Person ${pin}`, email, password: "a-good-password", pin } });
  const owner = await ownerCookie();
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });
  return { id: pending.id, cookie: (await call("POST", "/api/kiosk/login", { body: { pin } })).cookie };
}

test("the owner sees who is clocked in and who is out", async () => {
  const person = await staff("910001");
  await call("POST", "/api/punches/toggle", { cookie: person.cookie });
  const list = await call("GET", "/api/admin/attendance", { cookie: await ownerCookie() });
  assert.equal(list.status, 200);
  const row = list.data.find((r) => r.id === person.id);
  assert.equal(row.state, "in");
  assert.ok(row.since);
});

test("the owner clocks someone out who forgot, and the server's time is kept", async () => {
  const person = await staff("910002");
  await call("POST", "/api/punches/toggle", { cookie: person.cookie });
  const owner = await ownerCookie();
  const out = await call("POST", `/api/admin/staff/${person.id}/punch`, { cookie: owner });
  assert.equal(out.status, 201);
  assert.equal(out.data.punch.type, "out");
  assert.ok(Math.abs(Date.now() - Date.parse(out.data.punch.at)) < 60000);

  const list = await call("GET", "/api/admin/attendance", { cookie: owner });
  assert.equal(list.data.find((r) => r.id === person.id).state, "out");
});

test("a punch made by the owner records who made it", async () => {
  const person = await staff("910003");
  const owner = (await call("GET", "/api/auth/me", { cookie: await ownerCookie() })).data.user;
  await call("POST", `/api/admin/staff/${person.id}/punch`, { cookie: await ownerCookie() });
  const punches = JSON.parse(fs.readFileSync(path.join(tempData, "punches.json"), "utf8"));
  const mine = punches.filter((p) => p.userId === person.id);
  assert.equal(mine.at(-1).enteredBy, owner.id);
});

test("staff cannot see the attendance list or clock others (403)", async () => {
  const person = await staff("910004");
  assert.equal((await call("GET", "/api/admin/attendance", { cookie: person.cookie })).status, 403);
  assert.equal((await call("POST", `/api/admin/staff/${person.id}/punch`, { cookie: person.cookie })).status, 403);
});
