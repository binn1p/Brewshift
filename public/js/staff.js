// One staff member's page: clock in/out, this week's hours, next shifts, export.
// Only the person who entered their code on the kiosk is shown.

const userId = sessionStorage.getItem(SESSION_KEY);
const me = userId && getUser(userId);
if (!me || me.status !== "approved") window.location.replace("kiosk.html");

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

// ---------- Left panel: name and the clock in/out button ----------

const punchButton = document.getElementById("punch");
const toast = document.getElementById("staff-toast");

function showMe() {
  const working = isClockedIn(me.id);
  const sessions = getWorkSessions(me.id);
  const current = sessions[sessions.length - 1];
  document.getElementById("staff-status").textContent = working
    ? t("staff.on", { time: clockTime(current.start) })
    : t("staff.off");
  document.getElementById("staff-status").classList.toggle("is-working", working);

  const todayShift = getShifts(me.id).find((shift) => shift.date === dateKey(new Date()));
  document.getElementById("staff-today").textContent = todayShift
    ? t("staff.today", { start: todayShift.start, end: todayShift.end })
    : t("staff.noToday");

  punchButton.textContent = t(working ? "staff.clockOut" : "staff.clockIn");
  punchButton.classList.toggle("is-out", working);
}

punchButton.addEventListener("click", () => {
  const punch = togglePunch(me.id);
  const at = clockTime(new Date(punch.at));
  if (punch.type === "in") {
    toast.textContent = t("staff.toastIn", { time: at });
  } else {
    const sessions = getWorkSessions(me.id);
    const last = sessions[sessions.length - 1];
    toast.textContent = t("staff.toastOut", { time: at, hours: hoursText((last.end - last.start) / 60000) });
  }
  showMe();
  showWeek();
});

// ---------- Week view: hours worked each day, plus the scheduled shift ----------

let weekStart = startOfWeek(new Date());

function showWeek() {
  const todayKey = dateKey(new Date());
  const shifts = getShifts(me.id);
  const list = document.getElementById("week");
  list.innerHTML = "";
  let total = 0;

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const key = dateKey(day);
    const minutes = minutesWorkedOn(me.id, key);
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
  const upcoming = getShifts(me.id).filter((shift) => atTime(shift.date, shift.end) > now).slice(0, 3);
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
  return getWorkSessions(me.id).map((session) => ({
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

function done() {
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

if (me && me.status === "approved") {
  document.getElementById("staff-name").textContent = me.name;
  showMe();
  showWeek();
  showNextShifts();
  setInterval(() => { showMe(); showWeek(); }, 60000);
}
