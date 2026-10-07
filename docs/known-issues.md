# Known issues (to fix later)

## Open

1. **The seasonal tag on the menu is stuck on Egg Coffee.**
   - What works: changing the seasonal drink in Settings changes the home page tile (photo, link, name).
   - What does not: on the menu page, the seasonal tag stays on Egg Coffee. The tag comes from the drink's own label in the menu data ('Fall special' on egg coffee), not from the Settings choice.
   - Expected: the seasonal tag appears on the drink chosen in Settings, and moves when the choice changes.
   - Likely fix: show the seasonal tag on the menu page from the Settings choice (`home.seasonalDrink`), instead of the drink's own label.

## Fixed
