import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('skimly_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = {
  // Analysis
  analyze: async (text, sourceUrl, sourceTitle) => {
    const response = await axios.post(`${API}/analyze`, 
      { text, source_url: sourceUrl, source_title: sourceTitle },
      { headers: getAuthHeaders(), withCredentials: true }
    );
    return response.data;
  },

  // Save knowledge
  save: async (item) => {
    const response = await axios.post(`${API}/save`, item, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Get history
  getHistory: async (params = {}) => {
    const response = await axios.get(`${API}/history`, {
      params,
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Get single knowledge item
  getKnowledgeItem: async (itemId) => {
    const response = await axios.get(`${API}/knowledge/${itemId}`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Delete knowledge item
  deleteKnowledgeItem: async (itemId) => {
    const response = await axios.delete(`${API}/knowledge/${itemId}`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Update tags
  updateTags: async (itemId, tags) => {
    const response = await axios.put(`${API}/knowledge/${itemId}/tags`, tags, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Get all tags
  getTags: async () => {
    const response = await axios.get(`${API}/tags`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Ask Your Brain
  askBrain: async (question) => {
    const response = await axios.post(`${API}/ask`, 
      { question },
      { headers: getAuthHeaders(), withCredentials: true }
    );
    return response.data;
  },

  // Get digest
  getDigest: async () => {
    const response = await axios.get(`${API}/digest`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Get stats
  getStats: async () => {
    const response = await axios.get(`${API}/stats`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Export knowledge
  exportKnowledge: async () => {
    const response = await axios.get(`${API}/export`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  },

  // Get recommendations
  getRecommendations: async () => {
    const response = await axios.get(`${API}/recommendations`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
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
    const response = await axios.post(`${API}/auth/resend-verification`, {}, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  }
};

export default api;
