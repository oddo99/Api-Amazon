
const http = require('http');

const ports = [3000, 3001, 3002, 3003];

ports.forEach(port => {
    const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
        timeout: 2000
    }, (res) => {
        console.log(`✅ Port ${port} is OPEN. Status: ${res.statusCode}`);
    });

    req.on('error', (e) => {
        console.log(`❌ Port ${port} is CLOSED or unreachable. Error: ${e.message}`);
    });

    req.on('timeout', () => {
        console.log(`⏳ Port ${port} TIMED OUT.`);
        req.destroy();
    });

    req.end();
});
