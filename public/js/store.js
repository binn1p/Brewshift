// Temporary data store for the staff side, kept in the browser (localStorage).
// It holds the same three lists the server will keep in week 2:
//   users    -> data/users.json    (staff accounts)
//   punches  -> data/punches.json  (every clock-in and clock-out)
//   shifts   -> data/shifts.json   (the work schedule for ALL staff)
// Pages only call the functions at the bottom, so in week 2 we can swap the
// insides for server requests without touching the pages.
//
// DEMO ONLY: the PINs below are plain text so the kiosk can be tried now.
// The real server will store only bcrypt hashes (FR-23) and check PINs itself.

const DB_KEY = "brewshift-db-v1";

const DEMO_USERS = [
  { id: "u_linh", name: "Linh Tran", role: "staff", status: "approved", pin: "123456" },
  { id: "u_bao", name: "Bao Nguyen", role: "staff", status: "approved", pin: "246810" },
  { id: "u_mai", name: "Mai Pham", role: "staff", status: "pending", pin: "111222" },
];

// Each person's usual week: day number (0 = Sunday) -> [start, end]
const DEMO_PATTERNS = {
  u_linh: { 0: ["08:00", "11:00"], 3: ["09:00", "16:00"], 5: ["12:00", "18:00"] },
  u_bao: { 1: ["07:00", "13:00"], 2: ["07:00", "13:00"], 4: ["13:00", "18:00"], 6: ["08:00", "17:00"] },
};

// ---------- Date helpers (local time) ----------

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function atTime(dayKey, hhmm) {
  return new Date(`${dayKey}T${hhmm}:00`);
}

function startOfWeek(date) {
  const sunday = new Date(date);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return sunday;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// ---------- Demo data, built around today so the pages look alive ----------

function buildDemoData() {
  const shifts = [];
  const punches = [];
  const weekStart = startOfWeek(new Date());
  const today = dateKey(new Date());

  // Schedule from last week through two weeks ahead
  for (let i = -7; i < 21; i++) {
    const day = addDays(weekStart, i);
    for (const [userId, pattern] of Object.entries(DEMO_PATTERNS)) {
      const times = pattern[day.getDay()];
      if (!times) continue;
      const key = dateKey(day);
      shifts.push({ id: `s_${userId}_${key}`, userId, date: key, start: times[0], end: times[1] });

      // Past shifts already have punches, a few minutes off schedule
      if (key < today) {
        const wobble = ((i + 7) * 7) % 6;
        punches.push({ id: `p_${userId}_${key}_in`, userId, type: "in", at: new Date(atTime(key, times[0]).getTime() - wobble * 60000).toISOString() });
        punches.push({ id: `p_${userId}_${key}_out`, userId, type: "out", at: new Date(atTime(key, times[1]).getTime() + wobble * 60000).toISOString() });
      }
    }
  }
  return { users: DEMO_USERS, punches, shifts, votes: {} };
}

function loadDb() {
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY));
    if (saved) return saved;
  } catch {
    // broken data: start again from the demo
  }
  const fresh = buildDemoData();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ---------- What the pages use ----------

function findUserByPin(pin) {
  return loadDb().users.find((user) => user.pin === pin) || null;
}

function getUser(id) {
  return loadDb().users.find((user) => user.id === id) || null;
}

// Only this person's punches, oldest first
function getPunches(userId) {
  return loadDb().punches
    .filter((punch) => punch.userId === userId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

function isClockedIn(userId) {
  const punches = getPunches(userId);
  return punches.length > 0 && punches[punches.length - 1].type === "in";
}

// Clock in if out, clock out if in. Returns the new punch.
function togglePunch(userId) {
  const db = loadDb();
  const punch = {
    id: `p_${Date.now()}`,
    userId,
    type: isClockedIn(userId) ? "out" : "in",
    at: new Date().toISOString(),
  };
  db.punches.push(punch);
  saveDb(db);
  return punch;
}

// Only this person's shifts, in date order
function getShifts(userId) {
  return loadDb().shifts
    .filter((shift) => shift.userId === userId)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

// Pairs of clock-in/clock-out; a shift still running ends "now"
function getWorkSessions(userId) {
  const sessions = [];
  let open = null;
  for (const punch of getPunches(userId)) {
    if (punch.type === "in") {
      open = new Date(punch.at);
    } else if (open) {
      sessions.push({ start: open, end: new Date(punch.at), running: false });
      open = null;
    }
  }
  if (open) sessions.push({ start: open, end: new Date(), running: true });
  return sessions;
}

// Minutes worked on one day (by the day the shift started)
function minutesWorkedOn(userId, dayKey) {
  return getWorkSessions(userId)
    .filter((session) => dateKey(session.start) === dayKey)
    .reduce((sum, session) => sum + (session.end - session.start) / 60000, 0);
}

// Kiosk "weird question" votes, per question
function getVotes(questionId) {
  return loadDb().votes[questionId] || { a: 0, b: 0 };
}

function addVote(questionId, side) {
  const db = loadDb();
  const votes = db.votes[questionId] || { a: 0, b: 0 };
  votes[side] += 1;
  db.votes[questionId] = votes;
  saveDb(db);
  return votes;
}

// Who is using the staff page on this device (cleared on "Done")
const SESSION_KEY = "brewshift-staff-id";
