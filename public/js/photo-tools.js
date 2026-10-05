// Photo helpers for manager pages: shrink an uploaded image, and a pop-up
// to pick a photo from the Photos library. Needs store.js and i18n.js.

// Shrink a picture so it fits in the browser's small storage (max 900 px, JPEG)
function shrinkImage(file, maxSize = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        // PNG keeps see-through backgrounds (cut-out drinks); everything else becomes JPEG
        resolve(file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function allPhotos() {
  return [...getPhotos(), ...builtInPhotos()];
}

// Opens the picker; resolves with the chosen photo's src, or null if closed
function pickPhoto() {
  const picker = document.getElementById("picker");
  return new Promise((resolve) => {
    picker.innerHTML = `
      <div class="window__header">
        <h2>${t("photos.pick")}</h2>
        <button type="button" class="window__close" aria-label="${t("common.close")}">&times;</button>
      </div>
      <div class="picker__grid"></div>`;
    const grid = picker.querySelector(".picker__grid");
    allPhotos().forEach((photo) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "picker__item";
      const img = document.createElement("img");
      img.src = photo.src;
      img.alt = "";
      button.append(img);
      button.addEventListener("click", () => {
        picker.close();
        resolve(photo.src);
      });
      grid.append(button);
    });
    picker.querySelector(".window__close").addEventListener("click", () => picker.close());
    picker.addEventListener("close", () => resolve(null), { once: true });
    picker.showModal();
  });
}
