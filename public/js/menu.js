// Builds the menu page from the store. Drinks with a `spot` sit on the canvas;
// drinks added later by a manager (no spot) fill a grid below it, row by row.
// Drinks turned off are hidden; sold-out drinks show a badge.

const canvas = document.getElementById("menu-canvas");
const moreGrid = document.getElementById("menu-more");

function drinkText(drink) {
  return `
    <span class="menu-drink__text">
      ${isSoldOut(drink) ? `<span class="menu-drink__tag menu-drink__tag--out">${t("dw.soldOut")}</span>` : ""}
      ${drink.id === getSettings().home.seasonalDrink ? `<span class="menu-drink__tag">${t("menu.seasonal")}</span>` : ""}
      ${drink.tag ? `<span class="menu-drink__tag">${tr(drink.tag)}</span>` : ""}
      <span class="menu-drink__name"></span>
      <span class="menu-drink__vi"></span>
      <span class="menu-drink__price"></span>
    </span>`;
}

function fillText(item, drink) {
  item.querySelector(".menu-drink__name").textContent = drinkName(drink);
  item.querySelector(".menu-drink__vi").textContent = drink.viName;
  item.querySelector(".menu-drink__price").textContent = money(drink.price);
  item.querySelector(".menu-drink__photo").src = drink.photo;
  item.classList.toggle("is-sold-out", isSoldOut(drink));
  item.addEventListener("click", () => openDrinkWindow(drink));
}

// Draws the drinks on sale. Runs again when the server menu arrives.
function renderMenu() {
  canvas.querySelectorAll(".menu-drink").forEach((el) => el.remove());
  moreGrid.innerHTML = "";
  getMenu().filter((drink) => drink.available).forEach((drink) => {
    const item = document.createElement("button");
    item.type = "button";
    item.innerHTML = `<img class="menu-drink__photo" alt="">${drinkText(drink)}`;

    if (drink.spot) {
      const { x, y, w, label } = drink.spot;
      item.className = `menu-drink menu-drink--label-${label}`;
      item.style.top = y + "%";
      item.style.setProperty("--w", w);
      // A label on the left grows leftwards, so pin the photo's right edge instead
      if (label === "left") {
        item.style.right = 100 - x - w + "%";
      } else {
        item.style.left = x + "%";
      }
      canvas.append(item);
    } else {
      item.className = "menu-drink menu-drink--card";
      moreGrid.append(item);
    }
    fillText(item, drink);
  });

  moreGrid.hidden = moreGrid.children.length === 0;
}

renderMenu();
// Fresh menu and the seasonal choice from the server; draw again when they arrive
Promise.all([syncMenu("/api/menu"), syncHome()]).then(() => renderMenu());

// menu.html?drink=egg-coffee opens that drink right away (used by the home page tiles),
// and &qty=2 starts it at that quantity (used by the promo tile)
const params = new URLSearchParams(window.location.search);
const linked = findDrink(params.get("drink"));
if (linked) openDrinkWindow(linked, Number(params.get("qty")) || 1);
