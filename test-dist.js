const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const resData = JSON.parse(data);
    if (!resData.token) {
        console.log("Login failed");
        return;
    }
    
    // Now test indicator 35 distribution
    const testDist = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/indicators/35/category-distribution',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + resData.token }
    }, res2 => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log("Dist Response Status:", res2.statusCode);
        console.log("Dist Response Data:", data2);
      });
    });
    testDist.end();
  });
});

req.write(JSON.stringify({ email: 'admin@gmail.com', password: 'admin1234' }));
req.end();
