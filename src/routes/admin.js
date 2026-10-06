// Owner reports: every order, the weekly hours table, and CSV exports (FR-53 to FR-58).
// Only the owner can use these routes.

const express = require("express");
const { readJson } = require("../lib/storage");
const { publicUser, readUsers } = require("../lib/users");
const { weekHours } = require("../lib/punches");
const { toCsv } = require("../lib/csv");
const { requireLogin, requireRole } = require("../middleware/auth");

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Keeps only orders or punches whose date (YYYY-MM-DD, first 10 characters of the ISO time) is in range
function inRange(isoTime, from, to) {
  const day = isoTime.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
}

function dateRange(query) {
  const from = DATE.test(query.from) ? query.from : null;
  const to = DATE.test(query.to) ? query.to : null;
  return { from, to };
}

function adminRouter(shop) {
  const router = express.Router();
  router.use(requireLogin, requireRole("owner"));

  // Every order, optionally filtered by date and status (FR-53)
  router.get("/orders", async (req, res, next) => {
    try {
      const { from, to } = dateRange(req.query);
      const status = typeof req.query.status === "string" ? req.query.status : null;
      const orders = (await readJson("orders", []))
        .filter((o) => inRange(o.createdAt, from, to))
        .filter((o) => !status || o.status === status);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  });

  // Hours this week for every approved staff member (FR-54).
  // Over 24 h is flagged as the student limit, 40 h or more as overtime (FR-55).
  router.get("/hours", async (req, res, next) => {
    try {
      const users = (await readUsers()).filter((u) => u.role === "staff" && u.status === "approved");
      const punches = await readJson("punches", []);
      const now = new Date();
      const rows = users.map((user) => {
        const mine = punches.filter((p) => p.userId === user.id);
        const hours = weekHours(mine, now, shop.timeZone);
        const flag = hours >= 40 ? "overtime" : hours >= 24 ? "student-limit" : null;
        return { ...publicUser(user), hours, flag };
      });
      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  // CSV of all orders in a date range (FR-57)
  router.get("/export/orders.csv", async (req, res, next) => {
    try {
      const { from, to } = dateRange(req.query);
      const orders = (await readJson("orders", [])).filter((o) => inRange(o.createdAt, from, to));
      const csv = toCsv(
        [
          { key: "code", title: "Code" },
          { key: "createdAt", title: "Received" },
          { key: "customerName", title: "Customer" },
          { key: "phone", title: "Phone" },
          { key: "items", title: "Items" },
          { key: "subtotal", title: "Subtotal" },
          { key: "taxes", title: "Taxes" },
          { key: "total", title: "Total" },
          { key: "status", title: "Status" },
          { key: "pickupTime", title: "Pickup time" },
        ],
        orders.map((o) => ({
          ...o,
          items: o.items.map((i) => `${i.quantity} x ${i.name}`).join("; "),
          subtotal: (o.subtotalCents / 100).toFixed(2),
          taxes: (o.taxes.reduce((sum, t) => sum + t.cents, 0) / 100).toFixed(2),
          total: (o.totalCents / 100).toFixed(2),
        }))
      );
      sendCsv(res, "orders", from, to, csv);
    } catch (error) {
      next(error);
    }
  });

  // CSV of all clock in / out punches in a date range (FR-57)
  router.get("/export/punches.csv", async (req, res, next) => {
    try {
      const { from, to } = dateRange(req.query);
      const users = await readUsers();
      const names = new Map(users.map((u) => [u.id, u.name]));
      const punches = (await readJson("punches", [])).filter((p) => inRange(p.at, from, to));
      const csv = toCsv(
        [
          { key: "name", title: "Name" },
          { key: "type", title: "Action" },
          { key: "at", title: "Time (UTC)" },
        ],
        punches.map((p) => ({ name: names.get(p.userId) || "", type: p.type === "in" ? "Clock in" : "Clock out", at: p.at }))
      );
      sendCsv(res, "punches", from, to, csv);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function sendCsv(res, name, from, to, csv) {
  const suffix = [from, to].filter(Boolean).join("_to_") || "all";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="brewshift-${name}-${suffix}.csv"`);
  res.send("﻿" + csv); // BOM so Excel reads accents correctly
}

module.exports = { adminRouter };
