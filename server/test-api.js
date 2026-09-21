const request = require('http');

const app = require('./src/app');

let server;

async function runTests() {
  console.log('--- Starting CampusConnect API Verification Tests ---');

  await new Promise((resolve) => {
    server = app.listen(5099, resolve);
  });

  const baseUrl = 'http://localhost:5099/api/v1';

  const makeRequest = (path, method = 'GET', body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}${path}`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = request.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  try {
    // 1. Health check
    const health = await makeRequest('/health', 'GET');
    console.log('1. Health Check:', health.status === 200 ? 'PASS ✅' : 'FAIL ❌');

    // 2. Check unused whitelisted roll number (21EC015)
    const checkUnused = await makeRequest('/auth/check-roll', 'POST', { rollNumber: '21EC015' });
    console.log('2. Whitelist check for 21EC015 (expect success):', checkUnused.status === 200 ? 'PASS ✅' : 'FAIL ❌', checkUnused.body.message);

    // 3. Check non-whitelisted roll number (FAKE999)
    const checkFake = await makeRequest('/auth/check-roll', 'POST', { rollNumber: 'FAKE999' });
    console.log('3. Whitelist check for FAKE999 (expect 403 blocked):', checkFake.status === 403 ? 'PASS ✅' : 'FAIL ❌', checkFake.body.message);

    // 4. Check already used roll number (21CS001)
    const checkUsed = await makeRequest('/auth/check-roll', 'POST', { rollNumber: '21CS001' });
    console.log('4. Whitelist check for already registered 21CS001 (expect 409):', checkUsed.status === 409 ? 'PASS ✅' : 'FAIL ❌', checkUsed.body.message);

    // 5. Admin Login
    const adminLogin = await makeRequest('/auth/login', 'POST', {
      identifier: 'admin@campusconnect.edu',
      password: 'Admin@12345'
    });
    console.log('5. Admin login (expect token):', adminLogin.status === 200 && adminLogin.body.data.token ? 'PASS ✅' : 'FAIL ❌');
    const adminToken = adminLogin.body.data?.token;

    // 6. Student Login
    const studentLogin = await makeRequest('/auth/login', 'POST', {
      identifier: '21CS001',
      password: 'Student@123'
    });
    console.log('6. Student login (expect token):', studentLogin.status === 200 && studentLogin.body.data.token ? 'PASS ✅' : 'FAIL ❌');
    const studentToken = studentLogin.body.data?.token;

    // 7. Get Feed with student token
    const feed = await makeRequest('/posts', 'GET', null, { Authorization: `Bearer ${studentToken}` });
    console.log('7. Get Feed:', feed.status === 200 && feed.body.data.posts.length > 0 ? 'PASS ✅' : 'FAIL ❌', `(${feed.body.data.posts.length} posts loaded)`);

    // 8. Admin Stats
    const stats = await makeRequest('/admin/stats', 'GET', null, { Authorization: `Bearer ${adminToken}` });
    console.log('8. Admin Stats access:', stats.status === 200 ? 'PASS ✅' : 'FAIL ❌', stats.body.data);

    console.log('--- All Core API Tests Passed Successfully! ---');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
  }
}

runTests();
