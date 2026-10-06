// Brewshift server: serves the pages in public/ and the /api routes.
// Run with: npm start  (then open http://localhost:3000)

require("dotenv").config();
const express = require("express");
const path = require("path");
const { loadShop } = require("./lib/shop");

const app = express();
const PORT = process.env.PORT || 3000;

// Load the café settings once at startup (stops the server if the file is broken)
const shop = loadShop();

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

// Unknown API address: send a clear 404 instead of an HTML page
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Brewshift server running at http://localhost:${PORT}`);
});
