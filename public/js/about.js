// Shows a different photo of the shop on each visit to the About page.

const SHOP_PHOTOS = [
  { file: "interior-1.jpg", caption: "about.photo.shelf" },
  { file: "interior-2.jpg", caption: "about.photo.evening" },
  { file: "interior-3.jpg", caption: "about.photo.corner" },
  { file: "street-2.jpg", caption: "about.photo.neighbours" },
];

const photo = SHOP_PHOTOS[Math.floor(Math.random() * SHOP_PHOTOS.length)];
// A full address, so the browser can't mix up which folder the path starts from
const photoUrl = new URL(`images/backgrounds/${photo.file}`, document.baseURI).href;
document.getElementById("about-photo").style.setProperty("--photo", `url("${photoUrl}")`);
document.getElementById("about-caption").textContent = t(photo.caption);

// ---------- Shop info from Settings ----------

const shop = getSettings().shop;
const hours = getSettings().hours;
// 07:00 → 7:00 in English, 7 h in French
const hourText = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  if (LANG === "fr") return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  return `${h}:${String(m).padStart(2, "0")}`;
};
document.getElementById("about-address1").textContent = shop.address1;
document.getElementById("about-address2").textContent = shop.address2;
document.getElementById("about-hours1").textContent = t("about.hours1", { open: hourText(hours.weekday[0]), close: hourText(hours.weekday[1]) });
document.getElementById("about-hours2").textContent = t("about.hours2", { open: hourText(hours.weekend[0]), close: hourText(hours.weekend[1]) });
const phoneLink = document.getElementById("about-phone");
phoneLink.textContent = shop.phone;
phoneLink.href = `tel:+1${shop.phone.replace(/\D/g, "").slice(-10)}`;
const emailLink = document.getElementById("about-email");
emailLink.textContent = shop.email;
emailLink.href = `mailto:${shop.email}`;

// Only the networks that have a link in Settings, and only real web links
const socials = getSettings().socials;
const socialList = document.getElementById("about-socials");
[["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"]].forEach(([key, label]) => {
  if (!/^https:\/\//.test(socials[key] || "")) return;
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = socials[key];
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = label;
  li.append(a);
  socialList.append(li);
});
