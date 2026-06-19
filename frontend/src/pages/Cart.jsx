import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, ArrowLeft, ShieldCheck, Heart, Tag, Loader2, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { calcShippingFee, getShippingLabel } from '../utils/commerceHelpers';

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart, loading } = useCart();

  const [siteSettings, setSiteSettings] = useState({});
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/settings.php`).then((res) => {
      if (res.data.success) setSiteSettings(res.data.data);
    }).catch(() => {});
  }, []);

  const shippingFee = calcShippingFee(cartTotal, siteSettings);
  const shippingLabel = getShippingLabel(siteSettings);
  const discount = appliedCoupon?.discount || 0;
  const grandTotal = Math.max(0, cartTotal + shippingFee - discount);
  const shippingThreshold = parseFloat(siteSettings.shipping_free_threshold) || 999;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/coupons.php`, {
        params: { action: 'validate', code, subtotal: cartTotal },
      });
      if (res.data.success) {
        setAppliedCoupon({ code: res.data.data.code, discount: res.data.data.discount });
        sessionStorage.setItem('applied_coupon', JSON.stringify({ code: res.data.data.code, discount: res.data.data.discount }));
      } else {
        setAppliedCoupon(null);
        sessionStorage.removeItem('applied_coupon');
        setCouponError(res.data.message || 'Invalid coupon.');
      }
    } catch (err) {
      setAppliedCoupon(null);
      sessionStorage.removeItem('applied_coupon');
      setCouponError(err.response?.data?.message || 'Invalid coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    sessionStorage.removeItem('applied_coupon');
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('applied_coupon');
      if (saved && cartTotal > 0) {
        const parsed = JSON.parse(saved);
        setCouponInput(parsed.code);
        axios.get(`${API_BASE_URL}/coupons.php`, {
          params: { action: 'validate', code: parsed.code, subtotal: cartTotal },
        }).then((res) => {
          if (res.data.success) setAppliedCoupon({ code: res.data.data.code, discount: res.data.data.discount });
          else removeCoupon();
        }).catch(() => removeCoupon());
      }
    } catch { /* ignore */ }
  }, [cartTotal]);

  const handleCheckoutRedirect = () => {
    if (user) navigate('/checkout');
    else navigate('/auth?redirect=checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 min-h-screen text-center flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[40px] shadow-sm my-10">
        <div className="bg-primary-50 p-6 rounded-full text-primary-600 animate-pulse">
          <ShoppingBag className="h-16 w-16" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mt-6">Your Shopping Cart is Empty</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-sm leading-relaxed">
          Looks like you haven't added any gorgeous plants to your cart yet. Let's find some green companions for your spaces!
        </p>
        <Link to="/shop" className="mt-8 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-8 py-4 rounded-full shadow-lg flex items-center space-x-2">
          <span>Browse Shop Catalog</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen text-left">
      <div className="border-b border-slate-100 pb-5 mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Shopping Bag</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage your pending botanical purchases.</p>
        </div>
        <button onClick={clearCart} className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-full border border-red-200">
          Clear Entire Bag
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[30px] overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {cart.map((item) => (
                <div key={item.product_id} className="grid grid-cols-12 gap-4 p-5 sm:p-6 items-center">
                  <div className="col-span-3 sm:col-span-2">
                    <img src={item.image_url} alt={item.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-slate-100" />
                  </div>
                  <div className="col-span-9 sm:col-span-6">
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">{item.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.size}</p>
                    <div className="flex items-center space-x-3 mt-3 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 w-fit">
                      <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="text-slate-500 hover:text-primary-600"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm font-extrabold w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="text-slate-500 hover:text-primary-600"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-4 flex justify-between sm:justify-end items-center">
                    <span className="font-extrabold text-slate-900">
                      ₹{(((item.selling_price && parseFloat(item.selling_price) > 0 && parseFloat(item.selling_price) < parseFloat(item.price)) ? parseFloat(item.selling_price) : parseFloat(item.price)) * item.quantity).toFixed(2)}
                    </span>
                    <button onClick={() => removeFromCart(item.product_id)} className="text-slate-300 hover:text-red-500 p-2 rounded-full"><Trash2 className="h-4.5 w-4.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Link to="/shop" className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-primary-600 bg-slate-100 hover:bg-primary-50 px-4 py-2.5 rounded-full border border-slate-200">
            <ArrowLeft className="h-3.5 w-3.5" /><span>Continue Shopping</span>
          </Link>
        </div>

        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[30px] p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="font-extrabold text-slate-900 text-lg border-b border-slate-50 pb-4">Order Summary</h3>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Coupon code</label>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <span className="font-mono font-bold text-emerald-800 text-sm flex items-center gap-1"><Check className="h-4 w-4" />{appliedCoupon.code}</span>
                <button type="button" onClick={removeCoupon} className="text-[10px] font-bold text-rose-600">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="e.g. GREEN10"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold uppercase outline-none focus:border-primary-500"
                />
                <button type="button" onClick={handleApplyCoupon} disabled={couponLoading} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50">
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <p className="text-[10px] text-rose-600 font-bold">{couponError}</p>}
          </div>

          <div className="space-y-3.5 text-sm border-t border-slate-100 pt-4">
            <div className="flex justify-between font-semibold text-slate-600">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800">₹{cartTotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Coupon discount</span>
                <span className="font-bold">−₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-slate-600">
              <span>{shippingLabel}</span>
              {shippingFee === 0 ? (
                <span className="font-bold text-emerald-600 text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">FREE</span>
              ) : (
                <span className="font-bold">₹{shippingFee.toFixed(2)}</span>
              )}
            </div>
            {shippingFee > 0 && (
              <p className="text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-100 font-bold">
                Add ₹{(shippingThreshold - cartTotal).toFixed(0)} more for free shipping!
              </p>
            )}
            {siteSettings.shipping_estimated_days && (
              <p className="text-[10px] text-slate-400">Est. delivery: {siteSettings.shipping_estimated_days}</p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
            <span className="font-extrabold text-base">Grand Total</span>
            <span className="font-black text-2xl text-slate-950">₹{grandTotal.toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 mt-1">Estimate for online payment. COD may add a small fee at checkout.</p>
          </div>

          <button onClick={handleCheckoutRedirect} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-full shadow-lg flex items-center justify-center space-x-2">
            <span>Proceed to Checkout</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="border-t border-slate-100 pt-5 space-y-3 text-xs text-slate-500 font-semibold">
            <div className="flex items-center space-x-2"><ShieldCheck className="h-4.5 w-4.5 text-primary-500 shrink-0" /><span>Secure checkout & verified payments</span></div>
            <div className="flex items-center space-x-2"><Heart className="h-4.5 w-4.5 text-primary-500 shrink-0" /><span>Plant-safe packaging</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
