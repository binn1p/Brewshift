// Members: log in or create an account. After that, go back to where the
// customer came from (for example the menu with their bag), or to their account.
// Accounts are checked on the server.

const params = new URLSearchParams(window.location.search);
const SAFE_NEXT = ["menu.html", "account.html", "index.html"];
const next = SAFE_NEXT.includes(params.get("next")) ? params.get("next") : "account.html";

// Only skip the form if the server agrees the member is signed in
api("GET", "/api/customers/me").then((result) => { if (result.ok) window.location.replace(next); });
if (params.get("mode") === "register") document.querySelector("#register-form input").focus();

// Connection problems and server messages are shown in the customer's language
function showProblem(result) {
  if (result.status === 0) return t("kiosk.offline");
  if (result.status === 409) return (result.data?.error || "").includes("phone") ? t("login.phoneTaken") : t("login.emailTaken");
  if (result.data?.fields?.phone) return t("cart.phoneError");
  return t("cart.checkError");
}

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const error = form.querySelector(".admin__error");
  const result = await api("POST", "/api/customers/login", {
    email: form.elements.email.value,
    password: form.elements.password.value,
  });
  // Same message either way, so nobody can find out which emails have accounts
  if (!result.ok) {
    error.textContent = result.status === 0 ? t("kiosk.offline") : t("login.wrong");
    return;
  }
  signInCustomer(mirrorCustomer(result.data.customer).id);
  window.location.href = next;
});

document.getElementById("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const f = form.elements;
  const error = form.querySelector(".admin__error");
  const result = await api("POST", "/api/customers/register", {
    name: f.name.value,
    email: f.email.value,
    phone: f.phone.value,
    password: f.password.value,
    promos: f.promos.checked,
  });
  if (!result.ok) {
    error.textContent = showProblem(result);
    return;
  }
  signInCustomer(mirrorCustomer(result.data.customer).id);
  window.location.href = next;
});
