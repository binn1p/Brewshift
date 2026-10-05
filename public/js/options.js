// Shared by the drink window and the cart: customize choices, their icons, and tax.

// Small retro icons (ink outline + flat palette fills), drawn on a 24×24 grid
const ICON_STYLE = `fill="none" stroke="#3A2318" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
const ICONS = {
  none: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/></svg>`,
  condensed: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><path d="M6 6v12c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6" fill="#F3E6CF"/><path d="M6 10.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v4c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5z" fill="#A63A2A"/><ellipse cx="12" cy="6" rx="6" ry="2.5" fill="#E0A93B"/></svg>`,
  fresh: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><path d="M8 4h8v3l2 3v10H6V10l2-3z" fill="#F3E6CF"/><path d="M6 10h12" /><path d="M8 4h8v3H8z" fill="#6E7B3A"/><path d="M9 14h6v3H9z" fill="#D2652D"/></svg>`,
  almond: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><path d="M12 3c4 3.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2-7.5 6-11z" fill="#C98A52"/><path d="M10 9.5c-.8 1.5-1.2 3-1.2 4.5M13 8.5v1.5M14.5 12v2M11.5 15.5v1.5"/></svg>`,
  oat: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><path d="M12 21V6"/><ellipse cx="12" cy="4.5" rx="1.6" ry="2.4" fill="#E0A93B"/><ellipse cx="9" cy="9" rx="1.6" ry="2.6" transform="rotate(-35 9 9)" fill="#E0A93B"/><ellipse cx="15" cy="9" rx="1.6" ry="2.6" transform="rotate(35 15 9)" fill="#E0A93B"/><ellipse cx="9" cy="14" rx="1.6" ry="2.6" transform="rotate(-35 9 14)" fill="#E0A93B"/><ellipse cx="15" cy="14" rx="1.6" ry="2.6" transform="rotate(35 15 14)" fill="#E0A93B"/></svg>`,
  coconut: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><path d="M3 11h18a9 9 0 0 1-18 0z" fill="#6B3F24"/><path d="M5.5 11h13a6.5 6.5 0 0 1-13 0z" fill="#FFFDF7"/></svg>`,
  sugar: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><path d="M12 3l8 4v10l-8 4-8-4V7z" fill="#FFFDF7"/><path d="M4 7l8 4 8-4M12 11v10"/><path d="M12 11l8-4v10l-8 4z" fill="#E8D9BF"/></svg>`,
  ice: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><path d="M12 3l8 4v10l-8 4-8-4V7z" fill="#D6E8EC"/><path d="M4 7l8 4 8-4M12 11v10"/><path d="M12 11l8-4v10l-8 4z" fill="#B5D2D9"/><path d="M7 9.5l2 1" stroke="#FFFFFF"/></svg>`,
  note: `<svg viewBox="0 0 24 24" ${ICON_STYLE}><path d="M4 20l1-4L16 5l3 3L8 19z" fill="#E0A93B"/><path d="M14 7l3 3"/></svg>`,
};

// Milk choices; `extra` is added to the drink price. Names come from i18n.js ("milk.<id>").
const MILKS = [
  { id: "none", icon: "none", extra: 0 },
  { id: "condensed", icon: "condensed", extra: 0 },
  { id: "fresh", icon: "fresh", extra: 0 },
  { id: "almond", icon: "almond", extra: 0.75 },
  { id: "oat", icon: "oat", extra: 0.75 },
  { id: "coconut", icon: "coconut", extra: 0.5 },
];

const LEVELS = [0, 25, 50, 75, 100];

// Quebec sales taxes (Montreal); the rates can be changed in Settings
function getTaxes() {
  const rates = typeof getSettings === "function" ? getSettings().taxes : { gst: 5, qst: 9.975 };
  return [
    { label: "tax.gst", rate: rates.gst / 100, percent: rates.gst },
    { label: "tax.qst", rate: rates.qst / 100, percent: rates.qst },
  ];
}

function findMilk(id) {
  return MILKS.find((milk) => milk.id === id);
}

// $6.00 in English, 6,00 $ in French (Québec style)
function money(amount) {
  const fixed = amount.toFixed(2);
  return LANG === "en" ? `$${fixed}` : `${fixed.replace(".", ",")} $`;
}

// Price of one cart line. A promo like { buy: 2, pay: 1 } ("2 for 1") makes
// every second drink free: 2 cost 1, 3 cost 2, 4 cost 2...
function lineTotal(unitPrice, qty, promo) {
  if (!promo) return unitPrice * qty;
  const free = Math.floor(qty / promo.buy) * (promo.buy - promo.pay);
  return unitPrice * (qty - free);
}

// "$12.00" crossed out next to "$6.00" when a promo lowers the price
function priceHTML(unitPrice, qty, promo) {
  const full = unitPrice * qty;
  const paid = lineTotal(unitPrice, qty, promo);
  if (paid === full) return `<span class="price-now">${money(paid)}</span>`;
  return `<s class="price-was">${money(full)}</s> <span class="price-now">${money(paid)}</span>`;
}
