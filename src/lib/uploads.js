// Drink photos uploaded by the owner, kept on the server in data/uploads/ (git-ignored).
// Only JPEG, PNG and WebP images up to 2 MB are accepted.

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function uploadsDir() {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "..", "data");
  return path.join(dataDir, "uploads");
}

// Saves a data: URL (as the browser makes from a picked photo). Returns "/uploads/<file>".
async function saveImage(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!match) throw Object.assign(new Error("Send a JPEG, PNG or WebP photo."), { status: 400 });
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_BYTES) throw Object.assign(new Error("The photo is too big (2 MB maximum)."), { status: 413 });

  const file = `${crypto.randomBytes(8).toString("hex")}.${TYPES[match[1]]}`;
  await fs.mkdir(uploadsDir(), { recursive: true });
  await fs.writeFile(path.join(uploadsDir(), file), bytes);
  return `/uploads/${file}`;
}

// A photo path a drink may use: an uploaded one, or a built-in image
function isPhotoPath(value) {
  return typeof value === "string" && value.length <= 200 && /^(\/uploads\/[\w.-]+|images\/[\w./-]+)$/.test(value);
}

module.exports = { saveImage, isPhotoPath, uploadsDir };
