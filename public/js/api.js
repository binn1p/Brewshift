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
