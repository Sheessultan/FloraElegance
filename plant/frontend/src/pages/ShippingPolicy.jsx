import React from 'react';
import { Truck, ShieldCheck, Box, RefreshCw } from 'lucide-react';

const ShippingPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Decorative Premium Header */}
      <div className="relative overflow-hidden bg-emerald-950 py-20 px-4 sm:px-6 lg:px-8 text-center shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-700/20 blur-3xl"></div>
        <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-emerald-600/20 blur-3xl"></div>
        
        <div className="relative max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/50 border border-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 uppercase tracking-widest">
            <Truck className="h-4 w-4" />
            <span>Transit & Delivery Warrants</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Shipping & Transit Policy
          </h1>
          <p className="text-emerald-200 text-sm sm:text-base max-w-xl mx-auto font-medium leading-relaxed">
            How we protect, pack, and transport live plant specimens to your doorstep with guaranteed freshness.
          </p>
        </div>
      </div>

      {/* Policy Details Grid */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8 text-left">
        
        {/* Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3">
            <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Transit Guarantee</h3>
            <p className="text-slate-500 font-semibold text-xs leading-relaxed">
              If a specimen arrives damaged, we replace it immediately. Zero questions asked.
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3">
            <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-700">
              <Box className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Thermal Packaging</h3>
            <p className="text-slate-500 font-semibold text-xs leading-relaxed">
              We package roots inside organic moisture-retaining gels and insulated coco-peat.
            </p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center space-y-3">
            <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-700">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Carbon-Neutral</h3>
            <p className="text-slate-500 font-semibold text-xs leading-relaxed">
              We offset all transit emissions through verified reforestation and solar programs.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white border border-slate-100 rounded-[35px] p-8 sm:p-12 shadow-sm space-y-8 text-slate-600 text-sm font-semibold leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">1. Delivery Timelines</h2>
            <p>
              Depending on your location, dispatch times and transit windows vary as follows:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-500">
              <li><strong>Metro Bengaluru & Mumbai:</strong> Same-day dispatch, 24-48 hours delivery.</li>
              <li><strong>Other Metro Cities:</strong> 2 to 3 business days.</li>
              <li><strong>Rest of India (Tier 2/3):</strong> 3 to 5 business days.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">2. Plant Care In Transit</h2>
            <p>
              Live plants require breathing space and hydration. Our custom-designed boxes contain air ventilation pores and stabilizing structural chambers that prevent root dislocation or soil spillage during rough transit. Every plant undergoes a 24-hour hydration soak before dispatch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">3. Shipping Rates</h2>
            <p>
              We offer standard flat-rate shipping of &#x20B9;99 on orders below &#x20B9;999. Orders above &#x20B9;999 qualify for complimentary premium shipping. Additional remote area charges may apply depending on accessibility constraints.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">4. Return & Replacement Exclusions</h2>
            <p>
              Due to the perishable nature of live flora, we do not accept regular returns for "change of mind" requests after delivery is complete. However, if a plant fails to survive within 7 days of delivery, send us a photo, and our plant doctors will evaluate it for a replacement or store credit.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
};

export default ShippingPolicy;
