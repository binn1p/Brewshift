// Current orders from the counter and online, in the order to make them.
// Anyone who entered their code can use it. Start → Ready → Finish; a
// finished order leaves the board. The orders and each change come from the server.

const NEXT_STEP = {
  received: { status: "in_progress", label: "queue.start" },
  in_progress: { status: "ready", label: "queue.ready" },
  ready: { status: "picked_up", label: "queue.finish" },
};

function clock(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

let orders = [];
let shown = null; // what is on the screen now, to skip redrawing when nothing changed

async function loadQueue() {
  const result = await api("GET", "/api/queue");
  if (result.status === 401) {
    window.location.replace("kiosk.html");
    return;
  }
  if (result.ok) {
    // Redrawing the buttons while someone presses one makes the press miss, so only
    // redraw when the list has really changed
    const fresh = JSON.stringify(result.data);
    if (fresh === shown) return;
    shown = fresh;
    orders = result.data;
  }
  showQueue();
}

// Moves one order along. extra carries the payment, when finishing an order that was not
// paid yet (an online order that chose "pay at pickup"); see openPaymentDialog below.
async function sendStatus(order, status, button, extra = {}) {
  button.disabled = true;
  const result = await api("POST", `/api/queue/${order.code}/status`, { status, ...extra });
  if (result.status === 401) {
    // The session ended (for example the server restarted): enter the code again
    window.location.replace("kiosk.html");
    return;
  }
  if (result.status === 400 && result.data?.needsPayment) {
    // The server does not think this one is paid either: ask, same as the button already did
    openPaymentDialog(order, button);
    return;
  }
  if (result.status === 409) alert(t("queue.moved")); // someone already moved this order on
  else if (!result.ok) alert(t("kiosk.offline"));
  shown = null; // redraw now, so the button works again
  await loadQueue();
}

// A small dialog to collect cash or card before an unpaid online order can be marked picked up
const payDialog = document.createElement("dialog");
payDialog.className = "window editor";
document.body.append(payDialog);

function openPaymentDialog(order, button) {
  payDialog.innerHTML = `
    <div class="window__header">
      <h2>${t("queue.payTitle")}</h2>
      <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
    </div>
    <form class="editor__form">
      <p>${t("queue.payFor", { code: order.code, amount: money(order.totalCents / 100) })}</p>
      <fieldset class="pay">
        <legend>${t("pos.payment")} <span class="pickup__required" aria-hidden="true">*</span></legend>
        <label class="pay__choice"><input type="radio" name="payment" value="cash" required><span>${t("payment.cash")}</span></label>
        <label class="pay__choice"><input type="radio" name="payment" value="card"><span>${t("payment.card")}</span></label>
      </fieldset>
      <label class="field" data-cash hidden><span>${t("pos.received")}</span><input type="number" name="cashReceived" min="0" step="0.05" inputmode="decimal"></label>
      <p class="admin__hint" data-change aria-live="polite"></p>
      <p class="admin__error" role="alert"></p>
      <div class="editor__buttons">
        <button type="button" class="button button--small button--light" data-cancel>${t("admin.cancel")}</button>
        <button type="submit" class="button button--small">${t("queue.payConfirm")}</button>
      </div>
    </form>`;

  const form = payDialog.querySelector("form");
  const cashField = payDialog.querySelector("[data-cash]");
  const changeLine = payDialog.querySelector("[data-change]");
  const error = payDialog.querySelector(".admin__error");

  function showChange() {
    const isCash = form.elements.payment.value === "cash";
    cashField.hidden = !isCash;
    if (!isCash) {
      changeLine.textContent = "";
      return;
    }
    const received = Number(form.elements.cashReceived.value) || 0;
    const due = order.totalCents / 100;
    changeLine.textContent = received >= due
      ? t("pos.change", { amount: money(received - due) })
      : t("pos.short", { amount: money(due - received) });
  }
  form.querySelectorAll("input[name=payment]").forEach((radio) => radio.addEventListener("change", showChange));
  form.elements.cashReceived.addEventListener("input", showChange);

  const close = () => payDialog.close();
  payDialog.querySelector(".window__close").addEventListener("click", close);
  form.querySelector("[data-cancel]").addEventListener("click", close);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const payment = form.elements.payment.value;
    const cashReceived = payment === "cash" ? Number(form.elements.cashReceived.value) || 0 : undefined;
    if (payment === "cash" && Math.round(cashReceived * 100) < order.totalCents) {
      error.textContent = t("pos.short", { amount: money(order.totalCents / 100 - cashReceived) });
      return;
    }
    payDialog.close();
    await sendStatus(order, "picked_up", button, { payment, cashReceived });
  });

  payDialog.showModal();
}

function showQueue() {
  const grid = document.getElementById("queue");
  document.getElementById("queue-count").textContent = t("queue.count", { n: orders.length });
  grid.innerHTML = orders.length ? "" : `<p class="queue__empty">${t("queue.empty")}</p>`;

  orders.forEach((order, index) => {
    const card = document.createElement("article");
    card.className = `queue-card queue-card--${order.status}`;
    const created = new Date(order.createdAt);
    const waited = Math.round((Date.now() - created) / 60000);
    // A pickup time is "HH:MM" today, in this browser's time zone
    const pickupAt = order.pickupTime ? new Date(`${dateKey(new Date())}T${order.pickupTime}:00`) : null;
    // Late: waiting over 10 minutes, or past the pickup time asked for
    const late = pickupAt ? Date.now() > pickupAt : waited > 10;
    card.classList.toggle("is-late", late && order.status !== "ready");
    card.innerHTML = `
      <div class="queue-card__top">
        <span class="queue-card__number">${index + 1}</span>
        <strong class="queue-card__code"></strong>
        <span class="badge badge--staff"></span>
      </div>
      <p class="queue-card__name"></p>
      <p class="queue-card__when"></p>
      <ul class="queue-card__items"></ul>
      <p class="queue-card__status"></p>
      <button type="button" class="button"></button>`;
    card.querySelector(".queue-card__code").textContent = order.code;
    card.querySelector(".badge").textContent = t(`source.${order.source}`);
    card.querySelector(".queue-card__name").textContent = order.customerName || "—";
    card.querySelector(".queue-card__when").textContent = [
      t("queue.in", { time: clock(created), n: waited }),
      pickupAt ? t("queue.pickup", { time: order.pickupTime }) : t("queue.asap"),
      !order.payment ? t("queue.unpaid") : "",
    ].filter(Boolean).join(" · ");
    const list = card.querySelector(".queue-card__items");
    order.items.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = "<strong></strong><small></small>";
      li.querySelector("strong").textContent = `${item.quantity}× ${item.name}`;
      li.querySelector("small").textContent = optionsText(item.options);
      list.append(li);
    });
    card.querySelector(".queue-card__status").textContent = t(`status.${order.status}`) + (late && order.status !== "ready" ? ` · ${t("queue.late")}` : "");

    const step = NEXT_STEP[order.status];
    const button = card.querySelector("button");
    button.textContent = t(step.label);
    button.addEventListener("click", () => {
      // Finishing an order that was never paid (an online "pay at pickup" order) collects
      // the payment first; everything else goes straight through
      if (step.status === "picked_up" && !order.payment) {
        openPaymentDialog(order, button);
      } else {
        sendStatus(order, step.status, button);
      }
    });
    grid.append(card);
  });
}

async function startQueue() {
  const me = await api("GET", "/api/auth/me");
  if (!me.ok) {
    window.location.replace("kiosk.html");
    return;
  }
  markOrdersSeen();
  await loadQueue();
  // New orders show up by themselves
  setInterval(loadQueue, 15000);
}

startQueue();
