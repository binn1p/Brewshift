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

// Keep the loading screen up at least this long, so it doesn't just flash
const MIN_SHOW_MS = 1800;
const startTime = performance.now();

window.addEventListener("load", () => {
  const elapsed = performance.now() - startTime;
  const wait = Math.max(0, MIN_SHOW_MS - elapsed);

  setTimeout(() => {
    preloader.classList.add("is-hidden");
    preloader.addEventListener("transitionend", () => preloader.remove(), { once: true });
  }, wait);
});
