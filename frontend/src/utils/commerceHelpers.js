/** Shipping & coupon calculations from site settings */

export const calcShippingFee = (subtotal, settings = {}, paymentMethod = 'online') => {
  const enabled = settings.shipping_enabled !== '0' && settings.shipping_enabled !== 0;
  if (!enabled) return 0;

  const fee = parseFloat(settings.shipping_fee) || 99;
  const threshold = parseFloat(settings.shipping_free_threshold) || 999;
  const insurance = (settings.shipping_insurance_enabled !== '0' && settings.shipping_insurance_enabled !== 0)
    ? (parseFloat(settings.shipping_insurance_fee) || 0) : 0;
  const codExtra = paymentMethod === 'cod' ? (parseFloat(settings.shipping_cod_extra_fee) || 0) : 0;

  const base = subtotal >= threshold || subtotal <= 0 ? 0 : fee;
  return base + insurance + codExtra;
};

export const getShippingLabel = (settings = {}) => settings.shipping_label || 'Secure Shipping';

export const parseContentSections = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : [];
  } catch {
    return [];
  }
};

export const defaultContentSection = () => ({
  id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  title: 'New Section',
  type: 'text',
  content: '',
  items: [],
  sort_order: 0,
});
