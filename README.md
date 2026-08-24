# Lume Batch Generator

Aplikasi web lokal untuk membuat rangkaian kode verifikasi dan menggabungkannya dengan ID produk, nama batch, serta tanggal manual.

## Menjalankan aplikasi

Buka `index.html` langsung dengan browser modern seperti Chrome atau Edge. Tidak ada dependensi yang perlu diinstal.

Alternatif jika ingin menjalankan melalui server lokal:

```powershell
python -m http.server 8080
```

Kemudian buka `http://localhost:8080`.

## Format hasil

```text
http://verify.lumecolors.co.id/Genuine/scan/KODE
```

ID produk, nama batch, dan tanggal tetap ditampilkan di tabel, tetapi tidak ditambahkan ke URL hasil.

```text
http://verify.lumecolors.co.id/Genuine/scan/CWD002.02-MARET-2029.07500
```

## Riwayat input

Aplikasi menyimpan kode awal, kode terakhir yang dihasilkan, dan nomor berikutnya secara terpisah untuk setiap kode depan, misalnya `CONCA02` dan `CWD002`. Ketika kode depan diketik, riwayat yang sesuai ditampilkan otomatis. Tombol **Gunakan nomor berikutnya** membantu melanjutkan urutan tanpa mengulang nomor.
