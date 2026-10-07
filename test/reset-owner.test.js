// Tests for resetting the owner's PIN and password from the environment, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-reset-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
fs.copyFileSync(path.join(__dirname, "..", "data", "menu.json"), path.join(tempData, "menu.json"));

const { loadShop } = require("../src/lib/shop");
const { createApp } = require("../src/app");
const { ensureOwner } = require("../src/lib/users");

const OWNER = { email: "owner@reset.ca", password: "first-password-1", pin: "100001", name: "Kim Vo" };
let server;
let base;

before(async () => {
  await ensureOwner(OWNER);
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

test("without the reset flag, a changed PIN in the environment does not replace the owner's", async () => {
  await ensureOwner({ ...OWNER, pin: "100002" });
  assert.equal((await post("/api/kiosk/login", { pin: "100001" })).status, 200);
  assert.equal((await post("/api/kiosk/login", { pin: "100002" })).status, 401);
});

test("with the reset flag, the owner's PIN and password are replaced", async () => {
  await ensureOwner({ ...OWNER, pin: "112811", password: "new-password-2", reset: true });
  assert.equal((await post("/api/kiosk/login", { pin: "112811" })).status, 200);
  assert.equal((await post("/api/kiosk/login", { pin: "100001" })).status, 401);
  const login = await post("/api/auth/login", { email: OWNER.email, password: "new-password-2" });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.role, "owner");
});
