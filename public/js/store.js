// Temporary data store, kept in the browser (localStorage) until the server exists.
// It holds the same lists the server will keep in week 2 (data/*.json):
//   users     staff, managers and their details
//   punches   every clock-in and clock-out
//   shifts    the work schedule for ALL staff
//   menu      the drinks (seeded from MENU_SEED in menu-data.js), editable by managers
//   orders    every order and what happened to it
//   stock     ingredients on hand
//   settings  shop info, hours, taxes, work-hour limits, home page choices
// Photos are kept under a separate key because they are large.
// Pages only call the functions below, so in week 2 we can swap the insides
// for server requests without touching the pages.
//
// DEMO ONLY: PINs are plain text so the kiosk can be tried now. The real
// server will store only bcrypt hashes (FR-23) and check PINs itself.
// Needs menu-data.js loaded first.

const DB_KEY = "brewshift-db-v4";
const CUSTOMER_KEY = "brewshift-customer-id";
const PHOTOS_KEY = "brewshift-photos";
const SESSION_KEY = "brewshift-staff-id";

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

function hoursBetween(start, end) {
  return (atTime("2000-01-01", end) - atTime("2000-01-01", start)) / 3600000;
}

// ---------- Demo data, built around today so the pages look alive ----------

// Fun A/B questions for the kiosk (editable in Settings)
const DEFAULT_QUESTIONS = [
  {
    id: "q1",
    text: { en: "Would you rather drink only iced coffee or only hot coffee forever?", fr: "Préférez-vous boire seulement du café glacé ou seulement du café chaud pour toujours ?", vi: "Bạn chọn chỉ uống cà phê đá hay chỉ uống cà phê nóng suốt đời?" },
    a: { en: "Only iced", fr: "Seulement glacé", vi: "Chỉ đá" },
    b: { en: "Only hot", fr: "Seulement chaud", vi: "Chỉ nóng" },
  },
  {
    id: "q2",
    text: { en: "Condensed milk or fresh milk?", fr: "Lait concentré ou lait frais ?", vi: "Sữa đặc hay sữa tươi?" },
    a: { en: "Condensed", fr: "Concentré", vi: "Sữa đặc" },
    b: { en: "Fresh", fr: "Frais", vi: "Sữa tươi" },
  },
  {
    id: "q3",
    text: { en: "Would you rather fight one horse-sized bean or a hundred bean-sized horses?", fr: "Préférez-vous affronter un grain de café grand comme un cheval ou cent chevaux grands comme des grains ?", vi: "Bạn chọn đấu với một hạt cà phê to bằng con ngựa hay một trăm con ngựa nhỏ bằng hạt cà phê?" },
    a: { en: "One giant bean", fr: "Un grain géant", vi: "Một hạt khổng lồ" },
    b: { en: "100 tiny horses", fr: "100 mini-chevaux", vi: "100 con ngựa tí hon" },
  },
  {
    id: "q4",
    text: { en: "Is a hot dog a sandwich?", fr: "Un hot-dog, est-ce un sandwich ?", vi: "Bánh mì kẹp xúc xích có phải là sandwich không?" },
    a: { en: "Yes", fr: "Oui", vi: "Có" },
    b: { en: "Absolutely not", fr: "Absolument pas", vi: "Không đời nào" },
  },
  {
    id: "q5",
    text: { en: "Would you rather work the 7 am open or the 6 pm close?", fr: "Préférez-vous faire l'ouverture à 7 h ou la fermeture à 18 h ?", vi: "Bạn chọn ca mở cửa 7 giờ sáng hay ca đóng cửa 6 giờ chiều?" },
    a: { en: "The open", fr: "L'ouverture", vi: "Ca mở cửa" },
    b: { en: "The close", fr: "La fermeture", vi: "Ca đóng cửa" },
  },
  {
    id: "q6",
    text: { en: "Pineapple on pizza?", fr: "De l'ananas sur la pizza ?", vi: "Pizza có dứa?" },
    a: { en: "Yes please", fr: "Oui, merci", vi: "Có chứ" },
    b: { en: "Never", fr: "Jamais", vi: "Không bao giờ" },
  },
  {
    id: "q7",
    text: { en: "Would you rather have a rewind button or a pause button for your life?", fr: "Préférez-vous un bouton retour ou un bouton pause pour votre vie ?", vi: "Bạn muốn có nút tua lại hay nút tạm dừng cho cuộc đời?" },
    a: { en: "Rewind", fr: "Retour", vi: "Tua lại" },
    b: { en: "Pause", fr: "Pause", vi: "Tạm dừng" },
  },
];

const DEFAULT_SETTINGS = {
  shop: {
    name: "minh",
    address1: "123 Rue Saint-Laurent",
    address2: "Montreal, QC H2X 2T3",
    phone: "(514) 555-0142",
    email: "hello@minhcafe.ca",
  },
  hours: { weekday: ["07:00", "18:00"], weekend: ["08:00", "17:00"] },
  socials: { instagram: "", facebook: "", tiktok: "" },
  taxes: { gst: 5, qst: 9.975 },
  // Weekly hour limits used to warn while scheduling
  limits: { international: 24, partTime: 30, fullTime: 40 },
  home: { seasonalDrink: "egg-coffee", promoDrink: "iced-milk-coffee" },
  loadingMs: 1800,
  // Members earn points per drink; each point is worth this many dollars off at the counter
  loyalty: { pointsPerDrink: 1, pointValue: 1 },
  decor: "beans",
  // Pay periods are two weeks long, counted from this Sunday
  payPeriodStart: "2026-09-27",
  questions: DEFAULT_QUESTIONS,
  pinnedQuestion: "", // "" = a different question each day
};

const ALWAYS_FREE = { 0: ["07:00", "18:00"], 1: ["07:00", "18:00"], 2: ["07:00", "18:00"], 3: ["07:00", "18:00"], 4: ["07:00", "18:00"], 5: ["07:00", "18:00"], 6: ["07:00", "18:00"] };

const DEMO_USERS = [
  {
    id: "u_owner", name: "Kim Vo", role: "manager", status: "approved", pin: "111111",
    phone: "(514) 555-0100", email: "kim@minhcafe.ca", birthDate: "1988-03-14",
    type: "full", residency: "local", availability: ALWAYS_FREE,
  },
  {
    id: "u_linh", name: "Linh Tran", role: "staff", status: "approved", pin: "123456",
    phone: "(514) 555-0111", email: "linh@example.com", birthDate: "2004-06-02",
    type: "part", residency: "international",
    availability: { 0: ["08:00", "12:00"], 1: null, 2: null, 3: ["09:00", "17:00"], 4: null, 5: ["12:00", "18:00"], 6: ["08:00", "17:00"] },
  },
  {
    id: "u_bao", name: "Bao Nguyen", role: "staff", status: "approved", pin: "246810",
    phone: "(514) 555-0122", email: "bao@example.com", birthDate: "1999-11-20",
    type: "full", residency: "local",
    availability: { 0: null, 1: ["07:00", "18:00"], 2: ["07:00", "18:00"], 3: ["07:00", "13:00"], 4: ["07:00", "18:00"], 5: null, 6: ["08:00", "17:00"] },
  },
  {
    id: "u_vy", name: "Vy Dang", role: "staff", status: "approved", pin: "135790",
    phone: "(514) 555-0133", email: "vy@example.com", birthDate: "2005-01-09",
    type: "part", residency: "local",
    availability: { 0: ["08:00", "17:00"], 1: ["12:00", "18:00"], 2: ["12:00", "18:00"], 3: null, 4: ["12:00", "18:00"], 5: ["07:00", "13:00"], 6: null },
  },
  {
    id: "u_mai", name: "Mai Pham", role: "staff", status: "pending", pin: "111222",
    phone: "(514) 555-0144", email: "mai@example.com", birthDate: "2003-08-30",
    type: "part", residency: "international", availability: ALWAYS_FREE,
  },
  {
    id: "u_an", name: "An Le", role: "staff", status: "inactive", pin: "975310",
    phone: "(514) 555-0155", email: "an@example.com", birthDate: "2001-04-17",
    type: "part", residency: "local", availability: ALWAYS_FREE,
  },
];

// Each person's usual week: day number (0 = Sunday) -> [start, end]
const DEMO_PATTERNS = {
  u_linh: { 0: ["08:00", "11:00"], 3: ["09:00", "16:00"], 5: ["12:00", "18:00"] },
  u_bao: { 1: ["07:00", "13:00"], 2: ["07:00", "13:00"], 4: ["13:00", "18:00"], 6: ["08:00", "17:00"] },
  u_vy: { 0: ["12:30", "17:00"], 1: ["12:30", "18:00"], 4: ["12:30", "18:00"], 5: ["07:00", "12:30"] },
  u_owner: { 1: ["12:30", "18:00"], 2: ["12:30", "18:00"], 3: ["12:30", "18:00"], 5: ["12:30", "18:00"] },
};

const DEMO_STOCK = [
  { id: "st_beans", name: { en: "Robusta coffee beans", fr: "Grains de café robusta" }, unit: "kg", qty: 8, min: 5 },
  { id: "st_condensed", name: { en: "Condensed milk", fr: "Lait concentré" }, unit: { en: "cans", fr: "boîtes" }, qty: 14, min: 12 },
  { id: "st_fresh", name: { en: "Fresh milk", fr: "Lait frais" }, unit: "L", qty: 6, min: 8 },
  { id: "st_almond", name: { en: "Almond milk", fr: "Lait d'amande" }, unit: "L", qty: 4, min: 3 },
  { id: "st_oat", name: { en: "Oat milk", fr: "Lait d'avoine" }, unit: "L", qty: 2, min: 3 },
  { id: "st_coconut", name: { en: "Coconut milk", fr: "Lait de coco" }, unit: { en: "cans", fr: "boîtes" }, qty: 10, min: 6 },
  { id: "st_eggs", name: { en: "Eggs", fr: "Œufs" }, unit: { en: "dozen", fr: "douzaines" }, qty: 3, min: 2 },
  { id: "st_oranges", name: { en: "Oranges", fr: "Oranges" }, unit: "kg", qty: 5, min: 4 },
  { id: "st_cups", name: { en: "Cups (16 oz)", fr: "Gobelets (16 oz)" }, unit: { en: "sleeves", fr: "paquets" }, qty: 9, min: 6 },
];

// A tiny repeatable random generator, so the demo orders are the same every time
function seededRandom(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function orderCode(random) {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += letters[Math.floor(random() * letters.length)];
  return code;
}

function buildDemoOrders(menu) {
  const random = seededRandom(287);
  const orders = [];
  const today = new Date();
  for (let back = 45; back >= 0; back--) {
    const day = addDays(today, -back);
    const key = dateKey(day);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const [open, close] = weekend ? ["08:00", "17:00"] : ["07:00", "18:00"];
    const count = 22 + Math.floor(random() * (weekend ? 26 : 18));
    for (let i = 0; i < count; i++) {
      const minutes = Math.floor(random() * hoursBetween(open, close) * 60);
      const at = new Date(atTime(key, open).getTime() + minutes * 60000);
      if (back === 0 && at > today) continue;
      const lines = [];
      const lineCount = 1 + Math.floor(random() * random() * 3);
      for (let j = 0; j < lineCount; j++) {
        const drink = menu[Math.floor(random() * menu.length)];
        lines.push({ id: drink.id, qty: 1 + Math.floor(random() * 2), unitPrice: drink.price, promo: drink.promo || null, options: { ...drink.recipe, note: "" } });
      }
      const roll = random();
      let status = "picked_up";
      if (roll > 0.95) status = "cancelled";
      else if (roll > 0.91) status = "no_show";
      else if (roll > 0.88) status = "surplus";
      // Today's newest orders are still being made
      if (back === 0 && today - at < 40 * 60000) status = ["received", "in_progress", "ready"][Math.floor(random() * 3)];
      const source = status === "surplus" ? "kitchen" : random() > 0.3 ? "online" : "counter";
      orders.push({
        id: `o_${key}_${i}`,
        code: orderCode(random),
        customerName: status === "surplus" ? "" : ["Alex", "Sam", "Jade", "Leo", "Maya", "Noah", "Chloé", "Hugo", "Anh", "Tuan"][Math.floor(random() * 10)],
        phone: status === "surplus" ? "" : `514555${String(1000 + Math.floor(random() * 8999))}`,
        source,
        takenBy: source === "counter" ? ["u_linh", "u_bao", "u_vy"][Math.floor(random() * 3)] : null,
        payment: source === "counter" ? (random() > 0.4 ? "card" : "cash") : null,
        lines,
        status,
        createdAt: at.toISOString(),
        history: [],
      });
    }
  }
  // A few orders still open right now, so the current-orders page has something to show
  const now = Date.now();
  [
    { ago: 14, status: "ready", source: "online", name: "Jade", lines: [["iced-milk-coffee", 2]] },
    { ago: 9, status: "in_progress", source: "counter", name: "Hugo", lines: [["egg-coffee", 1], ["hot-black-coffee", 1]] },
    { ago: 6, status: "received", source: "online", name: "Maya", pickupIn: 25, lines: [["coconut-coffee", 1]] },
    { ago: 3, status: "received", source: "counter", name: "Leo", lines: [["orange-coffee", 1]] },
    { ago: 1, status: "received", source: "online", name: "Alex", lines: [["iced-black-coffee", 1], ["egg-coffee", 1]] },
  ].forEach((demo, i) => {
    orders.push({
      id: `o_open_${i}`,
      code: orderCode(random),
      customerName: demo.name,
      phone: demo.source === "online" ? `514555${1000 + i}` : "",
      source: demo.source,
      takenBy: demo.source === "counter" ? "u_linh" : null,
      payment: demo.source === "counter" ? "card" : null,
      lines: demo.lines.map(([id, qty]) => {
        const drink = menu.find((d) => d.id === id);
        return { id, qty, unitPrice: drink.price, promo: drink.promo || null, options: { ...drink.recipe, note: "" } };
      }),
      status: demo.status,
      createdAt: new Date(now - demo.ago * 60000).toISOString(),
      pickupAt: demo.pickupIn ? new Date(now + demo.pickupIn * 60000).toISOString() : null,
      history: [],
    });
  });
  return orders;
}

function seedMenu() {
  return MENU_SEED.map((drink) => ({
    ...drink,
    photo: `images/menu/cutout/${drink.id}.png`,
    sidePhoto: `images/menu/${drink.id}-side.jpg`,
    available: true,
    soldOut: null, // null, { until: "YYYY-MM-DD" } for today only, or { until: null } until turned back on
  }));
}

// Demo member (password "coffee123"); the hash is SHA-256 of the password.
// DEMO ONLY: the server will use bcrypt.
const DEMO_CUSTOMERS = [
  {
    id: "c_alex", name: "Alex Martin", email: "alex@example.com", phone: "5145550123",
    passwordHash: "a3c47c16f93a8f757b80046860008d929ed6d7e0e12943a24c150170d47c359f",
    promos: true, points: 7, createdAt: "2026-09-01T12:00:00Z",
  },
];

function buildDemoData() {
  const shifts = [];
  const punches = [];
  const weekStart = startOfWeek(new Date());
  const today = dateKey(new Date());

  // Schedule from three weeks ago through two weeks ahead
  for (let i = -21; i < 14; i++) {
    const day = addDays(weekStart, i);
    for (const [userId, pattern] of Object.entries(DEMO_PATTERNS)) {
      const times = pattern[day.getDay()];
      if (!times) continue;
      const key = dateKey(day);
      shifts.push({ id: `s_${userId}_${key}`, userId, date: key, start: times[0], end: times[1] });

      // Past shifts already have punches, a few minutes off schedule
      if (key < today) {
        const wobble = ((i + 21) * 7) % 6;
        punches.push({ id: `p_${userId}_${key}_in`, userId, type: "in", at: new Date(atTime(key, times[0]).getTime() - wobble * 60000).toISOString() });
        punches.push({ id: `p_${userId}_${key}_out`, userId, type: "out", at: new Date(atTime(key, times[1]).getTime() + wobble * 60000).toISOString() });
      }
    }
  }
  const menu = seedMenu();
  const orders = buildDemoOrders(menu);
  // Alex is a demo member: some of the online orders by "Alex" are theirs
  orders.filter((o) => o.customerName === "Alex" && o.source === "online").slice(-12).forEach((o) => {
    o.customerId = "c_alex";
    o.phone = "5145550123";
  });
  return {
    users: DEMO_USERS,
    customers: DEMO_CUSTOMERS,
    punches,
    shifts,
    menu,
    orders,
    stock: DEMO_STOCK,
    settings: DEFAULT_SETTINGS,
    votes: {},
  };
}

let dbCache = null;

function loadDb() {
  if (dbCache) return dbCache;
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY));
    if (saved) {
      dbCache = saved;
      return dbCache;
    }
  } catch {
    // broken data: start again from the demo
  }
  dbCache = buildDemoData();
  saveDb(dbCache);
  return dbCache;
}

function saveDb(db) {
  dbCache = db;
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Another tab (for example the kiosk) may have changed the data
window.addEventListener("storage", (event) => {
  if (event.key === DB_KEY) dbCache = null;
});

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- Users ----------

function getUsers() {
  return loadDb().users;
}

function getUser(id) {
  return getUsers().find((user) => user.id === id) || null;
}

function findUserByPin(pin) {
  return getUsers().find((user) => user.pin === pin) || null;
}

function isPinTaken(pin, exceptId) {
  return getUsers().some((user) => user.pin === pin && user.id !== exceptId);
}

function isManager(user) {
  return Boolean(user) && user.status === "approved" && user.role === "manager";
}

function saveUser(user) {
  const db = loadDb();
  const index = db.users.findIndex((u) => u.id === user.id);
  if (index >= 0) db.users[index] = user;
  else db.users.push({ ...user, id: newId("u") });
  saveDb(db);
}

// Weekly limit for one person, from their type and the settings
function weeklyLimit(user) {
  const limits = getSettings().limits;
  if (user.residency === "international") return limits.international;
  return user.type === "full" ? limits.fullTime : limits.partTime;
}

// ---------- Punches and worked hours ----------

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
    id: newId("p"),
    userId,
    type: isClockedIn(userId) ? "out" : "in",
    at: new Date().toISOString(),
  };
  db.punches.push(punch);
  saveDb(db);
  return punch;
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
  return minutesWorkedBetween(userId, dayKey, dayKey);
}

// Minutes worked from one day to another (both included)
function minutesWorkedBetween(userId, fromKey, toKey) {
  return getWorkSessions(userId)
    .filter((session) => dateKey(session.start) >= fromKey && dateKey(session.start) <= toKey)
    .reduce((sum, session) => sum + (session.end - session.start) / 60000, 0);
}

// ---------- Shifts (schedule) ----------

// Only this person's shifts, in date order
function getShifts(userId) {
  return loadDb().shifts
    .filter((shift) => shift.userId === userId)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

function getShiftsBetween(fromKey, toKey) {
  return loadDb().shifts
    .filter((shift) => shift.date >= fromKey && shift.date <= toKey)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

function saveShift(shift) {
  const db = loadDb();
  const index = db.shifts.findIndex((s) => s.id === shift.id);
  if (index >= 0) db.shifts[index] = shift;
  else db.shifts.push({ ...shift, id: newId("s") });
  saveDb(db);
}

function deleteShift(id) {
  const db = loadDb();
  db.shifts = db.shifts.filter((shift) => shift.id !== id);
  saveDb(db);
}

// Copy every shift of the week before into this week (replacing what is there)
function copyPreviousWeek(weekStart) {
  const db = loadDb();
  const from = dateKey(addDays(weekStart, -7));
  const to = dateKey(addDays(weekStart, -1));
  const thisFrom = dateKey(weekStart);
  const thisTo = dateKey(addDays(weekStart, 6));
  db.shifts = db.shifts.filter((shift) => shift.date < thisFrom || shift.date > thisTo);
  db.shifts
    .filter((shift) => shift.date >= from && shift.date <= to)
    .forEach((shift) => {
      db.shifts.push({ ...shift, id: newId("s"), date: dateKey(addDays(atTime(shift.date, "12:00"), 7)) });
    });
  saveDb(db);
}

// ---------- Menu ----------

function getMenu() {
  return loadDb().menu;
}

function findDrink(id) {
  return getMenu().find((drink) => drink.id === id) || null;
}

function isSoldOut(drink) {
  if (!drink.soldOut) return false;
  return drink.soldOut.until === null || drink.soldOut.until >= dateKey(new Date());
}

function saveMenuItem(item) {
  const db = loadDb();
  const index = db.menu.findIndex((d) => d.id === item.id);
  if (index >= 0) db.menu[index] = item;
  else db.menu.push({ ...item, id: newId("m") });
  saveDb(db);
}

// ---------- Orders ----------

function getOrders() {
  return loadDb().orders;
}

// Before tax, after any points discount
function orderSubtotal(order) {
  const items = order.lines.reduce((sum, line) => sum + lineTotal(line.unitPrice, line.qty, line.promo), 0);
  return Math.max(0, items - (order.discount || 0));
}

function drinkCount(lines) {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

function orderTotal(order) {
  return orderSubtotal(order) * (1 + taxRate());
}

// Turn the bag into an order; returns the new order.
// extra: { source: "counter", takenBy: userId, payment: "cash" | "card" } for
// orders taken at the counter. Online orders pay at pickup (payment: null).
function addOrder(cart, customerName, phone, extra = {}) {
  const db = loadDb();
  const order = {
    id: newId("o"),
    code: orderCode(Math.random),
    customerName,
    phone: phone.replace(/\D/g, ""),
    source: "online",
    takenBy: null,
    payment: null,
    lines: cart.map((line) => ({ id: line.id, qty: line.qty, unitPrice: line.unitPrice, promo: line.promo || null, options: line.options })),
    status: "received",
    createdAt: new Date().toISOString(),
    history: [],
    customerId: null,
    pickupAt: null,
    ...extra,
  };
  db.orders.push(order);
  saveDb(db);
  // Counter orders are paid now, so the member earns points now
  if (order.payment) awardPoints(order.id);
  return order;
}

function findOrder(id) {
  return getOrders().find((order) => order.id === id) || null;
}

// Every change to a sent order is kept in its history, with who did it and
// what it looked like before, so the order log can show it.
function changeOrder(id, byUserId, action, changes) {
  const db = loadDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) return null;
  const before = {};
  Object.keys(changes).forEach((key) => { before[key] = order[key]; });
  order.history = order.history || [];
  order.history.push({ at: new Date().toISOString(), by: byUserId, action, before: JSON.parse(JSON.stringify(before)), after: JSON.parse(JSON.stringify(changes)) });
  Object.assign(order, changes);
  saveDb(db);
  // Online orders are paid at pickup: that is when the member earns points
  if (changes.status === "picked_up") awardPoints(order.id);
  return order;
}

// ---------- Members and points ----------

function getCustomers() {
  const db = loadDb();
  db.customers = db.customers || [];
  return db.customers;
}

function findCustomer(id) {
  return getCustomers().find((c) => c.id === id) || null;
}

function findCustomerByPhone(phone) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? getCustomers().find((c) => c.phone.slice(-10) === digits) || null : null;
}

function findCustomerByEmail(email) {
  return getCustomers().find((c) => c.email.toLowerCase() === email.trim().toLowerCase()) || null;
}

// DEMO ONLY: a SHA-256 hash in the browser; the server will use bcrypt (FR-23)
async function hashPassword(password) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function saveCustomer(customer) {
  const db = loadDb();
  db.customers = db.customers || [];
  const index = db.customers.findIndex((c) => c.id === customer.id);
  if (index >= 0) db.customers[index] = customer;
  else db.customers.push(customer);
  saveDb(db);
}

function signedInCustomer() {
  const id = localStorage.getItem(CUSTOMER_KEY);
  return id ? findCustomer(id) : null;
}

function signInCustomer(id) {
  localStorage.setItem(CUSTOMER_KEY, id);
}

function signOutCustomer() {
  localStorage.removeItem(CUSTOMER_KEY);
}

// Points for every drink, once per order
function awardPoints(orderId) {
  const db = loadDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order || !order.customerId || order.pointsEarned) return;
  const customer = (db.customers || []).find((c) => c.id === order.customerId);
  if (!customer) return;
  order.pointsEarned = drinkCount(order.lines) * getSettings().loyalty.pointsPerDrink;
  customer.points += order.pointsEarned;
  saveDb(db);
}

// Spend points at the counter (taken from the member right away)
function spendPoints(customerId, points) {
  const db = loadDb();
  const customer = (db.customers || []).find((c) => c.id === customerId);
  if (!customer || points > customer.points) return false;
  customer.points -= points;
  saveDb(db);
  return true;
}

// ---------- Current orders (the queue) ----------

const OPEN_STATUSES = ["received", "in_progress", "ready"];

// Orders still being made or waiting, in the order they should be made:
// by requested pickup time, or by when they came in if there is none
function queueOrders() {
  return getOrders()
    .filter((order) => OPEN_STATUSES.includes(order.status))
    .sort((a, b) => queueTime(a) - queueTime(b));
}

function queueTime(order) {
  return new Date(order.pickupAt || order.createdAt).getTime();
}

function setOrderStatus(id, status, byUserId = null) {
  return changeOrder(id, byUserId, "status", { status });
}

// A counter or online order counts as a sale once it is paid: counter orders
// are paid when sent, online orders when picked up.
function isPaid(order) {
  if (["cancelled", "deleted", "no_show", "surplus"].includes(order.status)) return false;
  return order.payment ? true : order.status === "picked_up";
}

// ---------- Stock ----------

function getStock() {
  return loadDb().stock;
}

function saveStockItem(item) {
  const db = loadDb();
  const index = db.stock.findIndex((s) => s.id === item.id);
  if (index >= 0) db.stock[index] = item;
  else db.stock.push({ ...item, id: newId("st") });
  saveDb(db);
}

// ---------- Settings ----------

function getSettings() {
  // Fill in anything added to the defaults after the data was first saved
  const saved = loadDb().settings || {};
  return { ...DEFAULT_SETTINGS, ...saved };
}

function saveSettings(settings) {
  const db = loadDb();
  db.settings = settings;
  saveDb(db);
}

function taxRate() {
  const taxes = getSettings().taxes;
  return (taxes.gst + taxes.qst) / 100;
}

// ---------- Photos (separate key: they are big) ----------

// Photos that ship with the site; they can be used but not deleted
function builtInPhotos() {
  const backgrounds = ["interior-1", "interior-2", "interior-3", "product-1", "product-2", "product-3", "street-1", "street-2", "street-3"]
    .map((name) => ({ id: `bg_${name}`, src: `images/backgrounds/${name}.jpg`, category: name.startsWith("product") ? "product" : "shop", builtIn: true }));
  const drinks = MENU_SEED.flatMap((drink) => [
    { id: `top_${drink.id}`, src: `images/menu/${drink.id}-top.jpg`, category: "product", builtIn: true },
    { id: `side_${drink.id}`, src: `images/menu/${drink.id}-side.jpg`, category: "product", builtIn: true },
  ]);
  return [...drinks, ...backgrounds];
}

function getPhotos() {
  try {
    return JSON.parse(localStorage.getItem(PHOTOS_KEY)) || [];
  } catch {
    return [];
  }
}

// Returns false when the browser is out of space
function savePhotos(photos) {
  try {
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
    return true;
  } catch {
    return false;
  }
}

// ---------- Kiosk poll ----------

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
