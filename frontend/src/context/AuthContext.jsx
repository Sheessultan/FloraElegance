import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('plant_token');
    localStorage.removeItem('plant_user');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem('plant_user', JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('plant_token');
    const savedUser = localStorage.getItem('plant_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch {
        localStorage.removeItem('plant_token');
        localStorage.removeItem('plant_user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login.php`, { email, password });

      if (response.data.success) {
        const { token: jwtToken, user: userData } = response.data;
        setToken(jwtToken);
        setUser(userData);
        localStorage.setItem('plant_token', jwtToken);
        localStorage.setItem('plant_user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const sendLoginOtp = async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login.php`, {
        action: 'send_otp',
        email,
      });
      return {
        success: response.data.success,
        message: response.data.message,
        wait_seconds: response.data.wait_seconds,
      };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to send verification code.',
        wait_seconds: err.response?.data?.wait_seconds,
      };
    }
  };

  const loginWithOtp = async (email, otp) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login.php`, {
        action: 'otp',
        email,
        otp,
      });

      if (response.data.success) {
        const { token: jwtToken, user: userData } = response.data;
        setToken(jwtToken);
        setUser(userData);
        localStorage.setItem('plant_token', jwtToken);
        localStorage.setItem('plant_user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'OTP verification failed.',
      };
    }
  };

  const sendSignupOtp = async (name, email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/signup.php`, {
        action: 'send_otp',
        name,
        email,
      });
      return {
        success: response.data.success,
        message: response.data.message,
        wait_seconds: response.data.wait_seconds,
      };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to send verification code.',
        wait_seconds: err.response?.data?.wait_seconds,
      };
    }
  };

  const signup = async (name, email, password, otp) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/signup.php`, {
        name,
        email,
        password,
        otp,
      });

      if (response.data.success) {
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed. Try again.',
      };
    }
  };

  const isAdmin = () => user && user.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithOtp,
        sendLoginOtp,
        signup,
        sendSignupOtp,
        logout,
        updateUser,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
