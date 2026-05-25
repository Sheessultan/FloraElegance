import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Phone, Mail, MapPin, Heart } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Footer = () => {
  const [settings, setSettings] = useState({
    contact_email: 'care@floraelegance.com',
    contact_phone: '+91 98765 43210',
    contact_address: 'Greenhouse Tower, Level 4, Outer Ring Road, Bengaluru, Karnataka, 560103'
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
        // fail silently
      }
    };
    fetchSettings();
  }, []);

  const [subscribeStatus, setSubscribeStatus] = useState(null);

  const handleSubscribe = (e) => {
    e.preventDefault();
    setSubscribeStatus('success');
    setTimeout(() => setSubscribeStatus(null), 3000);
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Brand Info */}
          <div className="space-y-4 text-left">
            <Link to="/" className="flex items-center space-x-2 text-white">
              <Leaf className="h-7 w-7 text-primary-500" />
              <span className="font-extrabold text-xl tracking-tight">
                Flora<span className="text-primary-400 font-light">Elegance</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Premium curated house plants, indoor greenery, rare collectors specimens, and gardening accessories delivered directly to your doorstep.
            </p>
            
            {/* Social links with bulletproof inline SVGs */}
            <div className="flex space-x-4">
              <a href={settings.footer_social_facebook || '#'} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-primary-400 transition-colors p-2 bg-slate-800 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
              <a href={settings.footer_social_instagram || '#'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-primary-400 transition-colors p-2 bg-slate-800 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href={settings.footer_social_twitter || '#'} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-primary-400 transition-colors p-2 bg-slate-800 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Group 1 Links */}
          <div className="text-left">
            <h4 className="text-white font-bold mb-4 tracking-wider uppercase text-xs">{settings.footer_group1_title || 'Navigation'}</h4>
            <ul className="space-y-2.5 text-sm">
              {settings.footer_group1_links && settings.footer_group1_links.split('\n').filter(l => l.includes('|')).map((line, idx) => {
                const [label, url] = line.split('|');
                const isExternal = url.trim().startsWith('http');
                return (
                  <li key={idx}>
                    {isExternal ? (
                      <a href={url.trim()} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition-colors">{label.trim()}</a>
                    ) : (
                      <Link to={url.trim()} className="hover:text-primary-400 transition-colors">{label.trim()}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Group 2 Links */}
          <div className="text-left">
            <h4 className="text-white font-bold mb-4 tracking-wider uppercase text-xs">{settings.footer_group2_title || 'Resources'}</h4>
            <ul className="space-y-2.5 text-sm">
              {settings.footer_group2_links && settings.footer_group2_links.split('\n').filter(l => l.includes('|')).map((line, idx) => {
                const [label, url] = line.split('|');
                const isExternal = url.trim().startsWith('http');
                return (
                  <li key={idx}>
                    {isExternal ? (
                      <a href={url.trim()} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition-colors">{label.trim()}</a>
                    ) : (
                      <Link to={url.trim()} className="hover:text-primary-400 transition-colors">{label.trim()}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Store Address & Contact */}
          <div className="space-y-3.5 text-sm text-left">
            <h4 className="text-white font-bold tracking-wider uppercase text-xs">Get In Touch</h4>
            <div className="flex items-start space-x-2">
              <MapPin className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
              <span className="text-slate-400 leading-relaxed">
                {settings.contact_address}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-primary-500 shrink-0" />
              <a href={`tel:${settings.contact_phone}`} className="text-slate-400 hover:text-primary-400 transition-colors">
                {settings.contact_phone}
              </a>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-primary-500 shrink-0" />
              <a href={`mailto:${settings.contact_email}`} className="text-slate-400 hover:text-primary-400 transition-colors break-all">
                {settings.contact_email}
              </a>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Link to="/contact" className="inline-flex items-center justify-center space-x-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-5 py-2.5 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                <span>Send us a direct message</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Copyright */}
      <div className="bg-slate-950 py-6 border-t border-slate-800 text-center text-xs text-slate-500 font-semibold tracking-wide">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <span>&copy; {new Date().getFullYear()} FloraElegance. All rights reserved</span>
          <span className="flex items-center gap-1 text-sm text-slate-500">Designed & Developed by <a href="https://www.codewavestudio.space/" target="_blank" rel="noopener noreferrer" > CodeWave Studio</a>
          </span>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
