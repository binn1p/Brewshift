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
