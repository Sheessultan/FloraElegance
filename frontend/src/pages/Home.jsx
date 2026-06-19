import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Leaf, ShieldCheck, HeartPulse, Sparkles, Star, Sprout, Truck, Headphones, Coins } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useCart } from '../context/CartContext';

const Home = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartSuccessId, setCartSuccessId] = useState(null);
  const [cartError, setCartError] = useState(null);

  // Hero Images slider state
  const [heroImages, setHeroImages] = useState(['https://images.unsplash.com/photo-1688481156464-4285423c8b39?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D']);
  const [currentHeroIdx, setCurrentHeroIdx] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch Site Settings for Hero Images
        const setRes = await axios.get(`${API_BASE_URL}/settings.php`);
        if (setRes.data.success && setRes.data.data.hero_images) {
          const loadedHeros = setRes.data.data.hero_images.split(',').filter(x => x.trim() !== '');
          if (loadedHeros.length > 0) setHeroImages(loadedHeros);
        }

        // Fetch Categories (Filtered by show_on_home mapping)
        const catRes = await axios.get(`${API_BASE_URL}/categories.php`);
        if (catRes.data.success) {
          const mappedCats = catRes.data.data.filter(c => c.show_on_home === 1);
          setCategories(mappedCats.length > 0 ? mappedCats : catRes.data.data);
        }

        // Fetch Top Rated Products mapped to home
        const prodRes = await axios.get(`${API_BASE_URL}/products.php?home_only=true&sort=rating`);
        if (prodRes.data.success && prodRes.data.data.length > 0) {
          setFeaturedProducts(prodRes.data.data);
        } else {
          const fallbackRes = await axios.get(`${API_BASE_URL}/products.php?sort=rating`);
          if (fallbackRes.data.success) setFeaturedProducts(fallbackRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Carousel transition timer
  useEffect(() => {
    if (heroImages.length > 1) {
      const timer = setInterval(() => {
        setCurrentHeroIdx(prev => (prev + 1) % heroImages.length);
      }, 4500);
      return () => clearInterval(timer);
    }
  }, [heroImages]);

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    setCartError(null);
    const res = await addToCart(product, 1);
    if (res && res.success) {
      setCartSuccessId(product.id);
      setTimeout(() => setCartSuccessId(null), 2500);
    } else if (res?.message) {
      setCartError(res.message);
      setTimeout(() => setCartError(null), 3000);
    }
  };

  // Native CSS Scroll Intersection Observer
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const animatedElements = document.querySelectorAll('.scroll-animate-up, .scroll-animate-zoom');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [loading, categories, featuredProducts]);

  return (
    <div className="flex flex-col min-h-screen">
      {cartError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-xs font-bold shadow-lg">
          {cartError}
        </div>
      )}

      {/* 1. Hero Section */}
      <section className="relative pt-10 pb-10 bg-gradient-to-br from-green-50 via-emerald-50/30 to-slate-50 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-100/30 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-100/20 rounded-full blur-3xl translate-y-12 -translate-x-12"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left hero-animate-up">
            <div className="inline-flex items-center space-x-2 bg-primary-100/60 text-primary-800 px-4 py-1.5 rounded-full text-xs font-bold border border-primary-200">
              <Sparkles className="h-3.5 w-3.5" />
              <span>India's Premium Online Botanical Boutique</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Breathe Life Into <br />
              <span className="text-primary-600 font-serif">Your Living Spaces</span>
            </h1>
            <p className="text-slate-600 text-lg max-w-xl leading-relaxed">
              Elevate your home environment with our hand-selected collection of robust, clean-air indoor plants, lush outdoor balcony flora, and masterfully structured bonsai.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                to="/shop"
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center space-x-2 text-base btn-ripple">
                <span>Shop the Collection</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/categories" className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-8 py-4 rounded-full shadow-md hover:shadow-lg border border-slate-200 transition-all text-base btn-ripple">
                Explore Categories
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center hero-animate-img">
            {/* Featured Hero Plant Image Carousel */}
            <div className="relative w-80 h-96 sm:w-96 sm:h-[420px] bg-gradient-to-br from-emerald-800 to-green-950 rounded-[40px] shadow-2xl overflow-hidden transform rotate-3 hover:rotate-0 transition-transform duration-500">
              {heroImages.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`Botanical Hero ${idx}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${idx === currentHeroIdx
                    ? 'opacity-100 scale-105 hover:scale-110'
                    : 'opacity-0 scale-100'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why Choose Us Section */}
      <section className="bg-white py-20 border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 scroll-animate-up delay-100">
            <h2 className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">Why Plant Lovers Choose Us</h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              We redefine online botanical shopping with our healthy foliage guarantee, sustainable transport solutions, and lifelong expert support.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1: Farm Fresh Plants */}
            <div className="group bg-slate-50 border border-slate-100 hover:border-primary-200 p-8 rounded-[32px] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(16,185,129,0.05)] hover:-translate-y-1 text-left flex flex-col justify-between scroll-animate-up delay-100">
              <div className="space-y-4">
                <div className="bg-primary-100/80 text-primary-700 p-4 rounded-2xl w-14 h-14 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Sprout className="h-6 w-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">Farm Fresh Plants</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Grown locally under pristine shade-house conditions. Hand-picked on dispatch day to ensure cellular moisture levels are healthy.
                </p>
              </div>
            </div>

            {/* Card 2: Eco-Friendly Packaging */}
            <div className="group bg-slate-50 border border-slate-100 hover:border-primary-200 p-8 rounded-[32px] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(16,185,129,0.05)] hover:-translate-y-1 text-left flex flex-col justify-between scroll-animate-up delay-200">
              <div className="space-y-4">
                <div className="bg-primary-100/80 text-primary-700 p-4 rounded-2xl w-14 h-14 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Leaf className="h-6 w-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">Eco-friendly Packaging</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  100% biodegradable, zero-plastic box structures that protect roots, prevent soil displacement, and sustain ventilation.
                </p>
              </div>
            </div>

            {/* Card 3: Expert Support */}
            <div className="group bg-slate-50 border border-slate-100 hover:border-primary-200 p-8 rounded-[32px] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(16,185,129,0.05)] hover:-translate-y-1 text-left flex flex-col justify-between scroll-animate-up delay-300">
              <div className="space-y-4">
                <div className="bg-primary-100/80 text-primary-700 p-4 rounded-2xl w-14 h-14 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Headphones className="h-6 w-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">Expert Support</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Enjoy lifelong post-purchase access to our team of virtual botanists for custom watering, placement, or repotting queries.
                </p>
              </div>
            </div>

            {/* Card 4: COD Available */}
            <div className="group bg-slate-50 border border-slate-100 hover:border-primary-200 p-8 rounded-[32px] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(16,185,129,0.05)] hover:-translate-y-1 text-left flex flex-col justify-between scroll-animate-up delay-400">
              <div className="space-y-4">
                <div className="bg-primary-100/80 text-primary-700 p-4 rounded-2xl w-14 h-14 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Coins className="h-6 w-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">COD Available</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Order with confidence and pay right at your doorstep. We support Cash/UPI on Delivery across 19,000+ Indian PIN codes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 Order Process Section */}
      <section className="py-24 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden border-b border-slate-100">
        {/* Background Decorative Blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-50/50 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20 scroll-animate-up delay-100">
            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
              Our Journey
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-6 font-sans tracking-tight">How Your Plant Reaches You</h2>
            <p className="text-slate-500 mt-4 text-sm md:text-base leading-relaxed">
              We have designed a meticulous 4-step delivery pipeline optimized for absolute horticultural safety and speed.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 z-10">
            {/* Connecting lines for desktop with gradient and dash */}
            <div className="hidden lg:block absolute top-[44px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-primary-300 to-transparent border-t-2 border-dashed border-primary-200 -z-10" />

            {[
              { step: '01', title: 'Choose Plant', desc: 'Browse our catalog of air-purifiers, bonsai, and balcony flora to find your match.', icon: <Sprout className="h-6 w-6 text-primary-600" /> },
              { step: '02', title: 'Secure Packing', desc: 'Our eco-friendly ventilated boxes secure the roots and retain optimal soil humidity.', icon: <ShieldCheck className="h-6 w-6 text-primary-600" /> },
              { step: '03', title: 'Fast Delivery', desc: 'Shipped via express courier channels with special handle-with-care fragile labels.', icon: <Truck className="h-6 w-6 text-primary-600" /> },
              { step: '04', title: 'Enjoy Greenery', desc: 'Unbox, follow our easy care instructions, and watch your indoor air turn fresh.', icon: <Leaf className="h-6 w-6 text-primary-600" /> }
            ].map((item, idx) => (
              <div key={idx} className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-[40px] border border-slate-100/80 hover:border-primary-200 shadow-lg shadow-slate-100/50 hover:shadow-2xl hover:shadow-primary-100/40 transition-all duration-500 text-center hover:-translate-y-2 scroll-animate-up" style={{ transitionDelay: `${idx * 150}ms` }}>
                {/* Modern Step badge */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white text-primary-700 text-xs font-black w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl border border-slate-50 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-500 z-20 transform rotate-3 group-hover:rotate-0">
                  {item.step}
                </div>
                
                {/* Icon Container */}
                <div className="w-16 h-16 mx-auto bg-primary-50 rounded-3xl flex items-center justify-center mt-4 mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-primary-100/50">
                  {item.icon}
                </div>

                <h4 className="font-extrabold text-slate-900 text-lg mb-3">{item.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed px-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Categories Grid */}
      <section id="categories" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">Shop by Plant Category</h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Explore our curated selections categorized based on environmental placement and horticultural structures.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="h-64 bg-slate-200 animate-pulse rounded-3xl"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((cat, idx) => (
                <Link
                  key={cat.id}
                  to={`/shop?category_id=${cat.id}`}
                  className="group relative h-72 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 bg-slate-900">
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-60 group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-6 text-left">
                    <h3 className="text-white font-extrabold text-xl">{cat.name}</h3>
                    <p className="text-slate-300 text-xs mt-1 transition-opacity duration-300 leading-normal">
                      {cat.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Featured Bestsellers */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div className="text-left">
              <h2 className="text-3xl font-extrabold text-slate-900">Highly Rated Bestsellers</h2>
              <p className="text-slate-500 text-sm mt-1 leading-normal">
                These green showstoppers have earned exceptional reviews from our community of gardeners.
              </p>
            </div>
            <Link
              to="/shop"
              className="mt-4 md:mt-0 flex items-center space-x-1.5 text-primary-600 hover:text-primary-700 font-bold transition-colors group"
            >
              <span>View All Products</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="h-96 bg-slate-100 animate-pulse rounded-3xl"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((prod, idx) => {
                const isOnSale = prod.selling_price && parseFloat(prod.selling_price) > 0 && parseFloat(prod.selling_price) < parseFloat(prod.price);
                const discountPercent = isOnSale ? Math.round(((parseFloat(prod.price) - parseFloat(prod.selling_price)) / parseFloat(prod.price)) * 100) : 0;
                return (
                  <div
                    key={prod.id}
                    onClick={() => navigate(`/product/${prod.id}`)}
                    className={`group relative bg-white border rounded-[32px] overflow-hidden transition-all duration-300 flex flex-col cursor-pointer ${isOnSale
                      ? 'border-rose-100/80 shadow-[0_8px_30px_rgba(244,63,94,0.02)] hover:border-rose-300 hover:shadow-[0_20px_40px_rgba(244,63,94,0.08)] hover:-translate-y-1.5'
                      : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 hover:-translate-y-1.5'
                      }`}
                  >
                    {/* Image wrapper */}
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

                      {/* Rating badge */}
                      <span className="absolute top-4 right-4 bg-white/95 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-0.5 shadow-sm border border-slate-100">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span>{parseFloat(prod.rating).toFixed(1)}</span>
                      </span>
                    </div>

                    {/* Body Content */}
                    <div className="p-6 flex flex-col flex-grow text-left">
                      <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">{prod.category_name}</span>
                      <h3 className="font-extrabold text-slate-900 text-lg mt-1 group-hover:text-primary-600 transition-colors truncate">
                        {prod.name}
                      </h3>

                      {/* Care level and price */}
                      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold text-slate-400">
                            {isOnSale ? 'Special Offer' : 'Price'}
                          </span>
                          {isOnSale ? (
                            <div className="flex items-baseline space-x-1.5 mt-0.5">
                              <span className="text-xl font-black text-rose-600">&#x20B9;{prod.selling_price}</span>
                              <span className="text-xs text-slate-400 line-through font-bold">&#x20B9;{prod.price}</span>
                            </div>
                          ) : (
                            <span className="text-xl font-black text-slate-900 mt-0.5">&#x20B9;{prod.price}</span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleAddToCart(e, prod)}
                          className={`font-bold px-4 py-2 rounded-full text-xs transition-all shadow-sm hover:shadow-md transform active:scale-95 shrink-0 ${cartSuccessId === prod.id
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                            }`}
                        >
                          {cartSuccessId === prod.id ? 'Added! ✓' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Informational Plant Care Tips Section */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 relative flex justify-center order-last lg:order-first">
            <img
              src="https://images.unsplash.com/photo-1632207691143-643e2a9a9361?auto=format&fit=crop&w=700&q=80"
              alt="Care ZZ Plant"
              className="w-full max-w-md h-auto object-cover rounded-[40px] shadow-xl border-4 border-white"
            />
          </div>
          <div className="lg:col-span-6 space-y-6 text-left">
            <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">Botanist Corner</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Hassle-Free Greenery for the Modern Workspace
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Don't let a busy schedule stop you from enjoying the therapeutic presence of nature. Our botanists recommend starting with the <strong>indestructible trio</strong>: the ZZ Plant, Snake Plant, and Golden Pothos.
            </p>
            <div className="space-y-4">
              <div className="flex space-x-3 items-start">
                <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Over-watering is the Enemy</h4>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">Most foliage preferred dry soil breaks between water cycles. Insert a finger 2 inches into soil; only water if completely dry.</p>
                </div>
              </div>
              <div className="flex space-x-3 items-start">
                <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Indirect Sunlight is Key</h4>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">Direct scorching sun rays can burn glossy tropical leaves. Filtered balcony shade or close placement near windows is ideal.</p>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <Link
                to="/shop?category_id=6"
                className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 font-extrabold transition-colors group"
              >
                <span>Browse Low Maintenance Plants</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
