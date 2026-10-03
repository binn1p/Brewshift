// Cart button + cart window. Every page that loads this script gets both.

const CART_KEY = "brewshift-cart";
const POSITION_KEY = "brewshift-cart-position";

// The cart is saved in the browser (localStorage) as a list like
// [{ name: "Salt Coffee", price: 8, qty: 2 }], so it survives page changes.
function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

// ---------- Build the button and the window ----------

const cartButton = document.createElement("button");
cartButton.type = "button";
cartButton.className = "cart-button";
cartButton.setAttribute("aria-label", "Open your bag");
cartButton.innerHTML = `<span class="cart-button__count"></span>`;

const cartWindow = document.createElement("dialog");
cartWindow.className = "cart-window";
cartWindow.setAttribute("aria-label", "Your bag");
cartWindow.innerHTML = `
  <div class="cart-window__header">
    <h2>Your bag</h2>
    <button type="button" class="cart-window__close" aria-label="Close">&times;</button>
  </div>
  <div class="cart-window__body"></div>`;

document.body.append(cartButton, cartWindow);

// ---------- Show what is in the cart ----------

function renderCart() {
  const cart = readCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  cartButton.querySelector(".cart-button__count").textContent = count || "";

  const body = cartWindow.querySelector(".cart-window__body");
  if (cart.length === 0) {
    body.innerHTML = `
      <p class="cart-window__empty">Your bag is empty.</p>
      <a class="cart-window__action" href="menu.html">Browse the menu</a>`;
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  body.innerHTML = `
    <ul class="cart-window__items"></ul>
    <p class="cart-window__total"><span>Total</span><span>$${total.toFixed(2)}</span></p>
    <button type="button" class="cart-window__action" disabled>Checkout (coming soon)</button>`;

  // textContent (not innerHTML) so item names are always shown as plain text
  const list = body.querySelector(".cart-window__items");
  cart.forEach((item) => {
    const row = document.createElement("li");
    const name = document.createElement("span");
    const price = document.createElement("span");
    name.textContent = `${item.qty} × ${item.name}`;
    price.textContent = `$${(item.price * item.qty).toFixed(2)}`;
    row.append(name, price);
    list.append(row);
  });
}

renderCart();

// ---------- Open and close the window ----------

cartWindow.querySelector(".cart-window__close").addEventListener("click", () => cartWindow.close());

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
