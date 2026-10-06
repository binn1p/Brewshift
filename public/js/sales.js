// Sales for a day, week or month: totals, a bar chart, top drinks, and a CSV report.
// Paid orders count as sales: counter orders when sent, online orders at pickup.

let current = null;

function drinkName(id) {
  return drinkLabel(findDrink(id)) || id;
}

function salesFor(range, kind) {
  const orders = ordersInRange(range.from, range.to);
  const paid = orders.filter(isPaid);
  const lost = orders.filter((order) => order.status === "no_show" || order.status === "surplus");
  const revenue = paid.reduce((sum, order) => sum + orderSubtotal(order), 0);
  const lostValue = lost.reduce((sum, order) => sum + orderSubtotal(order), 0);
  const cups = paid.reduce((sum, order) => sum + order.lines.reduce((s, line) => s + line.qty, 0), 0);

  // Bars: by hour for one day, by day for a week or month
  const buckets = [];
  if (kind === "day") {
    for (let h = 7; h <= 18; h++) buckets.push({ label: `${h}h`, value: 0, match: (d) => d.getHours() === h });
  } else {
    for (let d = new Date(range.from); d <= range.to; d = addDays(d, 1)) {
      const key = dateKey(d);
      const label = kind === "week" ? CALENDAR.days[d.getDay()] : String(d.getDate());
      buckets.push({ label, value: 0, match: (date) => dateKey(date) === key });
    }
  }
  paid.forEach((order) => {
    const at = new Date(order.createdAt);
    const bucket = buckets.find((b) => b.match(at));
    if (bucket) bucket.value += orderSubtotal(order);
  });

  // Top drinks by money brought in
  const byDrink = {};
  paid.forEach((order) => order.lines.forEach((line) => {
    const entry = byDrink[line.id] || { id: line.id, qty: 0, revenue: 0 };
    entry.qty += line.qty;
    entry.revenue += lineTotal(line.unitPrice, line.qty, line.promo);
    byDrink[line.id] = entry;
  }));
  const top = Object.values(byDrink).sort((a, b) => b.revenue - a.revenue);

  return { orders, paid, revenue, tax: revenue * taxRate(), cups, lostValue, lostCount: lost.length, buckets, top };
}

function stat(label, value) {
  return `<div class="stat"><span class="stat__label">${label}</span><span class="stat__value">${value}</span></div>`;
}

function render(range, kind) {
  const data = salesFor(range, kind);
  current = { range, kind, data };

  document.getElementById("stats").innerHTML = [
    stat(t("sales.revenue"), money(data.revenue)),
    stat(t("sales.tax"), money(data.tax)),
    stat(t("sales.orders"), data.paid.length),
    stat(t("sales.avg"), money(data.paid.length ? data.revenue / data.paid.length : 0)),
    stat(t("sales.cups"), data.cups),
    stat(t("sales.lost"), `${money(data.lostValue)} · ${data.lostCount}`),
  ].join("");

  // Bar chart: one series, so one color and no legend; the tallest bar sets the scale
  document.getElementById("chart-title").textContent = t(kind === "day" ? "sales.byHour" : "sales.byDay");
  const chart = document.getElementById("chart");
  const max = Math.max(...data.buckets.map((b) => b.value), 1);
  chart.style.setProperty("--bars", data.buckets.length);
  chart.innerHTML = data.revenue === 0 ? `<p class="chart__empty">${t("sales.none")}</p>` : data.buckets.map((b, i) => `
    <div class="chart__col">
      <button type="button" class="chart__bar" style="--h:${(b.value / max) * 100}%" aria-label="${b.label}: ${money(b.value)}">
        <span class="chart__tip">${money(b.value)}</span>
      </button>
      <span class="chart__label">${kind === "month" && i % 2 === 1 ? "" : b.label}</span>
    </div>`).join("");

  document.getElementById("chart-table").innerHTML =
    data.buckets.map((b) => `<tr><td>${b.label}</td><td>${money(b.value)}</td></tr>`).join("");

  const top = document.getElementById("top");
  top.innerHTML = `<thead><tr><th>${t("sales.col.drink")}</th><th>${t("sales.col.qty")}</th><th>${t("sales.col.revenue")}</th></tr></thead><tbody></tbody>`;
  data.top.forEach((row) => {
    const tr = document.createElement("tr");
    [drinkName(row.id), row.qty, money(row.revenue)].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });
    top.querySelector("tbody").append(tr);
  });
}

document.getElementById("report").addEventListener("click", () => {
  const { range, data } = current;
  const rows = [
    [t("sales.reportTitle", { period: range.label })],
    [],
    [t("sales.revenue"), data.revenue.toFixed(2)],
    [t("sales.tax"), data.tax.toFixed(2)],
    [t("sales.orders"), data.paid.length],
    [t("sales.cups"), data.cups],
    [t("sales.lost"), data.lostValue.toFixed(2)],
    [],
    [document.getElementById("chart-title").textContent],
    ...data.buckets.map((b) => [b.label, b.value.toFixed(2)]),
    [],
    [t("sales.col.drink"), t("sales.col.qty"), t("sales.col.revenue")],
    ...data.top.map((row) => [drinkName(row.id), row.qty, row.revenue.toFixed(2)]),
  ];
  downloadCsv(`sales-${dateKey(range.from)}-${dateKey(range.to)}.csv`, rows);
});

document.getElementById("print").addEventListener("click", () => window.print());

if (isManager(manager)) {
  syncOrders().then(() => setupPeriodPicker(document.getElementById("period"), render));
}
