// A small banner on every shop screen (kiosk, staff, counter, manager pages) that shows
// when a new order comes in, online or at the counter. Not loaded on the customer pages.
// Clicking it goes to the order queue: straight there if already signed in, or asks for
// the kiosk code first and goes there right after.
// Needs api.js and store.js (SESSION_KEY) loaded first.

const ORDERS_SEEN_KEY = "brewshift-orders-seen";
const AFTER_LOGIN_KEY = "brewshift-after-login";

// The first time this runs in a browser, nothing before now counts as "new"
if (!localStorage.getItem(ORDERS_SEEN_KEY)) {
  localStorage.setItem(ORDERS_SEEN_KEY, new Date().toISOString());
}

// Call this when the orders have actually been looked at (the queue page does, on load)
function markOrdersSeen() {
  localStorage.setItem(ORDERS_SEEN_KEY, new Date().toISOString());
  document.getElementById("order-alert")?.remove();
}

function goToOrderQueue() {
  const onKiosk = /kiosk\.html$/.test(window.location.pathname);
  if (onKiosk) {
    // Nobody is signed in on the kiosk yet: enter the code, then go straight to Orders
    sessionStorage.setItem(AFTER_LOGIN_KEY, "queue.html");
    const message = document.getElementById("kiosk-message");
    if (message) {
      message.textContent = t("notify.enterCode");
      message.className = "kiosk__message";
    }
    return;
  }
  window.location.href = "queue.html";
}

function showOrderAlert(count) {
  let banner = document.getElementById("order-alert");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "order-alert";
    banner.className = "order-alert";
    banner.innerHTML = `<button type="button" class="order-alert__go"></button><button type="button" class="order-alert__close" aria-label="${t("common.close")}">&times;</button>`;
    banner.querySelector(".order-alert__go").addEventListener("click", goToOrderQueue);
    banner.querySelector(".order-alert__close").addEventListener("click", (event) => {
      event.stopPropagation();
      markOrdersSeen();
    });
    document.body.prepend(banner);
  }
  banner.querySelector(".order-alert__go").textContent = t("notify.newOrders", { n: count });
}

async function checkForNewOrders() {
  const since = localStorage.getItem(ORDERS_SEEN_KEY);
  const result = await api("GET", `/api/queue/alert?since=${encodeURIComponent(since)}`);
  if (result.ok && result.data.count > 0) showOrderAlert(result.data.count);
  else document.getElementById("order-alert")?.remove();
}

checkForNewOrders();
setInterval(checkForNewOrders, 15000);
