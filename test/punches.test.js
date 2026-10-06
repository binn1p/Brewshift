// Tests for the kiosk PIN, clock in/out and weekly hours, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-punch-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@punch.ca";
process.env.OWNER_PASSWORD = "owner-password-2";
process.env.OWNER_PIN = "111111";
fs.copyFileSync(path.join(__dirname, "..", "data", "menu.json"), path.join(tempData, "menu.json"));

const { loadShop } = require("../src/lib/shop");
const { createApp } = require("../src/app");
const { ensureOwner } = require("../src/lib/users");
const { startOfWeek, weekHours } = require("../src/lib/punches");

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

// Each test gets its own PINs and emails, so tests never clash
let counter = 0;
function unique() {
  counter += 1;
  return counter;
}

// Emails use letters only, so PIN digits never show up in them
function emailFor(n, prefix) {
  const letters = [...String(n)].map((d) => "abcdefghij"[d]).join("");
  return `${prefix}${letters}@punch.ca`;
}

// Register, approve (as owner), and return the staff member's PIN and id
async function approvedStaff() {
  const n = unique();
  const pin = String(300000 + n);
  const email = emailFor(n, "staff");
  await call("POST", "/api/auth/register", { body: { name: `Staff ${n}`, email, password: "a-good-password", pin } });
  const owner = await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } });
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner.cookie })).data.find((u) => u.email === email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner.cookie });
  return { pin, id: pending.id };
}

async function kioskLogin(pin) {
  return call("POST", "/api/kiosk/login", { body: { pin } });
}

test("week hours: Monday 9 to 5 counts 8 hours, last week does not count", () => {
  const tz = "America/Toronto";
  // Wednesday 7 Oct 2026, 15:00 in Toronto (EDT = UTC-4)
  const now = new Date("2026-10-07T19:00:00Z");
  const punches = [
    // last week (Sat 3 Oct), should not count
    { type: "in", at: "2026-10-03T14:00:00Z" },
    { type: "out", at: "2026-10-03T16:00:00Z" },
    // this week, Monday 5 Oct 9:00 to 17:00 Toronto
    { type: "in", at: "2026-10-05T13:00:00Z" },
    { type: "out", at: "2026-10-05T21:00:00Z" },
  ];
  assert.equal(weekHours(punches, now, tz), 8);
});

test("week starts on Sunday midnight in the café's time zone", () => {
  const start = startOfWeek(new Date("2026-10-07T19:00:00Z"), "America/Toronto");
  assert.equal(start.toISOString(), "2026-10-04T04:00:00.000Z");
});

test("someone still clocked in counts up to now", () => {
  const now = new Date("2026-10-07T19:00:00Z");
  // In since Wed 14:00 Toronto (18:00 UTC), so 1 hour so far
  const punches = [{ type: "in", at: "2026-10-07T18:00:00Z" }];
  assert.equal(weekHours(punches, now, "America/Toronto"), 1);
});

test("a PIN that is not recognised gets 401", async () => {
  const { status, data } = await kioskLogin("987654");
  assert.equal(status, 401);
  assert.match(data.error, /not recognised/);
});

test("a PIN that is not 6 digits gets 400", async () => {
  const { status } = await kioskLogin("12ab");
  assert.equal(status, 400);
});

test("a pending staff member's PIN is refused until approval", async () => {
  const n = unique();
  const pin = String(400000 + n);
  await call("POST", "/api/auth/register", { body: { name: "Waiting", email: emailFor(n, "waiting"), password: "a-good-password", pin } });
  const { status, data } = await kioskLogin(pin);
  assert.equal(status, 403);
  assert.match(data.error, /approval/);
});

test("an approved PIN starts a session and shows clocked out", async () => {
  const staff = await approvedStaff();
  const { status, data, cookie } = await kioskLogin(staff.pin);
  assert.equal(status, 200);
  assert.equal(data.state, "out");
  assert.ok(cookie);
});

test("clock in then clock out alternate, with the server's time", async () => {
  const staff = await approvedStaff();
  const { cookie } = await kioskLogin(staff.pin);

  const first = await call("POST", "/api/punches/toggle", { cookie });
  assert.equal(first.status, 201);
  assert.equal(first.data.punch.type, "in");
  assert.equal(first.data.state, "in");
  // The time is close to now on the server, whatever the browser might send
  assert.ok(Math.abs(Date.now() - Date.parse(first.data.punch.at)) < 60000);

  const second = await call("POST", "/api/punches/toggle", { cookie });
  assert.equal(second.data.punch.type, "out");
  assert.equal(second.data.state, "out");
});

test("a browser-sent time is ignored", async () => {
  const staff = await approvedStaff();
  const { cookie } = await kioskLogin(staff.pin);
  const { data } = await call("POST", "/api/punches/toggle", { cookie, body: { at: "2001-01-01T00:00:00Z" } });
  assert.ok(Date.parse(data.punch.at) > Date.parse("2026-01-01T00:00:00Z"));
});

test("clocking needs a session", async () => {
  const { status } = await call("POST", "/api/punches/toggle");
  assert.equal(status, 401);
});

test("my punches show only my own, with my hours and state", async () => {
  const alice = await approvedStaff();
  const bob = await approvedStaff();
  const aliceCookie = (await kioskLogin(alice.pin)).cookie;
  const bobCookie = (await kioskLogin(bob.pin)).cookie;

  await call("POST", "/api/punches/toggle", { cookie: aliceCookie });

  const mine = await call("GET", "/api/punches/me", { cookie: aliceCookie });
  assert.equal(mine.status, 200);
  assert.equal(mine.data.state, "in");
  assert.equal(mine.data.punches.length, 1);
  assert.ok(mine.data.punches.every((p) => p.userId === alice.id));

  const theirs = await call("GET", "/api/punches/me", { cookie: bobCookie });
  assert.equal(theirs.data.punches.length, 0);
  assert.equal(theirs.data.state, "out");
});
