// Background decoration scattered on the page card. Used on every page.

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
// The manager's choice in Settings wins over the page's own data-decor
const decorChoice = typeof getSettings === "function" ? getSettings().decor : document.body.dataset.decor;
const makeDecor = DECOR[decorChoice];
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
