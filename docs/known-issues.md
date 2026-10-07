# Known issues (to fix later)

## Open

1. **Changing the seasonal drink in Settings does not change the home page tile.**
   - Where: Settings → Home page → seasonal drink, then open the home page (`index.html`).
   - Expected: the seasonal tile shows the new drink.
   - Note: the seasonal tile is on the home page, not the menu page.
   - Likely cause to check: the home page reads the drink choice from this browser's copy of the settings. Check that the save reaches the server (`PUT /api/admin/settings/home`) and that the home page reloads the choice (`syncHome` in `public/js/api.js`, called from `public/js/home.js`).

## Fixed
