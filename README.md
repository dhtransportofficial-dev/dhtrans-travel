# 🚐 DH TRANS TRAVEL & CARTERAN (Mojokerto ⇄ Malang)

Website resmi pemesanan travel door-to-door dan layanan carteran privat rute **Mojokerto ⇄ Malang (PP)**.

![DH Trans Logo](public/images/logo-transparent.png)

---

## 🌟 Fitur Utama
1. **Pemesanan Tiket Reguler Online (`/booking`)**:
   - Pemilihan rute & jadwal (Via Tol Gempol Rp150.000 / Via Pandaan Rp130.000).
   - **Kapasitas Kursi Real-Time (Seat Availability)**: Kapasitas maksimal 6 kursi per mobil, auto-lock & disable jika sold out.
   - **Biaya Tambahan Wilayah Kabupaten**: Otomatis +Rp20.000/orang jika penjemputan/pengantaran di wilayah Kab. Mojokerto atau Kab. Malang.
   - **Integrasi WhatsApp Otomatis**: Menghasilkan draf chat WA dengan rincian lengkap pesanan.

2. **Layanan Sewa / Carteran Privat (`/carter`)**:
   - Layanan drop sekali jalan, PP, carter harian, atau paket wisata.
   - Pilihan armada: **Toyota All New Veloz (Hitam)** & **Toyota Calya (Putih)**.
   - Kebijakan penentuan harga fleksibel oleh admin berdasarkan jarak & durasi waktu.

3. **Live GPS Tracking Interaktif (`/tracking`)**:
   - Peta realtime berbasis **Leaflet.js & OpenStreetMap**.
   - Animasi posisi mobil bergerak sepanjang rute Mojokerto ➔ Tol Gempol ➔ Tol Pandaan ➔ Malang.
   - Telemetri estimasi waktu tiba (ETA ~35 menit), kecepatan, nomor polisi `W 1234 DH`.
   - Profil & kontak langsung driver:
     - 👨‍✈️ **Mas Zidan (Driver 1)**: `0819-1840-1858`
     - 👨‍✈️ **Mas Hervin (Driver 2)**: `0897-2681-444`

4. **Panel Admin Lengkap (`/admin`)**:
   - Dashboard statistik pendapatan, pemesanan, dan pesan.
   - Kelola pemesanan reguler & ubah status.
   - Kelola permintaan carteran & input penawaran harga custom.
   - Kelola jadwal, rute, pesan masuk, dan testimoni.
   - *Login default*: `admin` / `admin123`.

---

## 🛠️ Teknologi yang Digunakan
- **Backend**: Node.js & Express.js
- **Template Engine**: EJS
- **Frontend / Styling**: Vanilla CSS Modern & Responsive (Desain Elegan Navy `#0a1628` & Gold `#d4a843`)
- **Interactive Map**: Leaflet.js & OpenStreetMap
- **Database**: Pure JavaScript SQLite-compatible JSON engine (`database.js` / `data/database.json`)

---

## 🚀 Cara Menjalankan Secara Lokal
```bash
# 1. Install dependencies
npm install

# 2. Jalankan server
node server.js
```
Buka browser di `http://localhost:3000`.
