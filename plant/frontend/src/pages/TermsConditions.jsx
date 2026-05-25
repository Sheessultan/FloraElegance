import React from 'react';
import { Scale, Shield, FileText } from 'lucide-react';

const TermsConditions = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Decorative Premium Header */}
      <div className="relative overflow-hidden bg-emerald-950 py-20 px-4 sm:px-6 lg:px-8 text-center shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-700/20 blur-3xl"></div>
        <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-emerald-600/20 blur-3xl"></div>
        
        <div className="relative max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/50 border border-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 uppercase tracking-widest">
            <Scale className="h-4 w-4" />
            <span>Legal Framework</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-emerald-200 text-sm sm:text-base max-w-xl mx-auto font-medium leading-relaxed">
            Please read these terms carefully before transacting or using the FloraElegance platform.
          </p>
        </div>
      </div>

      {/* Policy Details Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-left">
        <div className="bg-white border border-slate-100 rounded-[35px] p-8 sm:p-12 shadow-sm space-y-8 text-slate-600 text-sm font-semibold leading-relaxed">
          
          <div className="flex items-center space-x-3 text-slate-900 mb-6">
            <FileText className="h-6 w-6 text-primary-600" />
            <span className="text-xs uppercase tracking-widest font-black text-slate-400">Effective Date: May 19, 2026</span>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or placing an order on FloraElegance, you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions. If you do not agree, please refrain from using the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">2. Plant Representations &amp; Sizing</h2>
            <p>
              Plants are living, breathing organisms. Therefore, shapes, colorations, and foliage counts will vary naturally. While we attempt to display accurate representations and approximate dimensions of all flora, the product delivered may exhibit minor structural differences from catalog illustrations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">3. User Accounts</h2>
            <p>
              To purchase certain products or access premium user loyalty dashboards, you must register a secure account. You are solely responsible for maintaining the confidentiality of your login credentials and passwords. Any unauthorized activity should be reported immediately.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">4. Payments &amp; Invoicing</h2>
            <p>
              All listed product pricing is inclusive of statutory GST unless stated otherwise. FloraElegance reserves the right to revise or adjust prices without prior notice. Payment clearances are verified by external secure gateways, and we do not store customer credit card credentials on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">5. Limitation of Liability</h2>
            <p>
              FloraElegance is not liable for any secondary damages arising from plant health issues, improper placement, or failure to follow care guides. In no event shall our liability exceed the purchase price of the specific product.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
