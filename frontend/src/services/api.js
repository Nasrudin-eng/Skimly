import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API,
  withCredentials: true
});

// Add token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('skimly_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const api = {
  // Analysis
  analyze: async (text, sourceUrl, sourceTitle) => {
    const response = await apiClient.post('/analyze', {
      text, source_url: sourceUrl, source_title: sourceTitle
    });
    return response.data;
  },

  // Save knowledge
  save: async (item) => {
    const response = await apiClient.post('/save', item);
    return response.data;
  },

  // Get history
  getHistory: async (params = {}) => {
    const response = await apiClient.get('/history', { params });
    return response.data;
  },

  // Get single knowledge item
  getKnowledgeItem: async (itemId) => {
    const response = await apiClient.get(`/knowledge/${itemId}`);
    return response.data;
  },

  // Delete knowledge item
  deleteKnowledgeItem: async (itemId) => {
    const response = await apiClient.delete(`/knowledge/${itemId}`);
    return response.data;
  },

  // Update tags
  updateTags: async (itemId, tags) => {
    const response = await apiClient.put(`/knowledge/${itemId}/tags`, tags);
    return response.data;
  },

  // Get all tags
  getTags: async () => {
    const response = await apiClient.get('/tags');
    return response.data;
  },

  // Ask Your Brain
  askBrain: async (question) => {
    const response = await apiClient.post('/ask', { question });
    return response.data;
  },

  // Get digest
  getDigest: async () => {
    const response = await apiClient.get('/digest');
    return response.data;
  },

  // Get stats
  getStats: async () => {
    const response = await apiClient.get('/stats');
    return response.data;
  },

  // Export knowledge
  exportKnowledge: async () => {
    const response = await apiClient.get('/export');
    return response.data;
  },

  // Get recommendations
  getRecommendations: async () => {
    const response = await apiClient.get('/recommendations');
    return response.data;
  },

  // Password reset
  forgotPassword: async (email) => {
    const response = await axios.post(`${API}/auth/forgot-password`, { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await axios.post(`${API}/auth/reset-password`, {
      token,
      new_password: newPassword
    });
    return response.data;
  },

  // Email verification
  verifyEmail: async (token) => {
    const response = await axios.post(`${API}/auth/verify-email`, { token });
    return response.data;
  },

  resendVerification: async () => {
    const response = await apiClient.post('/auth/resend-verification');
    return response.data;
  }
};

export default api;
