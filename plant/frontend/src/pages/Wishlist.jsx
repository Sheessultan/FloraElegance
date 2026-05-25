import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Heart, ShoppingCart, Trash2, ArrowRight, Eye, Star, Sparkles, Loader } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Wishlist = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores product_id of action in progress
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', text: '' }

  // Fetch wishlist items
  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/wishlist.php`);
      if (response.data.success) {
        setWishlist(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      showNotification('error', 'Failed to load your wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const showNotification = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Add to cart handler
  const handleAddToCart = async (product) => {
    setActionLoading(product.id);
    try {
      const res = await addToCart(product, 1);
      if (res.success) {
        showNotification('success', `"${product.name}" added to cart!`);
      } else {
        showNotification('error', res.message);
      }
    } catch (err) {
      showNotification('error', 'Failed to add item to cart.');
    } finally {
      setActionLoading(null);
    }
  };

  // Remove from wishlist
  const handleRemove = async (productId, productName) => {
    setActionLoading(productId);
    try {
      const response = await axios.delete(`${API_BASE_URL}/wishlist.php`, {
        params: { product_id: productId }
      });
      if (response.data.success) {
        setWishlist(prev => prev.filter(item => item.id !== productId));
        showNotification('success', `"${productName}" removed from your wishlist.`);
      } else {
        showNotification('error', response.data.message);
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to remove product.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-slate-50/50 py-12">
        <Loader className="h-10 w-10 text-primary-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Gathering your green favorites...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-xl transition-all duration-300 border animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-red-50 text-red-800 border-red-100'
        }`}>
          <div className={`h-2.5 w-2.5 rounded-full ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-sm font-semibold">{notification.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-primary-100/50 text-primary-800 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm border border-primary-100">
          <Sparkles className="h-3.5 w-3.5 text-primary-600 animate-pulse" />
          <span>My Green Sanctuary</span>
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
          Your Personal <span className="text-primary-600 font-light">Wishlist</span>
        </h1>
        <p className="text-slate-500 text-md sm:text-lg leading-relaxed">
          Keep track of premium indoor foliage, outdoor beauties, and rare specimens waiting to join your garden.
        </p>
      </div>

      {wishlist.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center max-w-xl mx-auto card-premium-shadow border border-slate-100">
          <div className="h-20 w-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce-slow">
            <Heart className="h-10 w-10 text-primary-600 fill-primary-100" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Your wishlist is empty</h3>
          <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
            Explore our curated catalog of air-purifying, low-maintenance, and rare exotic plants to populate your sanctuary.
          </p>
          <Link 
            to="/shop" 
            className="inline-flex items-center space-x-2 text-white bg-primary-600 hover:bg-primary-700 font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <span>Explore Plants</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        /* Wishlist Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {wishlist.map(item => (
            <div 
              key={item.id} 
              className="group bg-white rounded-3xl overflow-hidden card-premium-shadow border border-slate-100 flex flex-col relative transition-all duration-300 hover:-translate-y-1.5"
            >
              
              {/* Care Level Badge on Card */}
              <span className={`absolute top-4 left-4 z-10 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm ${
                item.care_level === 'Easy' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                  : item.care_level === 'Moderate' 
                  ? 'bg-amber-50 text-amber-800 border border-amber-100' 
                  : 'bg-rose-50 text-rose-800 border border-rose-100'
              }`}>
                {item.care_level}
              </span>

              {/* Sale Badge */}
              {item.selling_price && parseFloat(item.selling_price) > 0 && parseFloat(item.selling_price) < parseFloat(item.price) && (
                <span className="absolute top-14 left-4 z-10 bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-sm">
                  -{Math.round(((parseFloat(item.price) - parseFloat(item.selling_price)) / parseFloat(item.price)) * 100)}% OFF
                </span>
              )}

              {/* Delete Heart Button */}
              <button 
                disabled={actionLoading === item.id}
                onClick={() => handleRemove(item.id, item.name)}
                className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 shadow-md transition-all duration-200 cursor-pointer"
                title="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Product Image */}
              <div className="relative h-64 w-full bg-slate-100 overflow-hidden hover-zoom">
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="h-full w-full object-cover transition-transform"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                  <Link 
                    to={`/product/${item.id}`} 
                    className="inline-flex items-center space-x-1.5 bg-white text-slate-800 px-4 py-2 rounded-full text-xs font-bold shadow-md hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Quick View</span>
                  </Link>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  {/* Rating and Size */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold">{item.size} Size</span>
                    <div className="flex items-center space-x-1 font-bold text-amber-500">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <span>{parseFloat(item.rating).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Plant Name */}
                  <h4 className="font-bold text-lg text-slate-800 group-hover:text-primary-700 transition-colors mb-2 truncate">
                    {item.name}
                  </h4>
                  
                  {/* Price */}
                  {item.selling_price && parseFloat(item.selling_price) > 0 && parseFloat(item.selling_price) < parseFloat(item.price) ? (
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-xl font-extrabold text-rose-605 text-rose-600">₹{parseFloat(item.selling_price).toLocaleString('en-IN')}</span>
                      <span className="text-xs text-slate-400 line-through font-bold">₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                    </div>
                  ) : (
                    <p className="text-xl font-extrabold text-slate-900">
                      ₹{parseFloat(item.price).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center space-x-2">
                  {item.stock > 0 ? (
                    <button 
                      disabled={actionLoading === item.id}
                      onClick={() => handleAddToCart(item)}
                      className="w-full flex items-center justify-center space-x-2 text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 font-bold py-3 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                    >
                      {actionLoading === item.id ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full text-center text-xs font-bold text-red-500 bg-red-50 border border-red-100 py-3 rounded-2xl">
                      Out of Stock
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Wishlist;
