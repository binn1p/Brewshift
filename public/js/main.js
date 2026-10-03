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

// ---------- Background decoration ----------

// <body data-decor="..."> picks the decoration. Each entry makes one piece;
// seasonal ones (maple leaves, snowflakes, F1 cars...) can be added here later.
const DECOR = {
  beans: () => {
    const bean = document.createElement("span");
    bean.className = "bean";
    return bean;
  },
};

const decorLayer = document.querySelector(".decor");
const makeDecor = DECOR[document.body.dataset.decor];
if (decorLayer && makeDecor) {
  for (let i = 0; i < 60; i++) {
    const piece = makeDecor();
    piece.style.left = Math.random() * 100 + "%";
    piece.style.top = Math.random() * 100 + "%";
    piece.style.setProperty("--size", 0.7 + Math.random() * 0.9);
    piece.style.setProperty("--angle", Math.random() * 360 + "deg");
    decorLayer.appendChild(piece);
  }
}

// ---------- Loading screen fade-out ----------

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

// ---------- L-shaped tiles (menu + seasonal drink) ----------

const bento = document.querySelector(".bento");
const menuTile = bento.querySelector(".tile--menu");
const seasonalTile = bento.querySelector(".tile--seasonal");
const RADIUS = 28;
const phoneScreen = window.matchMedia("(max-width: 800px)");

// A point `distance` px along the line from point a toward point b
function toward(a, b, distance) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = Math.min(distance, length / 2);
  return [a[0] + (b[0] - a[0]) * d / length, a[1] + (b[1] - a[1]) * d / length];
}

// Turn a list of corner points into a clip-path shape with every corner rounded
function roundedShape(points) {
  const k = 0.55; // makes each curve close to a quarter circle
  let path = "";
  points.forEach((corner, i) => {
    const before = points[(i - 1 + points.length) % points.length];
    const after = points[(i + 1) % points.length];
    const start = toward(corner, before, RADIUS);
    const end = toward(corner, after, RADIUS);
    const c1 = [start[0] + (corner[0] - start[0]) * k, start[1] + (corner[1] - start[1]) * k];
    const c2 = [end[0] + (corner[0] - end[0]) * k, end[1] + (corner[1] - end[1]) * k];
    path += `${i === 0 ? "M" : "L"} ${start} C ${c1} ${c2} ${end} `;
  });
  return `path("${path}Z")`;
}

function shapeTiles() {
  if (phoneScreen.matches) {
    menuTile.style.clipPath = "";
    seasonalTile.style.clipPath = "";
    seasonalTile.style.setProperty("--notch-w", "0px");
    return;
  }

  // Read the real column/row sizes the browser worked out for the grid
  const grid = getComputedStyle(bento);
  const column2 = parseFloat(grid.gridTemplateColumns.split(" ")[1]);
  const row1 = parseFloat(grid.gridTemplateRows.split(" ")[0]);
  const gap = parseFloat(grid.columnGap);
  const notchW = column2 + gap;

  // Menu: a rectangle with its bottom-right corner cut away
  const mw = menuTile.offsetWidth;
  const mh = menuTile.offsetHeight;
  menuTile.style.clipPath = roundedShape([
    [0, 0], [mw, 0], [mw, row1], [mw - notchW, row1], [mw - notchW, mh], [0, mh],
  ]);

  // Seasonal drink: a rectangle with its top-left corner cut away
  const sw = seasonalTile.offsetWidth;
  const sh = seasonalTile.offsetHeight;
  seasonalTile.style.clipPath = roundedShape([
    [notchW, 0], [sw, 0], [sw, sh], [0, sh], [0, row1 + gap], [notchW, row1 + gap],
  ]);
  seasonalTile.style.setProperty("--notch-w", notchW + "px");
}

// Redraw the shapes whenever the grid changes size (window resized, phone rotated)
new ResizeObserver(shapeTiles).observe(bento);
