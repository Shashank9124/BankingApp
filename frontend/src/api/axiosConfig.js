import axios from 'axios';

const API = axios.create({
    baseURL: 'https://banking-4fdn1v1cb-shashanks-projects-a139df97.vercel.app/api', // <-- Your Vercel URL
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