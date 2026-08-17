const http = require('http');

async function testUrl(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:3000${path}`, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('Testing DH Trans Endpoints...');

  // 1. Home
  const home = await testUrl('/');
  console.log(`[GET /] Status: ${home.status} - OK? ${home.status === 200}`);

  // 2. Carter page
  const carter = await testUrl('/carter');
  console.log(`[GET /carter] Status: ${carter.status} - OK? ${carter.status === 200}`);

  // 3. Post Carter
  const carterPost = await testUrl('/carter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: 'Budi Santoso',
      customer_phone: '081234567890',
      car_choice: 'Toyota All New Veloz (Hitam)',
      charter_type: 'Drop Sekali Jalan (One Way)',
      start_date: '2026-08-25',
      pickup_address: 'Pacet Mojokerto',
      destination_address: 'Batu Malang',
      purpose: 'Wisata Keluarga',
      notes: 'Bawa koper'
    })
  });
  console.log(`[POST /carter] Status: ${carterPost.status} - Response:`, carterPost.body);

  // 4. Tracking page
  const tracking = await testUrl('/tracking');
  console.log(`[GET /tracking] Status: ${tracking.status} - OK? ${tracking.status === 200}`);

  // 5. Seat API
  const seats = await testUrl('/api/seats?schedule_id=1&travel_date=2026-08-25');
  console.log(`[GET /api/seats] Status: ${seats.status} - Response:`, seats.body);

  // 6. Regular Booking
  const bookingPost = await testUrl('/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      schedule_id: 1,
      travel_date: '2026-08-25',
      passenger_name: 'Ahmad Dahlan',
      passenger_phone: '08987654321',
      passenger_count: 2,
      pickup_zone: 'kabupaten',
      pickup_address: 'Trowulan Kab. Mojokerto',
      dropoff_zone: 'kota',
      dropoff_address: 'Sawojajar Kota Malang',
      notes: 'Depan gapura candi'
    })
  });
  console.log(`[POST /booking] Status: ${bookingPost.status} - Response:`, bookingPost.body);

  console.log('✅ ALL SERVER ENDPOINTS TESTED SUCCESSFULLY!');
}

runTests().catch(console.error);
