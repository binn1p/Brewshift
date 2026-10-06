// Staff details the owner keeps (Employees page): contact, age, hours type, work permit,
// weekly availability, access level and status. Checked here before they are saved.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_DETAILS = { birthDate: "", phone: "", email: "", type: "part", residency: "local", availability: {} };

// Returns { errors } or { value }. A PIN is required for a new person; optional when editing.
function checkDetails(body, { isNew }) {
  const errors = {};
  const input = body && typeof body === "object" ? body : {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 60) errors.name = "Please enter the name (60 characters maximum).";

  const birthDate = input.birthDate ?? "";
  if (birthDate !== "" && (typeof birthDate !== "string" || !DATE.test(birthDate))) errors.birthDate = "Birth date must look like 2004-06-02.";

  const phone = String(input.phone ?? "").replace(/\D/g, "").slice(-10);
  if (phone !== "" && phone.length !== 10) errors.phone = "Phone must have 10 digits.";

  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email address.";

  if (!["part", "full"].includes(input.type)) errors.type = "Choose part-time or full-time.";
  if (!["local", "international"].includes(input.residency)) errors.residency = "Choose local or international.";
  if (!["staff", "manager"].includes(input.role)) errors.role = "Choose staff or manager.";
  if (!["approved", "pending", "inactive"].includes(input.status)) errors.status = "Choose a status.";

  const availability = {};
  for (let day = 0; day <= 6; day++) {
    const slot = input.availability?.[day];
    if (slot === null || slot === undefined) {
      availability[day] = null;
    } else if (Array.isArray(slot) && slot.length === 2 && slot.every((x) => TIME.test(x)) && slot[0] < slot[1]) {
      availability[day] = slot;
    } else {
      errors.availability = "Each open day needs a start before its end time.";
    }
  }

  let pin = null;
  if (input.pin !== undefined && input.pin !== "") {
    if (!/^\d{6}$/.test(String(input.pin))) errors.pin = "Your PIN must be exactly 6 digits.";
    else pin = String(input.pin);
  } else if (isNew) {
    errors.pin = "Your PIN must be exactly 6 digits.";
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    value: {
      name,
      birthDate,
      phone,
      email,
      type: input.type,
      residency: input.residency,
      role: input.role === "manager" ? "owner" : "staff",
      status: input.status,
      availability,
      pin,
    },
  };
}

module.exports = { checkDetails, DEFAULT_DETAILS };
