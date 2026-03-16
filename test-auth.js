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
    console.log("Login Response:", res.statusCode, resData);
    if (!resData.token) return;
    
    // Now test indicator 1 gaps
    const testIndicator = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/indicators/1/gaps?frequency=WEEKLY',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + resData.token }
    }, res2 => {
      console.log("Indicator Gaps Response:", res2.statusCode);
      
      const testMe = http.request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/indicators/1/category-distribution',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + resData.token }
      }, res3 => {
        console.log("Category dist Response:", res3.statusCode);
        
        const testSubmissions = http.request({
          hostname: 'localhost',
          port: 4000,
          path: '/api/v1/indicators/1/submissions',
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + resData.token }
        }, res4 => {
          console.log("Submissions Response:", res4.statusCode);
        });
        testSubmissions.end();
        
      });
      testMe.end();
    });
    testIndicator.end();
  });
});

req.write(JSON.stringify({ email: 'admin@gmail.com', password: 'admin1234' }));
req.end();
