// The manager's dashboard: a quick number on every tile, and the manager's
// own clock in/out button at the top left.

const todayKey = dateKey(new Date());

// ---------- Manager clock in/out ----------

const clockChip = document.getElementById("manager-clock");

function showClockChip() {
  if (!manager) return;
  const working = isClockedIn(manager.id);
  const sessions = getWorkSessions(manager.id);
  clockChip.textContent = working
    ? `${t("admin.clockOut")} · ${t("admin.onSince", { time: clockTime(sessions[sessions.length - 1].start) })}`
    : t("admin.clockIn");
  clockChip.classList.toggle("is-working", working);
}

clockChip.addEventListener("click", () => {
  togglePunch(manager.id);
  showClockChip();
});

// ---------- Tile numbers ----------

function showTiles() {
  // Sales today: picked-up orders only (payment happens at pickup)
  const today = getOrders().filter((order) => dateKey(new Date(order.createdAt)) === todayKey);
  const paid = today.filter((order) => order.status === "picked_up");
  const revenue = paid.reduce((sum, order) => sum + orderSubtotal(order), 0);
  document.getElementById("dash-sales").textContent = money(revenue);
  document.getElementById("dash-sales-note").textContent = t("dash.salesToday", { n: paid.length });

  const open = today.filter((order) => ["received", "in_progress", "ready"].includes(order.status));
  document.getElementById("dash-orders").textContent = t("dash.ordersOpen", { n: open.length });
  document.getElementById("dash-orders-note").textContent = t("dash.ordersToday", { n: today.length });

  const menu = getMenu();
  document.getElementById("dash-menu").textContent = t("dash.menuStats", { n: menu.filter((d) => d.available).length, out: menu.filter(isSoldOut).length });

  // This week's schedule and who goes over their weekly limit
  const weekStart = startOfWeek(new Date());
  const shifts = getShiftsBetween(dateKey(weekStart), dateKey(addDays(weekStart, 6)));
  const totals = {};
  shifts.forEach((shift) => {
    totals[shift.userId] = (totals[shift.userId] || 0) + hoursBetween(shift.start, shift.end);
  });
  const allHours = Object.values(totals).reduce((sum, h) => sum + h, 0);
  const over = Object.entries(totals).filter(([id, hours]) => {
    const user = getUser(id);
    return user && hours > weeklyLimit(user);
  }).length;
  document.getElementById("dash-shifts").textContent = t("dash.shiftsStats", { hours: hoursText(allHours * 60) });
  document.getElementById("dash-shifts-warn").textContent = over ? t("dash.shiftsWarn", { n: over }) : t("dash.shiftsOk");
  document.getElementById("dash-shifts-warn").classList.toggle("is-alert", over > 0);

  const users = getUsers();
  document.getElementById("dash-employees").textContent = t("dash.employeesStats", {
    active: users.filter((u) => u.status === "approved").length,
    pending: users.filter((u) => u.status === "pending").length,
  });

  document.getElementById("dash-photos").textContent = t("dash.photosStats", { n: getPhotos().length + builtInPhotos().length });

  const low = getStock().filter((item) => item.qty <= item.min).length;
  document.getElementById("dash-stock").textContent = low ? t("dash.stockLow", { n: low }) : t("dash.stockOk");
}

if (isManager(manager)) {
  showClockChip();
  showTiles();
  setInterval(() => { showClockChip(); showTiles(); }, 30000);
}
