import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { Star, Leaf, Heart, Plus, Minus, ArrowLeft, ArrowRight, ShieldAlert, CheckCircle, Camera, Send, Ruler, Sun, Droplets, Compass, Gift, Home, Briefcase, Truck, ArrowUpRight } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { parseContentSections } from '../utils/commerceHelpers';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const renderStars = (rating) => {
  const stars = [];
  const numericRating = parseFloat(rating) || 0;
  for (let i = 1; i <= 5; i++) {
    const fillPercent = Math.min(100, Math.max(0, (numericRating - (i - 1)) * 100));
    if (fillPercent === 100) {
      stars.push(
        <Star key={i} className="h-4.5 w-4.5 fill-amber-500 text-amber-500 shrink-0" />
      );
    } else if (fillPercent === 0) {
      stars.push(
        <Star key={i} className="h-4.5 w-4.5 fill-none text-slate-300 shrink-0" />
      );
    } else {
      stars.push(
        <span key={i} className="relative inline-block h-4.5 w-4.5 shrink-0 align-middle">
          <Star className="absolute top-0 left-0 h-4.5 w-4.5 fill-none text-slate-300" />
          <span 
            className="absolute top-0 left-0 overflow-hidden h-full" 
            style={{ width: `${fillPercent}%` }}
          >
            <Star className="h-4.5 w-4.5 fill-amber-500 text-amber-500 max-w-none" />
          </span>
        </span>
      );
    }
  }
  return stars;
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { user } = useAuth();

  // API states
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interaction states
  const [quantity, setQuantity] = useState(1);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [cartError, setCartError] = useState(null);
  const [wishlistActive, setWishlistActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', user_name: '', user_image: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [uploadingReviewImg, setUploadingReviewImg] = useState(false);

  // Fetch Wishlist status on mount/change
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!user) {
        setWishlistActive(false);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/wishlist.php`);
        if (response.data.success) {
          const inWishlist = response.data.data.some(item => item.id === parseInt(id));
          setWishlistActive(inWishlist);
        }
      } catch (err) {
        console.error('Error checking wishlist status:', err);
      }
    };

    checkWishlistStatus();
  }, [id, user]);

  const handleWishlistToggle = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    
    try {
      if (wishlistActive) {
        // Remove from wishlist
        const response = await axios.delete(`${API_BASE_URL}/wishlist.php`, {
          params: { product_id: id }
        });
        if (response.data.success) {
          setWishlistActive(false);
        }
      } else {
        // Add to wishlist
        const response = await axios.post(`${API_BASE_URL}/wishlist.php`, {
          product_id: id
        });
        if (response.data.success) {
          setWishlistActive(true);
        }
      }
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Single Product
        const response = await axios.get(`${API_BASE_URL}/products.php`, {
          params: { id }
        });
        
        if (response.data.success) {
          const prodData = response.data.data;
          setProduct(prodData);
          setSelectedImage(prodData.image_url);
          setActiveImageIdx(0);
          setQuantity(1); // Reset quantity selector
          
          // Fetch Related Products in same Category
          const relatedResponse = await axios.get(`${API_BASE_URL}/products.php`, {
            params: { category_id: prodData.category_id }
          });
          if (relatedResponse.data.success) {
            // Filter out current product
            const filtered = relatedResponse.data.data.filter(item => item.id !== prodData.id);
            setRelated(filtered.slice(0, 4)); // Show top 4
          }
        } else {
          setError(response.data.message || 'Product not found.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error connecting to database.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  // Fetch reviews for this product
  const fetchReviews = async (productId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/reviews.php?product_id=${productId}`);
      if (res.data.success) setReviews(res.data.data);
    } catch (err) { /* fail silently */ }
  };

  useEffect(() => {
    if (id) fetchReviews(id);
  }, [id]);

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!product || product.stock <= 0) return;
    setCartError(null);
    const res = await addToCart(product, quantity);
    if (res && res.success) {
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 3000);
    } else if (res?.message) {
      setCartError(res.message);
      setTimeout(() => setCartError(null), 4000);
    }
  };

  const handleReviewImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingReviewImg(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await axios.post(`${API_BASE_URL}/upload.php`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) setReviewForm(prev => ({ ...prev, user_image: res.data.url }));
    } catch (err) { /* fail silently */ } finally {
      setUploadingReviewImg(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) return;
    setReviewSubmitting(true);
    try {
      const payload = {
        product_id: id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        user_name: user ? (user.name || user.email) : (reviewForm.user_name || 'Guest'),
        user_image: reviewForm.user_image || null
      };
      const res = await axios.post(`${API_BASE_URL}/reviews.php`, payload);
      if (res.data.success) {
        setReviewSuccess(true);
        setReviewForm({ rating: 5, comment: '', user_name: '', user_image: '' });
        fetchReviews(id);
        setTimeout(() => setReviewSuccess(false), 4000);
      }
    } catch (err) { /* fail silently */ } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 min-h-screen text-center flex flex-col items-center justify-center">
        <ShieldAlert className="h-16 w-16 text-red-500 animate-pulse" />
        <h2 className="text-2xl font-extrabold text-slate-800 mt-4">Unable to Load Product</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-sm">{error || "The requested variety is unavailable."}</p>
        <Link 
          to="/shop" 
          className="mt-6 inline-flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-3 rounded-full shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Catalog</span>
        </Link>
      </div>
    );
  }

  const allImages = [product.image_url, ...(product.gallery_images ? product.gallery_images.split(',').filter(u => u.trim()) : [])];
  const perfectForTags = product.perfect_for ? product.perfect_for.split(',').map(t => t.trim()) : ['Office Desk', 'Gifting', 'Home Decor'];
  const customSections = parseContentSections(product.content_sections);
  const detailTabs = [
    { id: 'description', label: 'Description' },
    { id: 'care', label: 'Care Guide' },
    { id: 'shipping', label: 'Shipping' },
    ...customSections.map((s) => ({ id: `sec_${s.id}`, label: s.title || 'Details', section: s })),
  ];

  const renderCustomSection = (sec) => {
    if (sec.type === 'faq' && Array.isArray(sec.items)) {
      return (
        <div className="space-y-3">
          {sec.items.map((item, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <p className="font-bold text-slate-800 text-sm">{item.q}</p>
              <p className="text-sm text-slate-600 mt-1">{item.a}</p>
            </div>
          ))}
        </div>
      );
    }
    if (sec.type === 'list' && Array.isArray(sec.items)) {
      return (
        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600 font-medium">
          {sec.items.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      );
    }
    if (sec.type === 'html') {
      return <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: sec.content || '' }} />;
    }
    return <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{sec.content}</p>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen text-left">
      
      {/* Breadcrumb / Back button */}
      <button 
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-primary-600 bg-slate-100/60 hover:bg-primary-50 px-4 py-2 rounded-full border border-slate-200 hover:border-primary-100 transition-all mb-8 shadow-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to Previous Page</span>
      </button>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start bg-white p-6 sm:p-10 border border-slate-100 rounded-[40px] shadow-sm">
        
        {/* Left Column: Image Display Slider */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 shadow-md group">
            <img 
              src={allImages[activeImageIdx] || product.image_url} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />

            {/* Slider Navigation Arrows Overlay */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/95 rounded-full border border-slate-200 shadow-lg text-slate-700 hover:text-primary-600 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/95 rounded-full border border-slate-200 shadow-lg text-slate-700 hover:text-primary-600 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Wishlist Button */}
            <button 
              onClick={handleWishlistToggle}
              className="absolute top-6 right-6 p-3 bg-white/95 rounded-full shadow-lg border border-slate-100 text-slate-500 hover:text-red-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Heart className={`h-5 w-5 transition-colors ${wishlistActive ? 'fill-red-500 text-red-500' : ''}`} />
            </button>

            {/* Indicator Dots overlay */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 bg-black/35 px-3 py-1.5 rounded-full backdrop-blur-sm">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === activeImageIdx ? 'bg-white w-4' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mini-Thumbnails Strip Slider */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
              {allImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === activeImageIdx ? 'border-primary-500 shadow-md scale-95 ring-2 ring-primary-100' : 'border-slate-200 hover:border-slate-350'
                  }`}
                >
                  <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information Panel */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Header Info */}
          <div>
            <span className="text-xs font-bold text-primary-600 uppercase tracking-widest bg-primary-50 px-3.5 py-1.5 rounded-full border border-primary-100">
              {product.category_name}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight leading-tight">
              {product.name}
            </h1>
            
            {/* Rating Stars */}
            <div className="flex items-center space-x-1 mt-3">
              <div className="flex space-x-0.5 items-center">
                {renderStars(product.rating)}
              </div>
              <span className="text-sm font-extrabold text-slate-800 pl-1">{parseFloat(product.rating).toFixed(1)} Rating</span>
            </div>
          </div>

          {/* Price & Stock Display Panel */}
          <div className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-400">Premium Offer Price</span>
              {product.selling_price && parseFloat(product.selling_price) > 0 && parseFloat(product.selling_price) < parseFloat(product.price) ? (
                <div className="flex items-baseline space-x-2.5 mt-1">
                  <span className="text-3xl font-black text-rose-600">&#x20B9;{product.selling_price}</span>
                  <span className="text-base text-slate-400 line-through font-bold">&#x20B9;{product.price}</span>
                  <span className="bg-rose-50 text-rose-700 text-[11px] font-black uppercase px-2 py-0.5 rounded-md border border-rose-200">
                    {Math.round(((parseFloat(product.price) - parseFloat(product.selling_price)) / parseFloat(product.price)) * 100)}% OFF
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-black text-slate-950 mt-1">&#x20B9;{product.price}</span>
              )}
            </div>
            
            {product.stock > 0 ? (
              <span className="inline-flex items-center space-x-1.5 text-emerald-800 bg-emerald-100/70 border border-emerald-200 rounded-full py-1.5 px-4 text-xs font-bold">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>In Stock & Ready to Ship</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-red-800 bg-red-50 border border-red-200 rounded-full py-1.5 px-4 text-xs font-bold">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-500" />
                <span>Out of Stock</span>
              </span>
            )}
          </div>

          {/* Add to Cart Actions */}
          {product.stock > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
              
              {/* Quantity Select Panel */}
              <div className="flex items-center justify-between border border-slate-200 rounded-full px-5 py-3.5 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-400 pr-4">Quantity</span>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={handleDecrement}
                    className="p-1 text-slate-500 hover:text-primary-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-extrabold text-sm text-slate-900 w-6 text-center">{quantity}</span>
                  <button 
                    onClick={handleIncrement}
                    className="p-1 text-slate-500 hover:text-primary-600 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {cartError && (
                <p className="text-red-600 text-xs font-semibold">{cartError}</p>
              )}

              {/* Action Button */}
              <button
                onClick={handleAddToCart}
                className={`flex-grow font-bold rounded-full py-4 px-8 text-sm transition-all transform active:scale-95 shadow-md flex items-center justify-center space-x-2 ${
                  cartSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-primary-600 hover:bg-primary-750 text-white hover:shadow-lg'
                }`}
              >
                {cartSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-white" />
                    <span>Successfully Added!</span>
                  </>
                ) : (
                  <>
                    <Leaf className="h-4 w-4 text-white" />
                    <span>Purchase & Add to Cart</span>
                  </>
                )}
              </button>

            </div>
          )}

          {/* Modern Tab Layout Controller */}
          <div className="pt-6 border-t border-slate-100">
            {/* Tab Bar buttons */}
            <div className="flex border-b border-slate-100 gap-1 pb-1">
              {detailTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-xs uppercase tracking-wider font-extrabold border-b-2 transition-all ${
                    activeTab === tab.id 
                      ? 'border-primary-500 text-primary-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content Panels */}
            <div className="py-6 min-h-[250px]">
              
              {/* Tab 1: Description */}
              {activeTab === 'description' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Perfect For Section */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Perfect Suitability</span>
                    <div className="flex flex-wrap gap-2">
                      {perfectForTags.map((tag, idx) => {
                        let IconComponent = Compass;
                        if (tag.toLowerCase().includes('desk') || tag.toLowerCase().includes('office')) IconComponent = Briefcase;
                        if (tag.toLowerCase().includes('gift')) IconComponent = Gift;
                        if (tag.toLowerCase().includes('home') || tag.toLowerCase().includes('decor')) IconComponent = Home;
                        return (
                          <span 
                            key={idx} 
                            className="inline-flex items-center space-x-1.5 bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200/60 shadow-sm"
                          >
                            <IconComponent className="h-3.5 w-3.5 text-primary-500" />
                            <span>{tag}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Biography */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Foliage Description</span>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {product.description || "No biography details specified for this active botanical specimen."}
                    </p>
                  </div>

                  {/* Size Guide & Dimensions visual scale */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dimensions & Visual Scale</span>
                    
                    <div className="grid grid-cols-3 gap-4">
                      {/* Height Indicator */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center text-center animate-fadeIn">
                        <Ruler className="h-5 w-5 text-primary-500 mb-1" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Height</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{product.height_cm || "30-40 cm / 12-16\""}</span>
                      </div>
                      {/* Pot Size Indicator */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center text-center animate-fadeIn">
                        <Leaf className="h-5 w-5 text-primary-500 mb-1" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Pot Size</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{product.pot_size || "12 cm / 5\""}</span>
                      </div>
                      {/* Visual scale Category */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center text-center animate-fadeIn">
                        <Compass className="h-5 w-5 text-primary-500 mb-1" />
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Visual Scale</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5 truncate max-w-[80px]">{product.visual_scale || "Desktop Scale"}</span>
                      </div>
                    </div>

                    {/* Scale chart diagram */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                      <div className="flex justify-between text-[9px] uppercase font-black text-slate-400 tracking-widest px-2 mb-3">
                        <span>Desktop (20-40cm)</span>
                        <span>Balcony (40-80cm)</span>
                        <span>Floor (80cm+)</span>
                      </div>
                      <div className="relative h-2 bg-slate-250 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 bottom-0 left-0 bg-primary-500 rounded-full transition-all duration-700" 
                          style={{ 
                            width: (product.visual_scale || '').toLowerCase().includes('floor') 
                              ? '90%' 
                              : (product.visual_scale || '').toLowerCase().includes('balcony')
                              ? '50%'
                              : '20%'
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 text-center font-bold">
                        {`This foliage falls within the `}
                        <span className="text-primary-600 font-extrabold">{product.visual_scale || "Desktop Scale"}</span>
                        {` classification.`}
                      </p>
                    </div>
                  </div>

                  {/* Biological Specifications Table */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Scientific specifications</span>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-slate-600">
                        <tbody>
                          <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 bg-slate-50/60 font-bold text-slate-700 w-1/3 text-[10px] tracking-wider uppercase">Foliage Dimension</td>
                            <td className="px-4 py-2.5 font-semibold">{product.size}</td>
                          </tr>
                          <tr className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 bg-slate-50/60 font-bold text-slate-700 w-1/3 text-[10px] tracking-wider uppercase">Care Required</td>
                            <td className="px-4 py-2.5 font-semibold">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                product.care_level === 'Easy' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : product.care_level === 'Moderate'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {product.care_level} Maintenance
                              </span>
                            </td>
                          </tr>
                          {product.biological_specs && (() => {
                            try {
                              const specs = JSON.parse(product.biological_specs);
                              return specs.map((spec, idx) => (
                                <tr key={idx} className={`${idx < specs.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/50`}>
                                  <td className="px-4 py-2.5 bg-slate-50/60 font-bold text-slate-700 w-1/3 text-[10px] tracking-wider uppercase">{spec.label}</td>
                                  <td className="px-4 py-2.5 font-semibold">{spec.value}</td>
                                </tr>
                              ));
                            } catch { return null; }
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Care Guide */}
              {activeTab === 'care' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Care icons grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/65 p-4 rounded-2xl border border-slate-100 flex items-start space-x-3 text-left">
                      <Sun className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Sun Exposure</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">{product.sun_exposure || "Bright indirect solar rays. Keep away from harsh direct sunlight."}</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50/65 p-4 rounded-2xl border border-slate-100 flex items-start space-x-3 text-left">
                      <Droplets className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Hydration</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">{product.hydration || "Weekly watering. Test soil dryness. Keep soil aerated."}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/65 p-4 rounded-2xl border border-slate-100 flex items-start space-x-3 text-left">
                      <Leaf className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Difficulty</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">{product.care_level} Care difficulty classification.</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/65 p-4 rounded-2xl border border-slate-100 flex items-start space-x-3 text-left">
                      <CheckCircle className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Toxin Filtration</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">{product.toxin_filtration || "High airborne pollutant purifying rating."}</p>
                      </div>
                    </div>
                  </div>

                  {/* Care Description */}
                  <div className="space-y-1.5 pt-4 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Care Instructions Guidelines</span>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {product.care_guide || "Water when top 1 inch of soil becomes dry. Thrives beautifully under bright, indirect light filter. Wipe leaves with damp cloth periodically."}
                    </p>
                  </div>

                </div>
              )}



              {/* Tab 4: Shipping */}
              {activeTab === 'shipping' && (
                <div className="space-y-6 animate-fadeIn text-left">
                  
                  {/* Delivery icons grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/65 p-4 rounded-2xl border border-slate-100 flex items-start space-x-3">
                      <Truck className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Fast Transit</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">Dispatched within 24-48 business hours with tracking details.</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50/65 p-4 rounded-2xl border border-slate-100 flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">COD Available</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">Pay with UPI or cash upon delivery at your doorstep.</p>
                      </div>
                    </div>
                  </div>

                  {/* Packaging Info */}
                  <div className="space-y-1.5 pt-4 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Delivery & Packaging Info</span>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {product.delivery_info || "Dispatched in double-walled, ventilated cardboard packaging designed to protect fragile root networks during shipping transit."}
                    </p>
                  </div>

                  {/* Safety Assurance */}
                  <div className="bg-primary-50 border border-primary-150 p-4 rounded-2xl animate-fadeIn">
                    <h4 className="font-extrabold text-primary-850 text-xs uppercase tracking-wider">Transit Quality Guarantee</h4>
                    <p className="text-[11px] text-primary-750 mt-1 leading-relaxed font-medium">
                      If your plant arrives damaged or unhealthy, simply send us a photo within 24 hours of delivery and we will replace it free of charge. No questions asked.
                    </p>
                  </div>

                </div>
              )}

              {customSections.map((sec) => (
                activeTab === `sec_${sec.id}` && (
                  <div key={sec.id} className="space-y-4 animate-fadeIn">
                    <h3 className="font-extrabold text-slate-900 text-lg">{sec.title}</h3>
                    {renderCustomSection(sec)}
                  </div>
                )
              ))}

            </div>
          </div>

        </div>

      </div>

      {/* ================= CUSTOMER REVIEWS ================= */}
      <section className="mt-16 bg-white p-6 sm:p-10 border border-slate-100 rounded-[40px] shadow-sm">
        <div className="text-left border-b border-slate-100 pb-5 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Customer Reviews</h2>
            <p className="text-sm text-slate-400 mt-1">Verified reviews from our plant community.</p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full">
            {reviews.length} Review{reviews.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Review Cards Grid */}
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {review.user_image ? (
                      <img src={review.user_image} alt={review.user_name} className="h-11 w-11 rounded-full object-cover border-2 border-primary-100" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary-100 to-emerald-100 flex items-center justify-center text-primary-750 font-extrabold text-sm border border-primary-100">
                        {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{review.user_name}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'fill-amber-500 text-amber-500' : 'fill-none text-slate-350'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-semibold">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 mb-10">
            <Star className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">No reviews yet. Be the first to review this plant!</p>
          </div>
        )}

        {/* Write a Review Form */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-lg mb-6">Write a Review</h3>

          {reviewSuccess ? (
            <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm">Your review has been submitted! Thank you.</span>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="space-y-5">
              {!user && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    required
                    value={reviewForm.user_name}
                    onChange={e => setReviewForm(p => ({ ...p, user_name: e.target.value }))}
                    placeholder="e.g. Priya Sharma"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-primary-400 rounded-xl px-4 py-2.5 outline-none font-medium text-sm shadow-inner"
                  />
                </div>
              )}

              <div className="flex items-center space-x-4">
                {reviewForm.user_image ? (
                  <img src={reviewForm.user_image} className="h-14 w-14 rounded-full object-cover border-2 border-primary-200" alt="Review" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-slate-400" />
                  </div>
                )}
                <label className="cursor-pointer text-xs font-bold text-primary-600 hover:text-primary-775 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-full transition-colors border border-primary-100 shadow-sm">
                  {uploadingReviewImg ? 'Uploading...' : 'Upload Photo (optional)'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleReviewImageUpload} disabled={uploadingReviewImg} />
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Rating</label>
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewForm(p => ({ ...p, rating: s }))}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star className={`h-7 w-7 transition-colors ${ s <= (hoverRating || reviewForm.rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Review</label>
                <textarea
                  required
                  rows="4"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                  placeholder="Share your experience with this plant — growth, care, delivery quality..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-primary-400 rounded-xl px-4 py-3 outline-none font-medium text-sm resize-none leading-relaxed"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3 rounded-full text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{reviewSubmitting ? 'Submitting...' : 'Submit Review'}</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Sticky Bottom Purchase Bar */}
      {product.stock > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] py-3.5 px-6 transition-all duration-500 transform ${showStickyBar ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-left">
              <img src={product.image_url} alt={product.name} className="w-11 h-11 rounded-xl object-cover border border-slate-100 shadow-sm shrink-0" />
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs truncate max-w-[130px] sm:max-w-xs">{product.name}</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  {product.selling_price && parseFloat(product.selling_price) > 0 && parseFloat(product.selling_price) < parseFloat(product.price) ? (
                    <>
                      <span className="text-xs font-black text-rose-600">&#x20B9;{product.selling_price}</span>
                      <span className="text-[10px] text-slate-400 line-through">&#x20B9;{product.price}</span>
                    </>
                  ) : (
                    <span className="text-xs font-black text-slate-800">&#x20B9;{product.price}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 shrink-0">
              {/* Compact Quantity Selector */}
              <div className="hidden sm:flex items-center space-x-2.5 border border-slate-250 bg-slate-50/50 rounded-full px-3 py-1.5 text-[11px]">
                <button onClick={handleDecrement} className="p-0.5 text-slate-500 hover:text-primary-600"><Minus className="h-3 w-3" /></button>
                <span className="font-extrabold text-slate-900 w-4 text-center">{quantity}</span>
                <button onClick={handleIncrement} className="p-0.5 text-slate-500 hover:text-primary-600"><Plus className="h-3 w-3" /></button>
              </div>
              
              <button
                onClick={handleAddToCart}
                className={`font-black rounded-full py-2.5 px-6 text-xs transition-all transform active:scale-95 shadow-md flex items-center space-x-1.5 ${
                  cartSuccess ? 'bg-emerald-600 text-white' : 'bg-primary-600 hover:bg-primary-750 text-white'
                }`}
              >
                <Leaf className="h-3.5 w-3.5" />
                <span>{cartSuccess ? 'Added!' : 'Add to Cart'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= RELATED PRODUCTS ================= */}
      {related.length > 0 && (
        <section className="mt-20">
          <div className="text-left border-b border-slate-100 pb-5 mb-10">
            <h2 className="text-2xl font-extrabold text-slate-900">Related Botanical Specimens</h2>
            <p className="text-sm text-slate-400 mt-1">
              You might also admire these complementary green additions in the {product.category_name} class.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {related.map((prod) => {
              const isOnSale = prod.selling_price && parseFloat(prod.selling_price) > 0 && parseFloat(prod.selling_price) < parseFloat(prod.price);
              const discountPercent = isOnSale ? Math.round(((parseFloat(prod.price) - parseFloat(prod.selling_price)) / parseFloat(prod.price)) * 100) : 0;
              return (
                <div 
                  key={prod.id}
                  onClick={() => navigate(`/product/${prod.id}`)}
                  className={`group relative bg-white border rounded-[32px] overflow-hidden transition-all duration-300 flex flex-col cursor-pointer ${
                    isOnSale 
                      ? 'border-rose-100/80 shadow-[0_8px_30px_rgba(244,63,94,0.02)] hover:border-rose-300 hover:shadow-[0_20px_40px_rgba(244,63,94,0.08)] hover:-translate-y-1.5' 
                      : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 hover:-translate-y-1.5'
                  }`}
                >
                  <div className="relative aspect-[4/5] bg-slate-50 overflow-hidden">
                    <img 
                      src={prod.image_url} 
                      alt={prod.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Stock / Size badge */}
                    {prod.stock <= 0 ? (
                      <span className="absolute top-4 left-4 z-10 bg-red-600/90 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow-sm">
                        Sold Out
                      </span>
                    ) : isOnSale ? (
                      <>
                        <span className="absolute top-4 left-4 z-10 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-md flex items-center space-x-1.5 animate-pulse">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                          </span>
                          <span>{discountPercent}% OFF</span>
                        </span>
                        <span className="absolute bottom-4 left-4 z-10 bg-slate-900/75 text-white text-[9px] font-bold uppercase px-3 py-1 rounded-full backdrop-blur-sm tracking-wider">
                          {prod.size} Size
                        </span>
                      </>
                    ) : (
                      <span className="absolute top-4 left-4 z-10 bg-slate-900/80 text-white text-[9px] font-bold uppercase px-3 py-1 rounded-full backdrop-blur-sm tracking-wider">
                        {prod.size} Size
                      </span>
                    )}

                    <span className="absolute top-4 right-4 bg-white/95 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-0.5 shadow-sm border border-slate-100">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>{parseFloat(prod.rating).toFixed(1)}</span>
                    </span>
                  </div>
                  <div className="p-6 flex flex-col flex-grow text-left">
                    <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">{prod.category_name}</span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-1 group-hover:text-primary-600 transition-colors truncate">
                      {prod.name}
                    </h3>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold text-slate-400">
                          {isOnSale ? 'Special Offer' : 'Price'}
                        </span>
                        {isOnSale ? (
                          <div className="flex items-baseline space-x-1 mt-0.5">
                            <span className="text-base font-black text-rose-600">&#x20B9;{prod.selling_price}</span>
                            <span className="text-[10px] text-slate-400 line-through font-bold">&#x20B9;{prod.price}</span>
                          </div>
                        ) : (
                          <span className="text-base font-black text-slate-900 mt-0.5">&#x20B9;{prod.price}</span>
                        )}
                      </div>
                      <span className="bg-primary-50 text-primary-700 group-hover:bg-primary-600 group-hover:text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all duration-300 border border-primary-100/50 shadow-sm flex items-center space-x-1">
                        <span>View Specs</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};

export default ProductDetails;
