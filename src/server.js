// Brewshift server: starts the app from app.js.
// Run with: npm start  (then open http://localhost:3000)

require("dotenv").config();
const { loadShop } = require("./lib/shop");
const { ensureOwner } = require("./lib/users");
const { createApp } = require("./app");

const PORT = process.env.PORT || 3000;

// Load the café settings once at startup (stops the server if the file is broken)
const shop = loadShop();

// Create the owner account from .env if it does not exist yet (FR-25)
ensureOwner({
  email: process.env.OWNER_EMAIL,
  password: process.env.OWNER_PASSWORD,
  pin: process.env.OWNER_PIN,
  name: process.env.OWNER_NAME,
})
  .then(() => {
    createApp(shop).listen(PORT, () => {
      console.log(`Brewshift server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Could not start:", error.message);
    process.exit(1);
  });
