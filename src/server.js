// Brewshift server: starts the app from app.js.
// Run with: npm start  (then open http://localhost:3000)

require("dotenv").config();
const { loadShop } = require("./lib/shop");
const { createApp } = require("./app");

const PORT = process.env.PORT || 3000;

// Load the café settings once at startup (stops the server if the file is broken)
const shop = loadShop();

createApp(shop).listen(PORT, () => {
  console.log(`Brewshift server running at http://localhost:${PORT}`);
});
