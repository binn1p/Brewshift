// Shared counter iPad: live clock, 6-digit employee code, and a fun A/B question.
// A correct code shows a welcome, then the choice page (hub.html).

// ---------- Clock ----------

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
}

function showClock() {
  const now = new Date();
  // "2026, Oct 4th" in English, "4 oct. 2026" in French, "4 tháng 10, 2026" in Vietnamese
  const month = CALENDAR.months[now.getMonth()];
  document.getElementById("kiosk-date").textContent =
    LANG === "fr" ? `${now.getDate() === 1 ? "1er" : now.getDate()} ${month} ${now.getFullYear()}`
    : LANG === "vi" ? formatLongDate(now)
    : `${now.getFullYear()}, ${month} ${ordinal(now.getDate())}`;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("kiosk-time").innerHTML = `${hh}<span class="kiosk__colon">:</span>${mm}`;
}

showClock();
setInterval(showClock, 1000);

// ---------- Employee code ----------
// The iPad has no keyboard, so the code is typed on the on-screen keypad
// (a computer keyboard works too). The six boxes only display progress.

const PIN_LENGTH = 6;

const pinRow = document.getElementById("pin");
const message = document.getElementById("kiosk-message");
const progress = document.getElementById("pin-progress");
let code = "";
let busy = false; // true while the welcome is showing

for (let i = 0; i < PIN_LENGTH; i++) {
  const box = document.createElement("span");
  box.className = "pin__box";
  pinRow.append(box);
}
const boxes = [...pinRow.querySelectorAll(".pin__box")];

function showCode() {
  boxes.forEach((box, i) => {
    const filled = i < code.length;
    box.classList.toggle("is-filled", filled);
    box.textContent = filled ? "•" : "";
  });
  progress.textContent = t("kiosk.progress", { n: code.length });
}

function clearBoxes() {
  code = "";
  showCode();
}

function press(key) {
  if (busy) return;
  if (key === "back") {
    code = code.slice(0, -1);
  } else if (key === "clear") {
    code = "";
  } else if (code.length < PIN_LENGTH) {
    code += key;
    message.textContent = "";
  }
  showCode();
  // A short pause so the last box can be seen filling before the check
  if (code.length === PIN_LENGTH) {
    const entered = code;
    setTimeout(() => checkPin(entered), 150);
  }
}

document.querySelectorAll(".keypad__key").forEach((key) => {
  key.addEventListener("click", () => press(key.dataset.key));
});

document.addEventListener("keydown", (event) => {
  if (/^[0-9]$/.test(event.key)) press(event.key);
  else if (event.key === "Backspace") press("back");
  else if (event.key === "Escape") press("clear");
});

showCode();

// The shared iPad starts with nobody signed in: end any session left from before
api("POST", "/api/auth/logout");

function shake() {
  pinForm.classList.remove("is-wrong");
  void pinForm.offsetWidth; // restart the shake animation
  pinForm.classList.add("is-wrong");
}

// The PIN is checked on the server. A correct PIN starts a session there.
async function checkPin(pin) {
  const { ok, status, data } = await api("POST", "/api/kiosk/login", { pin });

  if (status === 0) {
    shake();
    clearBoxes();
    message.textContent = t("kiosk.offline");
    message.className = "kiosk__message is-error";
    return;
  }

  // Waiting for approval: the server gives the name so the message can say hi
  if (status === 403 && data?.name) {
    shake();
    clearBoxes();
    message.textContent = t("kiosk.pending", { name: data.name.split(" ")[0] });
    message.className = "kiosk__message is-error";
    return;
  }

  if (!ok) {
    shake();
    clearBoxes();
    message.textContent = t("kiosk.wrong");
    message.className = "kiosk__message is-error";
    return;
  }

  welcome(mirrorUser(data.user), data.state);
}

function welcome(user, state) {
  const first = user.name.split(" ")[0];
  const working = state === "in";
  document.getElementById("welcome-title").textContent = t(working ? "kiosk.welcomeBack" : "kiosk.welcomeIn", { name: first });
  document.getElementById("welcome-text").textContent = t(working ? "kiosk.welcomeBackText" : "kiosk.welcomeInText");
  busy = true;
  document.getElementById("welcome").showModal();

  sessionStorage.setItem(SESSION_KEY, user.id);
  // Next: choose clock in/out, a counter order, or (managers) the dashboard
  setTimeout(() => { window.location.href = "hub.html"; }, 1800);
}

// ---------- Weird question of the day ----------

// The questions live in Settings (managers can add, edit or pin one)
const QUESTIONS = getSettings().questions;

// A pinned question if a manager chose one, otherwise a new one each day
const dayNumber = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const pinned = QUESTIONS.find((q) => q.id === getSettings().pinnedQuestion);
const question = pinned || QUESTIONS[dayNumber % QUESTIONS.length];
document.getElementById("question-text").textContent = tr(question.text);

// Tally marks: every fifth vote strikes through the four before it
function tallyHTML(count) {
  const groups = "<span class=\"tally__five\">||||</span>".repeat(Math.floor(count / 5));
  return groups + "|".repeat(count % 5);
}

function showVotes(votes) {
  document.querySelectorAll(".kiosk__side").forEach((button) => {
    const side = button.dataset.side;
    button.querySelector(".tally").innerHTML = votes[side]
      ? tallyHTML(votes[side])
      : `<span class="tally__empty">${t("kiosk.noVotes")}</span>`;
    button.setAttribute("aria-label", t("kiosk.votes", { answer: tr(question[side]), n: votes[side] }));
  });
}

document.querySelectorAll(".kiosk__side").forEach((button) => {
  button.querySelector(".kiosk__answer").textContent = tr(question[button.dataset.side]);
  button.addEventListener("click", () => {
    showVotes(addVote(question.id, button.dataset.side));
    button.classList.remove("is-voted");
    void button.offsetWidth;
    button.classList.add("is-voted");
  });
});

showVotes(getVotes(question.id));
