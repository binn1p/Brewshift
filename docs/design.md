# Brewshift — Design Notes

Visual design decisions for the **minh** café theme. Front-end CSS should pull colors from here (e.g. as CSS custom properties) instead of hard-coding hex values in multiple files.

## Color palette

| Swatch | Hex | RGB | Suggested use |
|---|---|---|---|
| 🟤 | `#622B14` | rgb(98, 43, 20) | Dark brown — headings, header/footer background |
| 🟤 | `#995F2F` | rgb(153, 95, 47) | Medium brown — primary buttons, links, accents |
| 🟢 | `#978F66` | rgb(151, 143, 102) | Olive/tan — secondary accents, borders |
| 🟡 | `#E4D6A9` | rgb(228, 214, 169) | Cream — page background, cards |

## Notes

- Picked for a warm, coffee-shop feel to match the "minh" branding.
- When `public/` CSS is set up, define these as root variables, e.g.:
  ```css
  :root {
    --color-dark: #622B14;
    --color-primary: #995F2F;
    --color-accent: #978F66;
    --color-bg: #E4D6A9;
  }
  ```
- Revisit contrast (text vs. background) once real pages exist, to keep text readable (accessibility).
