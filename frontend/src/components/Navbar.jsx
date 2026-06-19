import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, LogOut, Leaf, Shield, Menu, X, ChevronDown, Heart, Package, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [megaMenuLinks, setMegaMenuLinks] = useState([]);
  const [settings, setSettings] = useState({});
  const [timeLeft, setTimeLeft] = useState('');

  const fetchMegaMenuLinks = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/mega_menu.php`);
      if (res.data.success) {
        setMegaMenuLinks(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching mega menu links:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/settings.php`);
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching settings for navbar:', err);
    }
  };

  useEffect(() => {
    fetchMegaMenuLinks();
    fetchSettings();
  }, [location.pathname]);

  useEffect(() => {
    if (!settings.offer_bar_countdown || settings.offer_bar_countdown.trim() === '') {
      setTimeLeft('');
      return;
    }
    const target = new Date(settings.offer_bar_countdown).getTime();
    if (isNaN(target)) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [settings.offer_bar_countdown]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full glass shadow-sm transition-all duration-300">
      {/* Sticky Offer Bar */}
      {settings.offer_bar_show === '1' && (
        <div className="bg-primary-950 text-emerald-100 py-2 px-4 text-xs font-semibold text-center flex items-center justify-center flex-wrap gap-2 border-b border-primary-800 tracking-wide font-sans">
          <span>{settings.offer_bar_text}</span>
          {timeLeft && timeLeft !== 'Expired' && (
            <span className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono animate-pulse tracking-widest font-bold">
              ENDS IN: {timeLeft}
            </span>
          )}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 text-primary-700 hover:text-primary-800 transition-colors">
            <Leaf className="h-8 w-8 text-primary-600 animate-bounce-slow" />
            <span className="font-extrabold text-2xl tracking-tight font-sans">
              Flora<span className="text-primary-500 font-light">Elegance</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold tracking-wide">
            <Link 
              to="/" 
              className={`${isActive('/') ? 'text-primary-700 font-extrabold border-b-2 border-primary-600' : 'text-slate-600 hover:text-primary-600'} transition-all duration-200 py-2 inline-flex items-center`}
            >
              Home
            </Link>
            <div 
              className="relative py-2 flex items-center"
              onMouseEnter={() => {
                setMegaMenuOpen(true);
                fetchMegaMenuLinks();
              }}
              onMouseLeave={() => setMegaMenuOpen(false)}
            >
              <button 
                onClick={() => {
                  navigate('/shop');
                  setMegaMenuOpen(false);
                }}
                className={`flex items-center space-x-1 ${isActive('/shop') ? 'text-primary-700 font-extrabold border-b-2 border-primary-600' : 'text-slate-600 hover:text-primary-600'} transition-all duration-200 py-0 cursor-pointer font-semibold outline-none`}
              >
                <span>Shop</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${megaMenuOpen ? 'rotate-180 text-primary-600' : 'text-slate-400'}`} />
              </button>

              {/* MEGA MENU DRAWER CONTAINER */}
              {megaMenuOpen && megaMenuLinks.length > 0 && (() => {
                const grouped = megaMenuLinks.reduce((acc, link) => {
                  if (!acc[link.category_group]) {
                    acc[link.category_group] = [];
                  }
                  acc[link.category_group].push(link);
                  return acc;
                }, {});
                const uniqueGroupsCount = Object.keys(grouped).length;
                return (
                  <div 
                    className="absolute top-[100%] left-[50%] -translate-x-[50%] bg-white rounded-[28px] shadow-xl border border-slate-100 p-8 grid gap-6 z-50 animate-fade-in text-left transition-all duration-300"
                    style={{ 
                      width: `${Math.max(220, uniqueGroupsCount * 220)}px`,
                      gridTemplateColumns: `repeat(${uniqueGroupsCount}, minmax(0, 1fr))` 
                    }}
                  >
                    {Object.entries(grouped).map(([groupName, groupLinks]) => (
                      <div key={groupName} className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-700 border-b border-primary-100 pb-1.5">{groupName}</h4>
                        <ul className="space-y-2.5">
                          {groupLinks.map((item) => (
                            <li key={item.id}>
                              <Link 
                                to={item.url}
                                onClick={() => setMegaMenuOpen(false)}
                                className="text-xs text-slate-600 hover:text-primary-600 hover:pl-1 transition-all duration-200 font-semibold block"
                              >
                                {item.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <Link 
              to="/contact" 
              className={`${isActive('/contact') ? 'text-primary-700 font-extrabold border-b-2 border-primary-600' : 'text-slate-600 hover:text-primary-600'} transition-all duration-200 py-2 inline-flex items-center`}
            >
              Contact
            </Link>
            {isAdmin() && (
              <Link 
                to="/admin" 
                className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-full transition-all border border-emerald-200 shadow-sm"
              >
                <Shield className="h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            )}
          </nav>

          {/* Search, Cart, User Icons */}
          <div className="hidden md:flex items-center space-x-6">
            
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search premium plants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-800 placeholder-slate-400 pl-4 pr-10 py-2 rounded-full border border-transparent focus:border-primary-500 outline-none text-sm transition-all duration-300 shadow-inner"
              />
              <button type="submit" className="absolute right-3 top-2.5 text-slate-400 hover:text-primary-600 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* Cart Icon */}
            <Link to="/cart" className="relative p-2.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all duration-300">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Login/Dropdown */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 text-slate-700 hover:text-primary-600 font-semibold focus:outline-none bg-slate-50 hover:bg-slate-100 py-1.5 px-3 rounded-full border border-slate-200 transition-all cursor-pointer"
                >
                  <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm truncate max-w-[100px]">{user?.name?.split(' ')[0] || 'User'}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-xl py-2 border border-slate-100 z-20 overflow-hidden transform origin-top-right transition-all animate-fade-in">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-xs text-slate-400 font-medium">Logged in as</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
                        {isAdmin() && <span className="inline-block mt-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Administrator</span>}
                      </div>
                      
                      <Link 
                        to="/shop" 
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                      >
                        <Leaf className="h-4 w-4" />
                        <span>Browse Plants</span>
                      </Link>

                      <Link 
                        to="/dashboard" 
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors font-medium"
                      >
                        <User className="h-4 w-4" />
                        <span>My Dashboard</span>
                      </Link>

                      <Link 
                        to="/wishlist" 
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors font-medium"
                      >
                        <Heart className="h-4 w-4" />
                        <span>My Wishlist</span>
                      </Link>

                      {isAdmin() && (
                        <Link 
                          to="/admin" 
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors font-semibold"
                        >
                          <Shield className="h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}

                      
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left border-t border-slate-100 font-medium"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link 
                to="/auth" 
                className="flex items-center space-x-2 text-white bg-primary-600 hover:bg-primary-700 px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
              >
                <User className="h-4 w-4" />
                <span>Join / Log In</span>
              </Link>
            )}

          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-4">
            {/* Mobile Cart */}
            <Link to="/cart" className="relative p-2 text-slate-600">
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-primary-600 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-4 pb-6 space-y-4 shadow-lg animate-fade-in">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search premium plants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 pl-4 pr-10 py-2.5 rounded-full border border-slate-200 outline-none text-sm"
            />
            <button type="submit" className="absolute right-3 top-3 text-slate-400">
              <Search className="h-4 w-4" />
            </button>
          </form>

          <nav className="flex flex-col space-y-3 font-semibold text-slate-700">
            <Link 
              to="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-primary-600 transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/shop" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-primary-600 transition-colors"
            >
              Shop Plants
            </Link>
            <Link 
              to="/categories" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-primary-600 transition-colors"
            >
              Categories
            </Link>
            <Link 
              to="/track-order" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-primary-600 transition-colors flex items-center gap-2"
            >
              <Truck className="h-4 w-4" />
              Track Order
            </Link>
            <Link 
              to="/contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-primary-600 transition-colors"
            >
              Contact Us
            </Link>
            {isAdmin() && (
              <Link 
                to="/admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100"
              >
                <Shield className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </Link>
            )}
            
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-primary-600 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>My Dashboard</span>
                </Link>
                <Link 
                  to="/wishlist" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-primary-600 transition-colors"
                >
                  <Heart className="h-4 w-4 text-slate-400" />
                  <span>My Wishlist</span>
                </Link>
                <div className="px-3 py-2 border-t border-slate-100 flex items-center space-x-3 text-sm text-slate-500">
                  <div className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span>{user.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link 
                to="/auth" 
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center space-x-2 text-white bg-primary-600 hover:bg-primary-700 px-6 py-2.5 rounded-full text-sm font-bold shadow-md"
              >
                <User className="h-4 w-4" />
                <span>Log In / Register</span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
