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
    button.addEventListener("click", async () => {
      button.disabled = true;
      const result = await api("POST", `/api/queue/${order.code}/status`, { status: step.status });
      if (result.status === 401) {
        // The session ended (for example the server restarted): enter the code again
        window.location.replace("kiosk.html");
        return;
      }
      // 409: someone already moved this order on, so the list is refreshed
      if (result.status === 409) alert(t("queue.moved"));
      else if (!result.ok) alert(t("kiosk.offline"));
      shown = null; // redraw now, so the button works again
      await loadQueue();
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
  await loadQueue();
  // New orders show up by themselves
  setInterval(loadQueue, 15000);
}

startQueue();
