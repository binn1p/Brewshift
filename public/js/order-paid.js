// After Stripe sends the customer back here: confirm the payment, save the order on the
// server (done by the server itself), show the order code, and clear the bag.

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session_id");
const body = document.getElementById("order-paid-body");

function showError(message) {
  body.innerHTML = `
    <p class="order-done__thanks"></p>
    <p><a class="button button--small" href="menu.html">${t("nav.viewMenu")}</a></p>`;
  body.querySelector(".order-done__thanks").textContent = message;
}

// Shows the order's live status, the same way the confirmation in the bag does (FR-18)
function watchStatus(code) {
  const line = body.querySelector(".order-done__status");
  let timer = null;
  const show = (status) => { line.textContent = t(`cart.status.${status}`); };
  const check = async () => {
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

async function confirmPayment() {
  if (!sessionId) {
    showError(t("orderPaid.error"));
    return;
  }
  let response;
  try {
    response = await fetch(`/api/payments/confirm/${encodeURIComponent(sessionId)}`);
  } catch {
    showError(t("cart.serverDown"));
    return;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    showError(t("orderPaid.error"));
    return;
  }

  // The order is saved and paid: the bag that paid for it is now empty
  localStorage.removeItem("brewshift-cart");
  if (typeof renderCart === "function") renderCart();

  const member = signedInCustomer();
  body.innerHTML = `
    <p class="order-done__thanks"></p>
    <p class="order-done__label">${t("cart.code")}</p>
    <p class="order-done__code"></p>
    <p class="order-done__status" aria-live="polite"></p>
    ${member ? `<p><a class="button button--small" href="account.html">${t("loyalty.track")}</a></p>` : ""}
    <p><a class="button button--small button--light" href="menu.html">${t("nav.viewMenu")}</a></p>`;
  body.querySelector(".order-done__code").textContent = data.code;
  body.querySelector(".order-done__thanks").textContent = t("orderPaid.thanks");
  watchStatus(data.code);
}

confirmPayment();
