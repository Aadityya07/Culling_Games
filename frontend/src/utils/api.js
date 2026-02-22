import axios from 'axios';

// Create the axios instance with your live Render backend URL
const api = axios.create({
  baseURL: 'https://culling-games-backend.onrender.com/api',
});

// Automatically attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;