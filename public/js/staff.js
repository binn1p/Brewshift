// One staff member's page: clock in/out, this week's hours, next shifts, export.
// Only the person who entered their code on the kiosk is shown.
// Clock times, hours and shifts all come from the server.

// Day and month words come from CALENDAR in i18n.js (English or French)
const DAY_LETTERS = CALENDAR.letters;

function clockTime(date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const hoursText = formatHours;
const shortDate = formatShortDate;

function shiftLength(shift) {
  return (atTime(shift.date, shift.end) - atTime(shift.date, shift.start)) / 60000;
}

let me = null;
let punches = []; // my punches from the server, oldest first
let shifts = []; // my shifts from the server
let working = false;

// Pairs of clock in / clock out. A shift still running ends "now".
function workSessions() {
  const sessions = [];
  let open = null;
  for (const punch of punches) {
    if (punch.type === "in") {
      open = { start: new Date(punch.at), end: null, running: true };
    } else if (open) {
      open.end = new Date(punch.at);
      open.running = false;
      sessions.push(open);
      open = null;
    }
  }
  if (open) {
    open.end = new Date();
    sessions.push(open);
  }
  return sessions;
}

// Minutes worked on one day (by the day the shift started)
function minutesWorkedOn(dayKey) {
  return workSessions()
    .filter((s) => dateKey(s.start) === dayKey)
    .reduce((sum, s) => sum + (s.end - s.start) / 60000, 0);
}

async function loadMyData() {
  const [mine, myShifts] = await Promise.all([api("GET", "/api/punches/me"), api("GET", "/api/shifts/me")]);
  if (mine.ok) {
    punches = mine.data.punches;
    working = mine.data.state === "in";
  }
  if (myShifts.ok) shifts = myShifts.data;
}

// ---------- Left panel: name and the clock in/out button ----------

const punchButton = document.getElementById("punch");
const toast = document.getElementById("staff-toast");

function showMe() {
  const sessions = workSessions();
  const current = sessions[sessions.length - 1];
  document.getElementById("staff-status").textContent = working && current
    ? t("staff.on", { time: clockTime(current.start) })
    : t("staff.off");
  document.getElementById("staff-status").classList.toggle("is-working", working);

  const todayShift = shifts.find((shift) => shift.date === dateKey(new Date()));
  document.getElementById("staff-today").textContent = todayShift
    ? t("staff.today", { start: todayShift.start, end: todayShift.end })
    : t("staff.noToday");

  punchButton.textContent = t(working ? "staff.clockOut" : "staff.clockIn");
  punchButton.classList.toggle("is-out", working);
}

punchButton.addEventListener("click", async () => {
  punchButton.disabled = true;
  const result = await api("POST", "/api/punches/toggle");
  punchButton.disabled = false;
  if (!result.ok) {
    toast.textContent = t("kiosk.offline");
    return;
  }

  await loadMyData();
  const at = clockTime(new Date(result.data.punch.at));
  if (result.data.punch.type === "in") {
    toast.textContent = t("staff.toastIn", { time: at });
  } else {
    const last = workSessions().at(-1);
    toast.textContent = t("staff.toastOut", { time: at, hours: hoursText((last.end - last.start) / 60000) });
  }
  showMe();
  showWeek();
  showNextShifts();
});

// ---------- Week view: hours worked each day, plus the scheduled shift ----------

let weekStart = startOfWeek(new Date());

function showWeek() {
  const todayKey = dateKey(new Date());
  const list = document.getElementById("week");
  list.innerHTML = "";
  let total = 0;

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const key = dateKey(day);
    const minutes = minutesWorkedOn(key);
    const shift = shifts.find((s) => s.date === key);
    total += minutes;

    const li = document.createElement("li");
    li.className = "week__day";
    if (key === todayKey) li.classList.add("is-today");
    li.innerHTML = `
      <span class="week__letter">${DAY_LETTERS[i]}</span>
      <span class="week__date">${day.getDate()}</span>
      ${minutes > 0 ? `<span class="week__hours">${hoursText(minutes)}</span>` : `<span class="week__hours week__hours--none">–</span>`}
      ${shift ? `<span class="week__shift">${shift.start}–${shift.end}</span>` : ""}`;
    list.append(li);
  }

  const end = addDays(weekStart, 6);
  document.getElementById("week-title").textContent =
    `${formatDayMonth(weekStart)} – ${formatDayMonth(end)}`;
  document.getElementById("week-total").textContent = t("staff.worked", { hours: hoursText(total) });
}

document.getElementById("week-prev").addEventListener("click", () => { weekStart = addDays(weekStart, -7); showWeek(); });
document.getElementById("week-next").addEventListener("click", () => { weekStart = addDays(weekStart, 7); showWeek(); });

// ---------- Next shifts ----------

function showNextShifts() {
  const now = new Date();
  const upcoming = shifts.filter((shift) => atTime(shift.date, shift.end) > now).slice(0, 3);
  const list = document.getElementById("next-shifts");
  list.innerHTML = upcoming.length ? "" : `<li>${t("staff.noUpcoming")}</li>`;
  upcoming.forEach((shift) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${shortDate(atTime(shift.date, "00:00"))}</strong><span>${shift.start}–${shift.end} · ${hoursText(shiftLength(shift))}</span>`;
    list.append(li);
  });
}

// ---------- Export: CSV download and print ----------

function logRows() {
  return workSessions().map((session) => ({
    date: dateKey(session.start),
    in: clockTime(session.start),
    out: session.running ? t("staff.stillIn") : clockTime(session.end),
    minutes: (session.end - session.start) / 60000,
  }));
}

// Quote every cell so commas or quotes inside never break the columns
function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

document.getElementById("download").addEventListener("click", () => {
  const lines = [["staff.col.name", "staff.col.date", "staff.col.in", "staff.col.out", "staff.col.hours"].map((key) => t(key))];
  logRows().forEach((row) => lines.push([me.name, row.date, row.in, row.out, (row.minutes / 60).toFixed(2)]));
  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `hours-${me.name.toLowerCase().replace(/\s+/g, "-")}-${dateKey(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.getElementById("print").addEventListener("click", () => {
  const from = dateKey(weekStart);
  const to = dateKey(addDays(weekStart, 6));
  const rows = logRows().filter((row) => row.date >= from && row.date <= to);
  document.getElementById("print-title").textContent = t("staff.printTitle", { name: me.name, week: document.getElementById("week-title").textContent });
  const body = document.getElementById("print-rows");
  body.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    [row.date, row.in, row.out, hoursText(row.minutes)].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });
    body.append(tr);
  });
  document.getElementById("print-total").textContent = t("staff.total", { hours: hoursText(rows.reduce((sum, row) => sum + row.minutes, 0)) });
  window.print();
});

// ---------- Done: back to the kiosk for the next person ----------

async function done() {
  await api("POST", "/api/auth/logout");
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "kiosk.html";
}

document.getElementById("done").addEventListener("click", done);

// The iPad is shared, so leave the page by itself after 2 idle minutes
let idleTimer = setTimeout(done, 120000);
["pointerdown", "keydown"].forEach((type) => document.addEventListener(type, () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(done, 120000);
}));

async function start() {
  const who = await api("GET", "/api/auth/me");
  if (!who.ok) {
    window.location.replace("kiosk.html");
    return;
  }
  me = mirrorUser(who.data.user);
  document.getElementById("staff-name").textContent = me.name;
  await loadMyData();
  showMe();
  showWeek();
  showNextShifts();
  setInterval(async () => { await loadMyData(); showMe(); showWeek(); showNextShifts(); }, 60000);
}

start();
