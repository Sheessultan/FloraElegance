// frontend/src/pages/Contact.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Contact = () => {
  const [settings, setSettings] = useState({
    contact_email: 'support@floraelegance.com',
    contact_phone: '+91 98765 43210',
    contact_address: 'Greenhouse Tower, Level 4, Outer Ring Road, Bengaluru, Karnataka, 560103',
    contact_working_hours: 'Monday - Saturday: 09:00 AM - 07:00 PM'
  });
  
  const [loading, setLoading] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/settings.php`);
        if (res.data.success) {
          setSettings(prev => ({
            ...prev,
            ...res.data.data
          }));
        }
      } catch (err) {
        console.error('Error loading site settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/inquiries.php`, formData);
      if (res.data.success) {
        setFormSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setFormError(res.data.message || 'Failed to submit your inquiry. Please try again.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit your inquiry. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 animate-fade-in">
          <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-primary-100 text-primary-700 border border-primary-200">
            Reach Out to Us
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-800">
            Let's Start a <span className="text-primary-600 bg-gradient-to-r from-primary-600 to-emerald-600 bg-clip-text text-transparent">Conversation</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed">
            Have a question about a rare spec plant, caring instruction, or an active order? 
            Our dedicated green team is here to assist you at every step of your gardening journey.
          </p>
        </div>

        {/* Dynamic Details / Contact Coordinates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Direct Info Cards */}
          <div className="lg:col-span-5 space-y-6 animate-slide-right">
            
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider pl-1 border-l-4 border-primary-500">
              Contact Channels
            </h3>

            {/* Email Channel */}
            <div className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all duration-300 flex items-start space-x-4 group">
              <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shrink-0">
                <Mail className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Email Support</h4>
                <a 
                  href={`mailto:${settings.contact_email}`} 
                  className="font-extrabold text-sm text-slate-800 hover:text-primary-600 transition-colors break-all"
                >
                  {settings.contact_email}
                </a>
                <p className="text-[11px] text-slate-400 font-semibold">Drop us a line anytime. Expect a reply in 24 hours.</p>
              </div>
            </div>

            {/* Phone Channel */}
            <div className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all duration-300 flex items-start space-x-4 group">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shrink-0">
                <Phone className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Call Our Nursery</h4>
                <a 
                  href={`tel:${settings.contact_phone}`} 
                  className="font-extrabold text-sm text-slate-800 hover:text-emerald-600 transition-colors"
                >
                  {settings.contact_phone}
                </a>
                <p className="text-[11px] text-slate-400 font-semibold">Available for order queries and quick nursery consults.</p>
              </div>
            </div>

            {/* Location Channel */}
            <div className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all duration-300 flex items-start space-x-4 group">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shrink-0">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Botanical Office</h4>
                <p className="font-bold text-sm text-slate-800 leading-snug">
                  {settings.contact_address}
                </p>
                <p className="text-[11px] text-slate-400 font-semibold">Visit our curated showroom to explore active specimens.</p>
              </div>
            </div>

            {/* Working Hours */}
            <div className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all duration-300 flex items-start space-x-4 group">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Working Coordinates</h4>
                <p className="font-extrabold text-sm text-slate-800">
                  {settings.contact_working_hours}
                </p>
                <p className="text-[11px] text-slate-400 font-semibold">Support operations & nursery visiting windows.</p>
              </div>
            </div>

          </div>

          {/* Right Column: Contact Inquiry Form */}
          <div className="lg:col-span-7 animate-slide-left">
            <div className="bg-white border border-slate-100 rounded-[35px] p-8 shadow-md relative overflow-hidden">
              
              <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-primary-300/10 to-emerald-300/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-6 relative">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">Send an Inquiry</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Fill out the quick coordinates and our representative will reach you.</p>
                </div>

                {formSubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 text-center space-y-4 animate-scale-up">
                    <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full">
                      <CheckCircle className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-extrabold text-emerald-800">Message Transmitted!</h4>
                      <p className="text-xs text-emerald-600 font-semibold max-w-sm mx-auto leading-relaxed">
                        A botanical specialist has been allocated to your inquiry. We will contact you at your email coordinate shortly.
                      </p>
                    </div>
                    <button 
                      onClick={() => setFormSubmitted(false)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-sm hover:shadow-md cursor-pointer transition-all inline-flex items-center space-x-1"
                    >
                      <span>Submit New Message</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-4 text-left text-sm text-slate-600 font-semibold">
                    {formError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
                        {formError}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-slate-400">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Your Name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                        />
                      </div>
                      
                      {/* Email */}
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wider text-slate-400">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400">Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="Inquiry Subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wider text-slate-400">Message Details</label>
                      <textarea
                        required
                        rows="4"
                        placeholder="Detail your request or query here..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner resize-none"
                      ></textarea>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-extrabold py-3.5 rounded-full text-xs flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl cursor-pointer transition-all"
                      >
                        <span>Send Message</span>
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </form>
                )}

              </div>

            </div>
          </div>

        </div>

        {/* Dynamic Admin-Controlled Map Rendering */}
        {settings.contact_map_iframe && settings.contact_map_iframe.trim() !== '' && (
          <div className="animate-fade-in w-full overflow-hidden rounded-[35px] shadow-lg border border-slate-100 bg-white">
            <div dangerouslySetInnerHTML={{ __html: settings.contact_map_iframe }} className="w-full h-[400px] sm:h-[450px] [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0" />
          </div>
        )}

      </div>
    </div>
  );
};

export default Contact;
