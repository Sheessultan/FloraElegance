import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('plant_token');
    const savedUser = localStorage.getItem('plant_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
      // Configure default axios headers for all requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
    setLoading(false);
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login.php`, { email, password });
      
      if (response.data.success) {
        const { token: jwtToken, user: userData } = response.data;
        
        // Save to state
        setToken(jwtToken);
        setUser(userData);
        
        // Save to local storage
        localStorage.setItem('plant_token', jwtToken);
        localStorage.setItem('plant_user', JSON.stringify(userData));
        
        // Set axios header
        axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  // Signup handler
  const signup = async (name, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/signup.php`, { name, email, password });
      
      if (response.data.success) {
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed. Try again.'
      };
    }
  };

  // Logout handler
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('plant_token');
    localStorage.removeItem('plant_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
