import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('td_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('td_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('td_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('td_token');
        localStorage.removeItem('td_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('td_token', res.data.token);
    localStorage.setItem('td_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  // Registering no longer logs the user in directly -- an OTP is emailed
  // first and verifyOtp() below is what actually issues the session.
  async function register(full_name, email, password) {
    const res = await api.post('/auth/register', { full_name, email, password });
    return res.data; // { needsVerification: true, email }
  }

  async function verifyOtp(email, otp) {
    const res = await api.post('/auth/verify-otp', { email, otp });
    localStorage.setItem('td_token', res.data.token);
    localStorage.setItem('td_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  async function resendOtp(email) {
    await api.post('/auth/resend-otp', { email });
  }

  function logout() {
    localStorage.removeItem('td_token');
    localStorage.removeItem('td_user');
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, resendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
