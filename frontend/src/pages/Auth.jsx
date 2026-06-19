import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Lock, ShieldCheck, Leaf, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const navigate = useNavigate();
  const { login, signup, user } = useAuth();
  const [searchParams] = useSearchParams();

  // Tabs: 'login' | 'signup'
  const [activeTab, setActiveTab] = useState('login');

  // Input states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // UI status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check if redirect is specified in URL
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectPath = rawRedirect.startsWith('/') ? rawRedirect : `/${rawRedirect}`;

  // If already logged in, redirect immediately
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' && redirectPath === '/') {
        navigate('/admin');
      } else {
        navigate(redirectPath);
      }
    }
  }, [user, navigate, redirectPath]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { name, email, password, confirmPassword } = formData;

    if (activeTab === 'login') {
      // 1. Process Login
      const res = await login(email, password);
      setLoading(false);
      if (res.success) {
        setSuccess('Login successful! Redirecting...');
        // Let useEffect handle redirect
      } else {
        setError(res.message);
      }
    } else {
      // 2. Process Registration
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      
      const res = await signup(name, email, password);
      setLoading(false);
      if (res.success) {
        setSuccess('Registration successful! Please log in below.');
        // Clear input form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setActiveTab('login');
      } else {
        setError(res.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-100/40 rounded-full blur-3xl -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-100/30 rounded-full blur-3xl translate-y-20 -translate-x-20"></div>
      </div>

      <div className="max-w-md w-full relative z-10 space-y-8 bg-white border border-slate-100 p-8 sm:p-10 rounded-[35px] shadow-xl">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 shadow-inner">
            <Leaf className="h-6 w-6 text-primary-600 animate-bounce-slow" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
            Flora<span className="text-primary-600 font-light">Elegance</span>
          </h2>
          <p className="mt-1.5 text-xs text-slate-400 font-semibold tracking-wide uppercase">
            {activeTab === 'login' ? 'Welcome back, botanical companion' : 'Create your secure account'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border border-slate-150 p-1.5 rounded-full bg-slate-50 shadow-inner">
          <button
            onClick={() => {
              setActiveTab('login');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-grow font-bold text-xs py-2.5 rounded-full transition-all ${
              activeTab === 'login' 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In Account
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-grow font-bold text-xs py-2.5 rounded-full transition-all ${
              activeTab === 'signup' 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Dynamic Status Notification Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
            <ShieldCheck className="h-4.5 w-4.5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Main form */}
        <form onSubmit={handleFormSubmit} className="space-y-5 text-left">
          
          {/* Signup specific Name field */}
          {activeTab === 'signup' && (
            <div className="space-y-1.5 text-slate-600">
              <label className="text-[10px] font-bold uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Jane Doe"
                  className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-xs transition-all shadow-inner"
                />
                <User className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5 text-slate-600">
            <label className="text-[10px] font-bold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="jane@example.com"
                className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-xs transition-all shadow-inner"
              />
              <Mail className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5 text-slate-600">
            <label className="text-[10px] font-bold uppercase tracking-wider">Secure Password</label>
            <div className="relative">
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-xs transition-all shadow-inner"
              />
              <Lock className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
            </div>
          </div>

          {/* Signup specific Confirm Password */}
          {activeTab === 'signup' && (
            <div className="space-y-1.5 text-slate-600">
              <label className="text-[10px] font-bold uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-xs transition-all shadow-inner"
                />
                <Lock className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>
          )}

          {/* Form submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-full shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 text-white animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{activeTab === 'login' ? 'Sign In' : 'Register Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Redirect / Admin accounts hint */}
          {activeTab === 'login' && (
            <div className="text-[10px] text-slate-400 font-semibold leading-normal text-center mt-4 bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <span className="font-extrabold text-slate-600">Demo Login Details Available:</span><br />
              Customer: <span className="font-bold text-primary-700">jane@example.com</span> | PW: <span className="font-bold text-slate-600">admin123</span><br />
              Admin Panel: <span className="font-bold text-emerald-700">admin@floraelegance.com</span> | PW: <span className="font-bold text-slate-600">admin123</span>
            </div>
          )}

        </form>

      </div>
    </div>
  );
};

export default Auth;
