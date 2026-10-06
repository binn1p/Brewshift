// Tests for staff registration, approval and log in, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-auth-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@test.ca";
process.env.OWNER_PASSWORD = "owner-password-1";
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

// Send a request, optionally with a session cookie; returns status, body and the cookie
async function call(method, url, { body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(base + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie");
  const text = await response.text();
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null,
    cookie: setCookie ? setCookie.split(";")[0] : null,
    setCookie,
  };
}

// Unique PIN per test, so tests do not clash with each other
let pinCounter = 200000;
function newPin() {
  return String(pinCounter++);
}

function staffForm(overrides = {}) {
  // Email uses letters only, so the PIN digits never appear inside it
  const letters = [...String(pinCounter)].map((digit) => "abcdefghij"[digit]).join("");
  return {
    name: "Linh Tran",
    email: `linh${letters}@test.ca`,
    password: "a-good-password",
    pin: newPin(),
    ...overrides,
  };
}

// Register and approve a staff member through the owner, then return their login details
async function approvedStaff() {
  const form = staffForm();
  await call("POST", "/api/auth/register", { body: form });
  const owner = await login(process.env.OWNER_EMAIL, process.env.OWNER_PASSWORD);
  const pending = await call("GET", "/api/staff/pending", { cookie: owner });
  const found = pending.data.find((u) => u.email === form.email);
  await call("POST", `/api/staff/${found.id}/approve`, { cookie: owner });
  return { form, cookie: await login(form.email, form.password) };
}

async function login(email, password) {
  const response = await call("POST", "/api/auth/login", { body: { email, password } });
  assert.equal(response.status, 200, `login failed: ${JSON.stringify(response.data)}`);
  return response.cookie;
}

test("registration creates a pending account and never returns the hashes", async () => {
  const form = staffForm();
  const { status, data } = await call("POST", "/api/auth/register", { body: form });
  assert.equal(status, 201);
  assert.equal(data.user.status, "pending");
  assert.equal(data.user.role, "staff");
  assert.equal(data.user.passwordHash, undefined);
  assert.equal(data.user.pinHash, undefined);
  assert.ok(!JSON.stringify(data).includes(form.pin));
});

test("passwords and PINs are stored only as bcrypt hashes", async () => {
  const form = staffForm();
  await call("POST", "/api/auth/register", { body: form });
  const users = JSON.parse(fs.readFileSync(path.join(tempData, "users.json"), "utf8"));
  const saved = users.find((u) => u.email === form.email);
  assert.match(saved.passwordHash, /^\$2[aby]\$10\$/);
  assert.match(saved.pinHash, /^\$2[aby]\$10\$/);
  assert.ok(!JSON.stringify(saved).includes(form.password));
  assert.ok(!JSON.stringify(saved).includes(form.pin));
});

test("a pending account cannot log in", async () => {
  const form = staffForm();
  await call("POST", "/api/auth/register", { body: form });
  const { status, data } = await call("POST", "/api/auth/login", { body: { email: form.email, password: form.password } });
  assert.equal(status, 403);
  assert.match(data.error, /approval/);
});

test("a wrong password gets 401", async () => {
  const form = staffForm();
  await call("POST", "/api/auth/register", { body: form });
  const { status } = await call("POST", "/api/auth/login", { body: { email: form.email, password: "wrong-password" } });
  assert.equal(status, 401);
});

test("a PIN already used by someone else is refused", async () => {
  const first = staffForm();
  await call("POST", "/api/auth/register", { body: first });
  const { status, data } = await call("POST", "/api/auth/register", { body: staffForm({ pin: first.pin }) });
  assert.equal(status, 409);
  assert.match(data.error, /PIN/);
});

test("an email already registered is refused", async () => {
  const form = staffForm();
  await call("POST", "/api/auth/register", { body: form });
  const { status } = await call("POST", "/api/auth/register", { body: staffForm({ email: form.email }) });
  assert.equal(status, 409);
});

test("bad registration input is refused with field messages", async () => {
  const { status, data } = await call("POST", "/api/auth/register", {
    body: { name: "", email: "not-an-email", password: "short", pin: "12ab" },
  });
  assert.equal(status, 400);
  assert.ok(data.fields.name && data.fields.email && data.fields.password && data.fields.pin);
});

test("the owner can approve a pending account, then that person can log in and see who they are", async () => {
  const { form, cookie } = await approvedStaff();
  const me = await call("GET", "/api/auth/me", { cookie });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, form.email);
  assert.equal(me.data.user.status, "approved");
});

test("logging out ends the session", async () => {
  const { cookie } = await approvedStaff();
  await call("POST", "/api/auth/logout", { cookie });
  const me = await call("GET", "/api/auth/me", { cookie });
  assert.equal(me.status, 401);
});

test("the session cookie is httpOnly and sameSite=lax", async () => {
  const { form } = await approvedStaff();
  const response = await call("POST", "/api/auth/login", { body: { email: form.email, password: form.password } });
  assert.match(response.setCookie, /HttpOnly/i);
  assert.match(response.setCookie, /SameSite=Lax/i);
});

test("the pending list needs a login, and staff cannot see it (403)", async () => {
  const anonymous = await call("GET", "/api/staff/pending");
  assert.equal(anonymous.status, 401);

  const { cookie } = await approvedStaff();
  const staff = await call("GET", "/api/staff/pending", { cookie });
  assert.equal(staff.status, 403);
});

test("a staff member cannot approve anyone (403)", async () => {
  const { cookie } = await approvedStaff();
  const form = staffForm();
  await call("POST", "/api/auth/register", { body: form });
  const owner = await login(process.env.OWNER_EMAIL, process.env.OWNER_PASSWORD);
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === form.email);
  const attempt = await call("POST", `/api/staff/${pending.id}/approve`, { cookie });
  assert.equal(attempt.status, 403);
});

test("the owner can reject a pending account, which then cannot log in", async () => {
  const form = staffForm();
  await call("POST", "/api/auth/register", { body: form });
  const owner = await login(process.env.OWNER_EMAIL, process.env.OWNER_PASSWORD);
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === form.email);
  const rejected = await call("POST", `/api/staff/${pending.id}/reject`, { cookie: owner });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.user.status, "rejected");
  const attempt = await call("POST", "/api/auth/login", { body: { email: form.email, password: form.password } });
  assert.equal(attempt.status, 403);
});

test("deciding the same account twice is refused", async () => {
  const form = staffForm();
  await call("POST", "/api/auth/register", { body: form });
  const owner = await login(process.env.OWNER_EMAIL, process.env.OWNER_PASSWORD);
  const pending = (await call("GET", "/api/staff/pending", { cookie: owner })).data.find((u) => u.email === form.email);
  await call("POST", `/api/staff/${pending.id}/approve`, { cookie: owner });
  const again = await call("POST", `/api/staff/${pending.id}/reject`, { cookie: owner });
  assert.equal(again.status, 409);
});

test("the owner account was created from the environment", async () => {
  const cookie = await login(process.env.OWNER_EMAIL, process.env.OWNER_PASSWORD);
  const me = await call("GET", "/api/auth/me", { cookie });
  assert.equal(me.data.user.role, "owner");
});
