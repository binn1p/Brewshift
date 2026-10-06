// Work schedule (shifts). The owner plans shifts for everyone; each staff member sees their own.
// A shift is { id, userId, date: "YYYY-MM-DD", start: "HH:MM", end: "HH:MM" }.

const express = require("express");
const crypto = require("crypto");
const { readJson, writeJson, exclusive } = require("../lib/storage");
const { readUsers } = require("../lib/users");
const { requireLogin } = require("../middleware/auth");

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Checks a shift from the owner's form. Returns { errors } or { value }.
function checkShift(body) {
  const errors = {};
  const input = body && typeof body === "object" ? body : {};
  if (typeof input.userId !== "string") errors.userId = "Choose a staff member.";
  if (typeof input.date !== "string" || !DATE.test(input.date)) errors.date = "Date must look like 2026-10-06.";
  if (typeof input.start !== "string" || !TIME.test(input.start)) errors.start = "Start must look like 09:00.";
  if (typeof input.end !== "string" || !TIME.test(input.end)) errors.end = "End must look like 17:00.";
  if (!errors.start && !errors.end && input.start >= input.end) errors.end = "End must be after the start.";
  if (Object.keys(errors).length > 0) return { errors };
  return { value: { userId: input.userId, date: input.date, start: input.start, end: input.end } };
}

// Shifts between two dates (inclusive), in date order
function inDates(shifts, from, to) {
  return shifts
    .filter((s) => (!from || s.date >= from) && (!to || s.date <= to))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

// Owner side, mounted under /api/admin/shifts
function ownerShiftsRouter() {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const from = DATE.test(req.query.from) ? req.query.from : null;
      const to = DATE.test(req.query.to) ? req.query.to : null;
      res.json(inDates(await readJson("shifts", []), from, to));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const checked = checkShift(req.body);
      if (checked.errors) return res.status(400).json({ error: "Please check the form.", fields: checked.errors });
      const staff = (await readUsers()).find((u) => u.id === checked.value.userId && u.role === "staff" && u.status === "approved");
      if (!staff) return res.status(400).json({ error: "Choose an approved staff member.", fields: { userId: "Choose an approved staff member." } });

      const shift = await exclusive(async () => {
        const shifts = await readJson("shifts", []);
        const created = { id: `s_${crypto.randomBytes(4).toString("hex")}`, ...checked.value };
        shifts.push(created);
        await writeJson("shifts", shifts);
        return created;
      });
      res.status(201).json(shift);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const result = await exclusive(async () => {
        const shifts = await readJson("shifts", []);
        const remaining = shifts.filter((s) => s.id !== req.params.id);
        if (remaining.length === shifts.length) return { error: 404 };
        await writeJson("shifts", remaining);
        return { ok: true };
      });
      if (result.error) return res.status(404).json({ error: "No shift with that id." });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

// Staff side, mounted under /api/shifts: only my own shifts (FR-41 style isolation)
function myShiftsRouter() {
  const router = express.Router();
  router.use(requireLogin);

  router.get("/me", async (req, res, next) => {
    try {
      const from = DATE.test(req.query.from) ? req.query.from : null;
      const to = DATE.test(req.query.to) ? req.query.to : null;
      const mine = (await readJson("shifts", [])).filter((s) => s.userId === req.user.id);
      res.json(inDates(mine, from, to));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { ownerShiftsRouter, myShiftsRouter, checkShift };
