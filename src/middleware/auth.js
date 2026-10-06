// Checks who is signed in before a route runs (NFR-S1).
// The session only stores the user's id; the status and role are read from
// the file each time, so a deactivated person is blocked at once (FR-52).

const { readUsers } = require("../lib/users");

// Puts the signed-in user on req.user, or answers 401.
async function requireLogin(req, res, next) {
  try {
    const id = req.session?.userId;
    const user = id ? (await readUsers()).find((u) => u.id === id) : null;
    if (!user || user.status !== "approved") {
      return res.status(401).json({ error: "Please log in." });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// Use after requireLogin: only people with one of the given roles pass, else 403.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have access to this." });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
