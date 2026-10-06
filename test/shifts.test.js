// Tests for the work schedule, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-shift-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@shifts.ca";
process.env.OWNER_PASSWORD = "owner-password-5";
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
  return `${prefix}${[...String(counter)].map((d) => "abcdefghij"[d]).join("")}@shifts.ca`;
}

async function ownerCookie() {
  return (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
}

async function staffMember(approve = true) {
  counter += 1;
  const email = emailFor("staff");
  const pin = String(700000 + counter);
  await call("POST", "/api/auth/register", { body: { name: "Shift Worker", email, password: "a-good-password", pin } });
  const owner = await ownerCookie();
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === email);
  if (approve) await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });
  const login = approve ? await call("POST", "/api/auth/login", { body: { email, password: "a-good-password" } }) : { cookie: null };
  return { id: pending.id, cookie: login.cookie };
}

test("the owner plans a shift for an approved staff member", async () => {
  const staff = await staffMember();
  const { status, data } = await call("POST", "/api/admin/shifts", {
    cookie: await ownerCookie(),
    body: { userId: staff.id, date: "2026-10-12", start: "09:00", end: "13:00" },
  });
  assert.equal(status, 201);
  assert.equal(data.userId, staff.id);
  assert.match(data.id, /^s_/);
});

test("a shift can only be planned for an approved staff member", async () => {
  const waiting = await staffMember(false);
  const { status, data } = await call("POST", "/api/admin/shifts", {
    cookie: await ownerCookie(),
    body: { userId: waiting.id, date: "2026-10-12", start: "09:00", end: "13:00" },
  });
  assert.equal(status, 400);
  assert.ok(data.fields.userId);
});

test("bad times are refused: end before start, or wrong format", async () => {
  const staff = await staffMember();
  const owner = await ownerCookie();
  const backwards = await call("POST", "/api/admin/shifts", {
    cookie: owner,
    body: { userId: staff.id, date: "2026-10-12", start: "15:00", end: "09:00" },
  });
  assert.equal(backwards.status, 400);
  assert.ok(backwards.data.fields.end);

  const badFormat = await call("POST", "/api/admin/shifts", {
    cookie: owner,
    body: { userId: staff.id, date: "12/10/2026", start: "9am", end: "13:00" },
  });
  assert.equal(badFormat.status, 400);
  assert.ok(badFormat.data.fields.date && badFormat.data.fields.start);
});

test("staff see only their own shifts", async () => {
  const alice = await staffMember();
  const bob = await staffMember();
  const owner = await ownerCookie();
  await call("POST", "/api/admin/shifts", { cookie: owner, body: { userId: alice.id, date: "2026-10-13", start: "10:00", end: "14:00" } });
  await call("POST", "/api/admin/shifts", { cookie: owner, body: { userId: bob.id, date: "2026-10-13", start: "12:00", end: "16:00" } });

  const mine = await call("GET", "/api/shifts/me", { cookie: alice.cookie });
  assert.equal(mine.status, 200);
  assert.ok(mine.data.length >= 1);
  assert.ok(mine.data.every((s) => s.userId === alice.id));
});

test("staff cannot plan shifts (403)", async () => {
  const staff = await staffMember();
  const { status } = await call("POST", "/api/admin/shifts", {
    cookie: staff.cookie,
    body: { userId: staff.id, date: "2026-10-14", start: "09:00", end: "10:00" },
  });
  assert.equal(status, 403);
});

test("the owner sees shifts in a date range, sorted by date", async () => {
  const staff = await staffMember();
  const owner = await ownerCookie();
  await call("POST", "/api/admin/shifts", { cookie: owner, body: { userId: staff.id, date: "2026-11-03", start: "09:00", end: "10:00" } });
  await call("POST", "/api/admin/shifts", { cookie: owner, body: { userId: staff.id, date: "2026-11-02", start: "09:00", end: "10:00" } });

  const { data } = await call("GET", "/api/admin/shifts?from=2026-11-01&to=2026-11-30", { cookie: owner });
  const dates = data.filter((s) => s.userId === staff.id).map((s) => s.date);
  assert.deepEqual(dates, ["2026-11-02", "2026-11-03"]);
});

test("deleting a shift removes it; deleting it again gets 404", async () => {
  const staff = await staffMember();
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/shifts", { cookie: owner, body: { userId: staff.id, date: "2026-12-01", start: "09:00", end: "10:00" } });
  const removed = await call("DELETE", `/api/admin/shifts/${created.data.id}`, { cookie: owner });
  assert.equal(removed.status, 200);
  const again = await call("DELETE", `/api/admin/shifts/${created.data.id}`, { cookie: owner });
  assert.equal(again.status, 404);
});

test("the owner can change a shift's times, and bad times are refused", async () => {
  const staff = await staffMember();
  const owner = await ownerCookie();
  const created = await call("POST", "/api/admin/shifts", { cookie: owner, body: { userId: staff.id, date: "2027-01-04", start: "09:00", end: "13:00" } });
  const changed = await call("PUT", `/api/admin/shifts/${created.data.id}`, { cookie: owner, body: { userId: staff.id, date: "2027-01-04", start: "10:00", end: "14:00" } });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.start, "10:00");

  const bad = await call("PUT", `/api/admin/shifts/${created.data.id}`, { cookie: owner, body: { userId: staff.id, date: "2027-01-04", start: "15:00", end: "10:00" } });
  assert.equal(bad.status, 400);
});

test("copying last week fills this week with the same shifts, seven days later", async () => {
  const staff = await staffMember();
  const owner = await ownerCookie();
  // Last week (Sun 3 Jan 2027 is the start of week before 10 Jan) has a shift on Tue 5 Jan
  await call("POST", "/api/admin/shifts", { cookie: owner, body: { userId: staff.id, date: "2027-01-05", start: "08:00", end: "12:00" } });

  const copied = await call("POST", "/api/admin/shifts/copy-week", { cookie: owner, body: { weekStart: "2027-01-10" } });
  assert.equal(copied.status, 200);

  const { data } = await call("GET", "/api/admin/shifts?from=2027-01-10&to=2027-01-16", { cookie: owner });
  const mine = data.filter((s) => s.userId === staff.id);
  assert.ok(mine.some((s) => s.date === "2027-01-12" && s.start === "08:00" && s.end === "12:00"));
});

test("copy-week needs a proper date", async () => {
  const owner = await ownerCookie();
  const { status } = await call("POST", "/api/admin/shifts/copy-week", { cookie: owner, body: { weekStart: "soon" } });
  assert.equal(status, 400);
});
