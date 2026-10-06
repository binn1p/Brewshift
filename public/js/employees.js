// Employees: active / pending / inactive / all. Contact info, age, code,
// availability, hours type and work permit (these set the weekly limit),
// staff or manager access. Add people, approve them, or make them inactive.

const editor = document.getElementById("editor");
let view = "approved";

const DAY_KEYS = [0, 1, 2, 3, 4, 5, 6];

function age(birthDate) {
  if (!birthDate) return "";
  const birth = new Date(`${birthDate}T12:00:00`);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) years--;
  return years;
}

function availabilityText(user) {
  return DAY_KEYS.map((d) => {
    const slot = user.availability?.[d];
    return `${CALENDAR.letters[d]} ${slot ? `${slot[0]}–${slot[1]}` : "—"}`;
  }).join(" · ");
}

function showFilter() {
  const box = document.getElementById("emp-filter");
  const users = getUsers();
  box.innerHTML = "";
  [["approved", "emp.active"], ["pending", "emp.pending"], ["inactive", "emp.inactive"], ["all", "emp.all"]].forEach(([key, label]) => {
    const n = key === "all" ? users.length : users.filter((u) => u.status === key).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip-button";
    button.textContent = `${t(label)} · ${n}`;
    button.setAttribute("aria-pressed", String(view === key));
    button.addEventListener("click", () => { view = key; showFilter(); showGrid(); });
    box.append(button);
  });
}

function showGrid() {
  const grid = document.getElementById("emp-grid");
  grid.innerHTML = "";
  getUsers().filter((u) => view === "all" || u.status === view).forEach((user) => {
    const card = document.createElement("article");
    card.className = `emp-card emp-card--${user.status}`;
    card.innerHTML = `
      <div class="emp-card__top">
        <h2 class="emp-card__name"></h2>
        <span class="badge badge--${user.role}">${t(`role.${user.role}`)}</span>
      </div>
      <p class="emp-card__meta"></p>
      <p class="emp-card__contact"></p>
      <p class="emp-card__avail"></p>
      <p class="emp-card__status"></p>
      <div class="emp-card__buttons"></div>`;
    card.querySelector(".emp-card__name").textContent = user.name;
    card.querySelector(".emp-card__meta").textContent = [
      user.birthDate ? t("emp.age", { n: age(user.birthDate) }) : "",
      t(`type.${user.type}`),
      t(`residency.${user.residency}`),
      t("emp.limit", { n: weeklyLimit(user) }),
    ].filter(Boolean).join(" · ");
    card.querySelector(".emp-card__contact").textContent = [user.phone, user.email].filter(Boolean).join(" · ");
    card.querySelector(".emp-card__avail").textContent = availabilityText(user);
    card.querySelector(".emp-card__status").textContent = t(`emp.status.${user.status}`);

    const buttons = card.querySelector(".emp-card__buttons");
    if (user.status === "pending") {
      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "button button--small";
      approve.textContent = t("emp.approve");
      approve.addEventListener("click", async () => {
        await api("POST", `/api/staff/${user.id}/approve`);
        await syncStaff();
        showFilter();
        showGrid();
      });
      buttons.append(approve);
    }
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button--small button--light";
    edit.textContent = t("admin.edit");
    edit.addEventListener("click", () => openEditor(user));
    buttons.append(edit);
    grid.append(card);
  });
}

function openEditor(user) {
  const isNew = !user;
  const u = user || {
    name: "", phone: "", email: "", birthDate: "", pin: "", role: "staff", status: "approved",
    type: "part", residency: "local", availability: {},
  };
  const opt = (value, label, picked) => `<option value="${value}" ${value === picked ? "selected" : ""}>${label}</option>`;

  editor.innerHTML = `
    <div class="window__header">
      <h2>${isNew ? t("emp.new") : ""}</h2>
      <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
    </div>
    <form class="editor__form">
      <div class="editor__cols">
        <label class="field"><span>${t("emp.name")}</span><input name="name" required autocomplete="off"></label>
        <label class="field"><span>${t("emp.birth")}</span><input name="birthDate" type="date"></label>
        <label class="field"><span>${t("emp.phone")}</span><input name="phone" type="tel"></label>
        <label class="field"><span>${t("emp.email")}</span><input name="email" type="email"></label>
        <label class="field"><span>${t("emp.pin")}</span><input name="pin" inputmode="numeric" maxlength="6" ${isNew ? "required" : ""} autocomplete="off" placeholder="${isNew ? "" : "••••••"}"></label>
        <label class="field"><span>${t("emp.role")}</span><select name="role">${opt("staff", t("role.staff"), u.role)}${opt("manager", t("role.manager"), u.role)}</select></label>
        <label class="field"><span>${t("emp.type")}</span><select name="type">${opt("part", t("type.part"), u.type)}${opt("full", t("type.full"), u.type)}</select></label>
        <label class="field"><span>${t("emp.residency")}</span><select name="residency">${opt("local", t("residency.local"), u.residency)}${opt("international", t("residency.international"), u.residency)}</select></label>
        <label class="field"><span>${t("emp.status")}</span><select name="status">${["approved", "pending", "inactive"].map((s) => opt(s, t(`emp.status.${s}`), u.status)).join("")}</select></label>
      </div>
      <fieldset class="avail">
        <legend>${t("emp.availability")}</legend>
        ${DAY_KEYS.map((d) => {
          const slot = u.availability?.[d];
          return `<div class="avail__day">
            <span class="avail__name">${CALENDAR.days[d]}</span>
            <label class="field--check"><input type="checkbox" data-off="${d}" ${slot ? "" : "checked"}> ${t("emp.dayOff")}</label>
            <input type="time" data-start="${d}" value="${slot ? slot[0] : "07:00"}" aria-label="${CALENDAR.days[d]} ${t("shifts.start")}">
            <input type="time" data-end="${d}" value="${slot ? slot[1] : "18:00"}" aria-label="${CALENDAR.days[d]} ${t("shifts.end")}">
          </div>`;
        }).join("")}
      </fieldset>
      <p class="admin__error" role="alert"></p>
      <div class="editor__buttons">
        <button type="button" class="button button--small button--light" data-cancel>${t("admin.cancel")}</button>
        <button type="submit" class="button button--small">${t("admin.save")}</button>
      </div>
    </form>`;

  const form = editor.querySelector("form");
  const f = form.elements;
  if (!isNew) editor.querySelector("h2").textContent = u.name;
  f.name.value = u.name;
  f.birthDate.value = u.birthDate || "";
  f.phone.value = u.phone || "";
  f.email.value = u.email || "";
  f.pin.value = "";

  const close = () => editor.close();
  editor.querySelector(".window__close").addEventListener("click", close);
  form.querySelector("[data-cancel]").addEventListener("click", close);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = form.querySelector(".admin__error");
    const pin = f.pin.value.trim();

    const availability = {};
    DAY_KEYS.forEach((d) => {
      const off = form.querySelector(`[data-off="${d}"]`).checked;
      availability[d] = off ? null : [form.querySelector(`[data-start="${d}"]`).value, form.querySelector(`[data-end="${d}"]`).value];
    });
    // Saved on the server (the PIN only when a new one is typed); the server checks everything
    const body = {
      name: f.name.value.trim(),
      birthDate: f.birthDate.value,
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      pin: pin || undefined,
      role: f.role.value,
      type: f.type.value,
      residency: f.residency.value,
      status: f.status.value,
      availability,
    };
    const result = isNew
      ? await api("POST", "/api/staff", body)
      : await api("PUT", `/api/staff/${u.id}`, body);
    if (!result.ok) {
      const fields = result.data?.fields || {};
      if (fields.name) error.textContent = t("emp.nameRequired");
      else if (fields.pin) error.textContent = t("emp.pinInvalid");
      else if ((result.data?.error || "").includes("PIN")) error.textContent = t("emp.pinTaken");
      else error.textContent = result.status === 0 ? t("kiosk.offline") : t("cart.checkError");
      return;
    }
    await syncStaff();
    close();
    showFilter();
    showGrid();
  });

  editor.showModal();
}

document.getElementById("add").addEventListener("click", () => openEditor(null));

if (isManager(manager)) {
  syncStaff().then(() => {
    showFilter();
    showGrid();
  });
}
