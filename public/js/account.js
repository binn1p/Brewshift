// A member's page: points, orders still being made (with live status),
// order history, details and the promotions choice.

const me = signedInCustomer();
if (!me) window.location.replace("login.html");

const STEPS = ["received", "in_progress", "ready"];

function myOrders() {
  return getOrders().filter((order) => order.customerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function itemsText(order) {
  return order.lines.map((line) => {
    const drink = findDrink(line.id);
    return `${line.qty}× ${drink ? drinkName(drink) : line.id}`;
  }).join(", ");
}

function showPoints() {
  const fresh = findCustomer(me.id);
  document.getElementById("points").textContent = fresh.points;
  document.getElementById("points-worth").textContent = t("account.worth", { amount: money(fresh.points * getSettings().loyalty.pointValue), n: getSettings().loyalty.pointsPerDrink });
}

// Orders still open, with a step bar: received → being made → ready
function showCurrent() {
  const box = document.getElementById("current");
  const open = myOrders().filter((order) => STEPS.includes(order.status));
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
  const past = myOrders().filter((order) => !STEPS.includes(order.status));
  table.innerHTML = `<thead><tr><th>${t("account.col.date")}</th><th>${t("account.col.code")}</th><th>${t("account.col.items")}</th><th>${t("account.col.total")}</th><th>${t("account.pointsCol")}</th></tr></thead><tbody></tbody>`;
  const body = table.querySelector("tbody");
  if (!past.length) body.innerHTML = `<tr><td colspan="5">${t("account.noHistory")}</td></tr>`;
  past.forEach((order) => {
    const row = body.insertRow();
    const points = [order.pointsEarned ? `+${order.pointsEarned}` : "", order.pointsUsed ? `−${order.pointsUsed}` : ""].filter(Boolean).join(" ");
    [formatLongDate(new Date(order.createdAt)), order.code, itemsText(order), money(orderTotal(order)), points || "—"]
      .forEach((value) => { row.insertCell().textContent = value; });
  });
}

if (me) {
  document.getElementById("account-hello").textContent = t("account.hello", { name: me.name.split(" ")[0] });
  document.getElementById("profile").textContent = `${me.name} · ${me.email} · (${me.phone.slice(0, 3)}) ${me.phone.slice(3, 6)}-${me.phone.slice(6)}`;
  const promos = document.getElementById("promos");
  promos.checked = me.promos;
  promos.addEventListener("change", () => saveCustomer({ ...findCustomer(me.id), promos: promos.checked }));
  document.getElementById("logout").addEventListener("click", () => {
    signOutCustomer();
    window.location.href = "index.html";
  });
  showPoints();
  showCurrent();
  showHistory();
  // The status updates by itself while the page is open
  setInterval(() => { showPoints(); showCurrent(); }, 10000);
  window.addEventListener("storage", () => { showPoints(); showCurrent(); showHistory(); });
}
