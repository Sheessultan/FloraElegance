import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, SlidersHorizontal, Grid, RotateCcw, Star, X } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useCart } from '../context/CartContext';

const ProductListing = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  // API State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartSuccessId, setCartSuccessId] = useState(null);
  const [cartError, setCartError] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filter States
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category_id') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('price_max') || '2000');
  const [selectedSize, setSelectedSize] = useState(searchParams.get('size') || '');
  const [selectedCare, setSelectedCare] = useState(searchParams.get('care_level') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  
  const [filterSettings, setFilterSettings] = useState({
    shop_care_levels: ['Easy', 'Moderate', 'Expert'],
    shop_sizes: ['Small', 'Medium', 'Large']
  });
  
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync state filters with URL query parameters
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setSelectedCategory(searchParams.get('category_id') || '');
    setPriceMax(searchParams.get('price_max') || '2000');
    setSelectedSize(searchParams.get('size') || '');
    setSelectedCare(searchParams.get('care_level') || '');
    setSort(searchParams.get('sort') || 'newest');
  }, [searchParams]);

  // Load Categories & Filter settings on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/categories.php`);
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/settings.php`);
        if (res.data.success) {
          const s = res.data.data;
          const cares = s.shop_care_levels ? s.shop_care_levels.split(',').map(x => x.trim()) : ['Easy', 'Moderate', 'Expert'];
          const sizes = s.shop_sizes ? s.shop_sizes.split(',').map(x => x.trim()) : ['Small', 'Medium', 'Large'];
          setFilterSettings({
            shop_care_levels: cares,
            shop_sizes: sizes
          });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchCats();
    fetchSettings();
  }, []);

  // Fetch filtered products from REST API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        if (selectedCategory) params.category_id = selectedCategory;
        if (priceMax) params.price_max = priceMax;
        if (selectedSize) params.size = selectedSize;
        if (selectedCare) params.care_level = selectedCare;
        if (sort) params.sort = sort;

        const res = await axios.get(`${API_BASE_URL}/products.php`, { params });
        if (res.data.success) {
          setProducts(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching filtered products:', err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce product API calls for smooth price slider adjustments
    const timer = setTimeout(() => {
      fetchProducts();
      setCurrentPage(1); // Reset to page 1 when filters change
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, priceMax, selectedSize, selectedCare, sort]);

  // Handle filter changes and push to URL
  const updateURL = (newFilters) => {
    const current = {};
    searchParams.forEach((value, key) => {
      current[key] = value;
    });

    const updated = { ...current, ...newFilters };
    
    // Remove empty parameters
    Object.keys(updated).forEach(key => {
      if (updated[key] === '' || updated[key] === null || updated[key] === undefined) {
        delete updated[key];
      }
    });

    setSearchParams(updated);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setPriceMax('2000');
    setSelectedSize('');
    setSelectedCare('');
    setSort('newest');
    setSearchParams({});
    setMobileFiltersOpen(false);
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
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

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = products.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(products.length / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      {cartError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-xs font-bold">
          {cartError}
        </div>
      )}
      
      {/* Title Header */}
      <div className="text-left mb-8 border-b border-slate-100 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">FloraElegance Collection</h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore our handpicked range of fresh, healthy plants — thoughtfully grown, carefully packaged, and delivered with care.
          </p>
        </div>
        
        {/* Reset Filter Action */}
        <button 
          onClick={handleResetFilters}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 px-3.5 py-2 rounded-full border border-slate-200 hover:border-primary-200 transition-all cursor-pointer shadow-inner"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Clear Filters</span>
        </button>
      </div>

      {/* Mobile Filters Header */}
      <div className="flex md:hidden items-center justify-between bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-200 shadow-sm">
        <button 
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center space-x-2 text-slate-700 font-bold text-sm"
        >
          <SlidersHorizontal className="h-4 w-4 text-primary-600" />
          <span>Adjust Filters</span>
        </button>
        <span className="text-xs text-slate-400 font-bold">{products.length} Products Found</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* ================= DESKTOP SIDEBAR FILTERS ================= */}
        <aside className="hidden lg:block space-y-6 text-left">
          
          {/* 1. Keyword Search */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Keyword Search</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search plants..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  updateURL({ search: e.target.value });
                }}
                className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-4 pr-10 py-2.5 rounded-xl border border-transparent focus:border-primary-500 outline-none text-sm transition-all shadow-inner"
              />
              <Search className="absolute right-3.5 top-3 text-slate-400 h-4 w-4" />
            </div>
          </div>

          {/* 2. Categories Filter */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Categories</h3>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  updateURL({ category_id: '' });
                }}
                className={`text-left text-sm py-1.5 px-3 rounded-lg font-semibold transition-all ${
                  selectedCategory === '' 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                All Varieties
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id.toString());
                    updateURL({ category_id: cat.id.toString() });
                  }}
                  className={`text-left text-sm py-1.5 px-3 rounded-lg font-semibold transition-all ${
                    selectedCategory === cat.id.toString() 
                      ? 'bg-primary-50 text-primary-700' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Price Filter Slider */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Max Price</h3>
              <span className="text-sm font-black text-primary-700">&#x20B9;{priceMax}</span>
            </div>
            <input
              type="range"
              min="200"
              max="2000"
              step="50"
              value={priceMax}
              onChange={(e) => {
                setPriceMax(e.target.value);
                updateURL({ price_max: e.target.value });
              }}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>&#x20B9;200</span>
              <span>&#x20B9;2,000</span>
            </div>
          </div>

          {/* 4. Care Level Checkboxes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Care Required</h3>
            <div className="flex flex-col space-y-2 text-sm text-slate-600 font-semibold">
              {filterSettings.shop_care_levels.map((care) => (
                <label key={care} className="flex items-center space-x-2.5 cursor-pointer py-1 hover:text-slate-900">
                  <input
                    type="radio"
                    name="care_level"
                    checked={selectedCare === care}
                    onChange={() => {
                      setSelectedCare(care);
                      updateURL({ care_level: care });
                    }}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 accent-primary-600 h-4 w-4"
                  />
                  <span>{care} Care</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Size Selection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Plant Dimensions</h3>
            <div className="flex flex-col space-y-2 text-sm text-slate-600 font-semibold">
              {filterSettings.shop_sizes.map((size) => (
                <label key={size} className="flex items-center space-x-2.5 cursor-pointer py-1 hover:text-slate-900">
                  <input
                    type="radio"
                    name="size"
                    checked={selectedSize === size}
                    onChange={() => {
                      setSelectedSize(size);
                      updateURL({ size: size });
                    }}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 accent-primary-600 h-4 w-4"
                  />
                  <span>{size} Foliage</span>
                </label>
              ))}
            </div>
          </div>

        </aside>

        {/* ================= PRODUCTS CONTENT AREA ================= */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* Desktop Filter Summaries & Sort */}
          <div className="hidden lg:flex items-center justify-between bg-white p-4 border border-slate-100 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-slate-500">
              Showing {products.length > 0 ? `${indexOfFirstItem + 1}-${Math.min(indexOfLastItem, products.length)} of ${products.length}` : '0'} beautiful specimen varieties
            </span>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400">Sort By</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  updateURL({ sort: e.target.value });
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 py-1.5 px-3 rounded-lg outline-none cursor-pointer transition-colors shadow-inner"
              >
                <option value="newest">New Arrivals</option>
                <option value="price_low_high">Price: Low to High</option>
                <option value="price_high_low">Price: High to Low</option>
                <option value="rating">Customer Ratings</option>
              </select>
            </div>
          </div>

          {/* Dynamic Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(idx => (
                <div key={idx} className="h-[430px] bg-slate-100 animate-pulse rounded-3xl"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl py-20 px-4 text-center shadow-sm">
              <SlantLeafIcon className="mx-auto h-16 w-16 text-slate-300 animate-bounce-slow" />
              <h3 className="font-extrabold text-slate-800 text-lg mt-4">No Plants Found</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                We couldn't find any varieties matching your current filter selections. Try resetting the filters or modifying your search key.
              </p>
              <button 
                onClick={handleResetFilters}
                className="mt-6 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {currentItems.map((prod) => {
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
                    
                    {/* Image container */}
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
                      <h3 className="font-extrabold text-slate-900 text-base mt-1 group-hover:text-primary-600 transition-colors truncate">
                        {prod.name}
                      </h3>

                      {/* Specifications badges */}
                      <div className="flex gap-2 mt-3.5">
                        <span className="bg-slate-50 text-[10px] text-slate-500 font-bold px-2.5 py-1 rounded-md border border-slate-100">
                          {prod.care_level} Care
                        </span>
                        <span className="bg-slate-50 text-[10px] text-slate-500 font-bold px-2.5 py-1 rounded-md border border-slate-100">
                          NASA Cleans
                        </span>
                      </div>

                      {/* Pricing Footer */}
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
                            <span className="text-lg font-black text-slate-900 mt-0.5">&#x20B9;{prod.price}</span>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => handleAddToCart(e, prod)}
                          disabled={prod.stock <= 0}
                          className={`font-bold px-4 py-2 rounded-full text-xs transition-all shadow-sm hover:shadow-md transform active:scale-95 shrink-0 ${
                            prod.stock <= 0
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                              : cartSuccessId === prod.id
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                        >
                          {prod.stock <= 0 ? 'Out of Stock' : cartSuccessId === prod.id ? 'Added! ✓' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-center space-x-4 mt-12 pt-8 border-t border-slate-100">
              <button
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="px-6 py-2.5 rounded-full font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Previous
              </button>
              <span className="text-sm font-bold text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="px-6 py-2.5 rounded-full font-bold text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Next Page
              </button>
            </div>
          )}

        </main>
      </div>

      {/* ================= MOBILE FILTER DRAWER ================= */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)}></div>
          
          <div className="relative ml-auto max-w-xs w-full bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto z-50 text-left animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="font-extrabold text-slate-800 text-base uppercase flex items-center space-x-1.5">
                <SlidersHorizontal className="h-4 w-4 text-primary-600" />
                <span>Filters</span>
              </h2>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Keyword search */}
            <div className="space-y-2 mb-6">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Search</h3>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  updateURL({ search: e.target.value });
                }}
                className="w-full bg-slate-50 text-slate-800 pl-4 py-2 rounded-xl border border-slate-200 outline-none text-xs"
              />
            </div>

            {/* Sorting for mobile */}
            <div className="space-y-2 mb-6">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Sort Results</h3>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  updateURL({ sort: e.target.value });
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl outline-none"
              >
                <option value="newest">New Arrivals</option>
                <option value="price_low_high">Price: Low to High</option>
                <option value="price_high_low">Price: High to Low</option>
                <option value="rating">Customer Ratings</option>
              </select>
            </div>

            {/* Category selection */}
            <div className="space-y-2 mb-6">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Categories</h3>
              <div className="flex flex-col space-y-1.5">
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    updateURL({ category_id: '' });
                  }}
                  className={`text-left text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${
                    selectedCategory === '' ? 'bg-primary-50 text-primary-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  All Varieties
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id.toString());
                      updateURL({ category_id: cat.id.toString() });
                    }}
                    className={`text-left text-xs py-1.5 px-3 rounded-lg font-semibold transition-all ${
                      selectedCategory === cat.id.toString() ? 'bg-primary-50 text-primary-700 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Slider */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Max Price</h3>
                <span className="text-xs font-black text-primary-700">&#x20B9;{priceMax}</span>
              </div>
              <input
                type="range"
                min="200"
                max="2000"
                step="50"
                value={priceMax}
                onChange={(e) => {
                  setPriceMax(e.target.value);
                  updateURL({ price_max: e.target.value });
                }}
                className="w-full h-1 bg-slate-100 rounded-lg cursor-pointer accent-primary-600"
              />
            </div>

            {/* Care selection */}
            <div className="space-y-2 mb-4">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Care Level</h3>
              <div className="flex flex-col space-y-1.5 text-xs text-slate-500 font-semibold">
                {filterSettings.shop_care_levels.map((care) => (
                  <label key={care} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="mobile_care"
                      checked={selectedCare === care}
                      onChange={() => {
                        setSelectedCare(care);
                        updateURL({ care_level: care });
                      }}
                      className="accent-primary-600 h-3.5 w-3.5"
                    />
                    <span>{care} Care</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Size selection */}
            <div className="space-y-2 mb-6">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Plant Dimensions</h3>
              <div className="flex flex-col space-y-1.5 text-xs text-slate-500 font-semibold">
                {filterSettings.shop_sizes.map((size) => (
                  <label key={size} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="mobile_size"
                      checked={selectedSize === size}
                      onChange={() => {
                        setSelectedSize(size);
                        updateURL({ size: size });
                      }}
                      className="accent-primary-600 h-3.5 w-3.5"
                    />
                    <span>{size} Foliage</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleResetFilters}
              className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl shadow-inner transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// Mini Leaf icon for display
const SlantLeafIcon = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.58.9 9.2A7 7 0 0 1 11 20z" />
    <path d="M19 2c-2.26 4.33-5.27 7.14-8 10" />
  </svg>
);

export default ProductListing;
