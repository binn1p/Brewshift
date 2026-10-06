// Settings for every page: shop info and hours (About page, schedule),
// social links, taxes (bag), weekly hour limits (schedule warnings),
// home page tiles, loading screen, background decoration, pay periods.

const form = document.getElementById("settings");

function input(name, label, value, type = "text", extra = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${extra}></label>`;
}

function drinkOptions(picked) {
  return getMenu().map((drink) => `<option value="${drink.id}" ${drink.id === picked ? "selected" : ""}></option>`).join("");
}

function render() {
  const s = getSettings();
  form.innerHTML = `
    <section class="panel">
      <h2>${t("set.shop")}</h2>
      ${input("name", t("set.name"))}
      ${input("address1", t("set.address1"))}
      ${input("address2", t("set.address2"))}
      ${input("phone", t("set.phone"), "", "tel")}
      ${input("email", t("set.email"), "", "email")}
    </section>
    <section class="panel">
      <h2>${t("set.hours")}</h2>
      <div class="settings__pair"><span>${t("set.weekday")}</span><input type="time" name="wdOpen"><input type="time" name="wdClose"></div>
      <div class="settings__pair"><span>${t("set.weekend")}</span><input type="time" name="weOpen"><input type="time" name="weClose"></div>
      <h2>${t("set.socials")}</h2>
      ${input("instagram", "Instagram", "", "url", 'placeholder="https://"')}
      ${input("facebook", "Facebook", "", "url", 'placeholder="https://"')}
      ${input("tiktok", "TikTok", "", "url", 'placeholder="https://"')}
    </section>
    <section class="panel">
      <h2>${t("set.taxes")}</h2>
      ${input("gst", "GST / TPS", "", "number", 'step="0.001" min="0"')}
      ${input("qst", "QST / TVQ", "", "number", 'step="0.001" min="0"')}
      <h2>${t("set.limits")}</h2>
      ${input("limitIntl", t("set.limitIntl"), "", "number", 'min="0"')}
      ${input("limitPart", t("set.limitPart"), "", "number", 'min="0"')}
      ${input("limitFull", t("set.limitFull"), "", "number", 'min="0"')}
      ${input("payStart", t("set.payStart"), "", "date")}
      <h2>${t("set.loyalty")}</h2>
      ${input("pointsPerDrink", t("set.pointsPerDrink"), "", "number", 'min="0" step="1"')}
      ${input("pointValue", t("set.pointValue"), "", "number", 'min="0" step="0.25"')}
    </section>
    <section class="panel">
      <h2>${t("set.home")}</h2>
      <label class="field"><span>${t("set.seasonal")}</span><select name="seasonal">${drinkOptions(s.home.seasonalDrink)}</select></label>
      <label class="field"><span>${t("set.promo")}</span><select name="promo">${drinkOptions(s.home.promoDrink)}</select></label>
      ${input("loading", t("set.loading"), "", "number", 'step="0.1" min="0" max="5"')}
      <label class="field"><span>${t("set.decor")}</span><select name="decor">
        <option value="beans">${t("decor.beans")}</option>
        <option value="none">${t("decor.none")}</option>
      </select></label>
    </section>
    <section class="panel settings__questions">
      <h2>${t("set.questions")}</h2>
      <p class="admin__hint">${t("set.qHint")}</p>
      <label class="field--check"><input type="radio" name="pin" value=""> ${t("set.qRotate")}</label>
      <div class="questions" id="questions"></div>
      <button type="button" class="button button--small button--light" id="add-question">${t("set.qAdd")}</button>
    </section>
    <section class="panel settings__actions">
      <div class="settings__save">
        <button type="submit" class="button">${t("admin.save")}</button>
        <p class="settings__saved" role="status"></p>
        <button type="button" class="button button--small button--light" id="reset">${t("set.reset")}</button>
      </div>
    </section>`;

  // Values set with .value so any text typed by a manager is never read as HTML
  const f = form.elements;
  f.name.value = s.shop.name;
  f.address1.value = s.shop.address1;
  f.address2.value = s.shop.address2;
  f.phone.value = s.shop.phone;
  f.email.value = s.shop.email;
  [f.wdOpen.value, f.wdClose.value] = s.hours.weekday;
  [f.weOpen.value, f.weClose.value] = s.hours.weekend;
  f.instagram.value = s.socials.instagram;
  f.facebook.value = s.socials.facebook;
  f.tiktok.value = s.socials.tiktok;
  f.gst.value = s.taxes.gst;
  f.qst.value = s.taxes.qst;
  f.limitIntl.value = s.limits.international;
  f.limitPart.value = s.limits.partTime;
  f.limitFull.value = s.limits.fullTime;
  f.payStart.value = s.payPeriodStart;
  f.pointsPerDrink.value = s.loyalty.pointsPerDrink;
  f.pointValue.value = s.loyalty.pointValue;
  f.loading.value = s.loadingMs / 1000;
  f.decor.value = s.decor;
  form.querySelectorAll("select[name=seasonal] option, select[name=promo] option").forEach((option) => {
    option.textContent = drinkLabel(findDrink(option.value));
  });

  // Kiosk questions: one block per question, typed in up to three languages
  const list = document.getElementById("questions");
  s.questions.forEach((question) => addQuestionBlock(list, question));
  form.querySelector(`input[name=pin][value="${s.pinnedQuestion}"]`)?.click();
  if (!s.pinnedQuestion) form.querySelector("input[name=pin][value='']").checked = true;
  document.getElementById("add-question").addEventListener("click", () => {
    addQuestionBlock(list, { id: newId("q"), text: {}, a: {}, b: {} }).querySelector("input").focus();
  });

  document.getElementById("reset").addEventListener("click", () => {
    if (!confirm(t("set.resetConfirm"))) return;
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(PHOTOS_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "kiosk.html";
  });
}

const QUESTION_LANGS = ["en", "fr", "vi"];

function addQuestionBlock(list, question) {
  const block = document.createElement("fieldset");
  block.className = "question";
  block.dataset.id = question.id;
  block.innerHTML = `
    <div class="question__head">
      <label class="field--check"><input type="radio" name="pin" value=""> ${t("set.qPin")}</label>
      <button type="button" class="photo-card__delete">${t("admin.delete")}</button>
    </div>
    <div class="question__grid">
      <span></span>${QUESTION_LANGS.map((lang) => `<span class="question__lang">${lang.toUpperCase()}</span>`).join("")}
      ${["text", "a", "b"].map((part) => `
        <span class="question__part">${t(`set.q.${part}`)}</span>
        ${QUESTION_LANGS.map((lang) => `<input data-part="${part}" data-lang="${lang}" aria-label="${t(`set.q.${part}`)} ${lang.toUpperCase()}">`).join("")}
      `).join("")}
    </div>`;
  block.querySelector("input[name=pin]").value = question.id;
  // .value, never innerHTML, for text a manager typed
  block.querySelectorAll("input[data-part]").forEach((input) => {
    input.value = question[input.dataset.part]?.[input.dataset.lang] || "";
  });
  block.querySelector(".photo-card__delete").addEventListener("click", () => block.remove());
  list.append(block);
  return block;
}

function readQuestions() {
  return [...form.querySelectorAll(".question")].map((block) => {
    const question = { id: block.dataset.id, text: {}, a: {}, b: {} };
    block.querySelectorAll("input[data-part]").forEach((input) => {
      const value = input.value.trim();
      if (value) question[input.dataset.part][input.dataset.lang] = value;
    });
    return question;
  // A question needs at least its English text and both English answers
  }).filter((q) => q.text.en && q.a.en && q.b.en);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const f = form.elements;
  const s = getSettings();
  const questions = readQuestions();
  if (!questions.length) {
    form.querySelector(".settings__saved").textContent = t("set.qNeedOne");
    return;
  }

  // A question whose words changed starts again with no votes
  const db = loadDb();
  questions.forEach((q) => {
    const old = s.questions.find((o) => o.id === q.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(q)) delete db.votes[q.id];
  });
  saveDb(db);
  const pinChoice = form.querySelector("input[name=pin]:checked")?.value || "";
  const next = {
    ...s,
    shop: { name: f.name.value.trim(), address1: f.address1.value.trim(), address2: f.address2.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim() },
    hours: { weekday: [f.wdOpen.value, f.wdClose.value], weekend: [f.weOpen.value, f.weClose.value] },
    socials: { instagram: f.instagram.value.trim(), facebook: f.facebook.value.trim(), tiktok: f.tiktok.value.trim() },
    taxes: { gst: Number(f.gst.value) || 0, qst: Number(f.qst.value) || 0 },
    limits: { international: Number(f.limitIntl.value) || 0, partTime: Number(f.limitPart.value) || 0, fullTime: Number(f.limitFull.value) || 0 },
    payPeriodStart: f.payStart.value || s.payPeriodStart,
    loyalty: { pointsPerDrink: Number(f.pointsPerDrink.value) || 0, pointValue: Number(f.pointValue.value) || 0 },
    home: { seasonalDrink: f.seasonal.value, promoDrink: f.promo.value },
    loadingMs: Math.round((Number(f.loading.value) || 0) * 1000),
    decor: f.decor.value,
    questions,
    pinnedQuestion: questions.some((q) => q.id === pinChoice) ? pinChoice : "",
  };
  saveSettings(next);

  // Saved on the server too, so every device shows the same settings
  const shopPart = { ...next };
  delete shopPart.home;
  const shopResult = await api("PUT", "/api/admin/settings", shopPart);
  const homeResult = await api("PUT", "/api/admin/settings/home", { seasonalDrink: f.seasonal.value, promoDrink: f.promo.value });
  if (shopResult.status === 0 || homeResult.status === 0) {
    form.querySelector(".settings__saved").textContent = t("kiosk.offline");
  } else if (!shopResult.ok || !homeResult.ok) {
    form.querySelector(".settings__saved").textContent = t("set.saveFailed");
  } else {
    form.querySelector(".settings__saved").textContent = t("set.saved");
  }
});

if (isManager(manager)) {
  Promise.all([syncMenu("/api/admin/menu"), syncHome()]).then(render);
}
