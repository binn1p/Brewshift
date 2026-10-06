// Reads the café's settings from config/shop.json (FR-01).
// Nothing café-specific is written in the code: change the file, not the code.

const fs = require("fs");
const path = require("path");

const CONFIG_FILE = path.join(__dirname, "..", "..", "config", "shop.json");

// Read the file once at startup. A missing or broken file stops the server
// with a clear message instead of failing later on a request.
function loadShop() {
  let shop;
  try {
    shop = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read config/shop.json: ${error.message}`);
  }

  // Check the fields the pages depend on
  if (typeof shop.name !== "string" || !shop.name) {
    throw new Error("config/shop.json: 'name' is required");
  }
  if (!shop.hours || typeof shop.hours !== "object") {
    throw new Error("config/shop.json: 'hours' is required");
  }
  return shop;
}

module.exports = { loadShop };
