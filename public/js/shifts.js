// Weekly schedule builder. Each day has a morning and an afternoon shift
// (times from the opening hours in Settings). Drag a name onto a shift, or
// tap a name then a shift. Warns (but lets you go ahead) when someone isn't
// available or would pass their weekly hour limit. Exports: week CSV,
// two-week payroll CSV from actual clock-ins, and a text message per person.

const editor = document.getElementById("editor");
let weekStart = startOfWeek(new Date());
let pickedUserId = null;

const SPLIT = "12:30";

function weekKeys() {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => dateKey(addDays(weekStart, i)));
}

function openHours(dayNumber) {
  const hours = getSettings().hours;
  return dayNumber === 0 || dayNumber === 6 ? hours.weekend : hours.weekday;
}

function slotTimes(dayNumber, slot) {
  const [open, close] = openHours(dayNumber);
  return slot === "morning" ? [open, SPLIT] : [SPLIT, close];
}

function activeStaff() {
  return getUsers().filter((u) => u.status === "approved");
}

function weekShifts() {
  const keys = weekKeys();
  return getShiftsBetween(keys[0], keys[6]);
}

function scheduledHours(userId, shifts = weekShifts()) {
  return shifts.filter((s) => s.userId === userId).reduce((sum, s) => sum + hoursBetween(s.start, s.end), 0);
}

// Free for the whole shift on that day?
function isAvailable(user, dayNumber, start, end) {
  const slot = user.availability?.[dayNumber];
  return Boolean(slot) && slot[0] <= start && slot[1] >= end;
}

function weekLabel() {
  const end = addDays(weekStart, 6);
  return `${shortDate(weekStart)} – ${shortDate(end)}`;
}

// ---------- Roster (left) ----------

function showRoster() {
  const list = document.getElementById("roster");
  const shifts = weekShifts();
  list.innerHTML = "";
  activeStaff().forEach((user) => {
    const hours = scheduledHours(user.id, shifts);
    const limit = weeklyLimit(user);
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "roster__person";
    button.draggable = true;
    button.dataset.userId = user.id;
    button.classList.toggle("is-picked", pickedUserId === user.id);
    button.classList.toggle("is-over", hours > limit);
    button.setAttribute("aria-pressed", String(pickedUserId === user.id));
    button.innerHTML = `
      <span class="roster__name"></span>
      <span class="roster__meta"></span>
      <span class="roster__hours"></span>
      <span class="roster__bar"><span style="width:${Math.min(100, (hours / limit) * 100)}%"></span></span>`;
    button.querySelector(".roster__name").textContent = user.name;
    button.querySelector(".roster__meta").textContent = `${t(`type.${user.type}`)} · ${t(`residency.${user.residency}`)}`;
    button.querySelector(".roster__hours").textContent = `${hoursText(hours * 60)} / ${limit} h${hours > limit ? " ⚠" : ""}`;

    button.addEventListener("click", () => {
      pickedUserId = pickedUserId === user.id ? null : user.id;
      document.getElementById("roster-hint").textContent = pickedUserId ? t("shifts.picked", { name: user.name }) : t("shifts.hint");
      showRoster();
      showSchedule();
    });
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", user.id);
      pickedUserId = user.id;
      showSchedule();
    });
    li.append(button);
    list.append(li);
  });
}

// ---------- Week grid (right) ----------

function assign(userId, dayKey, slot) {
  const user = getUser(userId);
  const dayNumber = atTime(dayKey, "12:00").getDay();
  const [start, end] = slotTimes(dayNumber, slot);
  const shifts = weekShifts();

  // Already working at that time that day: nothing to do
  if (shifts.some((s) => s.userId === userId && s.date === dayKey && s.start < end && s.end > start)) return;

  if (!isAvailable(user, dayNumber, start, end) && !confirm(t("shifts.notAvailable", { name: user.name }))) return;
  const after = scheduledHours(userId, shifts) + hoursBetween(start, end);
  const limit = weeklyLimit(user);
  if (after > limit && !confirm(t("shifts.overLimit", { name: user.name, hours: hoursText(after * 60), limit }))) return;

  saveShift({ userId, date: dayKey, start, end });
  refresh();
}

function showSchedule() {
  const box = document.getElementById("schedule");
  const shifts = weekShifts();
  const picked = pickedUserId ? getUser(pickedUserId) : null;
  const todayKey = dateKey(new Date());

  box.innerHTML = `<div class="week-grid">
    <div class="week-grid__corner"></div>
    ${weekKeys().map((key, i) => `<div class="week-grid__day ${key === todayKey ? "is-today" : ""}"><strong>${CALENDAR.days[i]}</strong> ${atTime(key, "12:00").getDate()}</div>`).join("")}
    ${["morning", "afternoon"].map((slot) => `
      <div class="week-grid__slot">${t(`shifts.${slot}`)}</div>
      ${weekKeys().map((key, i) => `<div class="week-grid__cell" data-day="${key}" data-slot="${slot}" data-dow="${i}"></div>`).join("")}
    `).join("")}
  </div>`;

  box.querySelectorAll(".week-grid__cell").forEach((cell) => {
    const key = cell.dataset.day;
    const slot = cell.dataset.slot;
    const dow = Number(cell.dataset.dow);
    const [start, end] = slotTimes(dow, slot);

    // Everyone working during this slot
    shifts.filter((s) => s.date === key && s.start < end && s.end > start).forEach((shift) => {
      const user = getUser(shift.userId);
      if (!user) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "shift-chip";
      chip.innerHTML = `<span class="shift-chip__name"></span><span class="shift-chip__time">${shift.start}–${shift.end}</span>`;
      chip.querySelector(".shift-chip__name").textContent = user.name.split(" ")[0];
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        editShift(shift);
      });
      cell.append(chip);
    });

    // While a name is picked, light up the shifts that person is free for
    if (picked) cell.classList.add(isAvailable(picked, dow, start, end) ? "is-free" : "is-busy");

    cell.addEventListener("click", () => {
      if (pickedUserId) assign(pickedUserId, key, slot);
    });
    cell.addEventListener("dragover", (event) => {
      event.preventDefault();
      cell.classList.add("is-drop");
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("is-drop"));
    cell.addEventListener("drop", (event) => {
      event.preventDefault();
      cell.classList.remove("is-drop");
      assign(event.dataTransfer.getData("text/plain"), key, slot);
    });
  });
}

// Change a shift's times or remove the person from it
function editShift(shift) {
  const user = getUser(shift.userId);
  editor.innerHTML = `
    <div class="window__header">
      <h2>${t("shifts.editTitle")}</h2>
      <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
    </div>
    <form class="editor__form">
      <p class="editor__who"></p>
      <div class="editor__cols">
        <label class="field"><span>${t("shifts.start")}</span><input type="time" name="start" value="${shift.start}" required></label>
        <label class="field"><span>${t("shifts.end")}</span><input type="time" name="end" value="${shift.end}" required></label>
      </div>
      <div class="editor__buttons">
        <button type="button" class="button button--small button--light" data-remove>${t("shifts.remove")}</button>
        <button type="submit" class="button button--small">${t("admin.save")}</button>
      </div>
    </form>`;
  editor.querySelector(".editor__who").textContent = `${user.name} · ${shortDate(atTime(shift.date, "12:00"))}`;
  editor.querySelector(".window__close").addEventListener("click", () => editor.close());
  editor.querySelector("[data-remove]").addEventListener("click", () => {
    deleteShift(shift.id);
    editor.close();
    refresh();
  });
  editor.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const f = event.target.elements;
    if (f.end.value <= f.start.value) return;
    saveShift({ ...shift, start: f.start.value, end: f.end.value });
    editor.close();
    refresh();
  });
  editor.showModal();
}

function refresh() {
  document.getElementById("week-label").textContent = weekLabel();
  showRoster();
  showSchedule();
}

// ---------- Toolbar ----------

document.getElementById("week-prev").addEventListener("click", () => { weekStart = addDays(weekStart, -7); refresh(); });
document.getElementById("week-next").addEventListener("click", () => { weekStart = addDays(weekStart, 7); refresh(); });

document.getElementById("copy").addEventListener("click", () => {
  if (!confirm(t("shifts.copyConfirm"))) return;
  copyPreviousWeek(weekStart);
  refresh();
});

document.getElementById("export").addEventListener("click", () => {
  const shifts = weekShifts();
  const rows = [[t("emp.name"), ...weekKeys().map((key, i) => `${CALENDAR.days[i]} ${key}`), t("shifts.col.total")]];
  activeStaff().forEach((user) => {
    const cells = weekKeys().map((key) => shifts.filter((s) => s.userId === user.id && s.date === key).map((s) => `${s.start}-${s.end}`).join(" / "));
    rows.push([user.name, ...cells, scheduledHours(user.id, shifts).toFixed(2)]);
  });
  downloadCsv(`schedule-${weekKeys()[0]}.csv`, rows);
});

// Payroll: the two-week pay period containing this week, from actual clock-ins
document.getElementById("payroll").addEventListener("click", () => {
  const anchor = atTime(getSettings().payPeriodStart, "12:00");
  const weeksSince = Math.floor((weekStart - startOfWeek(anchor)) / (7 * 86400000));
  const periodStart = addDays(startOfWeek(anchor), Math.floor(weeksSince / 2) * 14);
  const k = (n) => dateKey(addDays(periodStart, n));
  const rows = [
    [t("shifts.payTitle", { from: k(0), to: k(13) })],
    [t("emp.name"), t("shifts.col.type"), t("shifts.col.week1"), t("shifts.col.week2"), t("shifts.col.total")],
  ];
  activeStaff().forEach((user) => {
    const w1 = minutesWorkedBetween(user.id, k(0), k(6)) / 60;
    const w2 = minutesWorkedBetween(user.id, k(7), k(13)) / 60;
    rows.push([user.name, `${t(`type.${user.type}`)} / ${t(`residency.${user.residency}`)}`, w1.toFixed(2), w2.toFixed(2), (w1 + w2).toFixed(2)]);
  });
  downloadCsv(`payroll-${k(0)}-${k(13)}.csv`, rows);
});

// Text: a ready-made message per person; the Text link opens the phone's
// Messages app with it filled in (sending needs a paid SMS service later)
document.getElementById("text").addEventListener("click", () => {
  const shifts = weekShifts();
  editor.innerHTML = `
    <div class="window__header">
      <h2>${t("shifts.textTitle")}</h2>
      <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
    </div>
    <ul class="text-list"></ul>`;
  const list = editor.querySelector(".text-list");
  activeStaff().forEach((user) => {
    const mine = shifts.filter((s) => s.userId === user.id);
    const lines = mine.length
      ? mine.map((s) => `• ${shortDate(atTime(s.date, "12:00"))}: ${s.start}–${s.end}`).join("\n")
      : t("shifts.noShifts");
    const body = t("shifts.textBody", { name: user.name.split(" ")[0], week: weekLabel(), lines });
    const li = document.createElement("li");
    li.innerHTML = `<div><strong></strong><pre></pre></div>`;
    li.querySelector("strong").textContent = user.name;
    li.querySelector("pre").textContent = body;
    const digits = (user.phone || "").replace(/\D/g, "");
    if (digits) {
      const link = document.createElement("a");
      link.className = "button button--small";
      link.href = `sms:${digits}?body=${encodeURIComponent(body)}`;
      link.textContent = t("shifts.send");
      li.append(link);
    } else {
      const none = document.createElement("span");
      none.className = "admin__hint";
      none.textContent = t("shifts.noPhone");
      li.append(none);
    }
    list.append(li);
  });
  editor.querySelector(".window__close").addEventListener("click", () => editor.close());
  editor.showModal();
});

if (isManager(manager)) refresh();
