import axios from 'axios';

// Create the axios instance
const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api', // Keep as localhost for now
});

// Automatically attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    // SWITCHED TO sessionStorage FOR TAB ISOLATION
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to catch 401 Unauthorized (Token revoked or expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If backend says token is invalid (expired or another team member logged in)
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user_email');
      
      // Force redirect to login screen
      if (window.location.hash !== '#/login') {
        window.location.href = '/#/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;