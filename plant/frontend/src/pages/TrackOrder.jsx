import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Search, Truck, MapPin, CreditCard, Banknote, CheckCircle,
  AlertTriangle, Loader2, Mail, Hash, ArrowRight, Clock, ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { formatOrderNumber, getPaymentMethod } from '../utils/orderHelpers';
import { useAuth } from '../context/AuthContext';

const STATUS_STEPS = [
  { key: 'placed', label: 'Order placed', sub: 'Confirmed' },
  { key: 'paid', label: 'Payment', sub: 'Secured' },
  { key: 'shipped', label: 'Shipped', sub: 'In transit' },
  { key: 'delivered', label: 'Delivered', sub: 'Completed' },
];

const isStepActive = (status, step) => {
  if (step === 'placed') return true;
  if (step === 'paid') return ['paid', 'shipped', 'delivered'].includes(status);
  if (step === 'shipped') return ['shipped', 'delivered'].includes(status);
  if (step === 'delivered') return status === 'delivered';
  return false;
};

const progressWidth = (status) => {
  if (status === 'failed') return '0%';
  if (status === 'pending') return '15%';
  if (status === 'paid') return '40%';
  if (status === 'shipped') return '72%';
  if (status === 'delivered') return '100%';
  return '0%';
};

const statusBadge = (status) => {
  const map = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    shipped: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    delivered: 'bg-teal-50 text-teal-800 border-teal-200',
    failed: 'bg-rose-50 text-rose-800 border-rose-200',
  };
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase border ${map[status] || map.pending}`}>
      {status}
    </span>
  );
};

const TrackOrder = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('order') || '');
  const [email, setEmail] = useState(searchParams.get('email') || user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  const runTrack = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setOrder(null);
    const oid = orderId.trim();
    const em = email.trim();
    if (!oid || !em) {
      setError('Enter your Order ID and the email used at checkout.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/track.php`, {
        params: { order: oid, email: em },
      });
      if (res.data.success) {
        setOrder(res.data.data);
      } else {
        setError(res.data.message || 'Order not found.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not find this order. Verify ID and email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qOrder = searchParams.get('order');
    const qEmail = searchParams.get('email');
    if (qOrder && qEmail) {
      setOrderId(qOrder);
      setEmail(qEmail);
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await axios.get(`${API_BASE_URL}/track.php`, {
            params: { order: qOrder, email: qEmail },
          });
          if (res.data.success) setOrder(res.data.data);
          else setError(res.data.message);
        } catch (err) {
          setError(err.response?.data?.message || 'Order not found.');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [searchParams]);

  const pay = order ? getPaymentMethod(order) : null;
  const isCod = pay === 'cod';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-primary-200">
            <Truck className="h-3.5 w-3.5" />
            Live order tracking
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Track Your Order</h1>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Enter your order number and checkout email to see delivery status, tracking AWB, and package details.
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
          <form onSubmit={runTrack} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Order ID
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="ORD-000042 or 42"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-primary-500 focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Checkout email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-primary-500 focus:bg-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold px-8 py-3.5 rounded-full shadow-md transition-all"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              {loading ? 'Tracking...' : 'Track package'}
            </button>
          </form>

          {error && (
            <div className="mt-5 flex items-start gap-3 bg-rose-50 border border-rose-100 text-rose-800 text-sm font-semibold rounded-2xl p-4">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {user && !order && (
            <p className="mt-4 text-xs text-slate-500 font-semibold text-center">
              Logged in? View all orders on{' '}
              <Link to="/dashboard" className="text-primary-600 font-bold hover:underline">My Dashboard</Link>
            </p>
          )}
        </div>

        {order && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Tracking result</p>
                  <h2 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                    {order.order_number || formatOrderNumber(order.id)}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-2 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Placed {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(order.status)}
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${isCod ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                    {isCod ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                    {isCod ? 'COD' : 'Online'}
                  </span>
                </div>
              </div>

              {order.status === 'failed' ? (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-rose-800 text-sm font-semibold flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  This order could not be completed. Contact support if you were charged.
                </div>
              ) : (
                <div className="mb-8">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Delivery progress</h3>
                  <div className="relative pt-2">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
                      <div className="h-full bg-primary-600 rounded-full transition-all duration-700" style={{ width: progressWidth(order.status) }} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
                      {STATUS_STEPS.map((step, i) => {
                        const active = isStepActive(order.status, step.key);
                        const codPending = isCod && step.key === 'paid' && order.status === 'pending';
                        return (
                          <div key={step.key} className="flex flex-col items-center">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm -mt-12 mb-2 ${active ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              {active ? <CheckCircle className="h-4 w-4" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                            </div>
                            <span className={`font-bold ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                              {step.key === 'paid' && isCod ? 'COD' : step.label}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {codPending && step.key === 'paid' ? 'On delivery' : step.sub}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {order.tracking_number && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
                  <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Truck className="h-4 w-4" />
                    Courier tracking
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">AWB / Tracking no.</p>
                      <p className="font-mono font-bold text-indigo-900 text-lg">{order.tracking_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Carrier</p>
                      <p className="font-bold text-slate-800">{order.tracking_carrier || 'Standard courier'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Status</p>
                      <p className="font-bold text-indigo-800">{order.tracking_status || 'In progress'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <h3 className="text-xs font-black text-slate-600 uppercase mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary-600" />
                    Delivery address
                  </h3>
                  <p className="font-bold text-slate-900">{order.name}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {order.address}, {order.city} — {order.zip}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">{order.phone}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <h3 className="text-xs font-black text-slate-600 uppercase mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary-600" />
                    Order summary
                  </h3>
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-slate-800">{order.items?.length || 0}</span> item(s)
                  </p>
                  <p className="text-2xl font-black text-primary-700 mt-2">
                    ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
                  </p>
                  {isCod && order.status === 'pending' && (
                    <p className="text-xs text-amber-700 font-bold mt-2">Pay in cash when your plants arrive.</p>
                  )}
                </div>
              </div>

              {order.items?.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Items in this package</h3>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                    {order.items.map((item) => (
                      <div key={item.product_id} className="flex items-center gap-4 p-4 bg-white hover:bg-slate-50/50">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl object-cover border border-slate-100 shrink-0"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&w=200&q=80'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.size} · Qty {item.quantity}</p>
                        </div>
                        <span className="font-black text-slate-900 shrink-0 text-sm">
                          ₹{(parseFloat(item.price) * parseInt(item.quantity, 10)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <Link to="/contact" className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  Need help? Contact support <ExternalLink className="h-3 w-3" />
                </Link>
                {user && (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-5 py-2.5 rounded-full"
                  >
                    My account <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-400 font-semibold pb-4">
          Order ID is in your confirmation email · Format: <span className="font-mono text-slate-600">ORD-000123</span>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
