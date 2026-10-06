// After a code is entered on the kiosk: choose what to do.
// Clock in/out, take an order at the counter, and (managers only) the dashboard.
// Who is signed in and the clock status come from the server.

let hubUser = null;

async function leaveHub() {
  await api("POST", "/api/auth/logout");
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "kiosk.html";
}

document.getElementById("done").addEventListener("click", leaveHub);

// The iPad is shared: back to the kiosk after 2 idle minutes
let hubIdle = setTimeout(leaveHub, 120000);
["pointerdown", "keydown"].forEach((type) => document.addEventListener(type, () => {
  clearTimeout(hubIdle);
  hubIdle = setTimeout(leaveHub, 120000);
}));

async function showHub() {
  const me = await api("GET", "/api/auth/me");
  if (!me.ok) {
    window.location.replace("kiosk.html");
    return;
  }
  hubUser = mirrorUser(me.data.user);

  document.getElementById("hub-hello").textContent = t("hub.hello", { name: hubUser.name.split(" ")[0] });

  const [punches, queue] = await Promise.all([api("GET", "/api/punches/me"), api("GET", "/api/queue")]);
  if (punches.ok) {
    const state = punches.data.state;
    const last = punches.data.punches.filter((p) => p.type === "in").at(-1);
    document.getElementById("hub-clock-status").textContent = state === "in"
      ? t("staff.on", { time: clockTime(new Date(last.at)) })
      : t("staff.off");
  }
  if (queue.ok) {
    document.getElementById("hub-queue-count").textContent = t("queue.count", { n: queue.data.length });
  }

  // Only managers see the Manager tile
  if (isManager(hubUser)) {
    document.getElementById("hub-manager").hidden = false;
    document.getElementById("hub").classList.add("hub--manager");
  }
}

function clockTime(date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

showHub();
