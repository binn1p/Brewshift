// Shared by every manager page: only managers get in, the shared iPad
// leaves by itself after 5 idle minutes, and a few helpers for exports.
// Needs i18n.js and store.js loaded first.

const managerId = sessionStorage.getItem(SESSION_KEY);
const manager = managerId ? getUser(managerId) : null;
if (!isManager(manager)) window.location.replace("kiosk.html");

// The server forgets sessions when it restarts or redeploys: ask it, and go back to the kiosk if it does not know us
api("GET", "/api/auth/me").then((result) => {
  if (!result.ok) window.location.replace("kiosk.html");
});

function leaveDashboard() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "kiosk.html";
}

document.getElementById("done")?.addEventListener("click", leaveDashboard);

let adminIdle = setTimeout(leaveDashboard, 5 * 60000);
["pointerdown", "keydown"].forEach((type) => document.addEventListener(type, () => {
  clearTimeout(adminIdle);
  adminIdle = setTimeout(leaveDashboard, 5 * 60000);
}));

// ---------- Export helpers ----------

// Quote every cell so commas or quotes inside never break the columns
function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const link = document.createElement("a");
  // The BOM at the start lets Excel read accents (é, ư...) correctly
  link.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---------- Formatting helpers ----------

function clockTime(date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const hoursText = formatHours;
const shortDate = formatShortDate;
const longDate = formatLongDate;

const drinkLabel = drinkName;

// ---------- Day / week / month periods (sales and order log) ----------

// Returns { from, to } as Date objects (to = last day included) and a label
function periodRange(kind, anchor) {
  if (kind === "day") {
    return { from: anchor, to: anchor, label: longDate(anchor) };
  }
  if (kind === "week") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    return { from, to, label: `${shortDate(from)} – ${shortDate(to)}` };
  }
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const monthName = CALENDAR.monthsLong[anchor.getMonth()];
  return { from, to, label: LANG === "vi" ? `${monthName}, ${anchor.getFullYear()}` : `${monthName} ${anchor.getFullYear()}` };
}

function movePeriod(kind, anchor, step) {
  if (kind === "day") return addDays(anchor, step);
  if (kind === "week") return addDays(anchor, step * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + step, 1);
}

function ordersInRange(from, to) {
  const fromKey = dateKey(from);
  const toKey = dateKey(to);
  return getOrders().filter((order) => {
    const key = dateKey(new Date(order.createdAt));
    return key >= fromKey && key <= toKey;
  });
}

// Wire up a Day / Week / Month switch plus ← → buttons; calls onChange(range, kind)
function setupPeriodPicker(root, onChange) {
  let kind = "day";
  let anchor = new Date();
  anchor.setHours(0, 0, 0, 0);
  const label = root.querySelector(".period__label");

  function update() {
    root.querySelectorAll("[data-kind]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.kind === kind));
    });
    const range = periodRange(kind, anchor);
    label.textContent = range.label;
    onChange(range, kind);
  }

  root.querySelectorAll("[data-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      kind = button.dataset.kind;
      update();
    });
  });
  root.querySelector("[data-step='-1']").addEventListener("click", () => { anchor = movePeriod(kind, anchor, -1); update(); });
  root.querySelector("[data-step='1']").addEventListener("click", () => { anchor = movePeriod(kind, anchor, 1); update(); });
  update();
}
