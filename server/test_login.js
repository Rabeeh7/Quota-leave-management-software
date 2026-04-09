const https = require('https');

const data = JSON.stringify({
  roll_no: 'CS001',
  password: 'CS001'
});

const options = {
  hostname: 'quota-leave-management-software.onrender.com',
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', responseData);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
