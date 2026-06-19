import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Search, Ban, ShieldCheck, ShoppingBag, DollarSign, Mail, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const AdminCustomersTab = ({ onNotify }) => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async (q = search) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/customers.php`, { params: q ? { search: q } : {} });
      if (res.data.success) setCustomers(res.data.data);
    } catch (e) {
      onNotify?.(e.response?.data?.message || 'Failed to load customers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleBan = async (userId, isBanned) => {
    const reason = isBanned ? null : window.prompt('Block reason (shown to customer):', 'Policy violation');
    if (!isBanned && reason === null) return;
    setActionLoading(true);
    try {
      const action = isBanned ? 'unban' : 'ban';
      const res = await axios.post(`${API_BASE_URL}/customers.php?action=${action}`, {
        user_id: userId,
        reason: reason || undefined,
      });
      if (res.data.success) {
        onNotify?.(res.data.message, 'success');
        load();
      }
    } catch (e) {
      onNotify?.(e.response?.data?.message || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            Customer Management
          </h3>
          <p className="text-xs text-slate-500 mt-1">Orders, lifetime spend, and ban / unblock accounts.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); load(search); }} className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone..."
              className="pl-9 pr-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-sm font-semibold w-64 outline-none focus:border-primary-500"
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white text-xs font-bold px-4 py-2.5 rounded-full">Search</button>
        </form>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-4 w-14 text-center">S.No</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Orders</th>
                  <th className="px-6 py-4">Total spend</th>
                  <th className="px-6 py-4">Last order</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c, index) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-4 text-center font-bold text-slate-400 text-xs tabular-nums">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3" />{c.email}</p>
                      {c.phone && <p className="text-[10px] text-slate-400 mt-0.5">{c.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <ShoppingBag className="h-3.5 w-3.5 text-primary-600" />
                        {c.total_orders || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-emerald-700">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        ₹{parseFloat(c.total_spend || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {parseInt(c.is_banned, 10) === 1 ? (
                        <span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded-full">Blocked</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleBan(c.id, parseInt(c.is_banned, 10) === 1)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${
                          parseInt(c.is_banned, 10) === 1
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {parseInt(c.is_banned, 10) === 1 ? <><ShieldCheck className="h-3.5 w-3.5" /> Unblock</> : <><Ban className="h-3.5 w-3.5" /> Block</>}
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-semibold">No customers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomersTab;
