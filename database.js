const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFile = path.join(dataDir, 'database.json');

// Default initial state
const defaultData = {
  users: [
    {
      id: 1,
      username: 'admin',
      password: crypto.createHash('sha256').update('admin123').digest('hex'),
      full_name: 'Administrator DH Trans',
      role: 'admin',
      created_at: new Date().toISOString()
    }
  ],
  routes: [
    { id: 1, origin: 'Mojokerto', destination: 'Malang', is_active: 1, created_at: new Date().toISOString() },
    { id: 2, origin: 'Malang', destination: 'Mojokerto', is_active: 1, created_at: new Date().toISOString() }
  ],
  schedules: [
    { id: 1, route_id: 1, departure_time: '06:00', via: 'Tol Gempol', price: 150000, max_seats: 6, is_active: 1, created_at: new Date().toISOString() },
    { id: 2, route_id: 1, departure_time: '15:00', via: 'Pandaan', price: 130000, max_seats: 6, is_active: 1, created_at: new Date().toISOString() },
    { id: 3, route_id: 2, departure_time: '10:00', via: 'Tol Gempol', price: 150000, max_seats: 6, is_active: 1, created_at: new Date().toISOString() },
    { id: 4, route_id: 2, departure_time: '19:00', via: 'Pandaan', price: 130000, max_seats: 6, is_active: 1, created_at: new Date().toISOString() }
  ],
  fleet: [
    {
      id: 1,
      name: 'Toyota All New Veloz (Hitam)',
      type: 'MPV Premium',
      capacity: 6,
      facilities: 'Full AC Double Blower, Audio & Musik, Port USB Charger HP, Kursi Nyaman & Bersih, Bagasi Luas',
      image_url: '/images/fleet-veloz.png',
      plate_number: 'W 1234 DH',
      is_active: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Toyota Calya (Putih)',
      type: 'Compact MPV',
      capacity: 6,
      facilities: 'Full AC Dingin, Audio & Musik, Port Charger HP, Kabin Bersih & Wangi, Perjalanan Nyaman',
      image_url: '/images/fleet-calya.png',
      plate_number: 'N 5678 DH',
      is_active: 1,
      created_at: new Date().toISOString()
    }
  ],
  drivers: [
    { 
      id: 1, 
      name: 'Mas Zidan (Driver 1)', 
      phone: '081918401858', 
      car: 'Toyota All New Veloz (Hitam)', 
      plate: 'W 1234 DH', 
      is_active: 1,
      is_tracking_active: 0, // 0 = Offline/Standby, 1 = Live Online
      current_lat: -7.6536,
      current_lng: 112.6917,
      speed: 0,
      accuracy: 0,
      heading: 0,
      location_name: 'Standby Mojokerto',
      last_updated: new Date().toISOString()
    },
    { 
      id: 2, 
      name: 'Mas Hervin (Driver 2)', 
      phone: '08972681444', 
      car: 'Toyota Calya (Putih)', 
      plate: 'N 5678 DH', 
      is_active: 1,
      is_tracking_active: 0,
      current_lat: -7.9797,
      current_lng: 112.6304,
      speed: 0,
      accuracy: 0,
      heading: 0,
      location_name: 'Standby Malang',
      last_updated: new Date().toISOString()
    }
  ],
  testimonials: [
    {
      id: 1,
      name: 'Budi Santoso',
      route_text: 'Mojokerto → Malang',
      rating: 5,
      comment: 'Pelayanan sangat memuaskan! Driver Mas Zidan ramah dan jemput tepat waktu di depan rumah. Mobil Veloz-nya bersih dan AC dingin.',
      is_approved: 1,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 2,
      name: 'Siti Rahayu',
      route_text: 'Malang → Mojokerto',
      rating: 5,
      comment: 'Sudah berkali-kali pakai DH Trans via Tol Gempol cepat sampai. Driver bawa mobil halus dan aman.',
      is_approved: 1,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 3,
      name: 'Ahmad Fauzi',
      route_text: 'Mojokerto → Malang',
      rating: 5,
      comment: 'Tarifnya terjangkau Rp130.000 via Pandaan door-to-door diantar sampai tujuan. Pelayanan nomor 1!',
      is_approved: 1,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      id: 4,
      name: 'Dewi Lestari',
      route_text: 'Malang → Mojokerto',
      rating: 5,
      comment: 'Pesan carteran keluarga ke Malang sangat fleksibel harganya sesuai dan driver sangat membantu.',
      is_approved: 1,
      created_at: new Date(Date.now() - 10 * 86400000).toISOString()
    }
  ],
  bookings: [
    {
      id: 1,
      booking_code: 'DH-20260820-101',
      booking_type: 'regular',
      schedule_id: 1,
      travel_date: '2026-08-20',
      passenger_name: 'Rizky Pratama',
      passenger_phone: '08123456789',
      passenger_email: 'rizky@gmail.com',
      passenger_count: 2,
      pickup_zone: 'kota',
      pickup_address: 'Jl. Mojopahit No. 45, Kranggan, Mojokerto',
      dropoff_zone: 'kota',
      dropoff_address: 'Jl. Soekarno Hatta No. 88, Lowokwaru, Malang',
      extra_fee: 0,
      total_price: 300000,
      payment_method: 'cash',
      payment_status: 'pending',
      is_gps_allowed: 1,
      status: 'confirmed',
      driver_id: 1,
      trip_progress: 65, // % progress for GPS
      current_location_desc: 'Tol Pandaan KM 48 (Menuju Singosari)',
      notes: 'Mohon jemput jam 05:45 WIB ya mas',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      booking_code: 'DH-20260821-102',
      booking_type: 'regular',
      schedule_id: 3,
      travel_date: '2026-08-21',
      passenger_name: 'Linda Wijaya',
      passenger_phone: '08567891234',
      passenger_email: 'linda@gmail.com',
      passenger_count: 1,
      pickup_zone: 'kota',
      pickup_address: 'Jl. Ijen No. 12, Klojen, Malang',
      dropoff_zone: 'kabupaten',
      dropoff_address: 'Perumahan Puri Mojokerto Blok B3, Kec. Puri, Kab. Mojokerto',
      extra_fee: 20000,
      total_price: 170000,
      payment_method: 'qris',
      payment_status: 'paid',
      is_gps_allowed: 1,
      status: 'pending',
      driver_id: 2,
      trip_progress: 20,
      current_location_desc: 'Persiapan Keberangkatan Malang Kota',
      notes: 'Bawa 1 koper sedang',
      created_at: new Date(Date.now() - 36000000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  charters: [
    {
      id: 1,
      charter_code: 'CTR-20260822-001',
      customer_name: 'Hendra Gunawan',
      customer_phone: '08789012345',
      customer_email: 'hendra@gmail.com',
      car_choice: 'Toyota All New Veloz (Hitam)',
      charter_type: 'PP (Pulang Pergi)',
      start_date: '2026-08-25',
      end_date: '2026-08-25',
      pickup_address: 'Jl. Gajah Mada No. 100, Mojokerto',
      destination_address: 'Wisata Gunung Bromo & Malang Kota',
      purpose: 'Liburan Rombongan Keluarga (6 Orang)',
      offered_price: 850000,
      status: 'deal',
      notes: 'Termasuk mobil + driver + bbm',
      created_at: new Date(Date.now() - 12000000).toISOString()
    }
  ],
  contacts: [
    {
      id: 1,
      name: 'Dimas Anggara',
      email: 'dimas@gmail.com',
      phone: '081333444555',
      subject: 'Pertanyaan Carter Drop Bandara',
      message: 'Apakah melayani carter drop Mojokerto ke Bandara Juanda jam 3 pagi?',
      is_read: 0,
      created_at: new Date(Date.now() - 12000000).toISOString()
    }
  ]
};

// Load or initialize data
function loadData() {
  try {
    if (fs.existsSync(dbFile)) {
      let content = fs.readFileSync(dbFile, 'utf8');
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      const data = JSON.parse(content);
      // Ensure defaults for any new properties
      if (!data.charters) data.charters = defaultData.charters;
      if (!data.drivers) data.drivers = defaultData.drivers;
      return data;
    }
  } catch (err) {
    console.error('Error reading dbFile, resetting to default:', err);
  }
  saveData(defaultData);
  return JSON.parse(JSON.stringify(defaultData));
}

function saveData(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving dbFile:', err);
  }
}

// Generate unique booking code
function generateBookingCode() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `DH-${dateStr}-${rand}`;
}

function generateCharterCode() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `CTR-${dateStr}-${rand}`;
}

// Get seat availability for a schedule on a specific date
function getSeatAvailability(schedule_id, travel_date) {
  const data = loadData();
  const schedule = data.schedules.find(s => s.id === parseInt(schedule_id));
  const maxSeats = schedule ? (schedule.max_seats || 6) : 6;

  if (!travel_date) {
    return { maxSeats, bookedSeats: 0, availableSeats: maxSeats, isFull: false };
  }

  const bookedSeats = data.bookings
    .filter(b => b.schedule_id === parseInt(schedule_id) && b.travel_date === travel_date && b.status !== 'cancelled')
    .reduce((acc, b) => acc + (b.passenger_count || 0), 0);

  const availableSeats = Math.max(0, maxSeats - bookedSeats);
  return {
    maxSeats,
    bookedSeats,
    availableSeats,
    isFull: availableSeats <= 0
  };
}

// Emulate SQLite query interface
const db = {
  prepare(sql) {
    const rawSql = sql.trim().replace(/\s+/g, ' ');

    return {
      all(...params) {
        const data = loadData();

        // SELECT routes with schedule_count
        if (/SELECT r\.\*, \(SELECT COUNT\(\*\)/i.test(rawSql)) {
          return data.routes.filter(r => r.is_active === 1).map(r => ({
            ...r,
            schedule_count: data.schedules.filter(s => s.route_id === r.id && s.is_active === 1).length
          }));
        }

        // SELECT routes
        if (/SELECT \* FROM routes/i.test(rawSql)) {
          if (/WHERE is_active = 1/i.test(rawSql)) {
            return data.routes.filter(r => r.is_active === 1);
          }
          return [...data.routes];
        }

        // SELECT schedules with routes
        if (/SELECT s\.\*, r\.origin, r\.destination FROM schedules s JOIN routes r/i.test(rawSql)) {
          let list = data.schedules.map(s => {
            const r = data.routes.find(route => route.id === s.route_id);
            return {
              ...s,
              max_seats: s.max_seats || 6,
              origin: r ? r.origin : '',
              destination: r ? r.destination : ''
            };
          });

          if (/WHERE s\.is_active = 1/i.test(rawSql)) {
            list = list.filter(s => s.is_active === 1);
          }
          list.sort((a, b) => a.route_id - b.route_id || a.departure_time.localeCompare(b.departure_time));
          return list;
        }

        // SELECT testimonials
        if (/SELECT \* FROM testimonials/i.test(rawSql)) {
          let list = [...data.testimonials];
          if (/WHERE is_approved = 1/i.test(rawSql)) {
            list = list.filter(t => t.is_approved === 1);
          }
          list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          if (/LIMIT (\d+)/i.test(rawSql)) {
            const limit = parseInt(rawSql.match(/LIMIT (\d+)/i)[1]);
            list = list.slice(0, limit);
          }
          return list;
        }

        // SELECT fleet
        if (/SELECT \* FROM fleet/i.test(rawSql)) {
          if (/WHERE is_active = 1/i.test(rawSql)) {
            return data.fleet.filter(f => f.is_active === 1);
          }
          return [...data.fleet];
        }

        // SELECT drivers
        if (/SELECT \* FROM drivers/i.test(rawSql)) {
          return [...(data.drivers || [])];
        }

        // SELECT contacts
        if (/SELECT \* FROM contacts/i.test(rawSql)) {
          const list = [...data.contacts];
          list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          return list;
        }

        // SELECT charters
        if (/SELECT \* FROM charters/i.test(rawSql)) {
          const list = [...(data.charters || [])];
          list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          return list;
        }

        // SELECT bookings
        if (/SELECT b\.\*, s\.departure_time/i.test(rawSql)) {
          let list = data.bookings.map(b => {
            const s = data.schedules.find(sc => sc.id === b.schedule_id);
            const r = s ? data.routes.find(rt => rt.id === s.route_id) : null;
            const d = data.drivers ? data.drivers.find(drv => drv.id === b.driver_id) : null;
            return {
              ...b,
              departure_time: s ? s.departure_time : '',
              via: s ? s.via : '',
              price: s ? s.price : 0,
              max_seats: s ? (s.max_seats || 6) : 6,
              origin: r ? r.origin : '',
              destination: r ? r.destination : '',
              driver_name: d ? d.name : 'Pak Slamet (081918401858)',
              driver_phone: d ? d.phone : '081918401858',
              driver_car: d ? d.car : 'Toyota All New Veloz (Hitam)',
              driver_plate: d ? d.plate : 'W 1234 DH'
            };
          });

          if (params.length > 0 && params[0]) {
            list = list.filter(b => b.status === params[0]);
          }

          list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          return list;
        }

        return [];
      },

      get(...params) {
        const data = loadData();

        // COUNT queries
        if (/SELECT COUNT\(\*\) as count FROM bookings WHERE status = 'pending'/i.test(rawSql)) {
          return { count: data.bookings.filter(b => b.status === 'pending').length };
        }
        if (/SELECT COUNT\(\*\) as count FROM bookings WHERE status = 'confirmed'/i.test(rawSql)) {
          return { count: data.bookings.filter(b => b.status === 'confirmed').length };
        }
        if (/SELECT COUNT\(\*\) as count FROM bookings WHERE status = 'completed'/i.test(rawSql)) {
          return { count: data.bookings.filter(b => b.status === 'completed').length };
        }
        if (/SELECT COUNT\(\*\) as count FROM bookings WHERE DATE\(created_at\)/i.test(rawSql)) {
          const today = new Date().toISOString().slice(0, 10);
          return { count: data.bookings.filter(b => (b.created_at || '').slice(0, 10) === today).length };
        }
        if (/SELECT COUNT\(\*\) as count FROM bookings/i.test(rawSql)) {
          return { count: data.bookings.length };
        }
        if (/SELECT COUNT\(\*\) as count FROM charters/i.test(rawSql)) {
          return { count: (data.charters || []).length };
        }
        if (/SELECT COALESCE\(SUM\(total_price\), 0\) as total FROM bookings WHERE status IN \('confirmed', 'completed'\)/i.test(rawSql)) {
          const total = data.bookings
            .filter(b => b.status === 'confirmed' || b.status === 'completed')
            .reduce((acc, b) => acc + (b.total_price || 0), 0);
          return { total };
        }
        if (/SELECT COUNT\(\*\) as count FROM contacts WHERE is_read = 0/i.test(rawSql)) {
          return { count: data.contacts.filter(c => !c.is_read).length };
        }
        if (/SELECT COUNT\(\*\) as count FROM testimonials WHERE is_approved = 0/i.test(rawSql)) {
          return { count: data.testimonials.filter(t => !t.is_approved).length };
        }
        if (/SELECT COUNT\(\*\) as count FROM routes/i.test(rawSql)) {
          return { count: data.routes.length };
        }

        // Single Schedule
        if (/SELECT s\.\*, r\.origin, r\.destination FROM schedules s JOIN routes r ON s\.route_id = r\.id WHERE s\.id = \?/i.test(rawSql)) {
          const s = data.schedules.find(sc => sc.id === parseInt(params[0]));
          if (!s) return undefined;
          const r = data.routes.find(rt => rt.id === s.route_id);
          return {
            ...s,
            max_seats: s.max_seats || 6,
            origin: r ? r.origin : '',
            destination: r ? r.destination : ''
          };
        }

        // Single Booking by code
        if (/SELECT b\.\*, s\.departure_time.*WHERE b\.booking_code = \?/i.test(rawSql)) {
          const search = (params[0] || '').trim().toUpperCase();
          const b = data.bookings.find(item => item.booking_code.trim().toUpperCase() === search);
          if (!b) return undefined;
          const s = data.schedules.find(sc => sc.id === b.schedule_id);
          const r = s ? data.routes.find(rt => rt.id === s.route_id) : null;
          const d = data.drivers ? data.drivers.find(drv => drv.id === b.driver_id) : null;
          return {
            ...b,
            departure_time: s ? s.departure_time : '',
            via: s ? s.via : '',
            price: s ? s.price : 0,
            max_seats: s ? (s.max_seats || 6) : 6,
            origin: r ? r.origin : '',
            destination: r ? r.destination : '',
            driver_name: d ? d.name : 'Pak Slamet (Driver 1)',
            driver_phone: d ? d.phone : '081918401858',
            driver_car: d ? d.car : 'Toyota All New Veloz (Hitam)',
            driver_plate: d ? d.plate : 'W 1234 DH'
          };
        }

        // User auth
        if (/SELECT \* FROM users WHERE username = \? AND password = \?/i.test(rawSql)) {
          return data.users.find(u => u.username === params[0] && u.password === params[1]);
        }

        return undefined;
      },

      run(...params) {
        const data = loadData();

        // INSERT into bookings
        if (/INSERT INTO bookings/i.test(rawSql)) {
          const [booking_code, schedule_id, travel_date, passenger_name, passenger_phone, passenger_email, passenger_count, pickup_address, dropoff_address, pickup_zone, dropoff_zone, extra_fee, total_price, notes] = params;
          const newId = data.bookings.length > 0 ? Math.max(...data.bookings.map(b => b.id)) + 1 : 1;
          const newBooking = {
            id: newId,
            booking_code,
            booking_type: 'regular',
            schedule_id: parseInt(schedule_id),
            travel_date,
            passenger_name,
            passenger_phone,
            passenger_email,
            passenger_count: parseInt(passenger_count),
            pickup_address,
            dropoff_address,
            pickup_zone: pickup_zone || 'kota',
            dropoff_zone: dropoff_zone || 'kota',
            extra_fee: parseInt(extra_fee || 0),
            total_price: parseInt(total_price),
            status: 'pending',
            driver_id: (newId % 2 === 1) ? 1 : 2,
            trip_progress: 10,
            current_location_desc: 'Menunggu Penjemputan',
            notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          data.bookings.push(newBooking);
          saveData(data);
          return { lastInsertRowid: newId, changes: 1 };
        }

        // INSERT into charters
        if (/INSERT INTO charters/i.test(rawSql)) {
          const [charter_code, customer_name, customer_phone, customer_email, car_choice, charter_type, start_date, end_date, pickup_address, destination_address, purpose, notes] = params;
          const newId = (data.charters && data.charters.length > 0) ? Math.max(...data.charters.map(c => c.id)) + 1 : 1;
          const newCharter = {
            id: newId,
            charter_code,
            customer_name,
            customer_phone,
            customer_email,
            car_choice: car_choice || 'Toyota All New Veloz (Hitam)',
            charter_type: charter_type || 'Drop Sekali Jalan',
            start_date,
            end_date: end_date || start_date,
            pickup_address,
            destination_address,
            purpose,
            offered_price: 0, // Admin decides
            status: 'menunggu_penawaran',
            notes,
            created_at: new Date().toISOString()
          };
          if (!data.charters) data.charters = [];
          data.charters.push(newCharter);
          saveData(data);
          return { lastInsertRowid: newId, changes: 1 };
        }

        // UPDATE charter price / status
        if (/UPDATE charters SET/i.test(rawSql)) {
          // Handled via custom endpoint
          return { changes: 1 };
        }

        // UPDATE booking status
        if (/UPDATE bookings SET status = \?, updated_at = CURRENT_TIMESTAMP WHERE id = \?/i.test(rawSql)) {
          const booking = data.bookings.find(b => b.id === parseInt(params[1]));
          if (booking) {
            booking.status = params[0];
            booking.updated_at = new Date().toISOString();
            saveData(data);
          }
          return { changes: 1 };
        }

        // DELETE booking
        if (/DELETE FROM bookings WHERE id = \?/i.test(rawSql)) {
          data.bookings = data.bookings.filter(b => b.id !== parseInt(params[0]));
          saveData(data);
          return { changes: 1 };
        }

        // INSERT into contacts
        if (/INSERT INTO contacts/i.test(rawSql)) {
          const [name, email, phone, subject, message] = params;
          const newId = data.contacts.length > 0 ? Math.max(...data.contacts.map(c => c.id)) + 1 : 1;
          data.contacts.push({
            id: newId,
            name,
            email,
            phone,
            subject,
            message,
            is_read: 0,
            created_at: new Date().toISOString()
          });
          saveData(data);
          return { lastInsertRowid: newId, changes: 1 };
        }

        // UPDATE contact read status
        if (/UPDATE contacts SET is_read = 1 WHERE id = \?/i.test(rawSql)) {
          const contact = data.contacts.find(c => c.id === parseInt(params[0]));
          if (contact) contact.is_read = 1;
          saveData(data);
          return { changes: 1 };
        }

        // DELETE contact
        if (/DELETE FROM contacts WHERE id = \?/i.test(rawSql)) {
          data.contacts = data.contacts.filter(c => c.id !== parseInt(params[0]));
          saveData(data);
          return { changes: 1 };
        }

        // INSERT into testimonials
        if (/INSERT INTO testimonials/i.test(rawSql)) {
          const [name, route_text, rating, comment] = params;
          const newId = data.testimonials.length > 0 ? Math.max(...data.testimonials.map(t => t.id)) + 1 : 1;
          data.testimonials.push({
            id: newId,
            name,
            route_text,
            rating: parseInt(rating),
            comment,
            is_approved: 1,
            created_at: new Date().toISOString()
          });
          saveData(data);
          return { lastInsertRowid: newId, changes: 1 };
        }

        // TOGGLE testimonial approve
        if (/UPDATE testimonials SET is_approved = NOT is_approved WHERE id = \?/i.test(rawSql)) {
          const item = data.testimonials.find(t => t.id === parseInt(params[0]));
          if (item) item.is_approved = item.is_approved ? 0 : 1;
          saveData(data);
          return { changes: 1 };
        }

        // DELETE testimonial
        if (/DELETE FROM testimonials WHERE id = \?/i.test(rawSql)) {
          data.testimonials = data.testimonials.filter(t => t.id !== parseInt(params[0]));
          saveData(data);
          return { changes: 1 };
        }

        // INSERT into schedules
        if (/INSERT INTO schedules/i.test(rawSql)) {
          const [route_id, departure_time, via, price] = params;
          const newId = data.schedules.length > 0 ? Math.max(...data.schedules.map(s => s.id)) + 1 : 1;
          data.schedules.push({
            id: newId,
            route_id: parseInt(route_id),
            departure_time,
            via,
            price: parseInt(price),
            max_seats: 6,
            is_active: 1,
            created_at: new Date().toISOString()
          });
          saveData(data);
          return { lastInsertRowid: newId, changes: 1 };
        }

        // TOGGLE schedule active
        if (/UPDATE schedules SET is_active = NOT is_active WHERE id = \?/i.test(rawSql)) {
          const item = data.schedules.find(s => s.id === parseInt(params[0]));
          if (item) item.is_active = item.is_active ? 0 : 1;
          saveData(data);
          return { changes: 1 };
        }

        // DELETE schedule
        if (/DELETE FROM schedules WHERE id = \?/i.test(rawSql)) {
          data.schedules = data.schedules.filter(s => s.id !== parseInt(params[0]));
          saveData(data);
          return { changes: 1 };
        }

        // INSERT into routes
        if (/INSERT INTO routes/i.test(rawSql)) {
          const [origin, destination] = params;
          const newId = data.routes.length > 0 ? Math.max(...data.routes.map(r => r.id)) + 1 : 1;
          data.routes.push({
            id: newId,
            origin,
            destination,
            is_active: 1,
            created_at: new Date().toISOString()
          });
          saveData(data);
          return { lastInsertRowid: newId, changes: 1 };
        }

        // TOGGLE route active
        if (/UPDATE routes SET is_active = NOT is_active WHERE id = \?/i.test(rawSql)) {
          const item = data.routes.find(r => r.id === parseInt(params[0]));
          if (item) item.is_active = item.is_active ? 0 : 1;
          saveData(data);
          return { changes: 1 };
        }

        return { changes: 0 };
      }
    };
  }
};

// Driver GPS Update Function (from Driver HP)
function updateDriverLocation(driver_id, { lat, lng, speed, accuracy, heading, is_tracking_active, location_name }) {
  const data = loadData();
  if (!data.drivers) data.drivers = defaultData.drivers;
  const driver = data.drivers.find(d => d.id === parseInt(driver_id));
  if (!driver) return false;

  if (typeof is_tracking_active !== 'undefined') {
    driver.is_tracking_active = is_tracking_active ? 1 : 0;
  }
  if (lat && lng) {
    driver.current_lat = parseFloat(lat);
    driver.current_lng = parseFloat(lng);
  }
  if (typeof speed !== 'undefined') driver.speed = Math.round(parseFloat(speed) || 0);
  if (typeof accuracy !== 'undefined') driver.accuracy = Math.round(parseFloat(accuracy) || 0);
  if (typeof heading !== 'undefined') driver.heading = Math.round(parseFloat(heading) || 0);
  if (location_name) driver.location_name = location_name;
  driver.last_updated = new Date().toISOString();

  saveData(data);
  return driver;
}

// Get GPS Tracking info for a booking code
function getTrackingInfo(booking_code) {
  const data = loadData();
  const search = (booking_code || '').trim().toUpperCase();
  const b = data.bookings.find(item => item.booking_code.trim().toUpperCase() === search);
  if (!b) return null;

  const s = data.schedules.find(sc => sc.id === b.schedule_id);
  const r = s ? data.routes.find(rt => rt.id === s.route_id) : null;
  const driverId = b.driver_id || 1;
  const driver = (data.drivers || []).find(d => d.id === driverId) || defaultData.drivers[0];

  const isGpsOnline = (driver.is_tracking_active === 1) && (b.is_gps_allowed !== 0);

  return {
    booking: {
      ...b,
      origin: r ? r.origin : 'Mojokerto',
      destination: r ? r.destination : 'Malang',
      departure_time: s ? s.departure_time : '06:00',
      via: s ? s.via : 'Tol Gempol'
    },
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      car: driver.car,
      plate: driver.plate
    },
    gps: {
      is_online: isGpsOnline,
      lat: driver.current_lat || -7.6536,
      lng: driver.current_lng || 112.6917,
      speed: driver.speed || 0,
      accuracy: driver.accuracy || 0,
      location_name: driver.location_name || 'Rest Area Tol KM 48',
      last_updated: driver.last_updated
    }
  };
}

// Initialize file on startup
loadData();

module.exports = { 
  db, 
  generateBookingCode, 
  generateCharterCode, 
  getSeatAvailability, 
  loadData, 
  saveData,
  updateDriverLocation,
  getTrackingInfo
};
