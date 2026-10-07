# Known issues (to fix later)

## Open

1. **The seasonal tag on the menu is stuck on Egg Coffee.**
   - What works: changing the seasonal drink in Settings changes the home page tile (photo, link, name).
   - What does not: on the menu page, the seasonal tag stays on Egg Coffee. The tag comes from the drink's own label in the menu data ('Fall special' on egg coffee), not from the Settings choice.
   - Expected: the seasonal tag appears on the drink chosen in Settings, and moves when the choice changes.
   - Likely fix: show the seasonal tag on the menu page from the Settings choice (`home.seasonalDrink`), instead of the drink's own label.


2. **Egg Coffee still has the "Fall special" label on the live site.**
   - The seasonal tile, photo and product page already point at Egg Coffee, and the menu shows the "Seasonal" label from Settings.
   - The old "Fall special" label is still stored on the server, so it still shows. It was removed from the starting menu in the code, but the live data keeps it.
   - Fix: in Menu admin, open Egg Coffee, clear the label, and save. Check the customer menu after that.

## Fixed
