
const axios = require('axios');

async function createTestUser() {
    try {
        const response = await axios.post('http://localhost:3001/api/users/signup', {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        });
        console.log('User created:', response.data);
    } catch (error) {
        if (error.response && error.response.status === 409) {
            console.log('User already exists, trying login...');
            try {
                const loginResponse = await axios.post('http://localhost:3001/api/users/login', {
                    email: 'test@example.com',
                    password: 'password123'
                });
                console.log('Login successful:', loginResponse.data);
            } catch (loginError) {
                console.error('Login failed:', loginError.response ? loginError.response.data : loginError.message);
            }
        } else {
            console.error('Error creating user:', error.response ? error.response.data : error.message);
        }
    }
}

createTestUser();
