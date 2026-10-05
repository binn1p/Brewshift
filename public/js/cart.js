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
    ${POS_MODE ? posCheckoutHTML() : `<form class="cart-window__checkout">
      <label class="pickup">
        <span>${t("cart.name")} <span class="pickup__required" aria-hidden="true">*</span></span>
        <input name="pickup" required maxlength="40" autocomplete="given-name" placeholder="${t("cart.namePlaceholder")}">
      </label>
      <label class="pickup">
        <span>${t("cart.phone")} <span class="pickup__required" aria-hidden="true">*</span></span>
        <input name="phone" type="tel" required maxlength="20" autocomplete="tel" placeholder="(514) 555-0142">
      </label>
      <button type="submit" class="button">${t("cart.checkout")}</button>
      <p class="cart-window__notice" role="status"></p>
    </form>`}`;

  if (POS_MODE) {
    setupPosCheckout(body);
  } else {
    setupOnlineCheckout(body);
  }

  // textContent (not innerHTML) for saved text such as the note, so it is shown as plain text
  showCartLines(body, cart);
}

// ---------- Online checkout (customers) ----------

function setupOnlineCheckout(body) {
  // Name and phone are required: the browser blocks the submit and shows a
  // message while one is missing. Both are saved so they survive page changes.
  const checkout = body.querySelector(".cart-window__checkout");
  const pickup = checkout.elements.pickup;
  const phone = checkout.elements.phone;
  pickup.value = localStorage.getItem(NAME_KEY) || "";
  phone.value = localStorage.getItem(PHONE_KEY) || "";
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

  checkout.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pickup.value.trim()) pickup.value = "";
    if (!checkout.reportValidity()) return;
    // Save the order, empty the bag, and show the order code
    const order = addOrder(readCart(), pickup.value.trim(), phone.value);
    localStorage.removeItem(CART_KEY);
    renderCart();
    cartWindow.querySelector(".cart-window__body").innerHTML = `
      <div class="order-done">
        <p class="order-done__thanks"></p>
        <p class="order-done__label">${t("cart.code")}</p>
        <p class="order-done__code"></p>
        <p>${t("cart.paymentSoon")}</p>
      </div>`;
    cartWindow.querySelector(".order-done__code").textContent = order.code;
    cartWindow.querySelector(".order-done__thanks").textContent = t("cart.placed", { name: order.customerName });
  });
}

// ---------- Counter checkout (staff) ----------

function posCheckoutHTML() {
  return `
    <form class="cart-window__checkout">
      <label class="pickup">
        <span>${t("pos.customer")} <span class="pickup__required" aria-hidden="true">*</span></span>
        <input name="pickup" required maxlength="40" autocomplete="off" placeholder="${t("pos.customerPlaceholder")}">
      </label>
      <fieldset class="pay">
        <legend>${t("pos.payment")} <span class="pickup__required" aria-hidden="true">*</span></legend>
        <label class="pay__choice"><input type="radio" name="payment" value="cash" required><span>${t("payment.cash")}</span></label>
        <label class="pay__choice"><input type="radio" name="payment" value="card"><span>${t("payment.card")}</span></label>
      </fieldset>
      <div class="pay__buttons">
        <button type="button" class="button button--light" data-bill>${t("pos.printBill")}</button>
        <button type="submit" class="button">${t("pos.send")}</button>
      </div>
    </form>`;
}

function setupPosCheckout(body) {
  const checkout = body.querySelector(".cart-window__checkout");
  checkout.querySelector("[data-bill]").addEventListener("click", () => {
    printBill(readCart(), checkout.elements.pickup.value.trim());
  });
  checkout.addEventListener("submit", (event) => {
    event.preventDefault();
    const pickup = checkout.elements.pickup;
    if (!pickup.value.trim()) pickup.value = "";
    if (!checkout.reportValidity()) return;
    const order = addOrder(readCart(), pickup.value.trim(), "", {
      source: "counter",
      takenBy: sessionStorage.getItem(SESSION_KEY),
      payment: checkout.elements.payment.value,
    });
    localStorage.removeItem(CART_KEY);
    renderCart();
    cartWindow.querySelector(".cart-window__body").innerHTML = `
      <div class="order-done">
        <p class="order-done__thanks"></p>
        <p class="order-done__label">${t("cart.code")}</p>
        <p class="order-done__code"></p>
        <div class="pay__buttons">
          <button type="button" class="button button--light" data-receipt>${t("pos.printReceipt")}</button>
          <button type="button" class="button" data-new>${t("pos.newOrder")}</button>
        </div>
      </div>`;
    cartWindow.querySelector(".order-done__code").textContent = order.code;
    cartWindow.querySelector(".order-done__thanks").textContent = t("pos.sent", { name: order.customerName, payment: t(`payment.${order.payment}`) });
    cartWindow.querySelector("[data-receipt]").addEventListener("click", () => printReceipt(order));
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
