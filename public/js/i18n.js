// English / French. Load this first on every page.
// - HTML text: give the element data-i18n="key" (and data-i18n-attr="placeholder:key"
//   for attributes); applyI18n() swaps in the chosen language.
// - JavaScript text: t("key", { name: "Linh" }) returns the string with {name} filled in.
// - Data with both languages ({ en: "...", fr: "..." }): tr(value) picks one.
// The language switch sits at the top right of every page; the choice is remembered.
// Customer pages offer EN | FR. Staff and manager pages add VI with
// <body data-langs="en fr vi">. A page that doesn't offer the saved language shows English.
// Missing Vietnamese text falls back to English.

const LANG_KEY = "brewshift-lang";
const LANGS = (document.body.dataset.langs || "en fr").split(" ");

let LANG = "en";
try {
  if (LANGS.includes(localStorage.getItem(LANG_KEY))) LANG = localStorage.getItem(LANG_KEY);
} catch {
  // storage blocked: stay in English
}
document.documentElement.lang = LANG;

const STRINGS = {
  // Pages and header
  "title.home": { en: "minh — Vietnamese coffee, Montreal", fr: "minh — café vietnamien, Montréal" },
  "title.menu": { en: "Menu — minh", fr: "Menu — minh" },
  "title.about": { en: "About — minh", fr: "À propos — minh" },
  "title.kiosk": { en: "Staff kiosk — minh", fr: "Borne du personnel — minh" },
  "title.staff": { en: "My shifts — minh", fr: "Mes quarts — minh" },
  "nav.home": { en: "← Home", fr: "← Accueil" },
  "nav.login": { en: "Log In", fr: "Connexion" },
  "nav.done": { en: "Done", fr: "Terminé" },
  "nav.logoHome": { en: "minh, back to home", fr: "minh, retour à l'accueil" },
  "lang.switch": { en: "Language", fr: "Langue" },

  // Home
  "home.menu.text": { en: "7 Vietnamese coffees, brewed slow with a phin.", fr: "7 cafés vietnamiens, infusés lentement au phin." },
  "home.menu.cta": { en: "Open the menu →", fr: "Voir le menu →" },
  "home.seasonal.label": { en: "Fall special", fr: "Spécial d'automne" },
  "home.seasonal.title": { en: "Egg Coffee", fr: "Café aux œufs" },
  "home.seasonal.text": { en: "Cà phê trứng: coffee under whipped egg-yolk and condensed-milk cream, Hanoi style.", fr: "Cà phê trứng : un café sous une crème fouettée de jaune d'œuf et de lait concentré, à la façon de Hanoï." },
  "home.seasonal.cta": { en: "$8 · Discover →", fr: "8 $ · Découvrir →" },
  "home.discover": { en: "Discover →", fr: "Découvrir →" },
  "home.promo.title": { en: "2 for 1 iced coffee", fr: "Café glacé 2 pour 1" },
  "home.promo.text": { en: "Weekdays, 2 to 4 pm.", fr: "En semaine, de 14 h à 16 h." },
  "home.about": { en: "About minh", fr: "À propos de minh" },

  // Drink window
  "dw.ingredients": { en: "Ingredients", fr: "Ingrédients" },
  "dw.story": { en: "The story", fr: "L'histoire" },
  "dw.milk": { en: "Milk", fr: "Lait" },
  "dw.sugar": { en: "Sugar", fr: "Sucre" },
  "dw.ice": { en: "Ice", fr: "Glace" },
  "dw.note": { en: "Note", fr: "Note" },
  "dw.notePlaceholder": { en: "Anything else? e.g. extra hot, less foam", fr: "Autre chose ? ex. très chaud, moins de mousse" },
  "dw.qty": { en: "Quantity", fr: "Quantité" },
  "dw.from": { en: "{vi} · from {price}", fr: "{vi} · à partir de {price}" },
  "dw.add": { en: "Add to bag", fr: "Ajouter au sac" },
  "dw.save": { en: "Save changes", fr: "Enregistrer" },
  "dw.promo": { en: "{tag}: every second one is free", fr: "{tag} : le deuxième est gratuit" },
  "common.close": { en: "Close", fr: "Fermer" },
  "common.less": { en: "One less", fr: "Un de moins" },
  "common.more": { en: "One more", fr: "Un de plus" },

  // Milks and taxes
  "milk.none": { en: "No milk", fr: "Sans lait" },
  "milk.condensed": { en: "Condensed milk", fr: "Lait concentré" },
  "milk.fresh": { en: "Fresh milk", fr: "Lait frais" },
  "milk.almond": { en: "Almond milk", fr: "Lait d'amande" },
  "milk.oat": { en: "Oat milk", fr: "Lait d'avoine" },
  "milk.coconut": { en: "Coconut milk", fr: "Lait de coco" },
  "tax.gst": { en: "GST {n}%", fr: "TPS {n} %" },
  "tax.qst": { en: "QST {n}%", fr: "TVQ {n} %" },

  // Cart
  "cart.title": { en: "Your bag", fr: "Votre sac" },
  "cart.open": { en: "Open your bag", fr: "Ouvrir votre sac" },
  "cart.empty": { en: "Your bag is empty.", fr: "Votre sac est vide." },
  "cart.browse": { en: "Browse the menu", fr: "Voir le menu" },
  "cart.subtotal": { en: "Subtotal (before tax)", fr: "Sous-total (avant taxes)" },
  "cart.total": { en: "Total (after tax)", fr: "Total (taxes incluses)" },
  "cart.name": { en: "Name for pickup", fr: "Nom pour la cueillette" },
  "cart.namePlaceholder": { en: "We'll call this name at the counter", fr: "Nous appellerons ce nom au comptoir" },
  "cart.phone": { en: "Phone", fr: "Téléphone" },
  "cart.phoneError": { en: "Please enter a 10-digit phone number.", fr: "Veuillez entrer un numéro à 10 chiffres." },
  "cart.checkout": { en: "Checkout", fr: "Commander" },
  "cart.placed": { en: "Thanks, {name}! Your order is in.", fr: "Merci, {name} ! Votre commande est reçue." },
  "cart.code": { en: "Your order code", fr: "Votre code de commande" },
  "cart.paymentSoon": { en: "Show this code at the counter and pay there.", fr: "Montrez ce code au comptoir et payez sur place." },
  "dw.soldOut": { en: "Sold out", fr: "Épuisé" },
  "cart.edit": { en: "Edit", fr: "Modifier" },
  "cart.editLabel": { en: "Edit {name}", fr: "Modifier {name}" },
  "cart.sugar": { en: "Sugar {n}%", fr: "Sucre {n} %" },
  "cart.ice": { en: "Ice {n}%", fr: "Glace {n} %" },

  // About
  "about.title": { en: "About minh", fr: "À propos de minh" },
  "about.story.title": { en: "How minh started", fr: "Les débuts de minh" },
  "about.story.p1": { en: "minh started with one phin filter in a tiny Montreal apartment. Missing the slow mornings back home, we brewed Vietnamese coffee for friends every weekend, until the line at our door was longer than our kitchen.", fr: "minh a commencé avec un seul filtre phin dans un petit appartement de Montréal. Ennuyés des matins tranquilles de chez nous, nous préparions du café vietnamien pour nos amis chaque fin de semaine, jusqu'à ce que la file à notre porte soit plus longue que notre cuisine." },
  "about.story.p2": { en: "So in 2026 we opened a small shop on Saint-Laurent to share the same thing: strong coffee, dripped slowly, with time to sit and talk.", fr: "En 2026, nous avons donc ouvert un petit café sur Saint-Laurent pour partager la même chose : un café corsé, filtré lentement, et le temps de s'asseoir pour jaser." },
  "about.story.quote": { en: "After the rain, the red basalt soil breathes out that damp, earthy smell, the scent of a whole coffee garden just washed clean. minh grew out of that smell. Every cup brewed here carries a little of it back, slow and quiet, like walking through rain that just passed.", fr: "Après la pluie, la terre rouge de basalte exhale cette odeur humide et terreuse, le parfum de toute une plantation de café fraîchement lavée. minh est né de cette odeur. Chaque tasse préparée ici en rapporte un peu, lente et tranquille, comme une promenade sous une pluie qui vient de passer." },
  "about.visit": { en: "Visit us", fr: "Venez nous voir" },
  "about.hours1": { en: "Mon–Fri {open}–{close}", fr: "Lun–ven {open}–{close}" },
  "about.hours2": { en: "Sat–Sun {open}–{close}", fr: "Sam–dim {open}–{close}" },
  "about.vision.title": { en: "Where we're going", fr: "Où nous allons" },
  "about.vision.text": { en: "To be the corner of Montreal that tastes like a Vietnamese morning, and to bring the phin to more neighbourhoods, one slow cup at a time.", fr: "Être le coin de Montréal qui goûte le matin vietnamien, et apporter le phin dans plus de quartiers, une tasse lente à la fois." },
  "about.photo.shelf": { en: "The coffee shelf", fr: "L'étagère à café" },
  "about.photo.evening": { en: "Evening light", fr: "Lumière du soir" },
  "about.photo.corner": { en: "Our corner", fr: "Notre coin" },
  "about.photo.neighbours": { en: "The neighbours", fr: "Les voisins" },

  // Kiosk
  "kiosk.title": { en: "Staff kiosk", fr: "Borne du personnel" },
  "kiosk.code": { en: "Employee code", fr: "Code d'employé" },
  "kiosk.keypad": { en: "Number keypad", fr: "Clavier numérique" },
  "kiosk.clear": { en: "Clear", fr: "Effacer" },
  "kiosk.back": { en: "Delete last digit", fr: "Effacer le dernier chiffre" },
  "kiosk.progress": { en: "{n} of 6 digits entered", fr: "{n} chiffres sur 6" },
  "kiosk.wrong": { en: "That code doesn't match. Please try again.", fr: "Ce code ne correspond pas. Veuillez réessayer." },
  "kiosk.pending": { en: "Hi {name}, your account is waiting for the owner's approval.", fr: "Bonjour {name}, votre compte attend l'approbation de la direction." },
  "kiosk.welcomeIn": { en: "Hi {name}, welcome in!", fr: "Bonjour {name}, bienvenue !" },
  "kiosk.welcomeInText": { en: "Have a great shift. Make every cup a good one.", fr: "Bon quart de travail ! Que chaque tasse soit réussie." },
  "kiosk.welcomeBack": { en: "Welcome back, {name}!", fr: "Rebonjour, {name} !" },
  "kiosk.welcomeManager": { en: "Welcome, {name}!", fr: "Bienvenue, {name} !" },
  "kiosk.welcomeManagerText": { en: "Opening the dashboard…", fr: "Ouverture du tableau de bord…" },
  "kiosk.welcomeBackText": { en: "Almost done? Your clock-out is one tap away.", fr: "Presque fini ? Votre fin de quart est à un clic." },
  "kiosk.noVotes": { en: "No votes yet", fr: "Aucun vote" },
  "kiosk.votes": { en: "{answer}: {n} votes", fr: "{answer} : {n} votes" },

  // Staff page
  "staff.hi": { en: "Hi,", fr: "Bonjour," },
  "staff.on": { en: "On the clock since {time}", fr: "En service depuis {time}" },
  "staff.off": { en: "Off the clock", fr: "Hors service" },
  "staff.today": { en: "Today's shift: {start}–{end}", fr: "Quart d'aujourd'hui : {start}–{end}" },
  "staff.noToday": { en: "No shift scheduled today", fr: "Aucun quart prévu aujourd'hui" },
  "staff.clockIn": { en: "Clock in", fr: "Début de quart" },
  "staff.clockOut": { en: "Clock out", fr: "Fin de quart" },
  "staff.toastIn": { en: "Clocked in at {time}. Have a great shift!", fr: "Début de quart à {time}. Bon travail !" },
  "staff.toastOut": { en: "Clocked out at {time}. You worked {hours}. Thanks!", fr: "Fin de quart à {time}. Vous avez travaillé {hours}. Merci !" },
  "staff.worked": { en: "Worked: {hours}", fr: "Travaillé : {hours}" },
  "staff.prevWeek": { en: "Previous week", fr: "Semaine précédente" },
  "staff.nextWeek": { en: "Next week", fr: "Semaine suivante" },
  "staff.nextShifts": { en: "Next shifts", fr: "Prochains quarts" },
  "staff.noUpcoming": { en: "No upcoming shifts yet.", fr: "Aucun quart à venir." },
  "staff.workHours": { en: "Work hours", fr: "Heures travaillées" },
  "staff.download": { en: "Download CSV", fr: "Télécharger CSV" },
  "staff.print": { en: "Print", fr: "Imprimer" },
  "staff.col.name": { en: "Name", fr: "Nom" },
  "staff.col.date": { en: "Date", fr: "Date" },
  "staff.col.in": { en: "Clock in", fr: "Début" },
  "staff.col.out": { en: "Clock out", fr: "Fin" },
  "staff.col.hours": { en: "Hours", fr: "Heures" },
  "staff.stillIn": { en: "(still clocked in)", fr: "(toujours en service)" },
  "staff.total": { en: "Total: {hours}", fr: "Total : {hours}" },
  "staff.printTitle": { en: "{name} — hours, {week}", fr: "{name} — heures, {week}" },
};

// Calendar words for the kiosk and staff page
const CALENDAR = {
  en: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    letters: ["S", "M", "T", "W", "T", "F", "S"],
    monthsLong: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  },
  fr: {
    months: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
    days: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
    letters: ["D", "L", "M", "M", "J", "V", "S"],
    monthsLong: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  },
  vi: {
    months: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
    days: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    letters: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    monthsLong: ["tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6", "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12"],
  },
}[LANG];

// ---------- Dates and durations in the current language ----------

// 425 minutes -> "7h 5m" / "7 h 05" / "7h05"
function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const mm = String(m).padStart(2, "0");
  if (LANG === "fr") return h === 0 ? `${m} min` : m ? `${h} h ${mm}` : `${h} h`;
  if (LANG === "vi") return h === 0 ? `${m} phút` : m ? `${h}h${mm}` : `${h}h`;
  return h === 0 ? `${m}m` : m ? `${h}h ${m}m` : `${h}h`;
}

// "Mon, Oct 5" / "lun. 5 oct." / "T2 5/10"
function formatShortDate(date) {
  if (LANG === "fr") return `${CALENDAR.days[date.getDay()]} ${date.getDate()} ${CALENDAR.months[date.getMonth()]}`;
  if (LANG === "vi") return `${CALENDAR.days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
  return `${CALENDAR.days[date.getDay()]}, ${CALENDAR.months[date.getMonth()]} ${date.getDate()}`;
}

// "Oct 5" / "5 oct." / "5/10"
function formatDayMonth(date) {
  if (LANG === "fr") return `${date.getDate()} ${CALENDAR.months[date.getMonth()]}`;
  if (LANG === "vi") return `${date.getDate()}/${date.getMonth() + 1}`;
  return `${CALENDAR.months[date.getMonth()]} ${date.getDate()}`;
}

// "Oct 5, 2026" / "5 oct. 2026" / "5 tháng 10, 2026"
function formatLongDate(date) {
  if (LANG === "fr") return `${date.getDate()} ${CALENDAR.months[date.getMonth()]} ${date.getFullYear()}`;
  if (LANG === "vi") return `${date.getDate()} ${CALENDAR.monthsLong[date.getMonth()]}, ${date.getFullYear()}`;
  return `${CALENDAR.months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function t(key, vars = {}) {
  const entry = STRINGS[key];
  let text = entry ? entry[LANG] || entry.en : key;
  for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, value);
  return text;
}

function tr(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value[LANG] || value.en;
  return value;
}

// A drink's name in the current language; in Vietnamese, its Vietnamese name
function drinkName(drink) {
  if (!drink) return "";
  return LANG === "vi" && drink.viName ? drink.viName : tr(drink.name);
}

function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  // data-i18n-attr="placeholder:key; aria-label:key2"
  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

// The language switch, added to the right end of the page header
function addLangSwitch() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const end = document.createElement("div");
  end.className = "header-end";
  const rightItem = header.querySelector(".login-link");
  const toggle = document.createElement("div");
  toggle.className = "lang-toggle";
  toggle.setAttribute("role", "group");
  toggle.setAttribute("aria-label", t("lang.switch"));
  LANGS.forEach((lang) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = lang.toUpperCase();
    button.setAttribute("aria-pressed", String(lang === LANG));
    button.addEventListener("click", () => {
      if (lang === LANG) return;
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch {
        // storage blocked: the choice can't be remembered
      }
      // Reload so every script builds its text again in the new language
      window.location.reload();
    });
    toggle.append(button);
  });
  end.append(toggle);
  if (rightItem) end.append(rightItem);
  header.append(end);
}

applyI18n();
addLangSwitch();
