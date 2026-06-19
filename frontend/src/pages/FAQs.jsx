import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, MessageSquare, Sprout, Truck, CreditCard } from 'lucide-react';

const FAQs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState(null);

  const faqData = [
    {
      category: 'Care & Maintenance',
      icon: <Sprout className="h-5 w-5 text-emerald-600" />,
      questions: [
        {
          q: "How often should I water my indoor plants?",
          a: "Most indoor plants (like Pothos, Snake Plants, and Monstera) prefer the 'soak and dry' method. Water only when the top 2-3 inches of soil feels completely dry to the touch. Succulents and Cacti require watering once every 2-3 weeks, depending on sunlight levels."
        },
        {
          q: "What should I do if the leaves start turning yellow?",
          a: "Yellowing leaves are usually a sign of overwatering or poor drainage. Ensure your pot has adequate drainage holes, and let the soil dry out. If the leaves are yellowing and crispy, the plant might be dehydrated or getting too much direct sunlight."
        },
        {
          q: "Do I need to repot my plants immediately after delivery?",
          a: "We recommend waiting 10-14 days before repotting. Perishable plants experience stress during transit, and changing their pot immediately might cause shock. Let them acclimatize to your space first."
        }
      ]
    },
    {
      category: 'Shipping & Transit',
      icon: <Truck className="h-5 w-5 text-emerald-600" />,
      questions: [
        {
          q: "How do you package live plants safely?",
          a: "We use custom-designed botanical ventilation pods. The pot is secured with organic moisture wrap to prevent soil leakage, and specialized breathable spacer tubes keep the stems standing upright without stress."
        },
        {
          q: "What happens if my plant arrives dead or broken?",
          a: "We offer a 100% Transit Guarantee. If your plant arrives damaged or dead, simply snap a picture and email it to us within 48 hours of delivery. We will ship a replacement specimen to you free of charge."
        },
        {
          q: "Do you ship across India?",
          a: "Yes, we ship to over 15,000 pin codes nationwide. Deliveries within Bengaluru and Mumbai are completed within 24-48 hours, while other regions take 3-5 business days."
        }
      ]
    },
    {
      category: 'Orders & Payments',
      icon: <CreditCard className="h-5 w-5 text-emerald-600" />,
      questions: [
        {
          q: "Can I customize the pots or soil mixes?",
          a: "Absolutely! During checkout, you can select premium terracotta, ceramic, or biodegradable pots. You can also add specialized orchid mixes, succulent potting soils, or organic vermicompost to your cart."
        },
        {
          q: "What payment options do you support?",
          a: "We support UPI, Netbanking, major Credit/Debit cards, and Cash on Delivery (COD) in select pin codes. All transactions are securely routed via UPI and payment gateway partners."
        }
      ]
    }
  ];

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Flatten and filter questions
  let questionCounter = 0;
  const filteredFAQs = faqData.map(cat => {
    const questions = cat.questions.filter(item => 
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...cat, questions };
  }).filter(cat => cat.questions.length > 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Decorative Premium Header */}
      <div className="relative overflow-hidden bg-emerald-950 py-20 px-4 sm:px-6 lg:px-8 text-center shadow-xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-700/20 blur-3xl"></div>
        <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-emerald-600/20 blur-3xl"></div>
        
        <div className="relative max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/50 border border-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300 uppercase tracking-widest">
            <HelpCircle className="h-4 w-4" />
            <span>Support &amp; Knowledgebase</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-emerald-200 text-sm sm:text-base max-w-xl mx-auto font-medium leading-relaxed">
            Find answers to common questions about botanical care, shipping guarantees, and online orders.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto pt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask us anything about plant care or delivery..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 hover:bg-white/[0.15] focus:bg-white text-white focus:text-slate-800 pl-5 pr-12 py-3.5 rounded-2xl border border-white/20 focus:border-white outline-none text-sm transition-all shadow-lg placeholder-emerald-200/60 focus:placeholder-slate-400 font-semibold"
              />
              <Search className="absolute right-4 top-4 text-emerald-200 focus-within:text-slate-400 h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Accordion List */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10 text-left">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <HelpCircle className="mx-auto h-16 w-16 text-slate-300 animate-bounce-slow" />
            <h3 className="font-extrabold text-slate-800 text-lg mt-4">No results found</h3>
            <p className="text-slate-400 text-sm mt-1">
              We couldn't find any answers matching "{searchQuery}". Try another search term.
            </p>
          </div>
        ) : (
          filteredFAQs.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                {cat.icon}
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">{cat.category}</h2>
              </div>

              <div className="space-y-3">
                {cat.questions.map((item) => {
                  const currentIndex = questionCounter++;
                  const isOpen = openIndex === currentIndex;
                  return (
                    <div
                      key={currentIndex}
                      className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden transition-all duration-300"
                    >
                      <button
                        onClick={() => handleToggle(currentIndex)}
                        className="w-full flex items-center justify-between p-5 text-left text-sm font-extrabold text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer outline-none"
                      >
                        <span>{item.q}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {/* Smooth Collapsible Answer Container */}
                      <div
                        className={`transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-[300px] border-t border-slate-50' : 'max-h-0'
                        } overflow-hidden`}
                      >
                        <p className="p-5 text-slate-500 font-semibold text-xs leading-relaxed bg-slate-50/40">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Direct support CTA */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-emerald-50 rounded-[35px] p-8 border border-emerald-100 text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-white rounded-2xl text-emerald-700 shadow-sm shrink-0">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-emerald-950 text-base">Still have questions?</h4>
              <p className="text-xs text-emerald-700 font-semibold">
                Our plant experts and support agents are here to assist you 24/7.
              </p>
            </div>
          </div>
          <a
            href="/contact"
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs px-6 py-3.5 rounded-full shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
          >
            Contact Plant Expert
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQs;
