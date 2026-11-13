# Demo Template Export

Demo ringan export laporan Prisma Log Multi ke Excel memakai **template sendiri** ([xlsx-template](https://github.com/optilude/xlsx-template)).
Langsung membaca database Prisma Log Multi. Tidak ada login dan tidak ada database tambahan.

## Menjalankan

```
npm install
npm start
```

Buka http://localhost:3000

Koneksi database otomatis diambil dari `%APPDATA%\Prisma Log Multi\config.json`.
Bisa ditimpa lewat env: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`.

## Alur

1. **Download template default**, lalu buka di Excel.
2. Ubah desainnya (logo, warna, merge, urutan kolom, format angka/tanggal).
3. Tulis global variable di sel. Daftarnya ada di halaman web (klik untuk copy).
4. **Upload**, lalu **Export Excel**.

## Aturan template

| Jenis | Contoh | Catatan |
|---|---|---|
| Nilai tunggal | `${from}`, `Periode: ${from} s/d ${to}` | Boleh dicampur teks |
| Baris data | `${table:rows.gross}` | Sendirian di sel, semua di **satu baris**; baris diulang per record dan baris di bawahnya ikut bergeser |

- Format angka dan tanggal diatur lewat *Format Cells* di Excel. Data dikirim sebagai angka atau tanggal asli.
- Variabel yang salah ketik akan ditandai saat upload dan hasilnya kosong saat export.
- Hindari chart, shape/text box, dan macro (.xlsm). Formula `SUM` tidak otomatis melebar, jadi pakai `${total_gross}`.

## Struktur

```
server.js                  API + export (express, mysql2, xlsx-template)
variables.js               DAFTAR GLOBAL VARIABLE + cara mengisinya (tambah variabel di sini)
config.js                  koneksi database
make-default-template.js   generator templates/default.xlsx (npm run make-template)
public/index.html          halaman web (tanpa framework)
templates/default.xlsx     template bawaan
templates/custom.xlsx      template hasil upload (dibuat otomatis)
```
