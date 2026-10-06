// Builds the Express app: pages, API routes and error handling.
// server.js starts it on a port; the tests start it on a temporary port.

const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");
const { readJson } = require("./lib/storage");
const { ordersRouter } = require("./routes/orders");
const { authRouter } = require("./routes/auth");
const { staffRouter } = require("./routes/staff");

function createApp(shop) {
  const app = express();
  const IS_PRODUCTION = process.env.NODE_ENV === "production";

  // Read JSON bodies sent by the browser (fetch with a JSON body)
  app.use(express.json());

  // Sessions: the server remembers who is signed in (C-4). The secret comes from
  // the environment (NFR-S4). Without one, a random secret is used for this run only.
  if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  app.use(
    session({
      secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax", secure: IS_PRODUCTION, maxAge: 12 * 60 * 60 * 1000 },
    })
  );

  // The front end (HTML, CSS, JS) lives in public/
  app.use(express.static(path.join(__dirname, "..", "public")));

  // Health check: a quick way to test that the server is alive
  app.get("/api/health", (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // Café name, address, hours and colours for the public pages (FR-02)
  app.get("/api/shop", (req, res) => {
    res.json(shop);
  });

  // Menu items that are on sale (FR-10). Unavailable items are left out.
  app.get("/api/menu", async (req, res, next) => {
    try {
      const menu = await readJson("menu");
      res.json(menu.filter((drink) => drink.available !== false));
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/orders", ordersRouter(shop));
  app.use("/api/auth", authRouter());
  app.use("/api/staff", staffRouter());

  // Development only: a visual check page and a list of every order (with phone numbers).
  // Not available in production.
  if (!IS_PRODUCTION) {
    app.use("/dev", express.static(path.join(__dirname, "..", "tools")));
    app.get("/api/dev/orders", async (req, res, next) => {
      try {
        res.json(await readJson("orders", []));
      } catch (error) {
        next(error);
      }
    });
  }

  // Unknown API address: send a clear 404 instead of an HTML page
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Last stop for errors: a clear JSON message, never a stack trace (NFR-R1, NFR-S7)
  app.use((error, req, res, next) => {
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "The request is not valid JSON." });
    }
    console.error(error);
    res.status(500).json({ error: "Something went wrong on the server." });
  });

  return app;
}

module.exports = { createApp };
