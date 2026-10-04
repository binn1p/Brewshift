// Shared counter iPad: live clock, 6-digit employee code, and a fun A/B question.
// A correct code shows a welcome, then opens that person's staff page.

// ---------- Clock ----------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
}

function showClock() {
  const now = new Date();
  document.getElementById("kiosk-date").textContent = `${now.getFullYear()}, ${MONTHS[now.getMonth()]} ${ordinal(now.getDate())}`;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("kiosk-time").innerHTML = `${hh}<span class="kiosk__colon">:</span>${mm}`;
}

showClock();
setInterval(showClock, 1000);

// ---------- Employee code ----------

const PIN_LENGTH = 6;

const pinForm = document.getElementById("pin-form");
const message = document.getElementById("kiosk-message");

for (let i = 0; i < PIN_LENGTH; i++) {
  const box = document.createElement("input");
  box.className = "pin__box";
  box.type = "password";
  box.inputMode = "numeric";
  box.maxLength = 1;
  box.placeholder = " ";
  box.setAttribute("aria-label", `Digit ${i + 1} of ${PIN_LENGTH}`);
  pinForm.append(box);
}
const boxes = [...pinForm.querySelectorAll(".pin__box")];
boxes[0].focus();

function clearBoxes() {
  boxes.forEach((box) => { box.value = ""; });
  boxes[0].focus();
}

// Typing a digit jumps to the next box; Backspace on an empty box goes back
boxes.forEach((box, i) => {
  box.addEventListener("input", () => {
    box.value = box.value.replace(/\D/g, "").slice(-1);
    if (box.value && i < PIN_LENGTH - 1) boxes[i + 1].focus();
    if (boxes.every((b) => b.value)) checkPin(boxes.map((b) => b.value).join(""));
  });
  box.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !box.value && i > 0) boxes[i - 1].focus();
  });
  // Pasting all six digits at once fills every box
  box.addEventListener("paste", (event) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (digits.length !== PIN_LENGTH) return;
    event.preventDefault();
    boxes.forEach((b, j) => { b.value = digits[j]; });
    checkPin(digits);
  });
});

function shake() {
  pinForm.classList.remove("is-wrong");
  void pinForm.offsetWidth; // restart the shake animation
  pinForm.classList.add("is-wrong");
}

function checkPin(pin) {
  const user = findUserByPin(pin);

  if (!user) {
    shake();
    clearBoxes();
    message.textContent = "That code doesn't match. Please try again.";
    message.className = "kiosk__message is-error";
    return;
  }

  if (user.status !== "approved") {
    shake();
    clearBoxes();
    message.textContent = `Hi ${user.name.split(" ")[0]}, your account is waiting for the owner's approval.`;
    message.className = "kiosk__message is-error";
    return;
  }

  welcome(user);
}

function welcome(user) {
  const first = user.name.split(" ")[0];
  const working = isClockedIn(user.id);
  document.getElementById("welcome-title").textContent = working ? `Welcome back, ${first}!` : `Hi ${first}, welcome in!`;
  document.getElementById("welcome-text").textContent = working
    ? "Almost done? Your clock-out is one tap away."
    : "Have a great shift. Make every cup a good one.";
  document.getElementById("welcome").showModal();

  sessionStorage.setItem(SESSION_KEY, user.id);
  setTimeout(() => { window.location.href = "staff.html"; }, 2200);
}

// ---------- Weird question of the day ----------

const QUESTIONS = [
  { id: "q1", text: "Would you rather drink only iced coffee or only hot coffee forever?", a: "Only iced", b: "Only hot" },
  { id: "q2", text: "Condensed milk or fresh milk?", a: "Condensed", b: "Fresh" },
  { id: "q3", text: "Would you rather fight one horse-sized bean or a hundred bean-sized horses?", a: "One giant bean", b: "100 tiny horses" },
  { id: "q4", text: "Is a hot dog a sandwich?", a: "Yes", b: "Absolutely not" },
  { id: "q5", text: "Would you rather work the 7 am open or the 6 pm close?", a: "The open", b: "The close" },
  { id: "q6", text: "Pineapple on pizza?", a: "Yes please", b: "Never" },
  { id: "q7", text: "Would you rather have a rewind button or a pause button for your life?", a: "Rewind", b: "Pause" },
];

// A new question each day, the same one all day long
const dayNumber = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const question = QUESTIONS[dayNumber % QUESTIONS.length];
document.getElementById("question-text").textContent = question.text;

// Tally marks: every fifth vote strikes through the four before it
function tallyHTML(count) {
  const groups = "<span class=\"tally__five\">||||</span>".repeat(Math.floor(count / 5));
  return groups + "|".repeat(count % 5);
}

function showVotes(votes) {
  document.querySelectorAll(".kiosk__side").forEach((button) => {
    const side = button.dataset.side;
    button.querySelector(".tally").innerHTML = tallyHTML(votes[side]);
    button.setAttribute("aria-label", `${question[side]}: ${votes[side]} votes`);
  });
}

document.querySelectorAll(".kiosk__side").forEach((button) => {
  button.querySelector(".kiosk__answer").textContent = question[button.dataset.side];
  button.addEventListener("click", () => {
    showVotes(addVote(question.id, button.dataset.side));
    button.classList.remove("is-voted");
    void button.offsetWidth;
    button.classList.add("is-voted");
    boxes.find((box) => !box.value)?.focus();
  });
});

showVotes(getVotes(question.id));
