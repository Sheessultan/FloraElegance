import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, ArrowRight, Sprout, Grid, Leaf, Compass } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catsRes, prodsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/categories.php`),
          axios.get(`${API_BASE_URL}/products.php`)
        ]);

        if (catsRes.data.success) {
          setCategories(catsRes.data.data);
        }
        if (prodsRes.data.success) {
          setProducts(prodsRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching categories page data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate product counts per category
  const getProductCount = (categoryId) => {
    return products.filter((p) => String(p.category_id) === String(categoryId)).length;
  };

  // Filter categories by search query
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Premium Glassmorphism Header */}
      <div className="relative overflow-hidden bg-emerald-950 py-24 px-4 sm:px-6 lg:px-8 text-center shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-700/20 blur-3xl"></div>
        <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-emerald-600/20 blur-3xl"></div>
        
        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/50 border border-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 uppercase tracking-widest">
            <Sprout className="h-4 w-4 animate-pulse" />
            <span>Botanical Classifications</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
            Explore Botanical Categories
          </h1>
          <p className="text-emerald-200 text-base sm:text-lg max-w-2xl mx-auto font-medium font-sans leading-relaxed">
            Delve into our curated collection of indoor flora, low-light purifying species, outdoor patios, and rare specimen collectors.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto pt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 hover:bg-white/[0.15] focus:bg-white text-white focus:text-slate-800 pl-5 pr-12 py-3.5 rounded-2xl border border-white/20 focus:border-white outline-none text-sm transition-all shadow-lg placeholder-emerald-200/60 focus:placeholder-slate-400 font-semibold"
              />
              <Search className="absolute right-4 top-4 text-emerald-200 focus-within:text-slate-400 h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Categories Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-96 bg-slate-200/75 animate-pulse rounded-3xl border border-slate-100 shadow-sm"></div>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm max-w-xl mx-auto">
            <Compass className="mx-auto h-16 w-16 text-slate-300 animate-spin-slow" />
            <h3 className="font-extrabold text-slate-800 text-lg mt-4">No Categories Found</h3>
            <p className="text-slate-400 text-sm mt-1">
              We couldn't find any classifications matching "{searchQuery}".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCategories.map((cat) => {
              const count = getProductCount(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/shop?category_id=${cat.id}`)}
                  className="group bg-white border border-slate-100 rounded-[35px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Category Image */}
                    <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                      <img
                        src={cat.image_url || 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600'}
                        alt={cat.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                      
                      {/* Count Badge */}
                      <span className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border border-slate-100/30 text-emerald-800 font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-md">
                        {count} Specimen{count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Category Details */}
                    <div className="p-6 text-left space-y-3">
                      <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-slate-500 font-medium text-xs leading-relaxed line-clamp-3">
                        {cat.description || 'Discover a fresh assortment of gorgeous plants handpicked to brighten your workspace or living rooms.'}
                      </p>
                    </div>
                  </div>

                  {/* Explore Link */}
                  <div className="px-6 pb-6 pt-2 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-emerald-700 transition-colors">
                    <span>Explore Collection</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-emerald-50 rounded-[40px] p-8 sm:p-12 border border-emerald-100 shadow-inner text-left flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 leading-tight">
              Need assistance selecting a specimen?
            </h2>
            <p className="text-sm text-emerald-700 font-medium leading-relaxed">
              We guide you from light specifications, potting arrangements, watering timers, and custom care manuals designed for your environment's requirements.
            </p>
          </div>
          <button
            onClick={() => navigate('/contact')}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all shrink-0 cursor-pointer"
          >
            Connect With Plant Expert
          </button>
        </div>
      </div>
    </div>
  );
};

export default Categories;
