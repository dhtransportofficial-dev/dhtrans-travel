const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const { db, generateBookingCode, generateCharterCode, getSeatAvailability, loadData, saveData } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE & CONSTANTS
// ============================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'dhtrans-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Global app variables
app.use((req, res, next) => {
  res.locals.isAdmin = req.session && req.session.isAdmin;
  res.locals.adminUser = req.session && req.session.adminUser;
  res.locals.instagramUrl = 'https://www.instagram.com/dhtrans.id?igsh=MTJkZ3gzcXp5NGkxaQ%3D%3D&utm_source=qr';
  res.locals.instagramHandle = '@dhtrans.id';
  res.locals.driver1 = '0819-1840-1858';
  res.locals.driver2 = '0897-2681-444';
  res.locals.csPhone = '0896-7196-9214';
  next();
});

// Auth middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}

// ============================================
// PUBLIC ROUTES
// ============================================

// Home page
app.get('/', (req, res) => {
  const routes = db.prepare(`
    SELECT r.*, 
      (SELECT COUNT(*) FROM schedules s WHERE s.route_id = r.id AND s.is_active = 1) as schedule_count
    FROM routes r WHERE r.is_active = 1
  `).all();

  const schedules = db.prepare(`
    SELECT s.*, r.origin, r.destination 
    FROM schedules s 
    JOIN routes r ON s.route_id = r.id 
    WHERE s.is_active = 1 AND r.is_active = 1
    ORDER BY r.id, s.departure_time
  `).all();

  const testimonials = db.prepare(`
    SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY created_at DESC LIMIT 6
  `).all();

  const fleet = db.prepare('SELECT * FROM fleet WHERE is_active = 1').all();

  res.render('index', { routes, schedules, testimonials, fleet, page: 'home' });
});

// API Seat Availability Check
app.get('/api/seats', (req, res) => {
  const { schedule_id, travel_date } = req.query;
  if (!schedule_id) {
    return res.status(400).json({ error: 'schedule_id required' });
  }
  const availability = getSeatAvailability(schedule_id, travel_date);
  res.json(availability);
});

// Booking page
app.get('/booking', (req, res) => {
  const schedules = db.prepare(`
    SELECT s.*, r.origin, r.destination 
    FROM schedules s 
    JOIN routes r ON s.route_id = r.id 
    WHERE s.is_active = 1 AND r.is_active = 1
    ORDER BY r.id, s.departure_time
  `).all();

  const selectedSchedule = req.query.schedule || '';
  res.render('booking', { schedules, selectedSchedule, page: 'booking' });
});

// Process Regular Travel Booking
app.post('/booking', (req, res) => {
  try {
    const { 
      schedule_id, 
      travel_date, 
      passenger_name, 
      passenger_phone, 
      passenger_email, 
      passenger_count, 
      pickup_address, 
      dropoff_address, 
      pickup_zone, 
      dropoff_zone, 
      notes 
    } = req.body;

    const schedule = db.prepare(`
      SELECT s.*, r.origin, r.destination 
      FROM schedules s JOIN routes r ON s.route_id = r.id 
      WHERE s.id = ?
    `).get(schedule_id);

    if (!schedule) {
      return res.status(400).json({ error: 'Jadwal tidak ditemukan' });
    }

    const count = parseInt(passenger_count || 1);

    // Check Seat Availability
    const seatInfo = getSeatAvailability(schedule_id, travel_date);
    if (seatInfo.isFull || seatInfo.availableSeats < count) {
      return res.status(400).json({ 
        error: `Maaf, kursi pada jadwal ini sudah penuh / tidak mencukupi untuk ${travel_date}. Tersisa: ${seatInfo.availableSeats} kursi.` 
      });
    }

    const pickupSurcharge = pickup_zone === 'kabupaten' ? 20000 * count : 0;
    const dropoffSurcharge = dropoff_zone === 'kabupaten' ? 20000 * count : 0;
    const totalExtraFee = pickupSurcharge + dropoffSurcharge;
    const basePrice = schedule.price * count;
    const totalPrice = basePrice + totalExtraFee;
    const bookingCode = generateBookingCode();

    db.prepare(`
      INSERT INTO bookings (booking_code, schedule_id, travel_date, passenger_name, passenger_phone, passenger_email, passenger_count, pickup_address, dropoff_address, pickup_zone, dropoff_zone, extra_fee, total_price, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      bookingCode, 
      schedule_id, 
      travel_date, 
      passenger_name, 
      passenger_phone, 
      passenger_email || null, 
      count, 
      pickup_address, 
      dropoff_address, 
      pickup_zone || 'kota', 
      dropoff_zone || 'kota', 
      totalExtraFee, 
      totalPrice, 
      notes || null
    );

    // Build area descriptions for WhatsApp message
    const pickupDesc = pickup_zone === 'kabupaten' 
      ? `${pickup_address} [Wilayah Kabupaten +Rp20.000/org]` 
      : `${pickup_address} [Dalam Kota]`;
    const dropoffDesc = dropoff_zone === 'kabupaten' 
      ? `${dropoff_address} [Wilayah Kabupaten +Rp20.000/org]` 
      : `${dropoff_address} [Dalam Kota]`;

    let feeBreakdown = `💰 Tarif Dasar: Rp${basePrice.toLocaleString('id-ID')} (${count} orang)`;
    if (totalExtraFee > 0) {
      feeBreakdown += `\n➕ Tambahan Luar Kota/Kabupaten: Rp${totalExtraFee.toLocaleString('id-ID')}`;
    }
    feeBreakdown += `\n💵 TOTAL BAYAR: Rp${totalPrice.toLocaleString('id-ID')}`;

    // Build WhatsApp message
    const waMessage = `Halo DH Trans! Saya ingin konfirmasi pemesanan tiket travel:\n\n` +
      `📋 Kode Booking: ${bookingCode}\n` +
      `🛣️ Rute: ${schedule.origin} → ${schedule.destination}\n` +
      `📅 Tanggal: ${travel_date}\n` +
      `🕐 Jam: ${schedule.departure_time} WIB (Via ${schedule.via})\n` +
      `👤 Nama: ${passenger_name}\n` +
      `👥 Jumlah: ${count} orang\n` +
      `📍 Titik Jemput: ${pickupDesc}\n` +
      `📍 Titik Antar: ${dropoffDesc}\n\n` +
      `${feeBreakdown}\n\n` +
      `Mohon konfirmasi pesanan saya. Terima kasih! 🙏`;

    const waLink = `https://wa.me/6289671969214?text=${encodeURIComponent(waMessage)}`;

    res.json({ 
      success: true, 
      bookingCode, 
      basePrice,
      extraFee: totalExtraFee,
      totalPrice,
      remainingSeats: seatInfo.availableSeats - count,
      waLink,
      message: 'Pemesanan berhasil dibuat!' 
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses pemesanan' });
  }
});

// Charter / Carteran Page
app.get('/carter', (req, res) => {
  const fleet = db.prepare('SELECT * FROM fleet WHERE is_active = 1').all();
  res.render('charter', { fleet, page: 'carter' });
});

// Process Charter Booking
app.post('/carter', (req, res) => {
  try {
    const { 
      customer_name, 
      customer_phone, 
      customer_email, 
      car_choice, 
      charter_type, 
      start_date, 
      end_date, 
      pickup_address, 
      destination_address, 
      purpose, 
      notes 
    } = req.body;

    const charterCode = generateCharterCode();

    db.prepare(`
      INSERT INTO charters (charter_code, customer_name, customer_phone, customer_email, car_choice, charter_type, start_date, end_date, pickup_address, destination_address, purpose, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      charterCode, 
      customer_name, 
      customer_phone, 
      customer_email || null, 
      car_choice || 'Toyota All New Veloz (Hitam)', 
      charter_type || 'Drop Sekali Jalan', 
      start_date, 
      end_date || start_date, 
      pickup_address, 
      destination_address, 
      purpose || 'Keluarga / Dinas', 
      notes || null
    );

    // Build WhatsApp message for Charter Inquiry
    const waMessage = `Halo DH Trans! Saya ingin mengajukan pemesanan CARTER / SEWA MOBIL KHUSUS:\n\n` +
      `📋 Kode Carter: ${charterCode}\n` +
      `👤 Nama: ${customer_name}\n` +
      `📱 WhatsApp: ${customer_phone}\n` +
      `🚗 Pilihan Mobil: ${car_choice}\n` +
      `🔄 Tipe Layanan: ${charter_type}\n` +
      `📅 Tanggal: ${start_date} ${end_date && end_date !== start_date ? 's/d ' + end_date : ''}\n` +
      `📍 Titik Jemput: ${pickup_address}\n` +
      `🏁 Tujuan / Rute: ${destination_address}\n` +
      `🎯 Keperluan: ${purpose || '-'}\n` +
      `📝 Catatan: ${notes || '-'}\n\n` +
      `Mohon info penawaran harga & ketersediaan armada. Terima kasih! 🙏`;

    const waLink = `https://wa.me/6289671969214?text=${encodeURIComponent(waMessage)}`;

    res.json({
      success: true,
      charterCode,
      waLink,
      message: 'Permintaan carteran berhasil dikirim!'
    });
  } catch (err) {
    console.error('Charter error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses carteran' });
  }
});

// Live GPS Tracking page
app.get('/tracking', (req, res) => {
  const code = (req.query.code || '').trim().toUpperCase();
  let booking = null;
  if (code) {
    booking = db.prepare(`
      SELECT b.*, s.departure_time, s.via, s.price, r.origin, r.destination
      FROM bookings b
      JOIN schedules s ON b.schedule_id = s.id
      JOIN routes r ON s.route_id = r.id
      WHERE b.booking_code = ?
    `).get(code);
  }
  res.render('tracking', { page: 'tracking', booking, searchCode: code, error: code && !booking ? 'Kode booking tidak ditemukan' : null });
});

// Check booking
app.get('/check-booking', (req, res) => {
  res.render('check-booking', { page: 'check-booking', booking: null, error: null });
});

app.post('/check-booking', (req, res) => {
  const { booking_code } = req.body;
  const booking = db.prepare(`
    SELECT b.*, s.departure_time, s.via, s.price, r.origin, r.destination
    FROM bookings b
    JOIN schedules s ON b.schedule_id = s.id
    JOIN routes r ON s.route_id = r.id
    WHERE b.booking_code = ?
  `).get(booking_code);

  if (!booking) {
    res.render('check-booking', { page: 'check-booking', booking: null, error: 'Kode booking "' + booking_code + '" tidak ditemukan. Pastikan kode yang Anda masukkan benar.' });
  } else {
    res.render('check-booking', { page: 'check-booking', booking, error: null });
  }
});

// Schedule page
app.get('/jadwal', (req, res) => {
  const schedules = db.prepare(`
    SELECT s.*, r.origin, r.destination 
    FROM schedules s 
    JOIN routes r ON s.route_id = r.id 
    WHERE s.is_active = 1 AND r.is_active = 1
    ORDER BY r.id, s.departure_time
  `).all();

  const routes = db.prepare('SELECT * FROM routes WHERE is_active = 1').all();
  res.render('schedule', { schedules, routes, page: 'jadwal' });
});

// Fleet page
app.get('/armada', (req, res) => {
  const fleet = db.prepare('SELECT * FROM fleet WHERE is_active = 1').all();
  res.render('fleet', { fleet, page: 'armada' });
});

// Contact page
app.get('/kontak', (req, res) => {
  res.render('contact', { page: 'kontak', success: false });
});

app.post('/kontak', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  db.prepare('INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)')
    .run(name, email || null, phone || null, subject || null, message);
  res.render('contact', { page: 'kontak', success: true });
});

// Submit testimonial
app.post('/testimonial', (req, res) => {
  const { name, route_text, rating, comment } = req.body;
  db.prepare('INSERT INTO testimonials (name, route_text, rating, comment) VALUES (?, ?, ?, ?)')
    .run(name, route_text, parseInt(rating), comment);
  res.json({ success: true, message: 'Terima kasih! Testimoni Anda telah diterima.' });
});

// ============================================
// ADMIN ROUTES
// ============================================

// Admin login
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { page: 'admin', error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, hashedPassword);
  
  if (user) {
    req.session.isAdmin = true;
    req.session.adminUser = { id: user.id, username: user.username, full_name: user.full_name };
    res.redirect('/admin');
  } else {
    res.render('admin/login', { page: 'admin', error: 'Username atau password salah. Default: admin / admin123' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Admin dashboard
app.get('/admin', requireAdmin, (req, res) => {
  const stats = {
    totalBookings: db.prepare('SELECT COUNT(*) as count FROM bookings').get().count,
    totalCharters: db.prepare('SELECT COUNT(*) as count FROM charters').get().count,
    pendingBookings: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'").get().count,
    confirmedBookings: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'").get().count,
    completedBookings: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'").get().count,
    totalRevenue: db.prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status IN ('confirmed', 'completed')").get().total,
    todayBookings: db.prepare("SELECT COUNT(*) as count FROM bookings WHERE DATE(created_at) = DATE('now')").get().count,
    unreadContacts: db.prepare("SELECT COUNT(*) as count FROM contacts WHERE is_read = 0").get().count,
    pendingTestimonials: db.prepare("SELECT COUNT(*) as count FROM testimonials WHERE is_approved = 0").get().count,
  };
  
  res.render('admin/dashboard', { page: 'admin-dashboard', stats });
});

// Admin bookings
app.get('/admin/bookings', requireAdmin, (req, res) => {
  const status = req.query.status || '';
  const bookings = db.prepare(`
    SELECT b.*, s.departure_time, s.via, s.price, r.origin, r.destination
    FROM bookings b
    JOIN schedules s ON b.schedule_id = s.id
    JOIN routes r ON s.route_id = r.id
  `).all(status);
  
  res.render('admin/bookings', { page: 'admin-bookings', bookings, currentStatus: status });
});

// Update booking status
app.post('/admin/bookings/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

// Delete booking
app.post('/admin/bookings/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin Charters Management
app.get('/admin/charters', requireAdmin, (req, res) => {
  const charters = db.prepare('SELECT * FROM charters').all();
  res.render('admin/charters', { page: 'admin-charters', charters });
});

app.post('/admin/charters/:id/price', requireAdmin, (req, res) => {
  const { offered_price, status } = req.body;
  const data = loadData();
  const c = data.charters.find(item => item.id === parseInt(req.params.id));
  if (c) {
    c.offered_price = parseInt(offered_price || 0);
    if (status) c.status = status;
    saveData(data);
  }
  res.json({ success: true });
});

app.post('/admin/charters/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const data = loadData();
  const c = data.charters.find(item => item.id === parseInt(req.params.id));
  if (c) {
    c.status = status;
    saveData(data);
  }
  res.json({ success: true });
});

app.post('/admin/charters/:id/delete', requireAdmin, (req, res) => {
  const data = loadData();
  data.charters = data.charters.filter(item => item.id !== parseInt(req.params.id));
  saveData(data);
  res.json({ success: true });
});

// Admin schedules
app.get('/admin/schedules', requireAdmin, (req, res) => {
  const schedules = db.prepare(`
    SELECT s.*, r.origin, r.destination 
    FROM schedules s JOIN routes r ON s.route_id = r.id 
    ORDER BY r.id, s.departure_time
  `).all();
  const routes = db.prepare('SELECT * FROM routes').all();
  res.render('admin/schedules', { page: 'admin-schedules', schedules, routes });
});

// Add schedule
app.post('/admin/schedules', requireAdmin, (req, res) => {
  const { route_id, departure_time, via, price } = req.body;
  db.prepare('INSERT INTO schedules (route_id, departure_time, via, price) VALUES (?, ?, ?, ?)')
    .run(route_id, departure_time, via, parseInt(price));
  res.redirect('/admin/schedules');
});

// Toggle schedule
app.post('/admin/schedules/:id/toggle', requireAdmin, (req, res) => {
  db.prepare('UPDATE schedules SET is_active = NOT is_active WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Delete schedule
app.post('/admin/schedules/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin routes management
app.get('/admin/routes', requireAdmin, (req, res) => {
  const routes = db.prepare('SELECT * FROM routes').all();
  res.render('admin/routes', { page: 'admin-routes', routes });
});

app.post('/admin/routes', requireAdmin, (req, res) => {
  const { origin, destination } = req.body;
  db.prepare('INSERT INTO routes (origin, destination) VALUES (?, ?)').run(origin, destination);
  res.redirect('/admin/routes');
});

app.post('/admin/routes/:id/toggle', requireAdmin, (req, res) => {
  db.prepare('UPDATE routes SET is_active = NOT is_active WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin contacts
app.get('/admin/contacts', requireAdmin, (req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts').all();
  res.render('admin/contacts', { page: 'admin-contacts', contacts });
});

app.post('/admin/contacts/:id/read', requireAdmin, (req, res) => {
  db.prepare('UPDATE contacts SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/admin/contacts/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin testimonials
app.get('/admin/testimonials', requireAdmin, (req, res) => {
  const testimonials = db.prepare('SELECT * FROM testimonials').all();
  res.render('admin/testimonials', { page: 'admin-testimonials', testimonials });
});

app.post('/admin/testimonials/:id/approve', requireAdmin, (req, res) => {
  db.prepare('UPDATE testimonials SET is_approved = NOT is_approved WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/admin/testimonials/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║         🚐 DH TRANS TRAVEL - MOJOKERTO ⇄ MALANG          ║
  ║                                                           ║
  ║  🌍 Website : http://localhost:${PORT}                       ║
  ║  📋 Carter  : http://localhost:${PORT}/carter                 ║
  ║  📍 GPS     : http://localhost:${PORT}/tracking               ║
  ║  🔑 Admin   : http://localhost:${PORT}/admin/login            ║
  ║  👤 Login   : admin / admin123                            ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});
