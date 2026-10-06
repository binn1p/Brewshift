// Clock in / out and own hours. Each person sees and changes only their own punches (FR-41).

const express = require("express");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { requireLogin } = require("../middleware/auth");
const { nextType, weekHours, currentState, newPunch } = require("../lib/punches");

function punchesRouter(shop) {
  const router = express.Router();
  router.use(requireLogin);

  // Clock in if clocked out, clock out if clocked in. The time is the server's (FR-32).
  router.post("/toggle", async (req, res, next) => {
    try {
      const now = new Date();
      const result = await exclusive(async () => {
        const all = await readJson("punches", []);
        const mine = all.filter((p) => p.userId === req.user.id);
        const punch = newPunch(req.user.id, nextType(mine), now);
        all.push(punch);
        await writeJson("punches", all);
        return { punch, state: currentState([...mine, punch]) };
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  // My punches, my state, and my hours this week (FR-40)
  router.get("/me", async (req, res, next) => {
    try {
      const mine = (await readJson("punches", [])).filter((p) => p.userId === req.user.id);
      const now = new Date();
      res.json({
        state: currentState(mine),
        weekHours: weekHours(mine, now, shop.timeZone),
        punches: mine.sort((a, b) => a.at.localeCompare(b.at)),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { punchesRouter };
