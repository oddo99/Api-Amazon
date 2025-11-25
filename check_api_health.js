
const axios = require('axios');

const API_URL = 'http://localhost:3002';

async function checkApi() {
    try {
        console.log('1. Logging in...');
        const loginResponse = await axios.post(`${API_URL}/api/users/login`, {
            email: 'alessandro@admin.local',
            password: 'password123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login successful. Token obtained.');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('\n2. Fetching Accounts...');
        const accountsResponse = await axios.get(`${API_URL}/api/accounts`, { headers });
        console.log(`✅ Accounts found: ${accountsResponse.data.length}`);

        if (accountsResponse.data.length === 0) {
            console.log('⚠️ No accounts found. Dashboard loading might be waiting for account creation.');
            return;
        }

        const accountId = accountsResponse.data[0].id;
        console.log(`   Using Account ID: ${accountId}`);

        console.log('\n3. Fetching Dashboard Data...');
        const dashboardResponse = await axios.get(`${API_URL}/api/analytics/dashboard`, {
            headers,
            params: { accountId }
        });
        console.log('✅ Dashboard Data received:', dashboardResponse.status);
        console.log('   Data keys:', Object.keys(dashboardResponse.data));

        console.log('\n4. Fetching Daily Stats...');
        const dailyStatsResponse = await axios.get(`${API_URL}/api/analytics/daily-stats`, {
            headers,
            params: { accountId }
        });
        console.log('✅ Daily Stats received:', dailyStatsResponse.status);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

checkApi();
