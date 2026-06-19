import React from 'react';
import { Shield, Eye, Lock } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Decorative Premium Header */}
      <div className="relative overflow-hidden bg-emerald-950 py-20 px-4 sm:px-6 lg:px-8 text-center shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-700/20 blur-3xl"></div>
        <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-emerald-600/20 blur-3xl"></div>
        
        <div className="relative max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/50 border border-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 uppercase tracking-widest">
            <Lock className="h-4 w-4" />
            <span>Data Transparency</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-emerald-200 text-sm sm:text-base max-w-xl mx-auto font-medium leading-relaxed">
            Your data protection is our highest priority. Read how we collect, secure, and manage your information.
          </p>
        </div>
      </div>

      {/* Policy Details Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-left">
        <div className="bg-white border border-slate-100 rounded-[35px] p-8 sm:p-12 shadow-sm space-y-8 text-slate-600 text-sm font-semibold leading-relaxed">
          
          <div className="flex items-center space-x-3 text-slate-900 mb-6">
            <Shield className="h-6 w-6 text-primary-600" />
            <span className="text-xs uppercase tracking-widest font-black text-slate-400">Effective Date: May 19, 2026</span>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">1. Information Collection</h2>
            <p>
              We collect information you directly provide when registering an account, placing a purchase order, or sending inquiries via our contact forms. This may include your name, shipping address, email address, and mobile number.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">2. Cookies &amp; Local Storage</h2>
            <p>
              FloraElegance utilizes local browser storage and cookie tokens to store user login states, track wishlist items, and manage shopping cart sessions. Cookies help us customize and enhance your overall navigation and loading times. You can disable cookies inside your browser settings if preferred.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">3. Data Usage &amp; Consent</h2>
            <p>
              Your data is processed only to execute transactions, arrange shipments, and communicate order tracking updates. We do not rent, sell, or lease your personal information to third-party marketing firms or advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">4. Third-Party Integrations</h2>
            <p>
              We share shipping address details with verified courier partners (e.g. BlueDart, Delhivery) to facilitate physical package delivery. Payment transactions are routed directly through secure RBI-approved payment gateways.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">5. Your Data Access Rights</h2>
            <p>
              You have the right to request access to your personal details stored on our databases, or demand complete deletion of your account. Contact us at <a href="mailto:privacy@floraelegance.com" className="text-emerald-700 underline font-bold">privacy@floraelegance.com</a> for requests.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
