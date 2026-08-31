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
