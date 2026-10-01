# Brewshift design ideas

Ideas collected from other café websites. These are ideas, not decisions yet.

## 1. Loading screen (from Café Myriade)

- **Source:** https://www.cafemyriade.com
- **What they do:** while the page is loading, the whole screen is a dark background with the white Myriade logo centered. Once loading finishes, this screen disappears and the main page shows. (In their code, this element has the class name `preloader`.)
- **Term:** a *loading screen* or *preloader* is a temporary cover screen shown while the page is still loading.
- **Applied to "minh":** background in the café's main color, with the word "minh" (or a logo) in white centered on it, possibly with a light *fade out* effect once loading is done.
- **How to build it (when the time comes):**
  1. HTML: a `div` with `id="preloader"` containing the logo, placed at the top of `body`.
  2. CSS: `position: fixed` covering the whole screen, dark background, logo centered.
  3. JavaScript: once the page finishes loading (`window.addEventListener("load", ...)`), add a class that fades it out, then hide it.
- **Note:** keep it short (under about 1 second) — a long loading screen annoys customers. Use it only on the home page, not on the ordering page.
- **When to build:** needs a bit of JavaScript, so it fits week 2 onward. The HTML/CSS part can be done earlier, in week 1.

## 2. Font and "vibe" (from Cộng Cà Phê) — the user likes this one

- **Source:** https://congcaphe.com
- **Vibe:** old-school, nostalgic Vietnam (subsidy-era look), like hand-painted signs and old posters. Bold, tall, narrow headline type on a cream background.
- **Cộng's colors** (per Brandfetch): red `#B5191E`, cream `#E9E4D6`, moss green `#3E5B18`.
- **Cộng's exact font:** not found (not present in their page's code). Their logo/signage font is likely custom-drawn and not available for download.
- **Free fonts for "minh" with the same vibe** (from Google Fonts, with Vietnamese support — Claude's suggestion):
  - Headings: **Oswald** (bold, tall, narrow — close to signage lettering).
  - Body text: **Be Vietnam Pro** (easy to read, designed by a Vietnamese team).
- **Quick CSS test:**
  ```css
  /* First, add this link tag to the HTML <head> to load the fonts from Google Fonts:
     https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Be+Vietnam+Pro:wght@400;600&display=swap */
  h1, h2, h3 { font-family: "Oswald", sans-serif; text-transform: uppercase; }
  body { font-family: "Be Vietnam Pro", sans-serif; background: #E9E4D6; color: #2b2b2b; }
  ```
- **Note:** "minh" should have its own colors, not copy Cộng's colors directly. Only borrow the vibe.

## 3. Minimal, image-heavy homepage (from % Arabica) — the user likes this one

- **Source:** https://arabica.com/en/
- **What they do:** almost no descriptive text on the page. The homepage is mostly large photos, with a simple nav (Philosophy, Locations, Shop, Films, Contact). Neutral color palette (white/black/gray), stylized logo.
- **Applied to "minh":** a few large, high-quality photos (drinks, counter, storefront) instead of paragraphs of text. Let the photos and whitespace (deliberate empty space around content) carry the mood, keep nav and copy short.
- **Important: good source photos are not enough on their own.** For the page to actually look good and load fast on the web:
  1. **Compress the images (image optimization).** Camera/phone photos are often several MB each; uploaded as-is they make the page slow. Convert/compress to a lighter format like `.webp` before putting them in `public/`. A free tool: squoosh.app.
  2. **Serve different sizes for different screens (responsive images).** A phone doesn't need the same huge image as a desktop. HTML has `srcset`/`<picture>` for this — to cover later when building real pages.
  3. **Keep a consistent color tone across photos** (color grading) so they feel like one set, not a mismatched collection.
  4. **Use CSS layout on purpose** (full-bleed images, consistent spacing) — good photos can still look broken without the right layout/CSS around them.
- **When to build:** photo selection/shooting can start anytime; compression and responsive `<img>`/`srcset` markup fit once `public/` HTML/CSS work begins.

## Logo (chosen 2026-10-01)

- Wordmark "minh" (all lowercase), font **Rye** (Google Fonts, free), Old West / vintage poster style; letters converted to vector paths.
- `public/images/logo.svg` for light backgrounds (espresso `#3A2318`); `public/images/logo-dark.svg` for dark backgrounds (mustard `#E0A93B`).
- Palette idea: espresso `#3A2318`, cream `#F3E6CF`, burnt orange `#D2652D`, mustard `#E0A93B`, brick red `#A63A2A`, olive `#6E7B3A`.
- Rye only for the logo and big titles, never body text; keep the logo at least ~28px tall.
- Per-shop branding for minh; Brewshift code stays generic (logo path will come from `config/shop.json`).

## Other reference websites

- Pikolo Espresso: https://pikoloespresso.com (single-page home layout)
- Highlands Coffee: https://www.highlandscoffee.com.vn (menu grouped by category, "Order" button)
- Blue Bottle: https://bluebottlecoffee.com (minimal item cards)
- Second Cup: https://secondcup.com ("Order now" button, menu by group)
- Philz Coffee: https://www.philzcoffee.com (option picker, Add to cart)
- Cộng Cà Phê: https://congcaphe.com (bilingual Vietnamese/English)
