// Shared by the counter page and the order log:
// - print a bill (before paying) or a receipt (after), using the browser's
//   print window as a stand-in for the receipt printer
// - edit or delete a sent order (managers only); every change is kept in
//   the order's history
// - describe that history for the order log
// Needs i18n.js, options.js and store.js.

function signedInUser() {
  const id = sessionStorage.getItem(SESSION_KEY);
  return id ? getUser(id) : null;
}

function lineName(line) {
  const drink = findDrink(line.id);
  return drink ? drinkName(drink) : line.id;
}

function optionsText(options) {
  if (!options) return "";
  const parts = [t(`milk.${options.milk}`), `${t("dw.sugar")} ${options.sugar}%`];
  if (options.ice !== null && options.ice !== undefined) parts.push(`${t("dw.ice")} ${options.ice}%`);
  if (options.note) parts.push(options.note);
  return parts.join(" · ");
}

// ---------- Printing ----------

function printSlip({ title, code, customer, takenBy, payment, lines, when, paid, discount = 0, pointsUsed = 0, pointsEarned = 0, cashReceived = null, change = null }) {
  const shop = getSettings().shop;
  const items = lines.reduce((sum, line) => sum + lineTotal(line.unitPrice, line.qty, line.promo), 0);
  const subtotal = Math.max(0, items - discount);
  const taxes = getTaxes();

  let slip = document.querySelector(".receipt-print");
  if (!slip) {
    slip = document.createElement("section");
    slip.className = "receipt-print";
    document.body.append(slip);
  }
  slip.innerHTML = `
    <p class="receipt__shop"></p>
    <p class="receipt__small receipt__address"></p>
    <p class="receipt__title"></p>
    <p class="receipt__small receipt__meta"></p>
    <table class="receipt__lines"></table>
    <table class="receipt__sums"></table>
    <p class="receipt__small receipt__foot"></p>`;
  // All text through textContent: names and notes come from people
  slip.querySelector(".receipt__shop").textContent = shop.name;
  slip.querySelector(".receipt__address").textContent = `${shop.address1}, ${shop.address2} · ${shop.phone}`;
  slip.querySelector(".receipt__title").textContent = code ? `${title} · ${code}` : title;
  slip.querySelector(".receipt__meta").textContent = [
    `${formatLongDate(when)} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`,
    customer ? `${t("orders.col.customer")}: ${customer}` : "",
    takenBy ? `${t("orders.col.by")}: ${takenBy}` : "",
  ].filter(Boolean).join(" · ");

  const table = slip.querySelector(".receipt__lines");
  lines.forEach((line) => {
    const row = table.insertRow();
    row.insertCell().textContent = `${line.qty}× ${lineName(line)}`;
    row.insertCell().textContent = money(lineTotal(line.unitPrice, line.qty, line.promo));
    const note = table.insertRow();
    const cell = note.insertCell();
    cell.colSpan = 2;
    cell.className = "receipt__small";
    cell.textContent = optionsText(line.options);
  });

  const sums = slip.querySelector(".receipt__sums");
  const addSum = (label, value, bold) => {
    const row = sums.insertRow();
    if (bold) row.className = "receipt__total";
    row.insertCell().textContent = label;
    row.insertCell().textContent = value;
  };
  if (discount) {
    addSum(t("receipt.items"), money(items));
    addSum(t("pos.pointsDiscount", { n: pointsUsed }), `−${money(discount)}`);
  }
  addSum(t("cart.subtotal"), money(subtotal));
  taxes.forEach((tax) => addSum(t(tax.label, { n: tax.percent }), money(subtotal * tax.rate)));
  addSum(t("cart.total"), money(subtotal * (1 + taxes.reduce((s, tax) => s + tax.rate, 0))), true);
  if (cashReceived !== null) {
    addSum(t("pos.received"), money(cashReceived));
    addSum(t("receipt.change"), money(change));
  }
  if (pointsEarned) addSum(t("receipt.points"), `+${pointsEarned}`);
  slip.querySelector(".receipt__foot").textContent = paid
    ? `${t("receipt.paidBy")}: ${t(`payment.${payment}`)} · ${t("receipt.thanks")}`
    : t("receipt.notPaid");

  document.body.classList.add("is-printing-slip");
  window.print();
  document.body.classList.remove("is-printing-slip");
}

function printBill(cart, customer, discount = 0) {
  if (!cart.length) return;
  printSlip({ title: t("receipt.bill"), customer, takenBy: signedInUser()?.name, lines: cart, when: new Date(), paid: false, discount, pointsUsed: discount / getSettings().loyalty.pointValue });
}

function printReceipt(order) {
  const taker = order.takenBy ? getUser(order.takenBy) : null;
  printSlip({
    title: t("receipt.receipt"),
    code: order.code,
    customer: order.customerName,
    takenBy: taker?.name,
    payment: order.payment,
    lines: order.lines,
    when: new Date(order.createdAt),
    paid: isPaid(order) || Boolean(order.payment),
    discount: order.discount || 0,
    pointsUsed: order.pointsUsed || 0,
    pointsEarned: order.pointsEarned || 0,
    cashReceived: order.cashReceived ?? null,
    change: order.change ?? null,
  });
}

// ---------- Editing a sent order (managers only) ----------

function openOrderEditor(order, onDone) {
  const me = signedInUser();
  if (!isManager(me)) return;
  let dialog = document.getElementById("order-editor");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "order-editor";
    dialog.className = "window editor";
    document.body.append(dialog);
  }
  const lines = JSON.parse(JSON.stringify(order.lines));

  function draw() {
    dialog.innerHTML = `
      <div class="window__header">
        <h2>${t("history.editTitle", { code: order.code })}</h2>
        <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
      </div>
      <p class="admin__hint">${t("history.editHint")}</p>
      <ul class="cart-window__items"></ul>
      <div class="editor__buttons">
        <button type="button" class="button button--small button--light" data-delete>${t("history.deleteOrder")}</button>
        <button type="button" class="button button--small" data-save>${t("admin.save")}</button>
      </div>`;
    const list = dialog.querySelector("ul");
    lines.forEach((line, index) => {
      const row = document.createElement("li");
      row.className = "cart-line";
      row.innerHTML = `
        <div class="cart-line__top">
          <strong></strong>
          <div class="stepper">
            <button type="button" data-change="-1" aria-label="${t("common.less")}">&minus;</button>
            <span></span>
            <button type="button" data-change="1" aria-label="${t("common.more")}">+</button>
          </div>
          <span class="cart-line__price"></span>
        </div>
        <small></small>`;
      row.querySelector("strong").textContent = lineName(line);
      row.querySelector(".stepper span").textContent = line.qty;
      row.querySelector(".cart-line__price").textContent = money(lineTotal(line.unitPrice, line.qty, line.promo));
      row.querySelector("small").textContent = optionsText(line.options);
      row.querySelectorAll("[data-change]").forEach((button) => button.addEventListener("click", () => {
        line.qty += Number(button.dataset.change);
        if (line.qty <= 0) lines.splice(index, 1);
        draw();
      }));
      list.append(row);
    });

    dialog.querySelector(".window__close").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-save]").addEventListener("click", () => {
      if (!lines.length) return;
      if (JSON.stringify(lines) !== JSON.stringify(order.lines)) changeOrder(order.id, me.id, "edited", { lines });
      dialog.close();
      onDone?.();
    });
    dialog.querySelector("[data-delete]").addEventListener("click", () => {
      if (!confirm(t("history.deleteConfirm", { code: order.code }))) return;
      changeOrder(order.id, me.id, "deleted", { status: "deleted" });
      dialog.close();
      onDone?.();
    });
  }

  draw();
  dialog.showModal();
}

// ---------- History, for the order log ----------

function linesSummary(lines) {
  return lines.map((line) => `${line.qty}× ${lineName(line)}`).join(", ");
}

function historyText(entry) {
  const who = getUser(entry.by)?.name || "—";
  const when = `${formatShortDate(new Date(entry.at))} ${String(new Date(entry.at).getHours()).padStart(2, "0")}:${String(new Date(entry.at).getMinutes()).padStart(2, "0")}`;
  let what;
  if (entry.action === "edited") {
    what = t("history.edited", { before: linesSummary(entry.before.lines), after: linesSummary(entry.after.lines) });
  } else if (entry.action === "deleted") {
    what = t("history.deleted");
  } else {
    what = t("history.status", { before: t(`status.${entry.before.status}`), after: t(`status.${entry.after.status}`) });
  }
  return `${when} · ${who}: ${what}`;
}
