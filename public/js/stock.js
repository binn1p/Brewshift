// Ingredients on hand. Quick − / + buttons, a reorder level per item,
// low items highlighted (with the word "Low", not just a color).

const editor = document.getElementById("editor");

function showStock() {
  const items = getStock();
  const low = items.filter((item) => item.qty <= item.min);
  document.getElementById("stock-summary").textContent = low.length ? t("stock.lowCount", { n: low.length }) : t("stock.allGood");

  const table = document.getElementById("stock");
  table.innerHTML = `<thead><tr><th>${t("stock.item")}</th><th>${t("stock.onHand")}</th><th>${t("stock.min")}</th><th></th></tr></thead><tbody></tbody>`;
  const body = table.querySelector("tbody");
  [...items].sort((a, b) => (a.qty <= a.min ? 0 : 1) - (b.qty <= b.min ? 0 : 1)).forEach((item) => {
    const row = document.createElement("tr");
    const isLow = item.qty <= item.min;
    row.classList.toggle("is-low", isLow);
    row.innerHTML = `
      <td><span class="stock__name"></span>${isLow ? ` <span class="badge badge--low">${t("stock.low")}</span>` : ""}</td>
      <td>
        <div class="stepper">
          <button type="button" data-change="-1" aria-label="${t("common.less")}">&minus;</button>
          <span></span>
          <button type="button" data-change="1" aria-label="${t("common.more")}">+</button>
        </div>
      </td>
      <td class="stock__min"></td>
      <td><button type="button" class="button button--small button--light">${t("admin.edit")}</button></td>`;
    row.querySelector(".stock__name").textContent = tr(item.name);
    row.querySelector(".stepper span").textContent = `${item.qty} ${tr(item.unit)}`;
    row.querySelector(".stock__min").textContent = `${item.min} ${tr(item.unit)}`;
    row.querySelectorAll("[data-change]").forEach((button) => button.addEventListener("click", () => {
      item.qty = Math.max(0, Math.round((item.qty + Number(button.dataset.change)) * 10) / 10);
      pushStockItem(item).then(showStock);
    }));
    row.querySelector("td:last-child button").addEventListener("click", () => openEditor(item));
    body.append(row);
  });
}

// ---------- Add or edit an item ----------

function openEditor(item) {
  const isNew = !item;
  const s = item || { name: { en: "", fr: "" }, unit: "", qty: 0, min: 1 };
  const unitText = typeof s.unit === "object" ? s.unit.en : s.unit;
  editor.innerHTML = `
    <div class="window__header">
      <h2>${isNew ? t("stock.new") : ""}</h2>
      <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
    </div>
    <form class="editor__form">
      <div class="editor__cols">
        <label class="field"><span>${t("stock.nameEn")}</span><input name="en" required></label>
        <label class="field"><span>${t("stock.nameFr")}</span><input name="fr"></label>
        <label class="field"><span>${t("stock.unit")}</span><input name="unit"></label>
        <label class="field"><span>${t("stock.onHand")}</span><input name="qty" type="number" min="0" step="0.1"></label>
        <label class="field"><span>${t("stock.min")}</span><input name="min" type="number" min="0" step="0.1"></label>
      </div>
      <div class="editor__buttons">
        ${isNew ? "" : `<button type="button" class="button button--small button--light" data-delete>${t("admin.delete")}</button>`}
        <button type="submit" class="button button--small">${t("admin.save")}</button>
      </div>
    </form>`;
  const f = editor.querySelector("form").elements;
  if (!isNew) editor.querySelector("h2").textContent = tr(s.name);
  f.en.value = s.name.en;
  f.fr.value = s.name.fr;
  f.unit.value = unitText;
  f.qty.value = s.qty;
  f.min.value = s.min;

  editor.querySelector(".window__close").addEventListener("click", () => editor.close());
  editor.querySelector("[data-delete]")?.addEventListener("click", () => {
    const db = loadDb();
    deleteStockItem(s.id).then(() => {
      editor.close();
      showStock();
    });
  });
  editor.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const unitChanged = f.unit.value.trim() !== unitText;
    await pushStockItem({
      ...s,
      name: { en: f.en.value.trim(), fr: f.fr.value.trim() || f.en.value.trim() },
      unit: unitChanged || isNew ? f.unit.value.trim() : s.unit,
      qty: Number(f.qty.value) || 0,
      min: Number(f.min.value) || 0,
    });
    editor.close();
    showStock();
  });
  editor.showModal();
}

document.getElementById("add").addEventListener("click", () => openEditor(null));

document.getElementById("csv").addEventListener("click", () => {
  const rows = [[t("stock.item"), t("stock.onHand"), t("stock.unit"), t("stock.min"), t("stock.low")]];
  getStock().forEach((item) => rows.push([tr(item.name), item.qty, tr(item.unit), item.min, item.qty <= item.min ? t("stock.low") : ""]));
  downloadCsv(`stock-${dateKey(new Date())}.csv`, rows);
});

if (isManager(manager)) syncStock().then(showStock);
