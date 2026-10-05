// The pop-up window for one drink: photo, ingredients and story on the left;
// customize boxes, note, quantity and "Add to bag" on the right.
// Needs options.js and cart.js loaded first. Also opened from the bag to edit a drink.

const drinkWindow = document.createElement("dialog");
drinkWindow.className = "window drink-window";
document.body.append(drinkWindow);

drinkWindow.addEventListener("click", (event) => {
  if (event.target === drinkWindow) drinkWindow.close();
});

// A row of press-down boxes built from radio buttons: only one can be picked,
// and the one matching the recipe starts pressed.
function boxGroup(title, name, choices, picked) {
  const boxes = choices.map((choice) => `
    <label class="box">
      <input type="radio" name="${name}" value="${choice.value}" ${choice.value === picked ? "checked" : ""}>
      <span class="box__face">
        ${ICONS[choice.icon]}
        <span class="box__label">${choice.label}</span>
        ${choice.extra ? `<span class="box__extra">+${money(choice.extra)}</span>` : ""}
      </span>
    </label>`).join("");
  return `<fieldset class="boxes"><legend>${title}</legend><div class="boxes__row">${boxes}</div></fieldset>`;
}

// edit (optional): { options, onSave } to change a drink already in the bag.
// The boxes then start on the saved choices and the button saves instead of adding.
function openDrinkWindow(drink, startQty = 1, edit = null) {
  const recipe = drink.recipe;
  const picked = edit ? edit.options : recipe;
  const milkChoices = MILKS.map((milk) => ({ value: milk.id, label: t(`milk.${milk.id}`), icon: milk.icon, extra: milk.extra }));
  const percent = (level) => (LANG === "fr" ? `${level} %` : `${level}%`);
  const levelChoices = (icon) => LEVELS.map((level) => ({ value: String(level), label: percent(level), icon }));

  drinkWindow.setAttribute("aria-label", drinkName(drink));
  drinkWindow.innerHTML = `
    <button type="button" class="window__close drink-window__close" aria-label="${t("common.close")}">&times;</button>
    <div class="drink-window__grid">
      <div class="drink-window__left">
        <img class="drink-window__photo" src="${drink.sidePhoto || drink.photo}" alt="">
        <section>
          <h3>${t("dw.ingredients")}</h3>
          <ul class="drink-window__ingredients"></ul>
        </section>
        <section>
          <h3>${t("dw.story")}</h3>
          <p class="drink-window__story"></p>
        </section>
      </div>
      <form class="drink-window__right">
        ${drink.tag ? `<span class="drink-window__tag">${tr(drink.tag)}</span>` : ""}
        <h2 class="drink-window__name"></h2>
        <p class="drink-window__vi"></p>
        ${boxGroup(t("dw.milk"), "milk", milkChoices, picked.milk)}
        ${boxGroup(t("dw.sugar"), "sugar", levelChoices("sugar"), String(picked.sugar))}
        ${recipe.ice === null ? "" : boxGroup(t("dw.ice"), "ice", levelChoices("ice"), String(picked.ice))}
        <label class="drink-window__note">
          <span>${ICONS.note} ${t("dw.note")}</span>
          <textarea name="note" rows="2" maxlength="120" placeholder="${t("dw.notePlaceholder")}"></textarea>
        </label>
        <div class="drink-window__qty">
          <span>${t("dw.qty")}</span>
          <div class="stepper">
            <button type="button" data-change="-1" aria-label="${t("common.less")}">&minus;</button>
            <span aria-live="polite"></span>
            <button type="button" data-change="1" aria-label="${t("common.more")}">+</button>
          </div>
        </div>
        ${drink.promo ? `<p class="drink-window__promo">${t("dw.promo", { tag: tr(drink.tag) })}</p>` : ""}
        <button type="submit" class="button"></button>
      </form>
    </div>`;

  drinkWindow.querySelector(".drink-window__photo").alt = drinkName(drink);
  drinkWindow.querySelector(".drink-window__name").textContent = drinkName(drink);
  drinkWindow.querySelector(".drink-window__vi").textContent = t("dw.from", { vi: drink.viName, price: money(drink.price) });
  drinkWindow.querySelector(".drink-window__story").textContent = tr(drink.story);
  const list = drinkWindow.querySelector(".drink-window__ingredients");
  tr(drink.ingredients).forEach((ingredient) => {
    const li = document.createElement("li");
    li.textContent = ingredient;
    list.append(li);
  });

  const form = drinkWindow.querySelector("form");
  if (edit) form.elements.note.value = edit.options.note;
  const submit = form.querySelector("[type=submit]");
  const qtyLabel = form.querySelector(".stepper span");
  const soldOut = !edit && isSoldOut(drink);
  let qty = Math.min(20, Math.max(1, startQty));

  const unitPrice = () => drink.price + findMilk(form.elements.milk.value).extra;
  const updateTotal = () => {
    qtyLabel.textContent = qty;
    submit.innerHTML = `${t(edit ? "dw.save" : "dw.add")} · ${priceHTML(unitPrice(), qty, drink.promo)}`;
    // A sold-out drink can be read about but not added
    if (soldOut) {
      submit.disabled = true;
      submit.textContent = t("dw.soldOut");
    }
  };

  form.querySelectorAll("[data-change]").forEach((button) => {
    button.addEventListener("click", () => {
      qty = Math.min(20, Math.max(1, qty + Number(button.dataset.change)));
      updateTotal();
    });
  });
  form.addEventListener("change", updateTotal);
  updateTotal();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = {
      id: drink.id,
      name: tr(drink.name),
      unitPrice: unitPrice(),
      qty,
      promo: drink.promo || null,
      options: {
        milk: form.elements.milk.value,
        sugar: Number(form.elements.sugar.value),
        ice: recipe.ice === null ? null : Number(form.elements.ice.value),
        note: form.elements.note.value.trim(),
      },
    };
    if (edit) {
      edit.onSave(item);
    } else {
      addToCart(item);
    }
    drinkWindow.close();
  });

  drinkWindow.querySelector(".drink-window__close").addEventListener("click", () => drinkWindow.close());
  drinkWindow.showModal();
}
