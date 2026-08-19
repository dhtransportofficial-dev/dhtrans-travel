const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const { 
  db, 
  generateBookingCode, 
  generateCharterCode, 
  getSeatAvailability, 
  loadData, 
  saveData,
  updateDriverLocation,
  getTrackingInfo
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE & CONSTANTS
// ============================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
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
  next();
});

// Admin auth middleware
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
  const routes = db.prepare('SELECT r.*, (SELECT COUNT(*) FROM schedules WHERE route_id = r.id AND is_active = 1) as schedule_count FROM routes r WHERE r.is_active = 1').all();
  const schedules = db.prepare(`
    SELECT s.*, r.origin, r.destination 
    FROM schedules s 
    JOIN routes r ON s.route_id = r.id 
    WHERE s.is_active = 1 AND r.is_active = 1
    ORDER BY r.id, s.departure_time
  `).all();
  const fleet = db.prepare('SELECT * FROM fleet WHERE is_active = 1').all();
  const testimonials = db.prepare('SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY created_at DESC LIMIT 6').all();

  res.render('index', { routes, schedules, fleet, testimonials, page: 'home' });
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

// API Seat Availability Check
app.get('/api/seats', (req, res) => {
  const { schedule_id, travel_date } = req.query;
  if (!schedule_id) {
    return res.status(400).json({ error: 'schedule_id is required' });
  }
  const info = getSeatAvailability(schedule_id, travel_date);
  res.json(info);
});

// Process Booking
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
      payment_method,
      notes 
    } = req.body;

    const count = parseInt(passenger_count) || 1;

    // Check seat availability before confirming
    const seatInfo = getSeatAvailability(schedule_id, travel_date);
    if (seatInfo.availableSeats < count) {
      return res.status(400).json({ 
        error: `Kursi tidak mencukupi. Tersisa ${seatInfo.availableSeats} kursi untuk tanggal ${travel_date}.` 
      });
    }

    const schedule = db.prepare(`
      SELECT s.*, r.origin, r.destination 
      FROM schedules s 
      JOIN routes r ON s.route_id = r.id 
      WHERE s.id = ?
    `).get(schedule_id);

    if (!schedule) {
      return res.status(404).json({ error: 'Jadwal tidak ditemukan' });
    }

    // Calculate Pricing
    const basePrice = schedule.price * count;
    let extraPerPax = 0;
    if (pickup_zone === 'kabupaten') extraPerPax += 20000;
    if (dropoff_zone === 'kabupaten') extraPerPax += 20000;
    const totalExtraFee = extraPerPax * count;
    const totalPrice = basePrice + totalExtraFee;

    const bookingCode = generateBookingCode();
    const chosenPayment = payment_method || 'cash';
    const payStatus = chosenPayment === 'cash' ? 'cod' : 'pending';

    const dbData = loadData();
    const newId = dbData.bookings.length > 0 ? Math.max(...dbData.bookings.map(b => b.id)) + 1 : 1;
    const newBooking = {
      id: newId,
      booking_code: bookingCode,
      booking_type: 'regular',
      schedule_id: parseInt(schedule_id),
      travel_date,
      passenger_name,
      passenger_phone,
      passenger_email: passenger_email || null,
      passenger_count: count,
      pickup_address,
      dropoff_address,
      pickup_zone: pickup_zone || 'kota',
      dropoff_zone: dropoff_zone || 'kota',
      extra_fee: totalExtraFee,
      total_price: totalPrice,
      payment_method: chosenPayment,
      payment_status: payStatus,
      is_gps_allowed: 1,
      status: 'pending',
      driver_id: (newId % 2 === 1) ? 1 : 2,
      trip_progress: 10,
      current_location_desc: 'Menunggu Penjemputan',
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dbData.bookings.push(newBooking);
    saveData(dbData);

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

    const paymentLabel = chosenPayment === 'qris' 
      ? '📱 QRIS (DH TRAVEL - NMID: ID1025421042405)' 
      : chosenPayment === 'transfer' 
        ? '🏦 Transfer BCA: 0501199302 (a.n. DH TRAVEL)' 
        : '💵 Bayar Tunai ke Sopir (COD saat penjemputan)';

    // Build WhatsApp message
    const waMessage = `Halo DH Trans! Saya ingin konfirmasi pemesanan tiket travel:\n\n` +
      `📋 Kode Booking: ${bookingCode}\n` +
      `🛣️ Rute: ${schedule.origin} → ${schedule.destination}\n` +
      `📅 Tanggal: ${travel_date}\n` +
      `🕐 Jam: ${schedule.departure_time} WIB (Via ${schedule.via})\n` +
      `👤 Nama: ${passenger_name}\n` +
      `👥 Jumlah: ${count} orang\n` +
      `📍 Titik Jemput: ${pickupDesc}\n` +
      `📍 Titik Antar: ${dropoffDesc}\n` +
      `💳 Metode Bayar: ${paymentLabel}\n\n` +
      `${feeBreakdown}\n\n` +
      `Mohon konfirmasi pesanan saya. Terima kasih! 🙏`;

    const waLink = `https://wa.me/6289671969214?text=${encodeURIComponent(waMessage)}`;

    res.json({ 
      success: true, 
      bookingCode, 
      basePrice,
      extraFee: totalExtraFee,
      totalPrice,
      paymentMethod: chosenPayment,
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
  const trackingData = code ? getTrackingInfo(code) : null;
  res.render('tracking', { 
    page: 'tracking', 
    trackingData, 
    searchCode: code, 
    error: code && !trackingData ? 'Kode booking tidak ditemukan' : null 
  });
});

// Real-time GPS API (Polled every 4 seconds by tracking map)
app.get('/api/tracking/live/:code', (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const info = getTrackingInfo(code);
  if (!info) {
    return res.status(404).json({ success: false, error: 'Booking tidak ditemukan' });
  }
  res.json({ success: true, ...info });
});

// Driver Portal Page (Buka di HP Driver untuk Mengaktifkan GPS)
app.get('/driver', (req, res) => {
  const data = loadData();
  const drivers = data.drivers || [];
  const selectedDriverId = parseInt(req.query.id || '1');
  const driver = drivers.find(d => d.id === selectedDriverId) || drivers[0];
  const activeBookings = (data.bookings || []).filter(b => b.status === 'confirmed' || b.status === 'pending');

  res.render('driver', { 
    page: 'driver', 
    drivers, 
    selectedDriver: driver, 
    activeBookings 
  });
});

// Driver Toggle GPS Broadcast
app.post('/api/driver/toggle-gps', (req, res) => {
  const { driver_id, is_tracking_active } = req.body;
  const updated = updateDriverLocation(driver_id, { is_tracking_active });
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });
  }
  res.json({ success: true, driver: updated });
});

// Driver Update Real GPS Location (From Phone Geolocation)
app.post('/api/driver/location', (req, res) => {
  const { driver_id, lat, lng, speed, accuracy, heading, location_name } = req.body;
  const updated = updateDriverLocation(driver_id, {
    lat,
    lng,
    speed,
    accuracy,
    heading,
    location_name,
    is_tracking_active: 1
  });

  if (!updated) {
    return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });
  }
  res.json({ success: true, driver: updated });
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
app.get('/schedule', (req, res) => res.redirect('/jadwal'));

// Fleet page
app.get('/armada', (req, res) => {
  const fleet = db.prepare('SELECT * FROM fleet WHERE is_active = 1').all();
  res.render('fleet', { fleet, page: 'armada' });
});
app.get('/fleet', (req, res) => res.redirect('/armada'));

// Contact page
app.get('/kontak', (req, res) => {
  res.render('contact', { page: 'kontak', success: false });
});
app.get('/contact', (req, res) => res.redirect('/kontak'));

app.post('/kontak', (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    db.prepare('INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)')
      .run(name, email || null, phone || null, subject || 'Umum', message);
    res.render('contact', { page: 'kontak', success: true });
  } catch (err) {
    console.error('Contact error:', err);
    res.render('contact', { page: 'kontak', success: false, error: 'Gagal mengirim pesan' });
  }
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

// Admin login page
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { page: 'admin', error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, hash);

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
  
  const drivers = loadData().drivers || [];
  res.render('admin/dashboard', { page: 'admin-dashboard', stats, drivers });
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
  
  const drivers = loadData().drivers || [];
  res.render('admin/bookings', { page: 'admin-bookings', bookings, drivers, currentStatus: status });
});

// Update booking status
app.post('/admin/bookings/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

// Update booking payment status
app.post('/admin/bookings/:id/payment', requireAdmin, (req, res) => {
  const { payment_status } = req.body;
  const data = loadData();
  const b = data.bookings.find(item => item.id === parseInt(req.params.id));
  if (b) {
    b.payment_status = payment_status;
    saveData(data);
  }
  res.json({ success: true });
});

// Toggle booking GPS permission
app.post('/admin/bookings/:id/gps-toggle', requireAdmin, (req, res) => {
  const data = loadData();
  const b = data.bookings.find(item => item.id === parseInt(req.params.id));
  if (b) {
    b.is_gps_allowed = b.is_gps_allowed === 0 ? 1 : 0;
    saveData(data);
  }
  res.json({ success: true, is_gps_allowed: b ? b.is_gps_allowed : 1 });
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
