// Places every drink on the menu canvas, using its `spot` from menu-data.js.

const canvas = document.getElementById("menu-canvas");

MENU.forEach((drink) => {
  const { x, y, w, label } = drink.spot;

  const item = document.createElement("button");
  item.type = "button";
  item.className = `menu-drink menu-drink--label-${label}`;
  item.style.top = y + "%";
  item.style.setProperty("--w", w);
  // A label on the left grows leftwards, so pin the photo's right edge instead
  if (label === "left") {
    item.style.right = 100 - x - w + "%";
  } else {
    item.style.left = x + "%";
  }

  item.innerHTML = `
    <img class="menu-drink__photo" src="images/menu/cutout/${drink.id}.png" alt="">
    <span class="menu-drink__text">
      ${drink.tag ? `<span class="menu-drink__tag">${drink.tag}</span>` : ""}
      <span class="menu-drink__name"></span>
      <span class="menu-drink__vi"></span>
      <span class="menu-drink__price"></span>
    </span>`;
  item.querySelector(".menu-drink__name").textContent = drink.name;
  item.querySelector(".menu-drink__vi").textContent = drink.viName;
  item.querySelector(".menu-drink__price").textContent = money(drink.price);

  item.addEventListener("click", () => openDrinkWindow(drink));
  canvas.append(item);
});

// menu.html?drink=egg-coffee opens that drink right away (used by the home page tiles),
// and &qty=2 starts it at that quantity (used by the promo tile)
const params = new URLSearchParams(window.location.search);
const linked = findDrink(params.get("drink"));
if (linked) openDrinkWindow(linked, Number(params.get("qty")) || 1);
