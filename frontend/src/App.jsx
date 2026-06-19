import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTopButton from './components/ScrollToTopButton';

// Import Pages
import Home from './pages/Home';
import ProductListing from './pages/ProductListing';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import Wishlist from './pages/Wishlist';
import CustomerDashboard from './pages/CustomerDashboard';
import Contact from './pages/Contact';
import Categories from './pages/Categories';
import ShippingPolicy from './pages/ShippingPolicy';
import TermsConditions from './pages/TermsConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import FAQs from './pages/FAQs';
import TrackOrder from './pages/TrackOrder';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-extrabold text-slate-900">Page not found</h1>
      <p className="text-slate-500 mt-2">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 text-primary-600 font-bold hover:underline">← Back to home</Link>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname === '/admin' || location.pathname.endsWith('/admin');

  return (
    <div className={`flex flex-col min-h-screen ${isAdminRoute ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
      {!isAdminRoute && <Navbar />}
      <ScrollToTopButton />
      <main className="flex-grow">
        <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<ProductListing />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/terms-conditions" element={<TermsConditions />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/faqs" element={<FAQs />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/track-order" element={<TrackOrder />} />
                
                {/* Protected customer routes */}
                <Route 
                  path="/checkout" 
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <CustomerDashboard />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/wishlist" 
                  element={
                    <ProtectedRoute>
                      <Wishlist />
                    </ProtectedRoute>
                  } 
                />

                {/* Authentication Page */}
                <Route path="/auth" element={<Auth />} />


                {/* Protected Admin control panel */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute adminRequired={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />

                <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
      {isAdminRoute && (
        <footer className="border-t border-slate-800 bg-slate-950 text-slate-500 text-center text-xs py-4 px-4">
          <Link to="/" className="text-primary-400 hover:text-primary-300 font-bold">← Back to FloraElegance Store</Link>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router basename={(() => {
          const b = import.meta.env.BASE_URL || '/';
          if (b === '/' || b === '') return undefined;
          return b.replace(/\/$/, '') || undefined;
        })()}>
          <AppLayout />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
