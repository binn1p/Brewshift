// Reads and writes the JSON files in data/ (NFR-R2).
// Writes are atomic: the new content goes to a temporary file first, then
// replaces the real file in one step. A crash mid-write cannot leave a
// half-written file behind.

const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

// Read data/<name>.json. If the file does not exist yet, return `fallback`.
async function readJson(name, fallback) {
  try {
    const text = await fs.readFile(filePath(name), "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== undefined) return fallback;
    throw error;
  }
}

// Replace data/<name>.json with new content, atomically.
async function writeJson(name, value) {
  const target = filePath(name);
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fs.rename(temp, target);
}

// Run one read-change-write at a time, so two orders arriving together
// cannot overwrite each other's changes.
let queue = Promise.resolve();
function exclusive(task) {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
}

module.exports = { readJson, writeJson, exclusive };
