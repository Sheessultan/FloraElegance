const DEFAULT_INVOICE_SETTINGS = {
  invoice_company_name: 'Flora Elegance',
  invoice_tagline: 'Premium Botanical Boutique',
  invoice_title: 'TAX INVOICE',
  invoice_billed_heading: 'Billed To (Customer Details)',
  invoice_ship_heading: 'Shipping Destination',
  invoice_table_heading: 'Item Description',
  invoice_footer_thanks: 'Thank you for choosing Flora Elegance!',
  invoice_footer_support: 'For support, contact support@floraelegance.com or call +91-9876543210',
  invoice_footer_legal: 'This is a computer-generated invoice and does not require a physical signature.',
  invoice_support_email: 'support@floraelegance.com',
  invoice_support_phone: '+91-9876543210',
  invoice_gst_note: '',
  invoice_primary_color: '#059669',
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const mergeInvoiceSettings = (siteSettings = {}) => ({
  ...DEFAULT_INVOICE_SETTINGS,
  ...Object.fromEntries(
    Object.entries(siteSettings).filter(([k]) => k.startsWith('invoice_'))
  ),
});

export const generateInvoice = (order, siteSettings = {}) => {
  const s = mergeInvoiceSettings(siteSettings);
  const primary = s.invoice_primary_color || '#059669';
  const invNo = `#INV-${String(order.id).padStart(6, '0')}`;
  const ordRef = `ORD-${String(order.id).padStart(6, '0')}`;
  const customerName = order.name || order.customer_name || 'Customer';
  const gstBlock = s.invoice_gst_note
    ? `<p style="font-size:12px;color:#666;margin-top:8px;">${esc(s.invoice_gst_note)}</p>`
    : '';

  const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invNo}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; background: #fff; margin: 0; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid ${primary}; padding-bottom: 20px; }
        .header-left h1 { margin: 0; color: ${primary}; font-size: 36px; text-transform: uppercase; letter-spacing: 2px; }
        .header-right { text-align: right; }
        .header-right p { margin: 2px 0; font-size: 14px; color: #666; }
        .details-container { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 20px; }
        .details-section { width: 48%; }
        .details-section h3 { margin-bottom: 10px; color: ${primary}; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .details-section p { margin: 4px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; color: #333; text-transform: uppercase; font-size: 12px; }
        .total-row { font-weight: bold; font-size: 18px; color: ${primary}; }
        .total-row td { border-top: 2px solid ${primary}; }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body onload="window.print()">
      <div class="invoice-box">
        <div class="header">
          <div class="header-left">
            <h1>${esc(s.invoice_company_name)}</h1>
            <p style="font-size: 12px; color: #999; margin-top: 5px;">${esc(s.invoice_tagline)}</p>
            ${gstBlock}
          </div>
          <div class="header-right">
            <h2 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">${esc(s.invoice_title)}</h2>
            <p><strong>Invoice No:</strong> ${invNo}</p>
            <p><strong>Order Ref:</strong> ${ordRef}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="details-container">
          <div class="details-section">
            <h3>${esc(s.invoice_billed_heading)}</h3>
            <p><strong>${esc(customerName)}</strong></p>
            <p>Phone: ${esc(order.phone)}</p>
            <p>Email: ${esc(order.email || 'N/A')}</p>
          </div>
          <div class="details-section">
            <h3>${esc(s.invoice_ship_heading)}</h3>
            <p>${esc(order.address)}</p>
            <p>${esc(order.city)} - ${esc(order.zip)}</p>
            <p><strong>Status:</strong> ${esc((order.status || '').toUpperCase())}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${esc(s.invoice_table_heading)}</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((item) => `
              <tr>
                <td>
                  <strong style="display:block; color:#333;">${esc(item.name)}</strong>
                  <span style="font-size:12px; color:#666;">Size: ${esc(item.size)}</span>
                </td>
                <td style="text-align: right;">₹${parseFloat(item.price).toLocaleString('en-IN')}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">₹${(parseFloat(item.price) * parseInt(item.quantity, 10)).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Grand Total (INR)</td>
              <td style="text-align: right;">₹${parseFloat(order.total_amount).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>${esc(s.invoice_footer_thanks)}</p>
          <p>${esc(s.invoice_footer_support)}</p>
          <p style="margin-top: 10px;"><em>${esc(s.invoice_footer_legal)}</em></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    alert('Please allow pop-ups to print or download the invoice.');
    return;
  }
  newWindow.document.write(invoiceHtml);
  newWindow.document.close();
};
