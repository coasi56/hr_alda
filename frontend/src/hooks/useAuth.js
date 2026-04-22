import React, { createContext, useContext, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('alda_token'));
  const [email, setEmail] = useState(() => localStorage.getItem('alda_email'));

  async function login(emailInput, password) {
    const data = await api.post('/auth/login', { email: emailInput, password });
    localStorage.setItem('alda_token', data.token);
    localStorage.setItem('alda_email', data.email);
    setToken(data.token);
    setEmail(data.email);
  }

  function logout() {
    localStorage.removeItem('alda_token');
    localStorage.removeItem('alda_email');
    setToken(null);
    setEmail(null);
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { token, email, isAuth: !!token, login, logout } },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
