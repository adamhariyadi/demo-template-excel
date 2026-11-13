const express = require("express");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const XlsxTemplate = require("xlsx-template");
const config = require("./config");
const { SCALARS, ROW_FIELDS, KNOWN, buildValues } = require("./variables");

const TEMPLATE_DIR = path.join(__dirname, "templates");
const DEFAULT_TEMPLATE = path.join(TEMPLATE_DIR, "default.xlsx");
const CUSTOM_TEMPLATE = path.join(TEMPLATE_DIR, "custom.xlsx");

const pool = mysql.createPool({ ...config.db, connectionLimit: 2 });
const app = express();
app.use(express.static(path.join(__dirname, "public")));

const activeTemplate = () => (fs.existsSync(CUSTOM_TEMPLATE) ? CUSTOM_TEMPLATE : DEFAULT_TEMPLATE);

// "2026-11-13T08:00" (input datetime-local) -> "2026-11-13 08:00:00"
const toSql = (s) => s.replace("T", " ") + (s.length === 16 ? ":00" : "");

// Query sama seperti export di Prisma Log Multi (router/report.js)
async function getReports({ from, to, product, scale }) {
  const where = [];
  const params = [];
  if (from) { where.push("r.created_at >= ?"); params.push(toSql(from)); }
  if (to) { where.push("r.created_at <= ?"); params.push(toSql(to)); }
  if (product) { where.push("r.product_id = ?"); params.push(product); }
  if (scale) { where.push("r.scale = ?"); params.push(scale); }

  const [rows] = await pool.query(
    `SELECT r.*, p.name AS product, u.name AS operator, s.name AS shift
       FROM reports r
       JOIN products p ON r.product_id = p.id
       JOIN users u ON r.user_id = u.id
       LEFT JOIN shifts s ON r.shift_id = s.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY r.created_at DESC`,
    params,
  );
  return rows;
}

async function getProductName(id) {
  if (!id) return null;
  const [rows] = await pool.query("SELECT name FROM products WHERE id = ?", [id]);
  return rows[0] ? rows[0].name : null;
}

// Ambil semua ${...} dari template untuk ditampilkan & divalidasi
function scanPlaceholders(buffer) {
  const t = new XlsxTemplate(buffer);
  const xml = Object.keys(t.archive.files)
    .filter((f) => /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(f))
    .map((f) => t.archive.file(f).asText())
    .join("");
  const found = [...new Set([...xml.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]))];
  return {
    found,
    unknown: found.filter((p) => !KNOWN.has(p)),
    hasTable: found.some((p) => p.startsWith("table:rows.")),
  };
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error(e);
    res.status(500).json({ error: e.message });
  });

app.get("/api/variables", (req, res) => res.json({ scalars: SCALARS, rowFields: ROW_FIELDS }));

app.get("/api/products", wrap(async (req, res) => {
  const [rows] = await pool.query("SELECT id, name FROM products ORDER BY name");
  res.json(rows);
}));

app.get("/api/reports", wrap(async (req, res) => {
  const reports = await getReports(req.query);
  const values = buildValues(reports, req.query, await getProductName(req.query.product));
  const { rows, ...summary } = values;
  res.json({ summary, rows: rows.slice(0, 200), total: rows.length });
}));

app.get("/api/export", wrap(async (req, res) => {
  const reports = await getReports(req.query);
  const values = buildValues(reports, req.query, await getProductName(req.query.product));

  const template = new XlsxTemplate(fs.readFileSync(activeTemplate()));
  template.substituteAll(values); // isi semua sheet
  const output = template.generate({ type: "nodebuffer" });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="Laporan Timbangan.xlsx"');
  res.send(output);
}));

app.get("/api/template", wrap(async (req, res) => {
  const custom = fs.existsSync(CUSTOM_TEMPLATE);
  res.json({ custom, ...scanPlaceholders(fs.readFileSync(activeTemplate())) });
}));

app.get("/api/template/download", (req, res) => {
  const file = req.query.which === "default" ? DEFAULT_TEMPLATE : activeTemplate();
  res.download(file, req.query.which === "default" ? "template-default.xlsx" : "template-aktif.xlsx");
});

// Upload: body = isi file .xlsx mentah (tanpa multipart, biar ringan)
app.post("/api/template", express.raw({ type: "*/*", limit: "20mb" }), wrap(async (req, res) => {
  const buf = req.body;
  if (!buf || buf.length < 4 || buf.toString("latin1", 0, 2) !== "PK") {
    return res.status(400).json({ error: "File bukan .xlsx yang valid." });
  }
  let scan;
  try {
    scan = scanPlaceholders(buf);
  } catch (e) {
    return res.status(400).json({ error: "Template tidak bisa dibaca: " + e.message });
  }
  if (!scan.hasTable) {
    return res.status(400).json({ error: "Template harus punya minimal satu ${table:rows.xxx} untuk baris data." });
  }
  fs.writeFileSync(CUSTOM_TEMPLATE, buf);
  res.json({ custom: true, ...scan });
}));

app.delete("/api/template", (req, res) => {
  if (fs.existsSync(CUSTOM_TEMPLATE)) fs.unlinkSync(CUSTOM_TEMPLATE);
  res.json({ custom: false, ...scanPlaceholders(fs.readFileSync(DEFAULT_TEMPLATE)) });
});

if (!fs.existsSync(DEFAULT_TEMPLATE)) {
  console.error("templates/default.xlsx belum ada. Jalankan: npm run make-template");
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`Demo template export: http://localhost:${config.port}`);
  console.log(`Database: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
});
