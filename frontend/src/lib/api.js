import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  updateRole: (userId, role) => api.put(`/users/${userId}/role`, { role }),
  delete: (userId) => api.delete(`/users/${userId}`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/document-categories'),
  create: (data) => api.post('/document-categories', data),
  delete: (categoryId) => api.delete(`/document-categories/${categoryId}`),
};

// Documents API
export const documentsAPI = {
  getAll: (categoryId) => api.get('/documents', { params: categoryId ? { category_id: categoryId } : {} }),
  getOne: (docId) => api.get(`/documents/${docId}`),
  create: (data) => api.post('/documents', data),
  update: (docId, data) => api.put(`/documents/${docId}`, data),
  delete: (docId) => api.delete(`/documents/${docId}`),
};

// AI Assistant API
export const aiAPI = {
  getContextSuggestions: () => api.get('/ai-assistant/suggestions-context'),
  getEnhancedSuggestions: () => api.get('/ai-assistant/suggestions-enhanced'),
  askQuestion: (question) => api.post('/ai-assistant/qa', { question }),
  getQAHistory: () => api.get('/ai-assistant/qa-history'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Seed data
export const seedAPI = {
  seedData: () => api.post('/seed-data'),
};

export default api;
