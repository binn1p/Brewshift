// Members: log in or create an account. After that, go back to where the
// customer came from (for example the menu with their bag), or to their account.

const params = new URLSearchParams(window.location.search);
const SAFE_NEXT = ["menu.html", "account.html", "index.html"];
const next = SAFE_NEXT.includes(params.get("next")) ? params.get("next") : "account.html";

if (signedInCustomer()) window.location.replace(next);
if (params.get("mode") === "register") document.querySelector("#register-form input").focus();

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const error = form.querySelector(".admin__error");
  const customer = findCustomerByEmail(form.elements.email.value);
  const hash = await hashPassword(form.elements.password.value);
  // Same message either way, so nobody can find out which emails have accounts
  if (!customer || customer.passwordHash !== hash) {
    error.textContent = t("login.wrong");
    return;
  }
  signInCustomer(customer.id);
  window.location.href = next;
});

document.getElementById("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const f = form.elements;
  const error = form.querySelector(".admin__error");
  const digits = f.phone.value.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) { error.textContent = t("cart.phoneError"); return; }
  if (findCustomerByEmail(f.email.value)) { error.textContent = t("login.emailTaken"); return; }
  if (findCustomerByPhone(digits)) { error.textContent = t("login.phoneTaken"); return; }
  const customer = {
    id: newId("c"),
    name: f.name.value.trim(),
    email: f.email.value.trim(),
    phone: digits,
    passwordHash: await hashPassword(f.password.value),
    promos: f.promos.checked,
    points: 0,
    createdAt: new Date().toISOString(),
  };
  saveCustomer(customer);
  signInCustomer(customer.id);
  window.location.href = next;
});
