import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
          });
          localStorage.setItem('accessToken', response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: async (credentials) => {
    const response = await axios.post(`${API_URL}/token/`, credentials);
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  }
};

// Member Service
export const memberService = {
  getAll: async (params = {}) => {
    const response = await api.get('/members/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/members/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/members/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/members/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/members/${id}/`);
    return response.data;
  },
  
  getDashboardStats: async () => {
    const response = await api.get('/members/dashboard_stats/');
    return response.data;
  },
};

// Membership Service
export const membershipService = {
  getAll: async (params = {}) => {
    const response = await api.get('/memberships/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/memberships/${id}/`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/memberships/', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/memberships/${id}/`, data);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/memberships/${id}/`);
    return response.data;
  },
  
  revenueAnalysis: async (data) => {
    const response = await api.post('/memberships/revenue_analysis/', data);
    return response.data;
  },
};

export default api;