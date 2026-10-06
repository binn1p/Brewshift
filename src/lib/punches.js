// Clock in and out ("punches") and the hours worked in a week (FR-30 to FR-33, FR-40).
// Every punch time comes from the server clock (FR-32); the browser's time is never used.
// Weeks start on Sunday, in the café's time zone (assumption A-4).

const crypto = require("crypto");

// The year, month, day, weekday and time of a moment, as seen in one time zone
function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdays.indexOf(get("weekday")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

// Sunday 00:00 in the café's time zone, as a real moment
function startOfWeek(now, timeZone) {
  const p = zonedParts(now, timeZone);
  // What the wall clock would read if it were UTC, minus the real time = the zone's offset
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  const midnightWall = Date.UTC(p.year, p.month - 1, p.day - p.weekday);
  return new Date(midnightWall - offset);
}

// The next punch type after the last one: a person alternates in, out, in, out
function nextType(userPunches) {
  const last = userPunches[userPunches.length - 1];
  return !last || last.type === "out" ? "in" : "out";
}

// Hours worked between sunday (start of week) and next sunday, from in/out pairs.
// A person still clocked in counts up to `now`.
function weekHours(userPunches, now, timeZone) {
  const from = startOfWeek(now, timeZone);
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  let minutes = 0;
  let openSince = null;
  const sorted = [...userPunches].sort((a, b) => a.at.localeCompare(b.at));
  for (const punch of sorted) {
    const at = new Date(punch.at);
    if (punch.type === "in") {
      openSince = at;
    } else if (openSince) {
      minutes += overlapMinutes(openSince, at, from, to);
      openSince = null;
    }
  }
  if (openSince) minutes += overlapMinutes(openSince, now, from, to);
  return Math.round((minutes / 60) * 100) / 100;
}

// Minutes of [start, end] that fall inside [from, to)
function overlapMinutes(start, end, from, to) {
  const s = Math.max(start.getTime(), from.getTime());
  const e = Math.min(end.getTime(), to.getTime());
  return e > s ? (e - s) / 60000 : 0;
}

// Current state for the staff page: clocked in or out
function currentState(userPunches) {
  const last = userPunches[userPunches.length - 1];
  return last && last.type === "in" ? "in" : "out";
}

function newPunch(userId, type, now) {
  return {
    id: `p_${crypto.randomBytes(4).toString("hex")}`,
    userId,
    type,
    at: now.toISOString(),
    correctedBy: null,
    originalAt: null,
  };
}

module.exports = { startOfWeek, nextType, weekHours, currentState, newPunch };
