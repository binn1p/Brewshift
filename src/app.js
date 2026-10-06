// Builds the Express app: pages, API routes and error handling.
// server.js starts it on a port; the tests start it on a temporary port.

const express = require("express");
const path = require("path");
const { readJson } = require("./lib/storage");
const { ordersRouter } = require("./routes/orders");

function createApp(shop) {
  const app = express();
  const IS_PRODUCTION = process.env.NODE_ENV === "production";

  // Read JSON bodies sent by the browser (fetch with a JSON body)
  app.use(express.json());

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
