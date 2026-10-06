// Counter orders: the menu canvas + the bag as the staff member's ticket
// (see cart.js counter mode). "Today's orders" lists today's orders with a
// receipt button; only managers can edit or delete a sent order.

const posUser = getUser(sessionStorage.getItem(SESSION_KEY));
if (!posUser || posUser.status !== "approved") window.location.replace("kiosk.html");

if (posUser) document.getElementById("pos-who").textContent = t("pos.who", { name: posUser.name });

const todayWindow = document.getElementById("today-window");

function showToday() {
  const todayKey = dateKey(new Date());
  const orders = getOrders()
    .filter((order) => dateKey(new Date(order.createdAt)) === todayKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const manager = isManager(posUser);

  todayWindow.innerHTML = `
    <div class="window__header">
      <h2>${t("pos.today")}</h2>
      <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
    </div>
    ${manager ? "" : `<p class="admin__hint">${t("pos.onlyManager")}</p>`}
    <div class="admin__scroll"><table class="admin-table"><tbody></tbody></table></div>`;
  const body = todayWindow.querySelector("tbody");
  if (!orders.length) body.innerHTML = `<tr><td>${t("orders.none")}</td></tr>`;

  orders.forEach((order) => {
    const row = body.insertRow();
    const at = new Date(order.createdAt);
    [
      `${at.getHours()}:${String(at.getMinutes()).padStart(2, "0")}`,
      order.code,
      order.customerName || "—",
      linesSummary(order.lines),
      money(orderTotal(order)),
      t(`status.${order.status}`) + (order.history?.some((h) => h.action !== "status") ? ` · ${t("history.changed")}` : ""),
    ].forEach((value) => { row.insertCell().textContent = value; });

    const actions = row.insertCell();
    actions.className = "today__actions";
    const receipt = document.createElement("button");
    receipt.type = "button";
    receipt.className = "button button--small button--light";
    receipt.textContent = t("pos.receipt");
    receipt.addEventListener("click", () => printReceipt(findOrder(order.id)));
    actions.append(receipt);

    if (manager && order.status !== "deleted") {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button button--small";
      edit.textContent = t("admin.edit");
      edit.addEventListener("click", () => openOrderEditor(findOrder(order.id), showToday));
      actions.append(edit);
    }
  });

  todayWindow.querySelector(".window__close").addEventListener("click", () => todayWindow.close());
  if (!todayWindow.open) todayWindow.showModal();
}

document.getElementById("today").addEventListener("click", async () => {
  await syncOrders("/api/queue/today");
  showToday();
});

// Shared iPad: back to the kiosk after 5 idle minutes
let posIdle = setTimeout(() => window.location.replace("kiosk.html"), 300000);
["pointerdown", "keydown"].forEach((type) => document.addEventListener(type, () => {
  clearTimeout(posIdle);
  posIdle = setTimeout(() => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.replace("kiosk.html");
  }, 300000);
}));
