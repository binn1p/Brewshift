const preloader = document.getElementById("preloader");
const beanLayer = preloader.querySelector(".beans");

// Create the falling coffee beans, each with a random spot, size and speed
const BEAN_COUNT = 24;
for (let i = 0; i < BEAN_COUNT; i++) {
  const bean = document.createElement("span");
  bean.className = "bean";
  bean.style.left = Math.random() * 100 + "%";
  bean.style.setProperty("--size", 0.6 + Math.random() * 0.8);
  bean.style.animationDuration = 4 + Math.random() * 5 + "s";
  // A negative delay starts the bean mid-fall, so the screen is full right away
  bean.style.animationDelay = -Math.random() * 9 + "s";
  beanLayer.appendChild(bean);
}

// ---------- Loading screen fade-out ----------

// Keep the loading screen up at least this long, so it doesn't just flash
// (the time can be changed in the dashboard's Settings)
const MIN_SHOW_MS = getSettings().loadingMs;
const startTime = performance.now();

window.addEventListener("load", () => {
  const elapsed = performance.now() - startTime;
  const wait = Math.max(0, MIN_SHOW_MS - elapsed);

  setTimeout(() => {
    preloader.classList.add("is-hidden");
    preloader.addEventListener("transitionend", () => preloader.remove(), { once: true });
  }, wait);
});

// ---------- Seasonal and promo tiles from Settings ----------

const homeSettings = getSettings().home;
const seasonal = findDrink(homeSettings.seasonalDrink);
if (seasonal) {
  const tile = document.querySelector(".tile--seasonal");
  tile.href = `menu.html?drink=${encodeURIComponent(seasonal.id)}`;
  tile.querySelector(".tile__title").textContent = tr(seasonal.name);
  tile.querySelector("p").textContent = `${seasonal.viName}: ${tr(seasonal.ingredients).join(", ")}`;
  tile.querySelector(".tile__cta").textContent = `${money(seasonal.price)} · ${t("home.discover")}`;
  // Built-in drinks have a top-down photo; added ones use their own photo
  const isSeed = MENU_SEED.some((drink) => drink.id === seasonal.id);
  const photo = new URL(isSeed ? `images/menu/${seasonal.id}-top.jpg` : seasonal.sidePhoto || seasonal.photo, document.baseURI).href;
  tile.style.setProperty("--photo", `url("${photo}")`);
}
const promoDrink = findDrink(homeSettings.promoDrink);
if (promoDrink) {
  document.querySelector(".tile--promo").href = `menu.html?drink=${encodeURIComponent(promoDrink.id)}&qty=${promoDrink.promo ? promoDrink.promo.buy : 1}`;
}
