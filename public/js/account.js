// A member's page: points, orders still being made (with live status),
// order history, details and the promotions choice. Everything comes from the server.

const STEPS = ["received", "in_progress", "ready"];

let me = null;
let orders = [];

function itemsText(order) {
  return order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
}

async function loadAccount() {
  const [who, mine] = await Promise.all([api("GET", "/api/customers/me"), api("GET", "/api/customers/orders")]);
  if (!who.ok) {
    signOutCustomer();
    window.location.replace("login.html");
    return;
  }
  me = mirrorCustomer(who.data.customer);
  if (mine.ok) orders = mine.data;
  showAll();
}

function showPoints() {
  document.getElementById("points").textContent = me.points;
  document.getElementById("points-worth").textContent = t("account.worth", { amount: money(me.points * getSettings().loyalty.pointValue), n: getSettings().loyalty.pointsPerDrink });
}

// Orders still open, with a step bar: received → being made → ready
function showCurrent() {
  const box = document.getElementById("current");
  const open = orders.filter((order) => STEPS.includes(order.status));
  box.innerHTML = open.length ? "" : `<p class="admin__hint">${t("account.noCurrent")}</p>`;
  open.forEach((order) => {
    const card = document.createElement("div");
    card.className = `order-track order-track--${order.status}`;
    card.innerHTML = `
      <div class="order-track__top"><strong class="order-track__code"></strong><span class="order-track__items"></span></div>
      <ol class="order-track__steps">
        ${STEPS.map((step) => `<li class="${STEPS.indexOf(step) <= STEPS.indexOf(order.status) ? "is-done" : ""}">${t(`account.step.${step}`)}</li>`).join("")}
      </ol>
      <p class="order-track__note"></p>`;
    card.querySelector(".order-track__code").textContent = order.code;
    card.querySelector(".order-track__items").textContent = itemsText(order);
    card.querySelector(".order-track__note").textContent = order.status === "ready" ? t("account.readyNote") : t("account.makingNote");
    box.append(card);
  });
}

function showHistory() {
  const table = document.getElementById("history");
  const past = orders.filter((order) => !STEPS.includes(order.status));
  table.innerHTML = `<thead><tr><th>${t("account.col.date")}</th><th>${t("account.col.code")}</th><th>${t("account.col.items")}</th><th>${t("account.col.total")}</th><th>${t("account.pointsCol")}</th></tr></thead><tbody></tbody>`;
  const body = table.querySelector("tbody");
  if (!past.length) body.innerHTML = `<tr><td colspan="5">${t("account.noHistory")}</td></tr>`;
  past.forEach((order) => {
    const row = body.insertRow();
    const points = [order.pointsEarned ? `+${order.pointsEarned}` : "", order.pointsUsed ? `−${order.pointsUsed}` : ""].filter(Boolean).join(" ");
    [formatLongDate(new Date(order.createdAt)), order.code, itemsText(order), money(order.totalCents / 100), points || "—"]
      .forEach((value) => { row.insertCell().textContent = value; });
  });
}

function showAll() {
  document.getElementById("account-hello").textContent = t("account.hello", { name: me.name.split(" ")[0] });
  document.getElementById("profile").textContent = `${me.name} · ${me.email} · (${me.phone.slice(0, 3)}) ${me.phone.slice(3, 6)}-${me.phone.slice(6)}`;
  document.getElementById("promos").checked = me.promos;
  showPoints();
  showCurrent();
  showHistory();
}

document.getElementById("promos").addEventListener("change", async (event) => {
  const result = await api("PUT", "/api/customers/promos", { promos: event.target.checked });
  if (result.ok) me = mirrorCustomer(result.data.customer);
});

document.getElementById("logout").addEventListener("click", async () => {
  await api("POST", "/api/customers/logout");
  signOutCustomer();
  window.location.href = "index.html";
});

loadAccount();
// The status and points update by themselves while the page is open
setInterval(async () => {
  const mine = await api("GET", "/api/customers/orders");
  const who = await api("GET", "/api/customers/me");
  if (mine.ok) orders = mine.data;
  if (who.ok) me = mirrorCustomer(who.data.customer);
  showPoints();
  showCurrent();
  showHistory();
}, 10000);
