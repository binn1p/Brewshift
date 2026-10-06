// Photo library: built-in photos plus uploads (shrunk and kept in the browser
// for now; they move to the server in week 2). Uploads can be deleted.

let category = "all";
const errorBox = document.getElementById("photo-error");

function showFilter() {
  const box = document.getElementById("photo-filter");
  box.innerHTML = "";
  ["all", "product", "shop", "other"].forEach((cat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip-button";
    button.textContent = t(`photos.cat.${cat}`);
    button.setAttribute("aria-pressed", String(category === cat));
    button.addEventListener("click", () => { category = cat; showFilter(); showGrid(); });
    box.append(button);
  });
}

function showGrid() {
  const grid = document.getElementById("photo-grid");
  grid.innerHTML = "";
  allPhotos().filter((photo) => category === "all" || photo.category === category).forEach((photo) => {
    const card = document.createElement("figure");
    card.className = "photo-card";
    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = "";
    img.loading = "lazy";
    card.append(img);

    const caption = document.createElement("figcaption");
    if (photo.builtIn) {
      caption.textContent = t("photos.builtIn");
    } else {
      // Uploaded photos: choose a category or delete
      const select = document.createElement("select");
      select.setAttribute("aria-label", "Category");
      ["product", "shop", "other"].forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = t(`photos.cat.${cat}`);
        option.selected = photo.category === cat;
        select.append(option);
      });
      select.addEventListener("change", async () => {
        await api("PATCH", `/api/admin/photos/${photo.id}`, { category: select.value });
        await syncPhotos();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "photo-card__delete";
      remove.textContent = t("admin.delete");
      remove.addEventListener("click", () => {
        if (!confirm(t("photos.deleteConfirm"))) return;
        api("DELETE", `/api/admin/photos/${photo.id}`).then(async () => {
          await syncPhotos();
          showGrid();
        });
      });
      caption.append(select, remove);
    }
    card.append(caption);
    grid.append(card);
  });
}

document.getElementById("upload").addEventListener("change", async (event) => {
  errorBox.textContent = "";
  for (const file of event.target.files) {
    const src = await shrinkImage(file);
    // The photo goes to the server; the server gives its address, and the library records it
    const uploaded = await api("POST", "/api/admin/uploads", { dataUrl: src });
    if (!uploaded.ok) {
      errorBox.textContent = uploaded.status === 413 ? t("photos.full") : t("kiosk.offline");
      continue;
    }
    await api("POST", "/api/admin/photos", { url: uploaded.data.url, category: category === "all" ? "other" : category });
  }
  event.target.value = "";
  await syncPhotos();
  showGrid();
});

if (isManager(manager)) {
  syncPhotos().then(() => {
    showFilter();
    showGrid();
  });
}
