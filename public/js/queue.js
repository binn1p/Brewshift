// Current orders from the counter and online, in the order to make them.
// Anyone who entered their code can use it. Start → Ready → Finish; a
// finished order leaves the board. Status changes are logged with the person's name.

const queueUser = getUser(sessionStorage.getItem(SESSION_KEY));
if (!queueUser || queueUser.status !== "approved") window.location.replace("kiosk.html");

const NEXT_STEP = {
  received: { status: "in_progress", label: "queue.start" },
  in_progress: { status: "ready", label: "queue.ready" },
  ready: { status: "picked_up", label: "queue.finish" },
};

function clock(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function showQueue() {
  const orders = queueOrders();
  const grid = document.getElementById("queue");
  document.getElementById("queue-count").textContent = t("queue.count", { n: orders.length });
  grid.innerHTML = orders.length ? "" : `<p class="queue__empty">${t("queue.empty")}</p>`;

  orders.forEach((order, index) => {
    const card = document.createElement("article");
    card.className = `queue-card queue-card--${order.status}`;
    const waited = Math.round((Date.now() - new Date(order.createdAt)) / 60000);
    // Late: waiting over 10 minutes, or past the pickup time asked for
    const late = order.pickupAt ? Date.now() > new Date(order.pickupAt) : waited > 10;
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
      t("queue.in", { time: clock(new Date(order.createdAt)), n: waited }),
      order.pickupAt ? t("queue.pickup", { time: clock(new Date(order.pickupAt)) }) : order.source === "online" ? t("queue.asap") : "",
    ].filter(Boolean).join(" · ");
    const list = card.querySelector(".queue-card__items");
    order.lines.forEach((line) => {
      const li = document.createElement("li");
      li.innerHTML = "<strong></strong><small></small>";
      li.querySelector("strong").textContent = `${line.qty}× ${lineName(line)}`;
      li.querySelector("small").textContent = optionsText(line.options);
      list.append(li);
    });
    card.querySelector(".queue-card__status").textContent = t(`status.${order.status}`) + (late && order.status !== "ready" ? ` · ${t("queue.late")}` : "");

    const step = NEXT_STEP[order.status];
    const button = card.querySelector("button");
    button.textContent = t(step.label);
    button.addEventListener("click", () => {
      setOrderStatus(order.id, step.status, queueUser.id);
      showQueue();
    });
    grid.append(card);
  });
}

if (queueUser && queueUser.status === "approved") {
  showQueue();
  // New online orders show up by themselves (another tab or device saving data)
  setInterval(showQueue, 15000);
  window.addEventListener("storage", showQueue);
}
