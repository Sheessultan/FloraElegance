/** Order filters, smart tags, and CSV export for admin */

export const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
];

export const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'last_7', label: 'Last 7 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
];

export const PAYMENT_FILTER_OPTIONS = [
  { value: '', label: 'All payments' },
  { value: 'online', label: 'Online (Razorpay)' },
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'failed_tx', label: 'Failed transactions' },
];

export const DEFAULT_ORDER_FILTERS = {
  status: '',
  dateRange: 'all',
  search: '',
  minPrice: '',
  maxPrice: '',
  payment: '',
};

export const formatOrderNumber = (id) => 'ORD-' + String(id).padStart(6, '0');

export const parseOrderSearchId = (search) => {
  const s = (search || '').trim();
  if (!s) return null;
  const m = s.match(/ORD-0*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const matchesDateRange = (createdAt, range) => {
  if (!range || range === 'all') return true;
  const d = new Date(createdAt);
  const now = new Date();
  const today = startOfDay(now);

  switch (range) {
    case 'today':
      return startOfDay(d).getTime() === today.getTime();
    case 'last_7': {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - 6);
      return d >= cutoff;
    }
    case 'this_month':
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    case 'last_month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    }
    case 'this_year':
      return d.getFullYear() === now.getFullYear();
    case 'last_year':
      return d.getFullYear() === now.getFullYear() - 1;
    default:
      return true;
  }
};

export const getPaymentMethod = (order) => {
  if (order.payment_method === 'cod') return 'cod';
  if (order.razorpay_order_id && String(order.razorpay_order_id).startsWith('order_mock_')) return 'online';
  if (order.razorpay_payment_id || (order.razorpay_order_id && !String(order.razorpay_order_id).startsWith('order_mock_'))) return 'online';
  return order.payment_method || 'online';
};

export const filterOrders = (orders, filters) => {
  const searchId = parseOrderSearchId(filters.search);
  const searchLower = (filters.search || '').trim().toLowerCase();
  const minP = filters.minPrice !== '' ? parseFloat(filters.minPrice) : null;
  const maxP = filters.maxPrice !== '' ? parseFloat(filters.maxPrice) : null;

  return orders.filter((o) => {
    if (filters.status && o.status !== filters.status) return false;
    if (!matchesDateRange(o.created_at, filters.dateRange)) return false;
    if (minP !== null && !Number.isNaN(minP) && parseFloat(o.total_amount) < minP) return false;
    if (maxP !== null && !Number.isNaN(maxP) && parseFloat(o.total_amount) > maxP) return false;

    if (filters.payment === 'cod' && getPaymentMethod(o) !== 'cod') return false;
    if (filters.payment === 'online' && getPaymentMethod(o) !== 'online') return false;
    if (filters.payment === 'failed_tx' && o.status !== 'failed') return false;

    if (searchLower) {
      const idMatch = searchId !== null && o.id === searchId;
      const numMatch = searchId !== null && String(o.id).includes(String(searchId));
      const nameMatch = (o.customer_name || o.name || '').toLowerCase().includes(searchLower);
      const ordMatch = formatOrderNumber(o.id).toLowerCase().includes(searchLower);
      if (!idMatch && !numMatch && !nameMatch && !ordMatch) return false;
    }
    return true;
  });
};

/** Build repeat-customer map from full order list */
export const buildCustomerOrderCounts = (orders) => {
  const counts = {};
  orders.forEach((o) => {
    const uid = o.user_id;
    if (uid) counts[uid] = (counts[uid] || 0) + 1;
  });
  return counts;
};

const HIGH_VALUE_THRESHOLD = 3000;
const RISKY_PENDING_HOURS = 48;

export const getOrderSmartTags = (order, allOrders, customerCounts) => {
  const tags = [];
  const amount = parseFloat(order.total_amount) || 0;
  const uid = order.user_id;

  if (amount >= HIGH_VALUE_THRESHOLD) {
    tags.push({ key: 'high_value', label: 'High Value Order', className: 'bg-amber-50 text-amber-800 border-amber-200' });
  }

  if (uid && (customerCounts[uid] || 0) > 1) {
    tags.push({ key: 'repeat', label: 'Repeat Customer', className: 'bg-indigo-50 text-indigo-800 border-indigo-200' });
  }

  const isRisky =
    order.status === 'failed' ||
    (order.status === 'pending' &&
      (Date.now() - new Date(order.created_at).getTime()) / 3600000 > RISKY_PENDING_HOURS) ||
    (getPaymentMethod(order) === 'cod' && amount >= HIGH_VALUE_THRESHOLD && (customerCounts[uid] || 0) <= 1);

  if (isRisky) {
    tags.push({ key: 'risky', label: 'Risky Order', className: 'bg-rose-50 text-rose-800 border-rose-200' });
  }

  return tags;
};

export const exportOrdersToCsv = (orders, filename = 'orders_export.csv') => {
  const headers = [
    'Order ID', 'Customer', 'Email', 'Phone', 'Status', 'Payment', 'Total',
    'Address', 'City', 'ZIP', 'Created', 'Tracking', 'Carrier', 'Razorpay Order', 'Razorpay Payment',
  ];
  const rows = orders.map((o) => [
    formatOrderNumber(o.id),
    o.customer_name || o.name || '',
    o.email || '',
    o.phone || '',
    o.status || '',
    getPaymentMethod(o) === 'cod' ? 'COD' : 'Online',
    o.total_amount ?? '',
    o.address || '',
    o.city || '',
    o.zip || '',
    o.created_at ? new Date(o.created_at).toISOString() : '',
    o.tracking_number || '',
    o.tracking_carrier || '',
    o.razorpay_order_id || '',
    o.razorpay_payment_id || '',
  ]);

  const escape = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };

  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
