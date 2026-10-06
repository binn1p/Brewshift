// Manage the drinks: show/hide, sold out (today or until turned back on),
// and edit or add a drink (photos, names, info, default choices, price, promo).

const grid = document.getElementById("drinks");
const editor = document.getElementById("editor");

function availabilityState(drink) {
  if (!drink.available) return "hidden";
  if (!isSoldOut(drink)) return "available";
  return drink.soldOut.until === null ? "outUntil" : "outToday";
}

// Sold out and hidden are saved on the server, so customers see them on any device
async function setAvailability(drink, state) {
  const soldOut = state === "outToday" ? { until: dateKey(new Date()) }
    : state === "outUntil" ? { until: null }
    : null;
  const result = await api("PATCH", `/api/admin/menu/${drink.id}`, { available: state !== "hidden", soldOut });
  if (!result.ok) {
    alert(t("kiosk.offline"));
    return;
  }
  await syncMenu("/api/admin/menu");
}

function showDrinks() {
  grid.innerHTML = "";
  getMenu().forEach((drink) => {
    const card = document.createElement("article");
    card.className = "madmin__card";
    const state = availabilityState(drink);
    card.classList.toggle("is-off", state !== "available");
    card.innerHTML = `
      <img class="madmin__photo" alt="">
      <div class="madmin__info">
        <h2 class="madmin__name"></h2>
        <p class="madmin__vi"></p>
        <p class="madmin__price"></p>
      </div>
      <select class="madmin__state" aria-label="${t("madmin.available")}">
        ${["available", "outToday", "outUntil", "hidden"].map((s) => `<option value="${s}" ${s === state ? "selected" : ""}>${t(`madmin.${s}`)}</option>`).join("")}
      </select>
      <button type="button" class="button button--small button--light">${t("admin.edit")}</button>`;
    card.querySelector(".madmin__photo").src = drink.photo;
    card.querySelector(".madmin__name").textContent = drinkLabel(drink);
    card.querySelector(".madmin__vi").textContent = drink.viName;
    card.querySelector(".madmin__price").textContent = money(drink.price) + (drink.promo ? ` · ${t("madmin.promo21")}` : "");
    card.querySelector("select").addEventListener("change", async (event) => {
      await setAvailability(drink, event.target.value);
      showDrinks();
    });
    card.querySelector("button").addEventListener("click", () => openEditor(drink));
    grid.append(card);
  });
}

// ---------- Editor ----------

function field(label, input) {
  return `<label class="field"><span>${label}</span>${input}</label>`;
}

function escapeAttr(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function selectOf(name, options, picked) {
  return `<select name="${name}">${options.map(([value, label]) => `<option value="${value}" ${String(value) === String(picked) ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

// A photo picked in this browser is a data: address; it is uploaded and replaced by its server address
async function uploadIfNew(src) {
  if (!src || !src.startsWith("data:")) return src || "";
  const result = await api("POST", "/api/admin/uploads", { dataUrl: src });
  if (!result.ok) throw new Error(result.status === 413 ? t("photos.full") : t("kiosk.offline"));
  return result.data.url;
}

function openEditor(drink) {
  const isNew = !drink;
  const d = drink || {
    name: { en: "", fr: "" }, viName: "", price: 6, recipe: { milk: "none", sugar: 50, ice: 100 },
    ingredients: { en: [], fr: [] }, story: { en: "", fr: "" }, photo: "images/bean.svg", sidePhoto: "",
    available: true, soldOut: null,
  };
  const photos = { photo: d.photo, sidePhoto: d.sidePhoto || d.photo };
  const levels = LEVELS.map((l) => [l, `${l}%`]);

  editor.innerHTML = `
    <div class="window__header">
      <h2>${isNew ? t("madmin.new") : escapeAttr(drinkLabel(d))}</h2>
      <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
    </div>
    <form class="editor__form">
      <div class="editor__photos">
        ${["photo", "sidePhoto"].map((key) => `
          <div class="editor__photo" data-key="${key}">
            <span>${t(key === "photo" ? "madmin.photo" : "madmin.sidePhoto")}</span>
            <img alt="">
            <div class="editor__photo-buttons">
              <label class="button button--small file-button">${t("madmin.upload")}<input type="file" accept="image/*"></label>
              <button type="button" class="button button--small button--light">${t("madmin.library")}</button>
            </div>
          </div>`).join("")}
      </div>
      <div class="editor__cols">
        ${field(t("madmin.nameEn"), `<input name="nameEn" value="${escapeAttr(d.name.en)}" required>`)}
        ${field(t("madmin.nameFr"), `<input name="nameFr" value="${escapeAttr(d.name.fr)}">`)}
        ${field(t("madmin.viName"), `<input name="viName" value="${escapeAttr(d.viName)}">`)}
        ${field(t("madmin.price"), `<input name="price" type="number" min="0" step="0.25" value="${d.price}" required>`)}
        ${field(t("madmin.tagEn"), `<input name="tagEn" value="${escapeAttr(d.tag?.en)}">`)}
        ${field(t("madmin.tagFr"), `<input name="tagFr" value="${escapeAttr(d.tag?.fr)}">`)}
        ${field(t("madmin.promo"), selectOf("promo", [["none", t("madmin.promoNone")], ["2for1", t("madmin.promo21")]], d.promo ? "2for1" : "none"))}
      </div>
      <fieldset class="editor__defaults">
        <legend>${t("madmin.defaults")}</legend>
        ${field(t("dw.milk"), selectOf("milk", MILKS.map((m) => [m.id, t(`milk.${m.id}`)]), d.recipe.milk))}
        ${field(t("dw.sugar"), selectOf("sugar", levels, d.recipe.sugar))}
        ${field(t("dw.ice"), selectOf("ice", levels, d.recipe.ice ?? 100))}
        <label class="field field--check"><input type="checkbox" name="hot" ${d.recipe.ice === null ? "checked" : ""}> <span>${t("madmin.hot")}</span></label>
      </fieldset>
      <div class="editor__cols">
        ${field(t("madmin.ingEn"), `<textarea name="ingEn" rows="4">${escapeAttr(d.ingredients.en.join("\n"))}</textarea>`)}
        ${field(t("madmin.ingFr"), `<textarea name="ingFr" rows="4">${escapeAttr(d.ingredients.fr.join("\n"))}</textarea>`)}
        ${field(t("madmin.storyEn"), `<textarea name="storyEn" rows="4">${escapeAttr(d.story.en)}</textarea>`)}
        ${field(t("madmin.storyFr"), `<textarea name="storyFr" rows="4">${escapeAttr(d.story.fr)}</textarea>`)}
      </div>
      <p class="admin__error" role="alert"></p>
      <div class="editor__buttons">
        <button type="button" class="button button--small button--light" data-cancel>${t("admin.cancel")}</button>
        <button type="submit" class="button button--small">${t("admin.save")}</button>
      </div>
    </form>`;

  // Photos: preview, upload (shrunk) or pick from the library
  editor.querySelectorAll(".editor__photo").forEach((box) => {
    const key = box.dataset.key;
    const img = box.querySelector("img");
    img.src = photos[key];
    box.querySelector("input[type=file]").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      photos[key] = await shrinkImage(file, key === "photo" ? 600 : 900);
      img.src = photos[key];
    });
    box.querySelector("button").addEventListener("click", async () => {
      const src = await pickPhoto();
      if (src) {
        photos[key] = src;
        img.src = src;
      }
    });
  });

  const form = editor.querySelector("form");
  const close = () => editor.close();
  editor.querySelector(".window__close").addEventListener("click", close);
  form.querySelector("[data-cancel]").addEventListener("click", close);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const f = form.elements;
    const price = Number(f.price.value);
    if (!f.nameEn.value.trim() || !(price >= 0)) {
      form.querySelector(".admin__error").textContent = t("madmin.required");
      return;
    }
    const lines = (text) => text.split("\n").map((s) => s.trim()).filter(Boolean);
    const tagEn = f.tagEn.value.trim();
    const promo = f.promo.value === "2for1" ? { buy: 2, pay: 1 } : null;
    const item = {
      name: { en: f.nameEn.value.trim(), fr: f.nameFr.value.trim() || f.nameEn.value.trim() },
      viName: f.viName.value.trim(),
      price,
      tag: tagEn ? { en: tagEn, fr: f.tagFr.value.trim() || tagEn } : promo ? { en: "2 for 1", fr: "2 pour 1" } : null,
      promo,
      recipe: { milk: f.milk.value, sugar: Number(f.sugar.value), ice: f.hot.checked ? null : Number(f.ice.value) },
      ingredients: { en: lines(f.ingEn.value), fr: lines(f.ingFr.value).length ? lines(f.ingFr.value) : lines(f.ingEn.value) },
      story: { en: f.storyEn.value.trim(), fr: f.storyFr.value.trim() || f.storyEn.value.trim() },
      photo: photos.photo,
      sidePhoto: photos.sidePhoto,
    };
    // Photos are uploaded first (new ones only), then the drink is saved with their addresses
    let photo;
    let sidePhoto;
    try {
      photo = await uploadIfNew(photos.photo);
      sidePhoto = await uploadIfNew(photos.sidePhoto);
    } catch (error) {
      form.querySelector(".admin__error").textContent = error.message;
      return;
    }
    item.photo = photo;
    if (sidePhoto) item.sidePhoto = sidePhoto;

    const result = isNew
      ? await api("POST", "/api/admin/menu", item)
      : await api("PATCH", `/api/admin/menu/${d.id}`, item);
    if (!result.ok) {
      form.querySelector(".admin__error").textContent = result.status === 0 ? t("kiosk.offline") : t("madmin.required");
      return;
    }
    await syncMenu("/api/admin/menu");

    close();
    showDrinks();
  });

  editor.showModal();
}

document.getElementById("add").addEventListener("click", () => openEditor(null));

if (isManager(manager)) {
  syncMenu("/api/admin/menu").then(showDrinks);
}
