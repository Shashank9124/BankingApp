import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api', // Your backend API base URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach JWT token
API.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default API;