// Builds a CSV file (comma-separated values) that opens in Excel or Google Sheets (FR-57).
// Each value is quoted when needed, so commas, quotes and line breaks stay in one cell.

function cell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

// columns: [{ key, title }] ; rows: plain objects
function toCsv(columns, rows) {
  const header = columns.map((c) => cell(c.title)).join(",");
  const body = rows.map((row) => columns.map((c) => cell(row[c.key])).join(","));
  return [header, ...body].join("\r\n") + "\r\n";
}

module.exports = { toCsv };
