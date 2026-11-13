// Daftar GLOBAL VARIABLE yang bisa dipakai di template Excel.
// Ini satu-satunya tempat untuk menambah/mengubah variabel: server mengisi nilainya
// di buildValues(), halaman web menampilkan daftar ini sebagai referensi.

const SCALARS = [
  { key: "app_name", desc: "Nama aplikasi", example: "Prisma Log Multi" },
  { key: "report_title", desc: "Judul laporan", example: "Laporan Timbangan" },
  { key: "from", desc: "Filter tanggal awal (teks)", example: "01-11-2026 00:00" },
  { key: "to", desc: "Filter tanggal akhir (teks)", example: "13-11-2026 23:59" },
  { key: "product_filter", desc: "Filter produk", example: "Semua" },
  { key: "scale_filter", desc: "Filter scale", example: "Semua" },
  { key: "exported_at", desc: "Waktu export (tanggal, ikut format sel)", example: "13/11/2026 10:15" },
  { key: "total_rows", desc: "Jumlah data", example: "49" },
  { key: "total_gross", desc: "Total gross", example: "12.345" },
  { key: "avg_gross", desc: "Rata-rata gross", example: "1.02" },
  { key: "min_gross", desc: "Gross terkecil", example: "0.98" },
  { key: "max_gross", desc: "Gross terbesar", example: "1.05" },
  { key: "count_ok", desc: "Jumlah judgement OK", example: "45" },
  { key: "count_under", desc: "Jumlah judgement UNDER", example: "2" },
  { key: "count_over", desc: "Jumlah judgement OVER", example: "2" },
];

// Kolom per baris data, dipakai sebagai ${table:rows.<key>}
const ROW_FIELDS = [
  { key: "no", desc: "Nomor urut" },
  { key: "id", desc: "ID report" },
  { key: "created_at", desc: "Tanggal timbang (tanggal, ikut format sel)" },
  { key: "scale", desc: "Nomor scale" },
  { key: "product", desc: "Nama produk" },
  { key: "gross", desc: "Berat gross (angka)" },
  { key: "unit", desc: "Satuan" },
  { key: "judgement", desc: "OK / UNDER / OVER" },
  { key: "operator", desc: "Nama operator" },
  { key: "shift", desc: "Nama shift" },
];

const pad = (n) => String(n).padStart(2, "0");
const fmtFilterDate = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const round = (n) => Math.round(n * 1000) / 1000;

// xlsx-template menulis tanggal sebagai UTC, jadi jam lokal (WIB) harus digeser dulu
// supaya jam di Excel sama dengan jam di database.
const excelDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
};

function buildValues(reports, filter, productName) {
  const gross = reports.map((r) => Number(r.gross));
  const sum = gross.reduce((a, b) => a + b, 0);
  const count = (j) => reports.filter((r) => r.judgement === j).length;

  return {
    app_name: "Prisma Log Multi",
    report_title: "Laporan Timbangan",
    from: fmtFilterDate(filter.from),
    to: fmtFilterDate(filter.to),
    product_filter: productName || "Semua",
    scale_filter: filter.scale ? `Scale ${filter.scale}` : "Semua",
    exported_at: excelDate(new Date()),
    total_rows: reports.length,
    total_gross: round(sum),
    avg_gross: gross.length ? round(sum / gross.length) : 0,
    min_gross: gross.length ? Math.min(...gross) : 0,
    max_gross: gross.length ? Math.max(...gross) : 0,
    count_ok: count("ok"),
    count_under: count("under"),
    count_over: count("over"),
    rows: reports.map((r, i) => ({
      no: i + 1,
      id: r.id,
      created_at: excelDate(r.created_at),
      scale: r.scale,
      product: r.product,
      gross: Number(r.gross),
      unit: r.unit || "",
      judgement: (r.judgement || "").toUpperCase(),
      operator: r.operator,
      shift: r.shift || "-",
    })),
  };
}

const KNOWN = new Set([
  ...SCALARS.map((s) => s.key),
  ...ROW_FIELDS.map((f) => `table:rows.${f.key}`),
]);

module.exports = { SCALARS, ROW_FIELDS, KNOWN, buildValues };
