// After a code is entered on the kiosk: choose what to do.
// Clock in/out, take an order at the counter, and (managers only) the dashboard.

const hubUser = getUser(sessionStorage.getItem(SESSION_KEY));
if (!hubUser || hubUser.status !== "approved") window.location.replace("kiosk.html");

function leaveHub() {
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

if (hubUser && hubUser.status === "approved") {
  document.getElementById("hub-hello").textContent = t("hub.hello", { name: hubUser.name.split(" ")[0] });
  const sessions = getWorkSessions(hubUser.id);
  document.getElementById("hub-clock-status").textContent = isClockedIn(hubUser.id)
    ? t("staff.on", { time: `${sessions.at(-1).start.getHours()}:${String(sessions.at(-1).start.getMinutes()).padStart(2, "0")}` })
    : t("staff.off");
  // Only managers see the Manager tile
  if (isManager(hubUser)) {
    document.getElementById("hub-manager").hidden = false;
    document.getElementById("hub").classList.add("hub--manager");
  }
}
