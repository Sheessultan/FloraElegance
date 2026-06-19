import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tag, Plus, Edit2, Trash2, Loader2, X, Check } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: '10',
  min_order: '0',
  max_discount: '',
  usage_limit: '',
  starts_at: '',
  expires_at: '',
  is_active: 1,
};

const AdminCouponsTab = ({ onNotify }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/coupons.php`);
      if (res.data.success) setCoupons(res.data.data);
    } catch (e) {
      onNotify?.(e.response?.data?.message || 'Failed to load coupons.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setSelected(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c) => {
    setSelected(c);
    setForm({
      code: c.code,
      description: c.description || '',
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order: String(c.min_order || 0),
      max_discount: c.max_discount != null ? String(c.max_discount) : '',
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
      is_active: parseInt(c.is_active, 10),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, code: form.code.toUpperCase() };
      if (selected) {
        await axios.put(`${API_BASE_URL}/coupons.php?id=${selected.id}`, payload);
        onNotify?.('Coupon updated.', 'success');
      } else {
        await axios.post(`${API_BASE_URL}/coupons.php`, payload);
        onNotify?.('Coupon created.', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      onNotify?.(err.response?.data?.message || 'Save failed.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/coupons.php?id=${id}`);
      onNotify?.('Coupon deleted.', 'success');
      load();
    } catch (err) {
      onNotify?.(err.response?.data?.message || 'Delete failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary-600" />
            Coupon & Discounts
          </h3>
          <p className="text-xs text-slate-500 mt-1">Create codes customers apply on the cart page.</p>
        </div>
        <button onClick={openAdd} className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4 py-2.5 rounded-full flex items-center gap-1">
          <Plus className="h-4 w-4" /> Add coupon
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-4 w-14 text-center">S.No</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Min order</th>
                <th className="px-6 py-4">Used</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((c, index) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-4 text-center font-bold text-slate-400 text-xs tabular-nums">{index + 1}</td>
                  <td className="px-6 py-4 font-mono font-bold text-primary-700">{c.code}</td>
                  <td className="px-6 py-4 font-semibold">
                    {c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`}
                    {c.max_discount && c.discount_type === 'percent' && (
                      <span className="text-[10px] text-slate-400 block">max ₹{c.max_discount}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">₹{parseFloat(c.min_order || 0).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${parseInt(c.is_active, 10) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                      {parseInt(c.is_active, 10) ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <button onClick={() => openEdit(c)} className="p-2 hover:bg-primary-50 rounded-full text-slate-500 hover:text-primary-600"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-rose-50 rounded-full text-slate-500 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No coupons yet. Add GREEN10 for your promo bar.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h4 className="font-extrabold text-slate-900">{selected ? 'Edit coupon' : 'New coupon'}</h4>
              <button onClick={() => setModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CODE" className="w-full bg-slate-50 rounded-xl px-4 py-2.5 font-mono font-bold" />
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full bg-slate-50 rounded-xl px-4 py-2.5" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="bg-slate-50 rounded-xl px-3 py-2.5 font-bold">
                  <option value="percent">Percent %</option>
                  <option value="fixed">Fixed ₹</option>
                </select>
                <input type="number" required min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="bg-slate-50 rounded-xl px-4 py-2.5" />
              </div>
              <input type="number" min="0" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} placeholder="Min order ₹" className="w-full bg-slate-50 rounded-xl px-4 py-2.5" />
              <input type="number" min="0" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} placeholder="Max discount (percent only)" className="w-full bg-slate-50 rounded-xl px-4 py-2.5" />
              <input type="number" min="0" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Usage limit (empty = unlimited)" className="w-full bg-slate-50 rounded-xl px-4 py-2.5" />
              <label className="flex items-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={form.is_active === 1} onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} />
                Active
              </label>
              <button type="submit" className="w-full bg-primary-600 text-white font-bold py-3 rounded-full flex items-center justify-center gap-1">
                <Check className="h-4 w-4" /> Save coupon
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponsTab;
