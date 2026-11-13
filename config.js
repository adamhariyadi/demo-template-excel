// Koneksi database: otomatis membaca setting dari aplikasi Prisma Log Multi
// (%APPDATA%/Prisma Log Multi/config.json). Bisa ditimpa lewat environment variable.
const fs = require("fs");
const path = require("path");

function readPrismaConfig() {
  try {
    const file = path.join(process.env.APPDATA || "", "Prisma Log Multi", "config.json");
    return JSON.parse(fs.readFileSync(file, "utf8")).database || {};
  } catch {
    return {};
  }
}

const prisma = readPrismaConfig();

module.exports = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || prisma.host || "localhost",
    port: Number(process.env.DB_PORT || prisma.port || 3306),
    user: process.env.DB_USER || prisma.user || "root",
    password: process.env.DB_PASSWORD ?? prisma.password ?? "",
    database: process.env.DB_NAME || prisma.name || "prisma_log_multi",
  },
};
