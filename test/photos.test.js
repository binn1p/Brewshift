// Tests for drink photo uploads, run with: npm test
// Uses a temporary data folder, so the real data/ files are never changed.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempData = fs.mkdtempSync(path.join(os.tmpdir(), "brewshift-photo-"));
process.env.DATA_DIR = tempData;
process.env.SESSION_SECRET = "test-secret";
process.env.OWNER_EMAIL = "owner@photos.ca";
process.env.OWNER_PASSWORD = "owner-password-6";
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
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch { /* not JSON (an image) */ }
  const setCookie = response.headers.get("set-cookie");
  return { status: response.status, data, headers: response.headers, cookie: setCookie ? setCookie.split(";")[0] : null };
}

async function ownerCookie() {
  return (await call("POST", "/api/auth/login", { body: { email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD } })).cookie;
}

// A tiny real PNG (1x1 pixel), as a data: address
const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

test("an uploaded photo is saved and can be fetched from its address", async () => {
  const { status, data } = await call("POST", "/api/admin/uploads", { cookie: await ownerCookie(), body: { dataUrl: TINY_PNG } });
  assert.equal(status, 201);
  assert.match(data.url, /^\/uploads\/[0-9a-f]+\.png$/);
  const image = await fetch(base + data.url);
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type"), /image\/png/);
});

test("only owners can upload", async () => {
  const { status } = await call("POST", "/api/admin/uploads", { body: { dataUrl: TINY_PNG } });
  assert.equal(status, 401);
});

test("a file that is not a JPEG, PNG or WebP image is refused", async () => {
  const { status, data } = await call("POST", "/api/admin/uploads", {
    cookie: await ownerCookie(),
    body: { dataUrl: "data:text/html;base64,PGgxPmhpPC9oMT4=" },
  });
  assert.equal(status, 400);
  assert.match(data.error, /JPEG, PNG or WebP/);
});

test("a photo over 2 MB is refused", async () => {
  const big = "data:image/jpeg;base64," + Buffer.alloc(2 * 1024 * 1024 + 10).toString("base64");
  const { status, data } = await call("POST", "/api/admin/uploads", { cookie: await ownerCookie(), body: { dataUrl: big } });
  assert.equal(status, 413);
  assert.match(data.error, /too big/);
});

test("a drink can use an uploaded photo, and customers see it", async () => {
  const owner = await ownerCookie();
  const upload = await call("POST", "/api/admin/uploads", { cookie: owner, body: { dataUrl: TINY_PNG } });
  const updated = await call("PATCH", "/api/admin/menu/egg-coffee", { cookie: owner, body: { photo: upload.data.url } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.photo, upload.data.url);

  const publicMenu = await call("GET", "/api/menu");
  assert.equal(publicMenu.data.find((d) => d.id === "egg-coffee").photo, upload.data.url);
});

test("a photo address that is not a file path of ours is refused", async () => {
  const { status, data } = await call("PATCH", "/api/admin/menu/egg-coffee", {
    cookie: await ownerCookie(),
    body: { photo: "javascript:alert(1)" },
  });
  assert.equal(status, 400);
  assert.ok(data.fields.photo);
});
