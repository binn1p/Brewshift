// Every order in a day, week or month, filterable by what happened to it.
// Exports as CSV (one row per order).

const STATUSES = ["received", "in_progress", "ready", "picked_up", "cancelled", "no_show", "surplus"];
let filter = "all";
let rows = [];
let range = null;

function itemsText(order) {
  return order.lines.map((line) => {
    const drink = findDrink(line.id);
    return `${line.qty}× ${drink ? drinkLabel(drink) : line.id}`;
  }).join(", ");
}

function timeText(order) {
  const at = new Date(order.createdAt);
  return range && dateKey(range.from) === dateKey(range.to) ? clockTime(at) : `${shortDate(at)} ${clockTime(at)}`;
}

function showFilter() {
  const box = document.getElementById("status-filter");
  const counts = {};
  rows.forEach((order) => { counts[order.status] = (counts[order.status] || 0) + 1; });
  box.innerHTML = "";
  ["all", ...STATUSES].forEach((status) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip-button status--${status}`;
    const n = status === "all" ? rows.length : counts[status] || 0;
    button.textContent = `${t(status === "all" ? "orders.all" : `status.${status}`)} · ${n}`;
    button.setAttribute("aria-pressed", String(filter === status));
    button.addEventListener("click", () => { filter = status; showFilter(); showTable(); });
    box.append(button);
  });
}

function shownRows() {
  return rows.filter((order) => filter === "all" || order.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function showTable() {
  const table = document.getElementById("orders");
  const list = shownRows();
  table.innerHTML = `<thead><tr>
    <th>${t("orders.col.time")}</th><th>${t("orders.col.code")}</th><th>${t("orders.col.customer")}</th>
    <th>${t("orders.col.items")}</th><th>${t("orders.col.total")}</th><th>${t("orders.col.source")}</th><th>${t("orders.col.status")}</th>
  </tr></thead><tbody></tbody>`;
  const body = table.querySelector("tbody");
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="7">${t("orders.none")}</td></tr>`;
    return;
  }
  // textContent everywhere: names and notes come from customers
  list.slice(0, 500).forEach((order) => {
    const tr = document.createElement("tr");
    [timeText(order), order.code, order.customerName || "—", itemsText(order), money(orderTotal(order)), t(`source.${order.source}`)].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });

    // Status can be changed right here (for example a forgotten pickup)
    const td = document.createElement("td");
    const select = document.createElement("select");
    select.className = `status-select status--${order.status}`;
    STATUSES.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = t(`status.${status}`);
      option.selected = status === order.status;
      select.append(option);
    });
    select.addEventListener("change", () => {
      setOrderStatus(order.id, select.value);
      order.status = select.value;
      select.className = `status-select status--${order.status}`;
      showFilter();
    });
    td.append(select);
    tr.append(td);
    body.append(tr);
  });
}

function render(newRange) {
  range = newRange;
  rows = ordersInRange(range.from, range.to);
  showFilter();
  showTable();
}

document.getElementById("csv").addEventListener("click", () => {
  const header = ["orders.col.time", "orders.col.code", "orders.col.customer", "orders.col.items", "orders.col.total", "orders.col.source", "orders.col.status"].map((key) => t(key));
  const data = shownRows().map((order) => [
    new Date(order.createdAt).toLocaleString({ en: "en-CA", fr: "fr-CA", vi: "vi-VN" }[LANG]),
    order.code, order.customerName, itemsText(order), orderTotal(order).toFixed(2),
    t(`source.${order.source}`), t(`status.${order.status}`),
  ]);
  downloadCsv(`orders-${dateKey(range.from)}-${dateKey(range.to)}.csv`, [header, ...data]);
});

document.getElementById("print").addEventListener("click", () => window.print());

if (isManager(manager)) setupPeriodPicker(document.getElementById("period"), render);
