// Membuat templates/default.xlsx (dijalankan sekali lewat `npm run make-template`).
// File hasilnya bisa dibuka di Excel, diubah desainnya, lalu di-upload lewat halaman web.
const ExcelJS = require("exceljs");
const path = require("path");

(async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Laporan Timbangan");

  ws.columns = [
    { width: 6 }, { width: 22 }, { width: 9 }, { width: 26 }, { width: 12 },
    { width: 8 }, { width: 12 }, { width: 18 }, { width: 14 },
  ];

  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = "${report_title}";
  ws.getCell("A1").font = { bold: true, size: 16 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.mergeCells("A2:I2");
  ws.getCell("A2").value = "${app_name}";
  ws.getCell("A2").alignment = { horizontal: "center" };

  const info = [
    ["Periode", "${from} s/d ${to}"],
    ["Produk", "${product_filter}"],
    ["Scale", "${scale_filter}"],
    ["Dicetak", "${exported_at}"],
  ];
  info.forEach(([label, val], i) => {
    const r = 4 + i;
    ws.getCell(`A${r}`).value = label;
    ws.getCell(`A${r}`).font = { bold: true };
    ws.getCell(`C${r}`).value = val;
  });
  ws.getCell("C7").numFmt = "dd/mm/yyyy hh:mm";
  ws.getCell("C7").alignment = { horizontal: "left" };

  const border = {
    top: { style: "thin" }, left: { style: "thin" },
    bottom: { style: "thin" }, right: { style: "thin" },
  };

  const headers = ["No", "Tanggal Timbang", "Scale", "Produk", "Gross", "Unit", "Judgement", "Operator", "Shift"];
  const fields = ["no", "created_at", "scale", "product", "gross", "unit", "judgement", "operator", "shift"];

  headers.forEach((h, i) => {
    const c = ws.getRow(9).getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    c.alignment = { horizontal: "center" };
    c.border = border;
  });

  fields.forEach((f, i) => {
    const c = ws.getRow(10).getCell(i + 1);
    c.value = `\${table:rows.${f}}`;
    c.border = border;
  });
  ws.getCell("B10").numFmt = "dd/mm/yyyy hh:mm:ss";
  ws.getCell("E10").numFmt = "0.000";

  const summary = [
    ["Jumlah data", "${total_rows}"],
    ["Total gross", "${total_gross}"],
    ["Rata-rata gross", "${avg_gross}"],
    ["OK / UNDER / OVER", "${count_ok} / ${count_under} / ${count_over}"],
  ];
  summary.forEach(([label, val], i) => {
    const r = 12 + i;
    ws.getCell(`A${r}`).value = label;
    ws.getCell(`A${r}`).font = { bold: true };
    ws.getCell(`D${r}`).value = val;
    ws.getCell(`D${r}`).alignment = { horizontal: "left" };
  });

  ws.getCell("H17").value = "Mengetahui,";
  ws.getCell("H20").value = "(____________________)";

  const out = path.join(__dirname, "templates", "default.xlsx");
  await wb.xlsx.writeFile(out);
  console.log("Template default dibuat:", out);
})();
