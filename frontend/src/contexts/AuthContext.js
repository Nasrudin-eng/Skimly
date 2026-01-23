import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('skimly_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('skimly_token');
    if (!storedToken) {
      setLoading(false);
      setIsAuthenticated(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        withCredentials: true
      });
      setUser(response.data);
      setToken(storedToken);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      localStorage.removeItem('skimly_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, 
      { email, password },
      { withCredentials: true }
    );
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('skimly_token', newToken);
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const register = async (name, email, password) => {
    const response = await axios.post(`${API}/auth/register`,
      { name, email, password },
      { withCredentials: true }
    );
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('skimly_token', newToken);
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processGoogleCallback = async (sessionId) => {
    const response = await axios.post(`${API}/auth/google/session`,
      { session_id: sessionId },
      { withCredentials: true }
    );
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('skimly_token', newToken);
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('skimly_token');
  };

  const updateProfile = async (data) => {
    const response = await axios.put(`${API}/profile`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true
    });
    setUser(response.data);
    return response.data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      token,
      isAuthenticated,
      login,
      register,
      loginWithGoogle,
      processGoogleCallback,
      logout,
      updateProfile,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
