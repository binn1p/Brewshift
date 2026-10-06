// Shop settings the owner changes in Settings: shop info, hours, taxes, work-hour
// limits, points, loading time, decoration, kiosk questions and pay periods.
// Stored in data/settings.json; only what the owner has saved is in the file, and the
// browser fills in the rest from its defaults.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (v, max) => typeof v === "string" && v.length <= max;
const num = (v, min, max) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const pair = (v) => Array.isArray(v) && v.length === 2 && v.every((x) => TIME.test(x));

// Returns { errors } or { value } with only the known fields
function checkSettings(input) {
  const errors = {};
  const s = input && typeof input === "object" ? input : {};
  const shop = s.shop || {};
  if (!text(shop.name, 60) || !shop.name.trim()) errors.name = "Shop name is required.";
  for (const key of ["address1", "address2", "phone", "email"]) {
    if (!text(shop[key], 120)) errors[key] = "Keep this under 120 characters.";
  }
  if (!s.hours || !pair(s.hours.weekday) || !pair(s.hours.weekend)) errors.hours = "Opening hours must look like 07:00 and 18:00.";
  if (!s.socials || !["instagram", "facebook", "tiktok"].every((k) => text(s.socials[k], 200))) errors.socials = "Social links are too long.";
  if (!s.taxes || !num(s.taxes.gst, 0, 30) || !num(s.taxes.qst, 0, 30)) errors.taxes = "Tax rates must be between 0 and 30.";
  if (!s.limits || !["international", "partTime", "fullTime"].every((k) => num(s.limits[k], 0, 168))) errors.limits = "Hour limits must be between 0 and 168.";
  if (!DATE.test(s.payPeriodStart || "")) errors.payPeriodStart = "Pay period start must look like 2026-09-27.";
  if (!s.loyalty || !num(s.loyalty.pointsPerDrink, 0, 100) || !num(s.loyalty.pointValue, 0, 100)) errors.loyalty = "Points values are not valid.";
  if (!num(s.loadingMs, 0, 10000)) errors.loadingMs = "Loading time must be between 0 and 10 seconds.";
  if (!text(s.decor, 30)) errors.decor = "Decoration is not valid.";
  if (!Array.isArray(s.questions) || s.questions.length > 50) errors.questions = "Questions are not valid.";
  if (!text(s.pinnedQuestion || "", 60)) errors.pinnedQuestion = "Pinned question is not valid.";
  if (Object.keys(errors).length > 0) return { errors };

  return {
    value: {
      shop: { name: shop.name.trim(), address1: shop.address1.trim(), address2: shop.address2.trim(), phone: shop.phone.trim(), email: shop.email.trim() },
      hours: { weekday: s.hours.weekday, weekend: s.hours.weekend },
      socials: { instagram: s.socials.instagram.trim(), facebook: s.socials.facebook.trim(), tiktok: s.socials.tiktok.trim() },
      taxes: { gst: s.taxes.gst, qst: s.taxes.qst },
      limits: { international: s.limits.international, partTime: s.limits.partTime, fullTime: s.limits.fullTime },
      payPeriodStart: s.payPeriodStart,
      loyalty: { pointsPerDrink: s.loyalty.pointsPerDrink, pointValue: s.loyalty.pointValue },
      loadingMs: s.loadingMs,
      decor: s.decor,
      questions: s.questions,
      pinnedQuestion: s.pinnedQuestion || "",
    },
  };
}

module.exports = { checkSettings };
