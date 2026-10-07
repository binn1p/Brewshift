// Brewshift server: starts the app from app.js.
// Run with: npm start  (then open http://localhost:3000)

require("dotenv").config();
const { loadShop } = require("./lib/shop");
const { ensureOwner } = require("./lib/users");
const { createApp } = require("./app");
const fs = require("fs/promises");
const path = require("path");

// The menu ships in the code (data/menu.json). If the data folder is somewhere else
// (DATA_DIR, e.g. a Render disk) and the file is not there yet, copy the starting menu in.
async function seedMenuIfMissing() {
  const target = process.env.DATA_DIR;
  if (!target) return;
  const file = path.join(target, "menu.json");
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(target, { recursive: true });
    await fs.copyFile(path.join(__dirname, "..", "data", "menu.json"), file);
  }
}

const PORT = process.env.PORT || 3000;

// Load the café settings once at startup (stops the server if the file is broken)
const shop = loadShop();

// Create the owner account from .env if it does not exist yet (FR-25)
seedMenuIfMissing()
  .then(() => ensureOwner({
  email: process.env.OWNER_EMAIL,
  password: process.env.OWNER_PASSWORD,
  pin: process.env.OWNER_PIN,
  name: process.env.OWNER_NAME,
  reset: process.env.RESET_OWNER === "yes",
}))
  .then(() => {
    createApp(shop).listen(PORT, () => {
      console.log(`Brewshift server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Could not start:", error.message);
    process.exit(1);
  });
