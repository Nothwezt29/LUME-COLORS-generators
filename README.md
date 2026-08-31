# Lume Batch Studio

Aplikasi web lokal untuk membuat kode verifikasi produk Lume Colors dan mengekspornya sebagai workbook Excel dua sheet.

## Menjalankan aplikasi

Buka `index.html` langsung menggunakan Chrome atau Edge. Aplikasi tidak memerlukan instalasi paket maupun backend.

## Alur penggunaan

1. Cari dan pilih produk dari katalog.
2. Masukkan kode awal, misalnya `CWD002.29-JUNI-2029.01501`.
3. Isi jumlah data, ID produk, nama batch, dan tanggal.
4. Pilih **Generate batch**.
5. Salin URL QR atau unduh workbook Excel untuk input tersebut.

Workbook berisi:

- **QR Produk** — kolom `Produk` dan `QR`.
- **Detail Batch** — rincian kode, kode produk, batch kode, nomor urut, nama batch, ID produk, tanggal, dan data gabungan.

## Batch dan riwayat

Setiap proses generate disimpan sebagai satu input tersendiri di browser. Produk yang sama dapat memiliki banyak batch maupun beberapa proses lanjutan tanpa menghapus catatan sebelumnya.

- **Unduh Excel** pada kartu riwayat mengekspor satu input saja.
- **Unduh semua** menggabungkan seluruh input yang pernah disimpan ke satu workbook dua sheet.
- **Lanjut** mengisi nomor berikutnya dari input yang dipilih.

Katalog dalam `products.js` berasal dari `kode & nama produk.xlsx` dan saat ini memuat 150 produk.

Data batch terbaru tersedia untuk 63 produk. Saat produk tersebut dipilih, nama batch dan tanggal kedaluwarsa terisi otomatis tetapi tetap dapat diedit. Produk tanpa data batch tetap dapat diisi manual.

## Generator bundling

Buka `bundling.html` atau pilih **Bundling Produk** pada navbar. Halaman ini memungkinkan pengguna memilih beberapa produk, mengatur urutannya, lalu membuat URL bundling dan mengunduh Excel dua sheet:

- **Bundling Produk** — judul, nama produk, dan tautan aktif.
- **Detail Batch** — kode lengkap, kode produk, batch, nomor urut, nama batch, ID produk, tanggal, dan data gabungan.

Pada halaman bundling, Sheet 2 memakai batch terbaru dan tanggal kedaluwarsa masing-masing produk. Kolom override dapat dipakai untuk mengganti nama batch seluruh produk; jika produk belum memiliki data batch, kode bundling menjadi fallback.

Kolom **Jumlah data** menentukan jumlah set yang dibuat. Setiap set menaikkan nomor urut dan berisi satu kode bundling utama beserta seluruh produk yang dipilih. Total hasil dibatasi 100.000 baris.
