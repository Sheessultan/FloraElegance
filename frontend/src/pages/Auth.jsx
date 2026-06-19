import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Lock, ShieldCheck, Leaf, ArrowRight, Loader2, KeyRound, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OTP_LENGTH = 6;

const Auth = () => {
  const navigate = useNavigate();
  const { login, loginWithOtp, signup, sendSignupOtp, sendLoginOtp, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('login');
  const [loginMode, setLoginMode] = useState('password'); // password | otp

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: '',
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const otpRefs = useRef([]);

  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectPath = rawRedirect.startsWith('/') ? rawRedirect : `/${rawRedirect}`;

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' && redirectPath === '/') {
        navigate('/admin');
      } else {
        navigate(redirectPath);
      }
    }
  }, [user, navigate, redirectPath]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => setOtpCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  const resetOtpState = () => {
    setOtpSent(false);
    setOtpCooldown(0);
    setFormData((prev) => ({ ...prev, otp: '' }));
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
    resetOtpState();
    if (tab === 'login') setLoginMode('password');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOtpDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const chars = formData.otp.padEnd(OTP_LENGTH, ' ').split('');
    chars[index] = digit || ' ';
    const next = chars.join('').trimEnd().replace(/ /g, '');
    setFormData({ ...formData, otp: next.slice(0, OTP_LENGTH) });
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = async () => {
    setError(null);
    setSuccess(null);

    if (!formData.email) {
      setError('Enter your email address first.');
      return;
    }

    if (activeTab === 'signup') {
      if (!formData.name) {
        setError('Enter your full name first.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    const res = activeTab === 'signup'
      ? await sendSignupOtp(formData.name, formData.email)
      : await sendLoginOtp(formData.email);
    setLoading(false);

    if (res.success) {
      setOtpSent(true);
      setOtpCooldown(res.wait_seconds || 60);
      setSuccess(res.message || 'Verification code sent to your email.');
    } else {
      setError(res.message);
      if (res.wait_seconds) setOtpCooldown(res.wait_seconds);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { name, email, password, confirmPassword, otp } = formData;

    if (activeTab === 'login') {
      if (loginMode === 'otp') {
        if (!otpSent) {
          setLoading(false);
          setError('Please request a verification code first.');
          return;
        }
        if (otp.length !== OTP_LENGTH) {
          setLoading(false);
          setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
          return;
        }
        const res = await loginWithOtp(email, otp);
        setLoading(false);
        if (res.success) {
          setSuccess('Signed in successfully! Redirecting...');
        } else {
          setError(res.message);
        }
        return;
      }

      const res = await login(email, password);
      setLoading(false);
      if (res.success) {
        setSuccess('Login successful! Redirecting...');
      } else {
        setError(res.message);
      }
      return;
    }

    // Signup — OTP required
    if (password !== confirmPassword) {
      setLoading(false);
      setError('Passwords do not match.');
      return;
    }
    if (!otpSent) {
      setLoading(false);
      setError('Please verify your email with the OTP code first.');
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      setLoading(false);
      setError(`Enter the ${OTP_LENGTH}-digit verification code.`);
      return;
    }

    const res = await signup(name, email, password, otp);
    setLoading(false);
    if (res.success) {
      setSuccess('Account created! Your email is verified — please sign in.');
      setFormData({ name: '', email: '', password: '', confirmPassword: '', otp: '' });
      resetOtpState();
      setActiveTab('login');
    } else {
      setError(res.message);
    }
  };

  const OtpInput = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Email Verification Code
        </label>
        <button
          type="button"
          onClick={handleSendOtp}
          disabled={loading || otpCooldown > 0}
          className="text-[10px] font-bold text-primary-600 hover:text-primary-700 disabled:text-slate-400 flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : otpSent ? 'Resend Code' : 'Send Code'}
        </button>
      </div>
      <div className="flex justify-center gap-2">
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { otpRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={formData.otp[i] || ''}
            onChange={(e) => handleOtpDigit(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            className="w-11 h-12 text-center text-lg font-extrabold bg-slate-50 border border-slate-200 focus:border-primary-500 focus:bg-white rounded-xl outline-none transition-all shadow-inner"
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-400 text-center font-medium">
        {otpSent
          ? 'Check your inbox & spam folder. Code expires in 10 minutes.'
          : 'We will send a 6-digit code to verify your email address.'}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">

      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-100/40 rounded-full blur-3xl -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-100/30 rounded-full blur-3xl translate-y-20 -translate-x-20" />
      </div>

      <div className="max-w-md w-full relative z-10 space-y-8 bg-white border border-slate-100 p-8 sm:p-10 rounded-[35px] shadow-xl">

        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 shadow-inner">
            <Leaf className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">
            Flora<span className="text-primary-600 font-light">Elegance</span>
          </h2>
          <p className="mt-1.5 text-xs text-slate-400 font-semibold tracking-wide uppercase">
            {activeTab === 'login' ? 'Secure sign-in with password or email OTP' : 'Verify your email to create an account'}
          </p>
        </div>

        <div className="flex border border-slate-150 p-1.5 rounded-full bg-slate-50 shadow-inner">
          <button type="button" onClick={() => switchTab('login')} className={`flex-grow font-bold text-xs py-2.5 rounded-full transition-all ${activeTab === 'login' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            Sign In
          </button>
          <button type="button" onClick={() => switchTab('signup')} className={`flex-grow font-bold text-xs py-2.5 rounded-full transition-all ${activeTab === 'signup' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            Create Account
          </button>
        </div>

        {activeTab === 'login' && (
          <div className="flex gap-2 p-1 rounded-xl bg-slate-50 border border-slate-100">
            <button type="button" onClick={() => { setLoginMode('password'); resetOtpState(); setError(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${loginMode === 'password' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
              <Lock className="h-3.5 w-3.5" /> Password
            </button>
            <button type="button" onClick={() => { setLoginMode('otp'); resetOtpState(); setError(null); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${loginMode === 'otp' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>
              <KeyRound className="h-3.5 w-3.5" /> Email OTP
            </button>
          </div>
        )}

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

        <form onSubmit={handleFormSubmit} className="space-y-5 text-left">

          {activeTab === 'signup' && (
            <div className="space-y-1.5 text-slate-600">
              <label className="text-[10px] font-bold uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Jane Doe" className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-xs transition-all shadow-inner" />
                <User className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-slate-600">
            <label className="text-[10px] font-bold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="jane@example.com" className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-xs transition-all shadow-inner" />
              <Mail className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
            </div>
          </div>

          {(activeTab === 'signup' || loginMode === 'password') && (
            <div className="space-y-1.5 text-slate-600">
              <label className="text-[10px] font-bold uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type="password" name="password" required={activeTab === 'signup' || loginMode === 'password'} value={formData.password} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-xs transition-all shadow-inner" />
                <Lock className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>
          )}

          {activeTab === 'signup' && (
            <div className="space-y-1.5 text-slate-600">
              <label className="text-[10px] font-bold uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleInputChange} placeholder="••••••••" className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-xs transition-all shadow-inner" />
                <Lock className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>
          )}

          {(activeTab === 'signup' || loginMode === 'otp') && (
            <>
              {!otpSent && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || otpCooldown > 0}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-full text-xs flex items-center justify-center gap-2 disabled:bg-slate-300 transition-all"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {otpCooldown > 0 ? `Wait ${otpCooldown}s` : 'Send Verification Code to Email'}
                </button>
              )}
              {otpSent && <OtpInput />}
            </>
          )}

          <button
            type="submit"
            disabled={loading || (activeTab === 'signup' && !otpSent) || (loginMode === 'otp' && activeTab === 'login' && !otpSent)}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 rounded-full shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 text-white animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {activeTab === 'login'
                    ? (loginMode === 'otp' ? 'Verify & Sign In' : 'Sign In')
                    : 'Verify Email & Register'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {activeTab === 'login' && loginMode === 'password' && (
            <div className="text-[10px] text-slate-400 font-semibold leading-normal text-center mt-4 bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <span className="font-extrabold text-slate-600">Demo accounts:</span><br />
              Customer: <span className="font-bold text-primary-700">jane@example.com</span> | PW: <span className="font-bold">admin123</span><br />
              Admin: <span className="font-bold text-emerald-700">admin@floraelegance.com</span> | PW: <span className="font-bold">admin123</span>
            </div>
          )}

        </form>
      </div>
    </div>
  );
};

export default Auth;
