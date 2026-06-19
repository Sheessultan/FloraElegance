import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Calendar, CheckCircle, Leaf, User, Mail, Phone, MapPin, Loader2, Sparkles, Banknote, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { calcShippingFee, getShippingLabel } from '../utils/commerceHelpers';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, cartTotal, clearCart, loading: cartLoading } = useCart();

  // Shipping Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    zip: ''
  });

  // Flow control states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [showMockPopup, setShowMockPopup] = useState(false);
  const [mockOrderDetails, setMockOrderDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [siteSettings, setSiteSettings] = useState({ cod_enabled: '1', cod_min_order: '499' });
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const shippingFee = calcShippingFee(cartTotal, siteSettings, paymentMethod);
  const discount = appliedCoupon?.discount || 0;
  const grandTotal = Math.max(0, cartTotal + shippingFee - discount);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/settings.php`).then((res) => {
      if (res.data.success) setSiteSettings(res.data.data);
    }).catch(() => {});
    try {
      const saved = sessionStorage.getItem('applied_coupon');
      if (saved) setAppliedCoupon(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const codEnabled = siteSettings.cod_enabled === '1' || siteSettings.cod_enabled === 1;
  const codMinOrder = parseFloat(siteSettings.cod_min_order) || 0;
  const codAvailable = codEnabled && grandTotal >= codMinOrder;

  useEffect(() => {
    if (!codAvailable && paymentMethod === 'cod') setPaymentMethod('online');
  }, [codAvailable, paymentMethod]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Protect route locally in case they direct URL navigate
  // Wait for cart sync before treating empty cart as "leave checkout"
  useEffect(() => {
    if (cartLoading) return;
    if (cart.length === 0 && !orderSuccess) {
      navigate('/cart');
    }
  }, [cart, orderSuccess, cartLoading, navigate]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Submit form and trigger Payment
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Create order record on PHP server & fetch Razorpay Order ID
      const orderResponse = await axios.post(`${API_BASE_URL}/orders.php`, {
        ...formData,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code || undefined,
      });
      
      if (orderResponse.data.success) {
        const orderData = orderResponse.data;

        if (orderData.is_cod) {
          setPlacedOrderId(orderData.order_id);
          setOrderSuccess(true);
          clearCart();
          sessionStorage.removeItem('applied_coupon');
          setLoading(false);
          return;
        }

        // 2. Check if the payment returned is Mock (e.g. server in local offline dev)
        if (orderData.is_mock) {
          setMockOrderDetails(orderData);
          setLoading(false);
          setShowMockPopup(true);
        } else {
          // 3. Initiate Real Razorpay SDK Checkout
          if (typeof window.Razorpay === 'undefined') {
            throw new Error('Razorpay SDK failed to load. Please check your internet connection or use fallback mock.');
          }

          const options = {
            key: orderData.key_id,
            amount: Math.round(orderData.amount * 100), // in paise
            currency: orderData.currency || 'INR',
            name: 'FloraElegance Store',
            description: 'Order Payment Receipt #' + orderData.order_id,
            image: 'https://example.com/', 
            order_id: orderData.razorpay_order_id,
            handler: async function (response) {
              setLoading(true);
              try {
                // 4. Verify payment signature on Server
                const verifyResponse = await axios.post(`${API_BASE_URL}/orders.php?action=verify`, {
                  order_id: orderData.order_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });

                if (verifyResponse.data.success) {
                  setPlacedOrderId(orderData.order_id);
                  setOrderSuccess(true);
                  clearCart();
        sessionStorage.removeItem('applied_coupon');
                } else {
                  setError('Payment signature verification failed. Placed order is pending.');
                }
              } catch (verifyErr) {
                setError(verifyErr.response?.data?.message || 'Payment verification failed.');
              } finally {
                setLoading(false);
              }
            },
            prefill: {
              name: formData.name,
              email: formData.email,
              contact: formData.phone
            },
            notes: {
              address: formData.address + ', ' + formData.city
            },
            theme: {
              color: '#15803d'
            },
            modal: {
              ondismiss: () => setLoading(false),
            },
          };

          const rzpInstance = new window.Razorpay(options);
          rzpInstance.on('payment.failed', function (resp) {
            setError(resp.error.description || 'Payment transaction failed.');
            setLoading(false);
          });

          rzpInstance.open();
        }
      } else {
        setError(orderResponse.data.message || 'Failed to place order.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error processing payment checkout.');
      setLoading(false);
    }
  };

  // Process Mock Payment simulation
  const handleMockPaymentSuccess = async () => {
    if (!mockOrderDetails) return;
    setShowMockPopup(false);
    setLoading(true);

    try {
      const verifyResponse = await axios.post(`${API_BASE_URL}/orders.php?action=verify`, {
        order_id: mockOrderDetails.order_id,
        razorpay_order_id: mockOrderDetails.razorpay_order_id,
        razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substr(2, 9),
        razorpay_signature: 'MOCK_PAYMENT_SIGNATURE'
      });

      if (verifyResponse.data.success) {
        setPlacedOrderId(mockOrderDetails.order_id);
        setOrderSuccess(true);
        clearCart();
        sessionStorage.removeItem('applied_coupon');
      } else {
        setError('Mock signature check failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Mock transaction error.');
    } finally {
      setLoading(false);
    }
  };

  // ================= ORDER CONFIRMATION / SUCCESS VIEW =================
  if (orderSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 min-h-screen text-center flex flex-col items-center justify-center">
        
        {/* Animated Checkbox */}
        <div className="bg-emerald-100/80 p-6 rounded-full text-emerald-600 border-4 border-white shadow-xl animate-fade-in">
          <CheckCircle className="h-16 w-16 fill-emerald-600 text-white" />
        </div>
        
        <span className="mt-6 inline-flex items-center space-x-1 bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-xs font-bold border border-primary-200">
          <Sparkles className="h-3 w-3" />
          <span>Payment Authorized Successfully</span>
        </span>

        <h2 className="text-3xl font-extrabold text-slate-900 mt-4 leading-tight">Your Plants are En-route!</h2>
        
        <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-sm">
          Thank you for choosing FloraElegance. We have registered your shipping address and our botanists are preparing your green variety packages.
        </p>

        {/* Order Details box */}
        <div className="w-full bg-slate-50 border border-slate-200/60 rounded-3xl p-6 text-left my-8 shadow-inner space-y-4">
          <div className="flex justify-between items-center text-sm border-b border-slate-200/40 pb-3">
            <span className="text-slate-400 font-semibold">Registered Order ID</span>
            <span className="font-extrabold text-slate-800">#FE-00{placedOrderId}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-slate-200/40 pb-3">
            <span className="text-slate-400 font-semibold">Delivery Time</span>
            <span className="font-extrabold text-slate-800 flex items-center space-x-1">
              <Calendar className="h-4 w-4 text-primary-600" />
              <span>3 to 5 Business Days</span>
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-semibold">Shipment Address</span>
            <span className="font-bold text-slate-800 max-w-[200px] truncate">{formData.address}, {formData.city}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Link 
            to="/" 
            className="flex-grow bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm py-4 rounded-full shadow-md hover:shadow-lg transition-all"
          >
            Return to Homepage
          </Link>
          <Link 
            to="/shop" 
            className="flex-grow bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm py-4 rounded-full shadow-md border border-slate-200 transition-all"
          >
            Shop More Plants
          </Link>
        </div>

      </div>
    );
  }

  // ================= MAIN CHECKOUT SHIPPING INTERFACE =================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen text-left">
      
      {/* Page Title */}
      <div className="border-b border-slate-100 pb-5 mb-10">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Checkout Details</h1>
        <p className="text-sm text-slate-500 mt-1">Specify your secure shipping information and authorize the transaction.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-semibold mb-6 flex items-center space-x-2.5 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left: Shipping Form */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[35px] p-6 sm:p-10 shadow-sm space-y-6">
          <h3 className="font-extrabold text-slate-900 text-lg border-b border-slate-50 pb-4">Shipping Destination</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Name */}
            <div className="space-y-1.5 text-slate-600 col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider">Receiver Name</label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-sm transition-all shadow-inner"
                />
                <User className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5 text-slate-600">
              <label className="text-xs font-bold uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g. jane@example.com"
                  className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-sm transition-all shadow-inner"
                />
                <Mail className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5 text-slate-600">
              <label className="text-xs font-bold uppercase tracking-wider">Phone Contact</label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-sm transition-all shadow-inner"
                />
                <Phone className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>

            {/* Street Address */}
            <div className="space-y-1.5 text-slate-600 col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider">Street Address</label>
              <div className="relative">
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. Apartment, Suite, Street name"
                  className="w-full bg-slate-50 focus:bg-white text-slate-800 pl-10 pr-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-sm transition-all shadow-inner"
                />
                <MapPin className="absolute left-3.5 top-3.5 text-slate-400 h-4 w-4" />
              </div>
            </div>

            {/* City */}
            <div className="space-y-1.5 text-slate-600">
              <label className="text-xs font-bold uppercase tracking-wider">City</label>
              <input
                type="text"
                name="city"
                required
                value={formData.city}
                onChange={handleInputChange}
                placeholder="e.g. Bangalore"
                className="w-full bg-slate-50 focus:bg-white text-slate-800 px-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-sm transition-all shadow-inner"
              />
            </div>

            {/* Zip */}
            <div className="space-y-1.5 text-slate-600">
              <label className="text-xs font-bold uppercase tracking-wider">Zip / Postal Code</label>
              <input
                type="text"
                name="zip"
                required
                value={formData.zip}
                onChange={handleInputChange}
                placeholder="e.g. 560001"
                className="w-full bg-slate-50 focus:bg-white text-slate-800 px-4 py-3 rounded-xl border border-transparent focus:border-primary-500 outline-none text-sm transition-all shadow-inner"
              />
            </div>

          </div>
        </div>

        {/* Right: Checkout summaries & CTA */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[35px] p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="font-extrabold text-slate-900 text-lg border-b border-slate-50 pb-4">Your Purchase</h3>
          
          {/* Items Summary list */}
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-2">
            {cart.map((item) => (
              <div key={item.product_id} className="py-3 flex justify-between items-center text-sm">
                <div className="flex items-center space-x-3 truncate">
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="h-10 w-10 rounded-lg object-cover border border-slate-100 shrink-0 shadow-sm"
                  />
                  <div className="truncate">
                    <h5 className="font-bold text-slate-800 truncate">{item.name}</h5>
                    <span className="text-[10px] text-slate-400 font-bold">QTY: {item.quantity}</span>
                  </div>
                </div>
                <span className="font-extrabold text-slate-900 shrink-0 pl-4">
                  &#x20B9;{(((item.selling_price && parseFloat(item.selling_price) > 0 && parseFloat(item.selling_price) < parseFloat(item.price)) ? parseFloat(item.selling_price) : parseFloat(item.price)) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="border-t border-slate-100 pt-4 space-y-3.5 text-sm">
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Cart Subtotal</span>
              <span className="font-bold text-slate-800">&#x20B9;{cartTotal.toFixed(2)}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-semibold">
                <span>Coupon ({appliedCoupon?.code})</span>
                <span className="font-bold">−&#x20B9;{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>{getShippingLabel(siteSettings)}</span>
              {shippingFee === 0 ? (
                <span className="font-bold text-emerald-600 uppercase text-xs">Free Shipping</span>
              ) : (
                <span className="font-bold text-slate-800">&#x20B9;{shippingFee.toFixed(2)}</span>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-slate-950 font-black">
              <span className="font-extrabold text-base">Grand Total</span>
              <span className="text-xl font-black">&#x20B9;{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Method</h4>
            <label className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-primary-500 bg-primary-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
              <input type="radio" name="payment" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="accent-primary-600" />
              <CreditCard className="h-5 w-5 text-primary-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-800 text-sm block">Pay Online</span>
                <span className="text-[10px] text-slate-500">UPI, Card, Netbanking via Razorpay</span>
              </div>
            </label>
            {codEnabled ? (
              <label className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${!codAvailable ? 'opacity-50 cursor-not-allowed border-slate-100' : paymentMethod === 'cod' ? 'border-amber-500 bg-amber-50/50 cursor-pointer' : 'border-slate-100 hover:border-slate-200 cursor-pointer'}`}>
                <input type="radio" name="payment" value="cod" disabled={!codAvailable} checked={paymentMethod === 'cod'} onChange={() => codAvailable && setPaymentMethod('cod')} className="accent-amber-600" />
                <Banknote className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 text-sm block">Cash on Delivery</span>
                  <span className="text-[10px] text-slate-500">
                    {codAvailable ? `Pay when delivered · Min order ₹${codMinOrder}` : `Available on orders ₹${codMinOrder}+ (your total ₹${grandTotal.toFixed(0)})`}
                  </span>
                </div>
              </label>
            ) : (
              <p className="text-[10px] text-slate-400 font-semibold px-1">COD is currently unavailable.</p>
            )}
          </div>

          {/* Order Placement CTA */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-full shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 text-white animate-spin shrink-0" />
                <span>Processing Order...</span>
              </>
            ) : paymentMethod === 'cod' ? (
              <>
                <Banknote className="h-4.5 w-4.5 text-white shrink-0" />
                <span>Place COD Order · &#x20B9;{grandTotal.toFixed(0)}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4.5 w-4.5 text-white shrink-0" />
                <span>Authorize & Pay &#x20B9;{grandTotal.toFixed(0)}</span>
              </>
            )}
          </button>

          <div className="text-[10px] text-slate-400 font-semibold leading-relaxed text-center">
            {paymentMethod === 'cod'
              ? 'You will pay in cash when your order is delivered. In transit healthy plant guarantees apply.'
              : 'By placing the order, you authorize the secure payment transaction. In transit healthy seed guarantees apply.'}
          </div>

        </div>

      </form>

      {/* ================= MOCK PAYMENT GATEWAY MODAL POPUP ================= */}
      {showMockPopup && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={() => setShowMockPopup(false)}></div>
          
          <div className="relative bg-white border border-slate-100 max-w-md w-full rounded-[35px] p-6 sm:p-8 shadow-2xl text-center space-y-6 z-50 animate-fade-in">
            <div className="bg-primary-50 p-4 rounded-full text-primary-600 inline-block">
              <Leaf className="h-10 w-10 animate-bounce-slow" />
            </div>
            
            <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold border border-amber-200">
              <span>Sandbox Payment Simulator</span>
            </span>

            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-900 text-xl">FloraElegance Sandbox Payment</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                We detected that the backend is configured in test simulation mode (or dummy keys are active). You can authorize the payment mock below.
              </p>
            </div>

            {/* Receipt specs */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left space-y-2 text-xs font-semibold text-slate-600 shadow-inner">
              <div className="flex justify-between">
                <span>Receiver Address:</span>
                <span className="text-slate-800">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Receipt Number:</span>
                <span className="text-slate-800">#FE-00{mockOrderDetails?.order_id}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/40 pt-2 font-bold text-slate-800">
                <span>Amount Chargeable:</span>
                <span className="text-primary-700">&#x20B9;{mockOrderDetails?.amount} INR</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleMockPaymentSuccess}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-full shadow-md text-sm cursor-pointer"
              >
                Simulate Successful Payment
              </button>
              <button
                onClick={() => {
                  setShowMockPopup(false);
                  setError('Payment simulation cancelled by user.');
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-full text-xs"
              >
                Cancel Simulation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Checkout;
