import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Package, AlertTriangle, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { API_BASE_URL } from '../../config';

const AdminInventoryTab = ({ products, siteSettings, onRefresh, onNotify }) => {
  const threshold = parseInt(siteSettings.low_stock_threshold, 10) || 5;
  const [stockEdits, setStockEdits] = useState({});
  const [savingId, setSavingId] = useState(null);

  const lowStock = useMemo(() => products.filter((p) => parseInt(p.stock, 10) <= threshold && parseInt(p.stock, 10) > 0), [products, threshold]);
  const outOfStock = useMemo(() => products.filter((p) => parseInt(p.stock, 10) <= 0), [products]);
  const inactive = useMemo(() => products.filter((p) => parseInt(p.is_active, 10) === 0), [products]);
  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + (parseInt(p.stock, 10) || 0), 0),
    [products]
  );

  const saveStock = async (product) => {
    const newStock = stockEdits[product.id] !== undefined ? parseInt(stockEdits[product.id], 10) : parseInt(product.stock, 10);
    if (Number.isNaN(newStock) || newStock < 0) return;
    setSavingId(product.id);
    try {
      await axios.put(`${API_BASE_URL}/products.php?id=${product.id}`, {
        ...product,
        stock: newStock,
        is_active: newStock > 0 ? (product.is_active ?? 1) : 0,
      });
      onNotify?.(`Stock updated for ${product.name}.`, 'success');
      onRefresh?.();
      setStockEdits((prev) => { const n = { ...prev }; delete n[product.id]; return n; });
    } catch (e) {
      onNotify?.(e.response?.data?.message || 'Update failed.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (product) => {
    try {
      await axios.put(`${API_BASE_URL}/products.php?id=${product.id}`, {
        ...product,
        is_active: parseInt(product.is_active, 10) === 1 ? 0 : 1,
      });
      onRefresh?.();
    } catch (e) {
      onNotify?.(e.response?.data?.message || 'Toggle failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            Inventory Management
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Low stock alert at ≤{threshold} units · Auto-disable OOS: {siteSettings.auto_disable_out_of_stock === '1' ? 'On' : 'Off'}
          </p>
        </div>
        <button onClick={onRefresh} className="text-xs font-bold text-primary-600 bg-primary-50 px-4 py-2 rounded-full flex items-center gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-black uppercase text-primary-800">Total stock (all products)</p>
          <p className="text-3xl font-black text-primary-900">{totalStock.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-primary-600/80 font-semibold mt-1">{products.length} SKU{products.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase text-amber-800">Low stock</p>
          <p className="text-3xl font-black text-amber-900">{lowStock.length}</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase text-rose-800">Out of stock</p>
          <p className="text-3xl font-black text-rose-900">{outOfStock.length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase text-slate-600">Hidden (inactive)</p>
          <p className="text-3xl font-black text-slate-900">{inactive.length}</p>
        </div>
      </div>

      {(lowStock.length > 0) && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-900">
            {lowStock.length} product(s) need restocking. Adjust threshold in Website Settings → Inventory.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-4 w-14 text-center">S.No</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Shop visible</th>
                <th className="px-6 py-4 text-center">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p, index) => {
                const stk = parseInt(p.stock, 10);
                const isLow = stk <= threshold && stk > 0;
                const isOos = stk <= 0;
                return (
                  <tr key={p.id} className={isOos ? 'bg-rose-50/30' : isLow ? 'bg-amber-50/20' : ''}>
                    <td className="px-4 py-4 text-center font-bold text-slate-400 text-xs tabular-nums">{index + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        value={stockEdits[p.id] !== undefined ? stockEdits[p.id] : p.stock}
                        onChange={(e) => setStockEdits({ ...stockEdits, [p.id]: e.target.value })}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-center"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {isOos ? (
                        <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-1 rounded-full border border-rose-200">Out of stock</span>
                      ) : isLow ? (
                        <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">Low</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">OK</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button type="button" onClick={() => toggleActive(p)} className="inline-flex text-primary-600">
                        {parseInt(p.is_active, 10) === 1 ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        disabled={savingId === p.id}
                        onClick={() => saveStock(p)}
                        className="text-xs font-bold bg-primary-600 text-white px-3 py-1.5 rounded-full disabled:opacity-50"
                      >
                        {savingId === p.id ? '...' : 'Update'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInventoryTab;
