// Calls to the server (/api/...). Pages that use the server load this file
// after store.js. Every call sends the session cookie automatically.

// Send one request. Returns { ok, status, data }. A network error gives status 0.
async function api(method, url, body) {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// The local store still finds people by id on the manager pages, so the person who
// signed in on the server is copied into it with the same id. Server role "owner"
// is the local "manager".
function mirrorUser(user) {
  const db = loadDb();
  const role = user.role === "owner" ? "manager" : "staff";
  const existing = db.users.find((u) => u.id === user.id);
  const merged = { ...(existing || {}), id: user.id, name: user.name, email: user.email, role, status: user.status };
  if (existing) db.users[db.users.indexOf(existing)] = merged;
  else db.users.push(merged);
  saveDb(db);
  return merged;
}

// Copies the menu from the server into this browser's store, so the pages that
// read the store (menu, bag, drink window) show the server's menu.
// url: "/api/menu" (customers, on-sale drinks) or "/api/admin/menu" (managers, all drinks).
async function syncMenu(url) {
  const result = await api("GET", url);
  if (!result.ok) return false;
  const db = loadDb();
  const local = new Map(db.menu.map((drink) => [drink.id, drink]));
  const seeded = (id) => MENU_SEED.some((drink) => drink.id === id);
  db.menu = result.data.map((drink) => {
    const old = local.get(drink.id) || {};
    return {
      ...old,
      ...drink,
      // Photos: the server's one, else the built-in image for the seed drinks, else the bean
      photo: drink.photo || (seeded(drink.id) ? `images/menu/cutout/${drink.id}.png` : "images/bean.svg"),
      sidePhoto: drink.sidePhoto || (seeded(drink.id) ? `images/menu/${drink.id}-side.jpg` : ""),
      soldOut: drink.soldOut ?? null,
    };
  });
  saveDb(db);
  return true;
}


// Home page tile choices from the server, copied into this browser's settings
// so the home page and Settings show the same drinks.
async function syncHome() {
  const result = await api("GET", "/api/settings/home");
  if (!result.ok) return false;
  const db = loadDb();
  db.settings = { ...(db.settings || {}), home: result.data };
  saveDb(db);
  return true;
}

// The shop settings the owner saved on the server (hours, taxes, questions...), copied
// into this browser. Returns true if they changed here. The home choices are kept.
async function syncSettings() {
  const result = await api("GET", "/api/settings");
  if (!result.ok) return false;
  // Compare what the page would show (with the defaults filled in), before and after
  const before = JSON.stringify(withoutHome(getSettings()));
  const db = loadDb();
  db.settings = { ...result.data, ...(db.settings?.home ? { home: db.settings.home } : {}) };
  saveDb(db);
  return before !== JSON.stringify(withoutHome(getSettings()));
}

function withoutHome(settings) {
  const { home, ...rest } = settings || {};
  return rest;
}

// Every page that loads this file reloads once when the settings are new here,
// so the page is drawn with them. The next load finds nothing new and does not reload.
if (typeof loadDb === "function") {
  syncSettings().then((changed) => { if (changed) window.location.reload(); });
  // A member remembered in this browser must also be signed in on the server (the server
  // forgets its sessions when it restarts). If not, forget them here, so the menu stops
  // showing the account link.
  if (localStorage.getItem(CUSTOMER_KEY)) {
    api("GET", "/api/customers/me").then((result) => {
      if (result.status === 401) {
        signOutCustomer();
        window.location.reload();
      }
    });
  }
}

// The member signed in on the server, copied into this browser so the bag and the
// counter can show them. The password is never kept here.
function mirrorCustomer(customer) {
  const db = loadDb();
  db.customers = db.customers || [];
  const index = db.customers.findIndex((c) => c.id === customer.id);
  const merged = {
    ...(index >= 0 ? db.customers[index] : {}),
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    promos: customer.promos,
    points: customer.points,
  };
  if (index >= 0) db.customers[index] = merged;
  else db.customers.push(merged);
  saveDb(db);
  return merged;
}

// A sale made at the counter, copied into this browser's order list for the receipt.
// The server has already taken the points, so this copy does not award them again.
function mirrorCounterSale(code, cart, extra) {
  const db = loadDb();
  const order = {
    id: newId("o"),
    code,
    customerName: extra.customerName,
    phone: extra.phone || "",
    source: "counter",
    takenBy: extra.takenBy,
    payment: extra.payment,
    lines: cart.map((line) => ({ id: line.id, qty: line.qty, unitPrice: line.unitPrice, promo: line.promo || null, options: line.options })),
    status: "received",
    createdAt: new Date().toISOString(),
    history: [],
    customerId: extra.customerId || null,
    pickupAt: null,
    pointsUsed: extra.pointsUsed || 0,
    discount: extra.discount || 0,
    cashReceived: extra.cashReceived ?? null,
    change: extra.change ?? null,
  };
  db.orders.push(order);
  saveDb(db);
  return order;
}
