// Cart button + cart window. Every page that loads this script gets both.
// Needs options.js loaded first (icons, milk names, taxes); the Edit button
// also uses menu-data.js and drink-window.js.

// Counter mode (pos.html sets <body data-cart="pos">): the bag is the staff
// member's ticket, kept apart from a customer's bag, with payment and printing.
const POS_MODE = document.body.dataset.cart === "pos";
const CART_KEY = POS_MODE ? "brewshift-pos-cart" : "brewshift-cart";
const POSITION_KEY = "brewshift-cart-position";
const NAME_KEY = "brewshift-pickup-name";
const PHONE_KEY = "brewshift-pickup-phone";

// The cart is saved in the browser (localStorage) as a list like
// [{ id: "egg-coffee", name: "Egg Coffee", unitPrice: 8, qty: 2, promo: null,
//    options: { milk: "condensed", sugar: 100, ice: null, note: "" } }],
// so it survives page changes.
function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    // Skip lines saved by older test versions of the cart, which had no options
    return saved.filter((line) => line.options && typeof line.options === "object");
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

// Same drink with exactly the same choices = one line with a bigger quantity
function addToCart(item) {
  const cart = readCart();
  const same = (line) => line.id === item.id && JSON.stringify(line.options) === JSON.stringify(item.options);
  const line = cart.find(same);
  if (line) {
    line.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);

  cartButton.classList.remove("is-bumped");
  void cartButton.offsetWidth; // restart the bump animation
  cartButton.classList.add("is-bumped");
}

// Swap one line for its edited version (merging it if it now matches another line)
function replaceCartLine(index, item) {
  const cart = readCart();
  cart.splice(index, 1);
  const same = cart.find((line) => line.id === item.id && JSON.stringify(line.options) === JSON.stringify(item.options));
  if (same) {
    same.qty += item.qty;
  } else {
    cart.splice(index, 0, item);
  }
  saveCart(cart);
}

// ---------- Build the button and the window ----------

const cartButton = document.createElement("button");
cartButton.type = "button";
cartButton.className = "cart-button";
cartButton.setAttribute("aria-label", t(POS_MODE ? "pos.ticket" : "cart.open"));
cartButton.innerHTML = `<span class="cart-button__count"></span>`;

const cartWindow = document.createElement("dialog");
cartWindow.className = "window cart-window";
cartWindow.setAttribute("aria-label", t(POS_MODE ? "pos.ticket" : "cart.title"));
cartWindow.innerHTML = `
  <div class="window__header">
    <h2>${t(POS_MODE ? "pos.ticket" : "cart.title")}</h2>
    <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
  </div>
  <div class="cart-window__body"></div>`;

document.body.append(cartButton, cartWindow);

// ---------- Show what is in the cart ----------

// One small "icon + text" chip for a customize choice
function chip(icon, text) {
  const span = document.createElement("span");
  span.className = "chip";
  span.innerHTML = ICONS[icon];
  span.append(text);
  return span;
}

function renderCart() {
  const cart = readCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  cartButton.querySelector(".cart-button__count").textContent = count || "";

  const body = cartWindow.querySelector(".cart-window__body");
  if (cart.length === 0) {
    body.innerHTML = `
      <p class="cart-window__empty">${t(POS_MODE ? "pos.empty" : "cart.empty")}</p>
      ${POS_MODE ? "" : `<a class="button" href="menu.html">${t("cart.browse")}</a>`}`;
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + lineTotal(item.unitPrice, item.qty, item.promo), 0);
  const percentText = (n) => (LANG === "fr" ? String(n).replace(".", ",") : String(n));
  const taxRows = getTaxes().map((tax) => `<p class="cart-window__sum"><span>${t(tax.label, { n: percentText(tax.percent) })}</span><span>${money(subtotal * tax.rate)}</span></p>`).join("");
  const total = subtotal * (1 + getTaxes().reduce((sum, tax) => sum + tax.rate, 0));

  body.innerHTML = `
    <ul class="cart-window__items"></ul>
    <div class="cart-window__sums">
      <p class="cart-window__sum"><span>${t("cart.subtotal")}</span><span>${money(subtotal)}</span></p>
      ${taxRows}
      <p class="cart-window__sum cart-window__sum--total"><span>${t("cart.total")}</span><span>${money(total)}</span></p>
    </div>
    ${POS_MODE ? posCheckoutHTML(subtotal) : onlineCheckoutHTML()}`;

  if (POS_MODE) {
    setupPosCheckout(body, subtotal);
  } else {
    setupOnlineCheckout(body);
  }

  // textContent (not innerHTML) for saved text such as the note, so it is shown as plain text
  showCartLines(body, cart);
}

function cartTotalWithTax(subtotal) {
  return subtotal * (1 + getTaxes().reduce((sum, tax) => sum + tax.rate, 0));
}

// ---------- Online checkout (customers) ----------

function onlineCheckoutHTML() {
  const member = signedInCustomer();
  const drinks = drinkCount(readCart()) * getSettings().loyalty.pointsPerDrink;
  return `
    <div class="member-box">
      ${member
        ? `<p class="member-box__line"></p>`
        : `<p>${t("loyalty.invite", { n: drinks })}</p>
           <div class="member-box__links">
             <a class="button button--small" href="login.html?next=menu.html">${t("loyalty.login")}</a>
             <a class="button button--small button--light" href="login.html?mode=register&next=menu.html">${t("loyalty.register")}</a>
           </div>
           <p class="admin__hint">${t("loyalty.guest")}</p>`}
    </div>
    <form class="cart-window__checkout">
      <label class="pickup">
        <span>${t("cart.name")} <span class="pickup__required" aria-hidden="true">*</span></span>
        <input name="pickup" required maxlength="40" autocomplete="given-name" placeholder="${t("cart.namePlaceholder")}">
      </label>
      <label class="pickup">
        <span>${t("cart.phone")} <span class="pickup__required" aria-hidden="true">*</span></span>
        <input name="phone" type="tel" required maxlength="20" autocomplete="tel" placeholder="(514) 555-0142">
      </label>
      <label class="pickup">
        <span>${t("cart.pickupTime")}</span>
        <input name="pickupTime" type="time" step="300">
        <small class="admin__hint">${t("cart.pickupHint")}</small>
      </label>
      <fieldset class="pay">
        <legend>${t("cart.payWhen")}</legend>
        <label class="pay__choice"><input type="radio" name="payWhen" value="pickup" checked><span>${t("cart.payAtPickup")}</span></label>
        <label class="pay__choice"><input type="radio" name="payWhen" value="online"><span>${t("cart.payOnline")}</span></label>
      </fieldset>
      <button type="submit" class="button">${t("cart.checkout")}</button>
      <p class="cart-window__notice" role="status"></p>
    </form>`;
}

// Send the bag to the server (POST /api/orders). Only what the customer chose
// is sent: the server works out the prices itself. Returns { code, totalCents }
// or throws an Error whose message is shown to the customer.
async function sendOrder(bag, name, phone, pickupTime) {
  const body = {
    name,
    phone,
    pickupTime: pickupTime || null,
    items: bag.map((line) => ({ id: line.id, quantity: line.qty, options: line.options })),
  };
  let response;
  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(t("cart.serverDown"));
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 400) throw new Error(t("cart.checkError"));
  if (!response.ok) throw new Error(t("cart.serverDown"));
  return data;
}

// Starts an online card payment (Stripe Checkout, test mode). On success, the browser is
// sent to Stripe's own page, and never handles the card number itself.
async function payOnline(bag, name, phone, pickupTime) {
  const body = {
    name,
    phone,
    pickupTime: pickupTime || null,
    items: bag.map((line) => ({ id: line.id, quantity: line.qty, options: line.options })),
  };
  let response;
  try {
    response = await fetch("/api/payments/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(t("cart.serverDown"));
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 503) throw new Error(t("cart.payNotReady"));
  if (response.status === 400) throw new Error(t("cart.checkError"));
  if (!response.ok) throw new Error(t("cart.serverDown"));
  return data.url;
}

function setupOnlineCheckout(body) {
  // Name and phone are required: the browser blocks the submit and shows a
  // message while one is missing. Both are saved so they survive page changes.
  const checkout = body.querySelector(".cart-window__checkout");
  const pickup = checkout.elements.pickup;
  const phone = checkout.elements.phone;
  const pickupTime = checkout.elements.pickupTime;
  const member = signedInCustomer();

  if (member) {
    body.querySelector(".member-box__line").textContent = t("loyalty.signedIn", {
      name: member.name.split(" ")[0],
      points: member.points,
      n: drinkCount(readCart()) * getSettings().loyalty.pointsPerDrink,
    });
  }
  pickup.value = localStorage.getItem(NAME_KEY) || member?.name || "";
  phone.value = localStorage.getItem(PHONE_KEY) || member?.phone || "";
  pickup.addEventListener("input", () => localStorage.setItem(NAME_KEY, pickup.value.trim()));

  // A North American number: 10 digits (or 11 starting with 1), any spacing or dashes
  const checkPhone = () => {
    const digits = phone.value.replace(/\D/g, "");
    const ok = digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
    phone.setCustomValidity(ok || !phone.value ? "" : t("cart.phoneError"));
  };
  phone.addEventListener("input", () => {
    checkPhone();
    localStorage.setItem(PHONE_KEY, phone.value.trim());
  });
  checkPhone();

  // Pickup time is optional; if given it must be later today, before closing
  const day = new Date().getDay();
  const hours = getSettings().hours;
  const close = day === 0 || day === 6 ? hours.weekend[1] : hours.weekday[1];
  const checkPickup = () => {
    if (!pickupTime.value) return pickupTime.setCustomValidity("");
    const chosen = atTime(dateKey(new Date()), pickupTime.value);
    const tooSoon = chosen < new Date(Date.now() + 5 * 60000);
    const tooLate = pickupTime.value > close;
    pickupTime.setCustomValidity(tooSoon || tooLate ? t("cart.pickupError", { close }) : "");
  };
  pickupTime.max = close;
  pickupTime.addEventListener("input", checkPickup);

  checkout.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pickup.value.trim()) pickup.value = "";
    checkPickup();
    if (!checkout.reportValidity()) return;
    const notice = checkout.querySelector(".cart-window__notice");
    notice.textContent = "";

    // Pay online now: hand off to Stripe. The order is only saved once Stripe confirms the
    // payment (order-paid.html), so the bag is left alone here in case the customer cancels.
    if (checkout.elements.payWhen.value === "online") {
      const submit = checkout.querySelector("[type=submit]");
      submit.disabled = true;
      try {
        window.location.href = await payOnline(readCart(), pickup.value.trim(), phone.value, pickupTime.value);
      } catch (error) {
        notice.textContent = error.message;
        submit.disabled = false;
      }
      return;
    }

    // The server checks and prices the order. The bag is only emptied once it is saved.
    let saved;
    try {
      saved = await sendOrder(readCart(), pickup.value.trim(), phone.value, pickupTime.value);
    } catch (error) {
      notice.textContent = error.message;
      return;
    }
    // Keep a copy in this browser (account page, order log) under the server's code
    const order = addOrder(readCart(), pickup.value.trim(), phone.value, {
      code: saved.code,
      customerId: member?.id || null,
      pickupAt: pickupTime.value ? atTime(dateKey(new Date()), pickupTime.value).toISOString() : null,
    });
    localStorage.removeItem(CART_KEY);
    renderCart();
    cartWindow.querySelector(".cart-window__body").innerHTML = `
      <div class="order-done">
        <p class="order-done__thanks"></p>
        <p class="order-done__label">${t("cart.code")}</p>
        <p class="order-done__code"></p>
        <p class="order-done__when"></p>
        <p class="order-done__status" aria-live="polite"></p>
        <p>${t("cart.paymentSoon")}</p>
        ${member ? `<a class="button button--small" href="account.html">${t("loyalty.track")}</a>` : ""}
      </div>`;
    cartWindow.querySelector(".order-done__code").textContent = order.code;
    cartWindow.querySelector(".order-done__thanks").textContent = t("cart.placed", { name: order.customerName });
    cartWindow.querySelector(".order-done__when").textContent = order.pickupAt
      ? t("cart.readyAt", { time: pickupTime.value })
      : t("cart.readyNow");
    watchOrderStatus(saved.code);
  });
}

// Shows the order's live status on the confirmation (FR-18). Asks the server
// every 15 seconds until the order is ready, and stops when the bag is closed.
function watchOrderStatus(code) {
  const line = cartWindow.querySelector(".order-done__status");
  let timer = null;
  const show = (status) => {
    line.textContent = t(`cart.status.${status}`);
  };
  const check = async () => {
    if (!cartWindow.open) return clearInterval(timer);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(code)}`);
      if (!response.ok) return;
      const data = await response.json();
      show(data.status);
      if (data.status === "ready" || data.status === "picked_up") clearInterval(timer);
    } catch {
      // Offline for a moment: the next check tries again
    }
  };
  show("received");
  timer = setInterval(check, 15000);
  check();
}

// ---------- Counter checkout (staff) ----------

function posCheckoutHTML(subtotal) {
  const quick = [5, 10, 20, 50];
  return `
    <form class="cart-window__checkout">
      <label class="pickup">
        <span>${t("pos.customer")} <span class="pickup__required" aria-hidden="true">*</span></span>
        <input name="pickup" required maxlength="40" autocomplete="off" placeholder="${t("pos.customerPlaceholder")}">
      </label>
      <label class="pickup">
        <span>${t("pos.memberPhone")}</span>
        <input name="member" type="tel" inputmode="numeric" maxlength="20" autocomplete="off" placeholder="(514) 555-0123">
      </label>
      <div class="member-found" aria-live="polite"></div>
      <div class="pos-total"></div>
      <fieldset class="pay">
        <legend>${t("pos.payment")} <span class="pickup__required" aria-hidden="true">*</span></legend>
        <label class="pay__choice"><input type="radio" name="payment" value="cash" required><span>${t("payment.cash")}</span></label>
        <label class="pay__choice"><input type="radio" name="payment" value="card"><span>${t("payment.card")}</span></label>
      </fieldset>
      <div class="cash" hidden>
        <div class="cash__screen">
          <span>${t("pos.received")}</span>
          <output class="cash__amount">$0.00</output>
        </div>
        <div class="cash__quick">
          ${quick.map((n) => `<button type="button" data-quick="${n}">${money(n)}</button>`).join("")}
          <button type="button" data-quick="exact">${t("pos.exact")}</button>
        </div>
        <div class="cash__keys">
          ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"].map((k) => `<button type="button" data-key="${k}" ${k === "back" ? `aria-label="${t("kiosk.back")}"` : ""}>${k === "back" ? "&#9003;" : k}</button>`).join("")}
        </div>
        <p class="cash__change" aria-live="polite"></p>
      </div>
      <div class="pay__buttons">
        <button type="button" class="button button--light" data-bill>${t("pos.printBill")}</button>
        <button type="submit" class="button">${t("pos.send")}</button>
      </div>
    </form>`;
}

function setupPosCheckout(body, itemsSubtotal) {
  const checkout = body.querySelector(".cart-window__checkout");
  const memberInput = checkout.elements.member;
  const memberBox = body.querySelector(".member-found");
  const totalBox = body.querySelector(".pos-total");
  const cashBox = body.querySelector(".cash");
  const pointValue = getSettings().loyalty.pointValue;
  let member = null; // { id, name, points, phone } as the server knows them
  let usePoints = false;
  let cents = 0; // cash received, typed like a register: 1, 2, 5 → $1.25

  // Points pay for whole dollars of the bill, at most what the member has
  const pointsToUse = () => (member && usePoints ? Math.min(member.points, Math.floor(itemsSubtotal / pointValue)) : 0);
  const discount = () => pointsToUse() * pointValue;
  const toPay = () => Math.round(cartTotalWithTax(itemsSubtotal - discount()) * 100) / 100;

  function showTotals() {
    totalBox.innerHTML = discount()
      ? `<p class="cart-window__sum"><span>${t("pos.pointsDiscount", { n: pointsToUse() })}</span><span>−${money(discount())}</span></p>
         <p class="cart-window__sum cart-window__sum--total"><span>${t("pos.toPay")}</span><span>${money(toPay())}</span></p>`
      : "";
    showCash();
  }

  function showCash() {
    const isCash = checkout.elements.payment.value === "cash";
    cashBox.hidden = !isCash;
    const received = cents / 100;
    cashBox.querySelector(".cash__amount").textContent = money(received);
    const change = cashBox.querySelector(".cash__change");
    const send = checkout.querySelector("[type=submit]");
    if (!isCash) {
      send.setCustomValidity("");
      return;
    }
    if (received >= toPay()) {
      change.textContent = t("pos.change", { amount: money(received - toPay()) });
      change.className = "cash__change is-ok";
      send.setCustomValidity("");
    } else {
      change.textContent = t("pos.short", { amount: money(toPay() - received) });
      change.className = "cash__change is-short";
      send.setCustomValidity(t("pos.short", { amount: money(toPay() - received) }));
    }
  }

  function showMember() {
    const available = Math.min(member.points, Math.floor(itemsSubtotal / pointValue));
    memberBox.innerHTML = `<p class="member-found__name"></p>
      ${member.points > 0 ? `<label class="field--check"><input type="checkbox" data-use> ${t("pos.usePoints", { n: available, amount: money(available * pointValue) })}</label>` : ""}`;
    memberBox.querySelector(".member-found__name").textContent = t("pos.memberFound", { name: member.name, points: member.points, n: drinkCount(readCart()) * getSettings().loyalty.pointsPerDrink });
    memberBox.querySelector("[data-use]")?.addEventListener("change", (event) => {
      usePoints = event.target.checked;
      showTotals();
    });
    if (!checkout.elements.pickup.value) checkout.elements.pickup.value = member.name.split(" ")[0];
  }

  // Member lookup on the server by phone, once 10 digits are typed
  let lookupTimer = null;
  async function lookupMember() {
    const digits = memberInput.value.replace(/\D/g, "").slice(-10);
    member = null;
    usePoints = false;
    memberBox.innerHTML = "";
    if (digits.length === 10) {
      const result = await api("GET", `/api/customers/lookup?phone=${digits}`);
      if (result.ok) {
        member = { ...result.data, phone: digits };
        showMember();
      } else if (result.status === 404) {
        memberBox.innerHTML = `<p class="admin__hint">${t("pos.noMember")}</p>`;
      } else {
        memberBox.innerHTML = `<p class="admin__hint">${t("kiosk.offline")}</p>`;
      }
    }
    showTotals();
  }
  memberInput.addEventListener("input", () => {
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(lookupMember, 300);
  });

  checkout.querySelectorAll("input[name=payment]").forEach((radio) => radio.addEventListener("change", showCash));
  cashBox.querySelectorAll("[data-key]").forEach((key) => key.addEventListener("click", () => {
    const k = key.dataset.key;
    if (k === "back") cents = Math.floor(cents / 10);
    else if (String(cents).length < 7) cents = Number(`${cents}${k}`);
    showCash();
  }));
  cashBox.querySelectorAll("[data-quick]").forEach((key) => key.addEventListener("click", () => {
    cents = key.dataset.quick === "exact" ? Math.round(toPay() * 100) : Number(key.dataset.quick) * 100;
    showCash();
  }));
  showTotals();

  checkout.querySelector("[data-bill]").addEventListener("click", () => {
    printBill(readCart(), checkout.elements.pickup.value.trim(), discount());
  });

  checkout.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pickup = checkout.elements.pickup;
    if (!pickup.value.trim()) pickup.value = "";
    showCash();
    if (!checkout.reportValidity()) return;

    // The server takes the points, works out the total and the change, and saves the sale
    const isCash = checkout.elements.payment.value === "cash";
    const bag = readCart();
    const send = checkout.querySelector("[type=submit]");
    send.disabled = true;
    const result = await api("POST", "/api/orders/counter", {
      customerName: pickup.value.trim(),
      payment: checkout.elements.payment.value,
      cashReceived: isCash ? cents / 100 : null,
      customerPhone: member ? member.phone : null,
      usePoints: Boolean(member && usePoints),
      items: bag.map((line) => ({ id: line.id, quantity: line.qty, options: line.options })),
    });
    send.disabled = false;
    if (!result.ok) {
      const note = document.createElement("p");
      note.className = "admin__error";
      note.textContent = result.status === 0 ? t("kiosk.offline") : t("cart.checkError");
      totalBox.append(note);
      return;
    }

    const order = mirrorCounterSale(result.data.code, bag, {
      customerName: pickup.value.trim(),
      phone: member ? member.phone : "",
      customerId: member ? member.id : null,
      takenBy: sessionStorage.getItem(SESSION_KEY),
      payment: checkout.elements.payment.value,
      pointsUsed: result.data.pointsUsed || 0,
      discount: (result.data.pointsUsed || 0) * pointValue,
      cashReceived: isCash ? cents / 100 : null,
      change: result.data.change,
    });
    localStorage.removeItem(CART_KEY);
    renderCart();
    cartWindow.querySelector(".cart-window__body").innerHTML = `
      <div class="order-done">
        <p class="order-done__thanks"></p>
        <p class="order-done__label">${t("cart.code")}</p>
        <p class="order-done__code"></p>
        <p class="order-done__change"></p>
        <div class="pay__buttons">
          <button type="button" class="button button--light" data-receipt>${t("pos.printReceipt")}</button>
          <button type="button" class="button" data-new>${t("pos.newOrder")}</button>
        </div>
      </div>`;
    cartWindow.querySelector(".order-done__code").textContent = order.code;
    cartWindow.querySelector(".order-done__thanks").textContent = t("pos.sent", { name: order.customerName, payment: t(`payment.${order.payment}`) });
    cartWindow.querySelector(".order-done__change").textContent = order.change !== null ? t("pos.change", { amount: money(order.change) }) : "";
    cartWindow.querySelector("[data-receipt]").addEventListener("click", () => printReceipt(findOrder(order.id)));
    cartWindow.querySelector("[data-new]").addEventListener("click", () => cartWindow.close());
  });
}

// ---------- Lines in the bag ----------

function showCartLines(body, cart) {
  const list = body.querySelector(".cart-window__items");
  cart.forEach((item, index) => {
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
      <div class="cart-line__chips"></div>`;
    // Show the drink name in the current language when the menu is on this page
    const drink = typeof findDrink === "function" ? findDrink(item.id) : null;
    const name = drink ? drinkName(drink) : item.name;
    row.querySelector("strong").textContent = name;
    row.querySelector(".stepper span").textContent = item.qty;
    row.querySelector(".cart-line__price").innerHTML = priceHTML(item.unitPrice, item.qty, item.promo);

    const chips = row.querySelector(".cart-line__chips");
    const milk = findMilk(item.options.milk);
    chips.append(chip(milk.icon, t(`milk.${milk.id}`)));
    chips.append(chip("sugar", t("cart.sugar", { n: item.options.sugar })));
    if (item.options.ice !== null) chips.append(chip("ice", t("cart.ice", { n: item.options.ice })));
    if (item.options.note) chips.append(chip("note", item.options.note));

    // Edit opens the drink window on top of the bag with this line's choices;
    // saving updates the line and the bag stays open underneath
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "cart-line__edit";
    editButton.textContent = t("cart.edit");
    editButton.setAttribute("aria-label", t("cart.editLabel", { name }));
    editButton.addEventListener("click", () => {
      openDrinkWindow(findDrink(item.id), item.qty, {
        options: item.options,
        onSave: (updated) => replaceCartLine(index, updated),
      });
    });
    chips.append(editButton);

    row.querySelectorAll("[data-change]").forEach((button) => {
      button.addEventListener("click", () => {
        const updated = readCart();
        updated[index].qty += Number(button.dataset.change);
        if (updated[index].qty <= 0) updated.splice(index, 1);
        saveCart(updated);
      });
    });
    list.append(row);
  });
}

renderCart();

// ---------- Open and close the window ----------

cartWindow.querySelector(".window__close").addEventListener("click", () => cartWindow.close());

// Clicking the dimmed area outside the window also closes it
cartWindow.addEventListener("click", (event) => {
  if (event.target === cartWindow) cartWindow.close();
});

// ---------- Drag the button around ----------

let drag = null;
let justDragged = false;

// Keep the button fully on screen
function placeButton(left, top) {
  const maxLeft = window.innerWidth - cartButton.offsetWidth;
  const maxTop = window.innerHeight - cartButton.offsetHeight;
  cartButton.style.left = Math.min(Math.max(0, left), maxLeft) + "px";
  cartButton.style.top = Math.min(Math.max(0, top), maxTop) + "px";
  cartButton.style.right = "auto";
  cartButton.style.bottom = "auto";
}

cartButton.addEventListener("pointerdown", (event) => {
  const box = cartButton.getBoundingClientRect();
  drag = { startX: event.clientX, startY: event.clientY, left: box.left, top: box.top, moved: false };
  cartButton.setPointerCapture(event.pointerId);
});

cartButton.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  // Only count it as a drag after a few pixels, so a shaky tap still opens the cart
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  cartButton.classList.add("is-dragging");
  placeButton(drag.left + dx, drag.top + dy);
});

cartButton.addEventListener("pointerup", () => {
  if (drag && drag.moved) {
    justDragged = true;
    cartButton.classList.remove("is-dragging");
    localStorage.setItem(POSITION_KEY, JSON.stringify({ left: cartButton.style.left, top: cartButton.style.top }));
  }
  drag = null;
});

cartButton.addEventListener("click", () => {
  if (justDragged) {
    justDragged = false;
    return;
  }
  renderCart();
  cartWindow.showModal();
});

// Put the button back where the customer last left it, on any page
try {
  const saved = JSON.parse(localStorage.getItem(POSITION_KEY));
  if (saved) placeButton(parseFloat(saved.left), parseFloat(saved.top));
} catch {
  // no saved position: stay in the default bottom-right corner
}

window.addEventListener("resize", () => {
  if (cartButton.style.left) placeButton(parseFloat(cartButton.style.left), parseFloat(cartButton.style.top));
});

// Customer pages: "Log In" becomes "My account" once a member is signed in
if (!POS_MODE) {
  const loginLink = document.querySelector(".login-link");
  if (loginLink && signedInCustomer()) {
    loginLink.href = "account.html";
    loginLink.textContent = t("nav.account");
  }
}
