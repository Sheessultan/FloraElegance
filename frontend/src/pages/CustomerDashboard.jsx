import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  User, Package, MapPin, Phone, Lock, Edit2, Save, ShoppingBag, 
  Heart, ShoppingCart, LogOut, CheckCircle, Clock, Truck, 
  AlertTriangle, ChevronRight, Eye, Shield, Calendar, CreditCard, X, ArrowRight, DownloadCloud,
  Banknote, Filter, Search, Loader2, Bell, Plus, Trash2
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { generateInvoice } from '../utils/invoiceGenerator';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  formatOrderNumber,
  getPaymentMethod,
  filterOrders,
  DEFAULT_ORDER_FILTERS,
  ORDER_STATUS_OPTIONS,
} from '../utils/orderHelpers';

const CustomerDashboard = () => {
  const { user, logout, isAdmin, updateUser } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  // Navigation Tabs: 'overview', 'orders', 'profile'
  const [activeTab, setActiveTab] = useState('overview');
  
  // State
  const [orders, setOrders] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [addressForm, setAddressForm] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [siteSettings, setSiteSettings] = useState({});
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  // Password Change State
  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [orderFilters, setOrderFilters] = useState({ ...DEFAULT_ORDER_FILTERS });

  // Notification Toast State
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch orders and wishlist stats
  const fetchData = async () => {
    try {
      setLoadingOrders(true);
      const ordersRes = await axios.get(`${API_BASE_URL}/orders.php`);
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      showToast('error', 'Failed to load order history.');
    } finally {
      setLoadingOrders(false);
    }

    try {
      const wishlistRes = await axios.get(`${API_BASE_URL}/wishlist.php`);
      if (wishlistRes.data.success) {
        setWishlistCount(wishlistRes.data.data.length);
      }
    } catch (err) {
      console.error('Error fetching wishlist count:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const [profRes, addrRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/profile.php`),
        axios.get(`${API_BASE_URL}/addresses.php`),
      ]);
      if (profRes.data.success) {
        const d = profRes.data.data;
        setProfile({ name: d.name || '', email: d.email || '', phone: d.phone || '' });
      }
      if (addrRes.data.success) {
        setShippingAddresses(addrRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      showToast('error', 'Failed to load profile settings.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/settings.php`);
      if (res.data.success) setSiteSettings(res.data.data);
    } catch (e) { /* optional */ }
  };

  const emptyAddressForm = () => ({
    id: null,
    label: 'Home',
    name: profile.name || '',
    phone: profile.phone || '',
    address: '',
    city: '',
    zip: '',
    is_default: shippingAddresses.length === 0,
  });

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm) return;
    setSavingAddress(true);
    try {
      let res;
      if (addressForm.id) {
        res = await axios.put(`${API_BASE_URL}/addresses.php?id=${addressForm.id}`, addressForm);
      } else {
        res = await axios.post(`${API_BASE_URL}/addresses.php`, addressForm);
      }
      if (res.data.success) {
        showToast('success', res.data.message);
        setAddressForm(null);
        const addrRes = await axios.get(`${API_BASE_URL}/addresses.php`);
        if (addrRes.data.success) setShippingAddresses(addrRes.data.data);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Remove this shipping address?')) return;
    try {
      const res = await axios.delete(`${API_BASE_URL}/addresses.php?id=${id}`);
      if (res.data.success) {
        showToast('success', res.data.message);
        const addrRes = await axios.get(`${API_BASE_URL}/addresses.php`);
        if (addrRes.data.success) setShippingAddresses(addrRes.data.data);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not delete address.');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/addresses.php?action=set_default`, { id });
      if (res.data.success) {
        showToast('success', res.data.message);
        const addrRes = await axios.get(`${API_BASE_URL}/addresses.php`);
        if (addrRes.data.success) setShippingAddresses(addrRes.data.data);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to set default.');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('error', 'This browser does not support notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      new Notification('FloraElegance — alerts on', {
        body: 'You will get updates when your order status changes.',
        tag: 'fe-customer-notify-on',
      });
      showToast('success', 'Order update notifications enabled.');
    } else if (permission === 'denied') {
      showToast('error', 'Notifications blocked. Enable them in browser site settings.');
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
    fetchProfile();
    fetchSiteSettings();
  }, [user]);

  useEffect(() => {
    const locked = Boolean(selectedOrder) || (loadingOrderDetail && !selectedOrder);
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedOrder, loadingOrderDetail]);

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/orders.php`);
        if (!res.data.success) return;
        const fresh = res.data.data;
        setOrders((prev) => {
          if (prev.length > 0) {
            const known = new Set(prev.map((o) => o.id));
            fresh.forEach((o) => {
              if (!known.has(o.id)) {
                new Notification('New order confirmed 📦', {
                  body: `${formatOrderNumber(o.id)} — ₹${o.total_amount}`,
                  tag: `cust-order-new-${o.id}`,
                });
              } else {
                const old = prev.find((p) => p.id === o.id);
                if (old && old.status !== o.status) {
                  new Notification('Order status updated', {
                    body: `${formatOrderNumber(o.id)} is now ${o.status}`,
                    tag: `cust-order-${o.id}-${o.status}`,
                  });
                }
              }
            });
          }
          return fresh;
        });
      } catch (e) { /* silent */ }
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Handle Profile Update Form Submission
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      showToast('error', 'Name is a required field.');
      return;
    }
    
    setUpdatingProfile(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/profile.php`, {
        name: profile.name,
        phone: profile.phone,
      });
      
      if (res.data.success) {
        // Sync updated details to localStorage so navbar displays updated name
        updateUser({ name: res.data.data.name });

        showToast('success', 'Profile updated successfully!');
      } else {
        showToast('error', res.data.message || 'Profile update failed.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Error occurred while updating profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Handle Password Change Form Submission
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!pwdForm.current_password || !pwdForm.new_password || !pwdForm.confirm_password) {
      showToast('error', 'Please fill in all password fields.');
      return;
    }

    if (pwdForm.new_password !== pwdForm.confirm_password) {
      showToast('error', 'New passwords do not match.');
      return;
    }

    if (pwdForm.new_password.length < 6) {
      showToast('error', 'Password must be at least 6 characters long.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/profile.php`, {
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        zip: profile.zip,
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password
      });

      if (res.data.success) {
        showToast('success', 'Password changed successfully!');
        setPwdForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        showToast('error', res.data.message || 'Failed to change password.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Incorrect current password or update failed.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Fetch Specific Order Detail for Modal
  const handleViewOrder = async (orderId) => {
    setLoadingOrderDetail(true);
    setSelectedOrder(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/orders.php`, { params: { id: orderId } });
      if (res.data.success) {
        setSelectedOrder(res.data.data);
      } else {
        showToast('error', 'Could not load package details.');
      }
    } catch (err) {
      showToast('error', 'Failed to retrieve order details.');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleLogoutClick = () => {
    logout();
    navigate('/');
  };

  // Helper: Format Dates
  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const filteredOrders = useMemo(() => filterOrders(orders, orderFilters), [orders, orderFilters]);

  const orderStats = useMemo(() => ({
    pending: orders.filter((o) => o.status === 'pending').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    failed: orders.filter((o) => o.status === 'failed').length,
  }), [orders]);

  const getProgressWidth = (order) => {
    if (order.status === 'failed') return '0%';
    if (order.status === 'pending') return '12%';
    if (order.status === 'paid') return '40%';
    if (order.status === 'shipped') return '72%';
    if (order.status === 'delivered') return '100%';
    return '0%';
  };

  const isStepDone = (order, step) => {
    const s = order.status;
    if (step === 'placed') return true;
    if (step === 'paid') return ['paid', 'shipped', 'delivered'].includes(s);
    if (step === 'shipped') return ['shipped', 'delivered'].includes(s);
    if (step === 'delivered') return s === 'delivered';
    return false;
  };

  // Helper: Status badge color picker
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 uppercase">Paid</span>;
      case 'shipped':
        return <span className="px-3 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 uppercase">Shipped</span>;
      case 'delivered':
        return <span className="px-3 py-1 text-xs font-bold bg-teal-100 text-teal-800 rounded-full border border-teal-200 uppercase">Delivered</span>;
      case 'failed':
        return <span className="px-3 py-1 text-xs font-bold bg-rose-50 text-rose-700 rounded-full border border-rose-100 uppercase">Failed</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-100 uppercase">Pending</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-xl border animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-red-50 text-red-800 border-red-100'
        }`}>
          <div className={`h-2.5 w-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Grid Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 flex flex-col space-y-3 bg-white p-6 rounded-3xl card-premium-shadow border border-slate-100 h-fit">
          
          <div className="flex items-center space-x-3 pb-6 mb-4 border-b border-slate-100">
            <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg uppercase shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-slate-800 text-md truncate">{user?.name}</h4>
              <p className="text-slate-400 text-xs truncate capitalize">{user?.role} Account</p>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'overview' 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-primary-600'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Account Overview</span>
          </button>

          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'orders' 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-primary-600'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>My Orders</span>
            {orders.length > 0 && (
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-700 border border-primary-100'
              }`}>
                {orders.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-primary-600'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Profile & Addresses</span>
          </button>

          {notificationPermission !== 'granted' ? (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 cursor-pointer"
            >
              <Bell className="h-4 w-4 shrink-0" />
              <span>Enable order alerts</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700">
              <Bell className="h-3.5 w-3.5" />
              <span>Notifications active</span>
            </div>
          )}

          <Link 
            to="/wishlist"
            className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-all"
          >
            <Heart className="h-4 w-4" />
            <span>Wishlist</span>
            {wishlistCount > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded-full">
                {wishlistCount}
              </span>
            )}
          </Link>

          {isAdmin() && (
            <Link 
              to="/admin"
              className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-left text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-all border border-emerald-100/50 bg-emerald-50/20"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
          )}

          <button 
            onClick={handleLogoutClick}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-all border-t border-slate-100 pt-6 mt-4 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>

        </div>

        {/* Content Body */}
        <div className="lg:col-span-3">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              
              {/* Welcome Card */}
              <div className="bg-gradient-to-r from-primary-800 to-primary-600 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                {/* Background decorative vector */}
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
                  <ShoppingCart className="h-96 w-96 text-white" />
                </div>
                
                <div className="relative z-10 max-w-xl">
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/25">Welcome Back</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">Hello, {user?.name}!</h2>
                  <p className="mt-3 text-primary-100 text-sm leading-relaxed">
                    Welcome to your personal green gardening dashboard. Check order logistics, manage your home delivery address, or add rare specimens to your collection!
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Stat 1: Total Orders */}
                <div className="bg-white p-6 rounded-3xl card-premium-shadow border border-slate-100 flex items-center space-x-4">
                  <div className="h-12 w-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Purchases</h5>
                    <p className="text-2xl font-extrabold text-slate-800 mt-1">{orders.length}</p>
                  </div>
                </div>

                {/* Stat 2: Wishlist Item Count */}
                <div className="bg-white p-6 rounded-3xl card-premium-shadow border border-slate-100 flex items-center space-x-4">
                  <div className="h-12 w-12 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600">
                    <Heart className="h-6 w-6 fill-pink-50" />
                  </div>
                  <div>
                    <h5 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Wishlisted Plants</h5>
                    <p className="text-2xl font-extrabold text-slate-800 mt-1">{wishlistCount}</p>
                  </div>
                </div>

                {/* Stat 3: Active Cart Count */}
                <div className="bg-white p-6 rounded-3xl card-premium-shadow border border-slate-100 flex items-center space-x-4">
                  <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cart Items</h5>
                    <p className="text-2xl font-extrabold text-slate-800 mt-1">{cartCount}</p>
                  </div>
                </div>

              </div>

              {/* Quick Actions Panel */}
              <div className="bg-white rounded-3xl p-8 card-premium-shadow border border-slate-100">
                <h3 className="font-bold text-slate-800 text-xl mb-6">Quick Portal Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  
                  <Link 
                    to="/shop" 
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-primary-50 rounded-2xl border border-slate-100 hover:border-primary-100 transition-all font-semibold text-slate-700 hover:text-primary-700"
                  >
                    <span>Browse Premium Plants</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link 
                    to="/cart" 
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-primary-50 rounded-2xl border border-slate-100 hover:border-primary-100 transition-all font-semibold text-slate-700 hover:text-primary-700"
                  >
                    <span>Checkout Active Cart</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button 
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-primary-50 rounded-2xl border border-slate-100 hover:border-primary-100 transition-all font-semibold text-slate-700 hover:text-primary-700 cursor-pointer"
                  >
                    <span>Update Shipping Address</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-white rounded-3xl p-8 card-premium-shadow border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 text-xl">Recent Orders</h3>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="text-primary-600 hover:text-primary-700 text-sm font-bold flex items-center space-x-1 transition-all"
                  >
                    <span>See All History</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {loadingOrders ? (
                  <div className="flex justify-center py-6">
                    <Clock className="h-6 w-6 text-primary-500 animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm font-medium mb-4">No recent orders found.</p>
                    <Link to="/shop" className="text-sm text-primary-600 hover:underline font-bold">Start Shopping &rarr;</Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider pb-3">
                          <th className="py-3">Order ID</th>
                          <th className="py-3">Date</th>
                          <th className="py-3">Amount</th>
                          <th className="py-3">Status</th>
                          <th className="py-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                        {orders.slice(0, 3).map(o => (
                          <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 font-bold text-slate-800">{formatOrderNumber(o.id)}</td>
                            <td className="py-4 text-slate-500">{formatDate(o.created_at)}</td>
                            <td className="py-4 font-extrabold text-slate-900">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</td>
                            <td className="py-4">{getStatusBadge(o.status)}</td>
                            <td className="py-4 text-right">
                              <button 
                                onClick={() => handleViewOrder(o.id)}
                                className="inline-flex items-center space-x-1.5 text-primary-600 hover:text-primary-700 font-bold bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-all text-xs cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: MY ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 card-premium-shadow border border-slate-100">
                <div className="mb-6">
                  <h3 className="font-bold text-slate-800 text-2xl">My Orders</h3>
                  <p className="text-slate-400 text-sm mt-1">Track delivery, payment status, and open full package inspection.</p>
                </div>

                {!loadingOrders && orders.length > 0 && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                      {[
                        { label: 'Pending', count: orderStats.pending, color: 'amber' },
                        { label: 'Paid', count: orderStats.paid, color: 'emerald' },
                        { label: 'Shipped', count: orderStats.shipped, color: 'indigo' },
                        { label: 'Delivered', count: orderStats.delivered, color: 'teal' },
                        { label: 'Failed', count: orderStats.failed, color: 'rose' },
                      ].map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => setOrderFilters({ ...orderFilters, status: orderFilters.status === s.label.toLowerCase() ? '' : s.label.toLowerCase() })}
                          className={`rounded-2xl border p-3 text-center transition-all ${
                            orderFilters.status === s.label.toLowerCase()
                              ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                              : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                          }`}
                        >
                          <p className="text-lg font-black text-slate-800">{s.count}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search order ID..."
                          value={orderFilters.search}
                          onChange={(e) => setOrderFilters({ ...orderFilters, search: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-primary-500 bg-white"
                        />
                      </div>
                      <select
                        value={orderFilters.status}
                        onChange={(e) => setOrderFilters({ ...orderFilters, status: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary-500"
                      >
                        {ORDER_STATUS_OPTIONS.map((o) => (
                          <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <select
                        value={orderFilters.payment}
                        onChange={(e) => setOrderFilters({ ...orderFilters, payment: e.target.value })}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary-500"
                      >
                        <option value="">All payments</option>
                        <option value="online">Online</option>
                        <option value="cod">COD</option>
                      </select>
                      {(orderFilters.status || orderFilters.search || orderFilters.payment) && (
                        <button
                          type="button"
                          onClick={() => setOrderFilters({ ...DEFAULT_ORDER_FILTERS })}
                          className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-100"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-400 mb-4 flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Showing {filteredOrders.length} of {orders.length} orders
                    </p>
                  </>
                )}

                {loadingOrders ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
                    <p className="text-slate-500 text-sm font-semibold">Loading your orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="h-16 w-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingBag className="h-8 w-8 text-primary-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2">No orders yet</h4>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">Start your plant collection — we deliver healthy greens to your door.</p>
                    <Link to="/shop" className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3 rounded-full shadow-md transition-all">Shop Plants</Link>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 font-semibold text-sm">No orders match your filters.</div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((o) => {
                      const pay = getPaymentMethod(o);
                      return (
                        <div
                          key={o.id}
                          className="bg-slate-50/80 hover:bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 hover:border-primary-100 hover:shadow-md transition-all"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1 space-y-3 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-lg font-mono">{formatOrderNumber(o.id)}</span>
                                {getStatusBadge(o.status)}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${pay === 'cod' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                                  {pay === 'cod' ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                                  {pay === 'cod' ? 'COD' : 'Online'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(o.created_at)}
                              </p>
                              <div className="flex items-start gap-2 text-xs text-slate-600">
                                <MapPin className="h-3.5 w-3.5 text-primary-600 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{o.address}, {o.city} — {o.zip}</span>
                              </div>
                              {o.tracking_number && (
                                <p className="text-[10px] font-bold text-indigo-700 bg-indigo-50 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-100">
                                  <Truck className="h-3 w-3" />
                                  {o.tracking_carrier || 'Courier'}: {o.tracking_number}
                                  {o.tracking_status ? ` · ${o.tracking_status}` : ''}
                                </p>
                              )}
                              {o.status !== 'failed' && (
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-xs">
                                  <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: getProgressWidth(o) }} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0">
                              <div className="text-left lg:text-right">
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
                                <span className="text-2xl font-black text-slate-900">₹{parseFloat(o.total_amount).toLocaleString('en-IN')}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleViewOrder(o.id)}
                                disabled={loadingOrderDetail}
                                className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all disabled:opacity-60"
                              >
                                <Eye className="h-4 w-4" />
                                Inspect Package
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE & SHIPPING ADDRESSES */}
          {activeTab === 'profile' && (
            <div className="space-y-8">

              {notificationPermission !== 'granted' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900 text-sm">Browser order notifications</p>
                      <p className="text-xs text-amber-800/80 mt-1">Get alerts when your order is shipped, delivered, or status changes.</p>
                    </div>
                  </div>
                  <button type="button" onClick={requestNotificationPermission} className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-full">
                    Enable notifications
                  </button>
                </div>
              )}
              
              <div className="bg-white rounded-3xl p-8 card-premium-shadow border border-slate-100">
                <div className="mb-8">
                  <h3 className="font-bold text-slate-800 text-2xl">Account profile</h3>
                  <p className="text-slate-400 text-sm mt-1">Your name and contact number used across orders.</p>
                </div>

                {loadingProfile ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-3 h-5 w-5 text-slate-400" />
                          <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="John Doe" className="w-full bg-slate-50 text-slate-800 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary-500 font-semibold shadow-inner" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email (locked)</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <input type="email" value={profile.email} readOnly disabled className="w-full bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 font-semibold cursor-not-allowed" />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2 max-w-md">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-3 h-5 w-5 text-slate-400" />
                          <input type="text" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98765 43210" className="w-full bg-slate-50 text-slate-800 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary-500 font-semibold shadow-inner" />
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={updatingProfile} className="inline-flex items-center gap-2 text-white bg-primary-600 hover:bg-primary-700 font-bold px-8 py-3.5 rounded-2xl shadow-md disabled:opacity-60">
                      <Save className="h-4 w-4" />
                      <span>{updatingProfile ? 'Saving...' : 'Save profile'}</span>
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-white rounded-3xl p-8 card-premium-shadow border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-bold text-slate-800 text-2xl">Shipping addresses</h3>
                    <p className="text-slate-400 text-sm mt-1">Save multiple delivery addresses. Mark one as default for faster checkout.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddressForm(emptyAddressForm())}
                    className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add address
                  </button>
                </div>

                {loadingProfile ? (
                  <Loader2 className="h-6 w-6 text-primary-500 animate-spin mx-auto" />
                ) : shippingAddresses.length === 0 && !addressForm ? (
                  <p className="text-center text-slate-400 text-sm py-8 font-semibold">No shipping addresses yet. Add your first delivery address.</p>
                ) : (
                  <div className="space-y-4">
                    {shippingAddresses.map((addr) => (
                      <div key={addr.id} className={`rounded-2xl border p-5 ${addr.is_default == 1 ? 'border-primary-300 bg-primary-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-extrabold text-slate-900">{addr.label}</span>
                              {addr.is_default == 1 && (
                                <span className="text-[9px] font-black uppercase bg-primary-600 text-white px-2 py-0.5 rounded-full">Default</span>
                              )}
                            </div>
                            <p className="font-bold text-slate-800 text-sm">{addr.name} · {addr.phone}</p>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{addr.address}, {addr.city} — {addr.zip}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {addr.is_default != 1 && (
                              <button type="button" onClick={() => handleSetDefaultAddress(addr.id)} className="text-[10px] font-bold text-primary-700 bg-white border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50">
                                Set default
                              </button>
                            )}
                            <button type="button" onClick={() => setAddressForm({ ...addr, is_default: addr.is_default == 1 })} className="text-[10px] font-bold text-slate-600 bg-white border px-3 py-1.5 rounded-lg hover:bg-slate-100">
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDeleteAddress(addr.id)} className="text-[10px] font-bold text-rose-600 bg-white border border-rose-100 px-3 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-1">
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {addressForm && (
                  <form onSubmit={handleSaveAddress} className="mt-6 p-6 border-2 border-dashed border-primary-200 rounded-2xl bg-primary-50/30 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">{addressForm.id ? 'Edit address' : 'New shipping address'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Label</label>
                        <select value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-bold">
                          <option>Home</option>
                          <option>Office</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Receiver name</label>
                        <input required type="text" value={addressForm.name} onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })} className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-semibold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Phone</label>
                        <input type="text" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-semibold" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Street address</label>
                        <textarea required rows={2} value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-semibold resize-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                        <input required type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-semibold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">ZIP / Postal</label>
                        <input required type="text" value={addressForm.zip} onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })} className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-semibold" />
                      </div>
                      <label className="sm:col-span-2 flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })} className="accent-primary-600" />
                        Set as default shipping address
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingAddress} className="bg-primary-600 text-white font-bold text-xs px-5 py-2.5 rounded-full disabled:opacity-60">
                        {savingAddress ? 'Saving...' : 'Save address'}
                      </button>
                      <button type="button" onClick={() => setAddressForm(null)} className="bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-full">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Password credentials panel */}
              <div className="bg-white rounded-3xl p-8 card-premium-shadow border border-slate-100">
                <div className="mb-8">
                  <h3 className="font-bold text-slate-800 text-2xl">Modify Security Password</h3>
                  <p className="text-slate-400 text-sm mt-1">Upgrade your account key values to protect purchase history data details.</p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
                  
                  {/* Current password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Security Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3 h-5 w-5 text-slate-400" />
                      <input 
                        type="password" 
                        value={pwdForm.current_password}
                        onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                        placeholder="••••••••" 
                        className="w-full bg-slate-50 text-slate-800 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 outline-none focus:bg-white focus:border-primary-500 transition-all font-semibold shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* New password */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3 h-5 w-5 text-slate-400" />
                        <input 
                          type="password" 
                          value={pwdForm.new_password}
                          onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                          placeholder="Min 6 chars" 
                          className="w-full bg-slate-50 text-slate-800 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 outline-none focus:bg-white focus:border-primary-500 transition-all font-semibold shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Confirm new password */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3 h-5 w-5 text-slate-400" />
                        <input 
                          type="password" 
                          value={pwdForm.confirm_password}
                          onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                          placeholder="Re-type new password" 
                          className="w-full bg-slate-50 text-slate-800 border border-slate-100 rounded-2xl pl-12 pr-4 py-3 outline-none focus:bg-white focus:border-primary-500 transition-all font-semibold shadow-inner"
                        />
                      </div>
                    </div>

                  </div>

                  <button 
                    type="submit" 
                    disabled={changingPassword}
                    className="inline-flex items-center space-x-2 text-white bg-slate-800 hover:bg-slate-900 disabled:bg-slate-600 font-bold px-8 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                    <span>{changingPassword ? 'Updating credentials...' : 'Update Password'}</span>
                  </button>

                </form>
              </div>

            </div>
          )}

        </div>

      </div>

      {(loadingOrderDetail && !selectedOrder) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" aria-hidden />
          <div className="relative bg-white rounded-2xl px-8 py-6 flex flex-col items-center shadow-xl">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-600">Loading package details...</p>
          </div>
        </div>
      )}

      {/* INSPECT PACKAGE — centered modal, scroll inside panel only */}
      {selectedOrder && (() => {
        const inspPay = getPaymentMethod(selectedOrder);
        const isCod = inspPay === 'cod';
        return (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
            aria-hidden
          />
          <div
            className="relative z-10 flex flex-col w-full max-w-2xl max-h-[min(90vh,calc(100dvh-2rem))] rounded-[28px] bg-white shadow-2xl border border-slate-100 overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-6 sm:px-8 py-5 border-b border-slate-100 bg-white flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Inspect Package</p>
                <h3 className="font-extrabold text-slate-900 text-xl font-mono">{formatOrderNumber(selectedOrder.id)}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {getStatusBadge(selectedOrder.status)}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${isCod ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                    {isCod ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                    {isCod ? 'Cash on Delivery' : 'Paid Online'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-1">Ordered {formatDate(selectedOrder.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedOrder.status === 'delivered' && (
                  <button
                    type="button"
                    onClick={() => generateInvoice(selectedOrder, siteSettings)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-xl shadow-sm"
                  >
                    <DownloadCloud className="h-4 w-4" />
                    Invoice
                  </button>
                )}
                <button type="button" onClick={() => setSelectedOrder(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6">
              
              {/* Delivery journey */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary-600" />
                  Delivery Journey
                </h4>
                {selectedOrder.status === 'failed' ? (
                  <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-800 text-sm font-semibold">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>Payment failed or was cancelled. Please try checkout again or contact support.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 text-center text-xs relative pt-2 pb-2">
                    <div className="absolute left-[12%] right-[12%] top-5 h-1 bg-slate-100 rounded-full">
                      <div className="h-full bg-primary-600 rounded-full transition-all duration-500" style={{ width: getProgressWidth(selectedOrder) }} />
                    </div>
                    {[
                      { key: 'placed', label: 'Placed', sub: 'Confirmed' },
                      { key: 'paid', label: isCod ? 'COD' : 'Paid', sub: isCod && selectedOrder.status === 'pending' ? 'On delivery' : isCod ? 'Collected' : 'Secured' },
                      { key: 'shipped', label: 'Shipped', sub: 'In transit' },
                      { key: 'delivered', label: 'Delivered', sub: 'At home' },
                    ].map((step, i) => (
                      <div key={step.key} className="flex flex-col items-center z-10">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm ${
                          isStepDone(selectedOrder, step.key) ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>
                          {isStepDone(selectedOrder, step.key) ? (
                            step.key === 'shipped' ? <Truck className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />
                          ) : (
                            <span className="text-[10px] font-bold">{i + 1}</span>
                          )}
                        </div>
                        <span className={`font-bold mt-2 ${isStepDone(selectedOrder, step.key) ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</span>
                        <span className="text-[10px] text-slate-400">{step.sub}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer address */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  Delivery Address
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Receiver</p>
                    <p className="font-bold text-slate-900">{selectedOrder.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Phone</p>
                    <p className="font-bold text-slate-900">{selectedOrder.phone}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Full address</p>
                    <p className="font-semibold text-slate-800 leading-relaxed">{selectedOrder.address}, {selectedOrder.city} — {selectedOrder.zip}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Email</p>
                    <p className="font-semibold text-slate-700">{selectedOrder.email}</p>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  {isCod ? <Banknote className="h-4 w-4 text-amber-600" /> : <CreditCard className="h-4 w-4 text-blue-600" />}
                  Payment Method
                </h4>
                {isCod ? (
                  <div className="text-sm">
                    <p className="font-bold text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      Cash on Delivery — pay ₹{parseFloat(selectedOrder.total_amount).toLocaleString('en-IN')} when your package arrives.
                    </p>
                    {selectedOrder.status === 'pending' && (
                      <p className="text-xs text-slate-500 mt-2 font-semibold">Your order is confirmed. Payment will be collected at delivery.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-xs font-mono">
                    <p className="font-sans font-bold text-slate-800 text-sm mb-2">Paid securely via Razorpay</p>
                    <div className="bg-white border rounded-lg px-3 py-2 text-slate-600">
                      <span className="text-slate-400 font-sans font-semibold">Order ID: </span>
                      {selectedOrder.razorpay_order_id || 'Processing'}
                    </div>
                    <div className="bg-white border rounded-lg px-3 py-2 text-slate-600">
                      <span className="text-slate-400 font-sans font-semibold">Payment ID: </span>
                      {selectedOrder.razorpay_payment_id || (selectedOrder.status === 'pending' ? 'Awaiting payment' : '—')}
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery tracking */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-600" />
                  Delivery Tracking
                </h4>
                {selectedOrder.tracking_number ? (
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Tracking number</p>
                      <p className="font-mono font-bold text-indigo-900">{selectedOrder.tracking_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Carrier</p>
                      <p className="font-bold text-slate-800">{selectedOrder.tracking_carrier || 'Standard courier'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Status</p>
                      <p className="font-bold text-indigo-800">{selectedOrder.tracking_status || 'In progress'}</p>
                    </div>
                    {selectedOrder.tracking_updated_at && (
                      <p className="sm:col-span-2 text-[10px] text-slate-500">
                        Last updated: {new Date(selectedOrder.tracking_updated_at).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 font-semibold">
                    {selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered'
                      ? 'Tracking details will appear here once assigned by our nursery team.'
                      : 'Tracking will be available after your order is shipped.'}
                  </p>
                )}
              </div>

              {/* Product list */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary-600" />
                  Products in this package
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                  {selectedOrder.items?.length ? selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl object-cover border border-slate-100 shrink-0"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&w=600&q=80'; }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.size} · Qty {item.quantity}</p>
                          <p className="text-xs text-slate-500">₹{parseFloat(item.price).toLocaleString('en-IN')} each</p>
                        </div>
                      </div>
                      <span className="font-black text-slate-900 shrink-0">
                        ₹{(parseFloat(item.price) * parseInt(item.quantity, 10)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )) : (
                    <p className="p-6 text-center text-slate-400 text-sm">No line items found.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Order total</span>
                <span className="text-2xl font-black text-primary-700">₹{parseFloat(selectedOrder.total_amount).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setSelectedOrder(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-full text-xs">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
};

export default CustomerDashboard;
