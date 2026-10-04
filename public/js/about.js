// Shows a different photo of the shop on each visit to the About page.

const SHOP_PHOTOS = [
  { file: "interior-1.jpg", caption: "The coffee shelf" },
  { file: "interior-2.jpg", caption: "Evening light" },
  { file: "interior-3.jpg", caption: "Our corner" },
  { file: "street-2.jpg", caption: "The neighbours" },
];

const photo = SHOP_PHOTOS[Math.floor(Math.random() * SHOP_PHOTOS.length)];
// A full address, so the browser can't mix up which folder the path starts from
const photoUrl = new URL(`images/backgrounds/${photo.file}`, document.baseURI).href;
document.getElementById("about-photo").style.setProperty("--photo", `url("${photoUrl}")`);
document.getElementById("about-caption").textContent = photo.caption;
