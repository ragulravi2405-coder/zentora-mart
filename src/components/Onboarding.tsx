import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { db, auth } from '../firebase';
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { Sparkles, Building, Phone, MapPin, Landmark, ArrowRight, User } from 'lucide-react';

interface OnboardingProps {
  userId: string;
  userEmail: string;
  onComplete: (storeId: string, language: Language) => void;
}

export default function Onboarding({ userId, userEmail, onComplete }: OnboardingProps) {
  const { language, setLanguage, t } = useLanguage();
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [storeName, setStoreName] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !storeName.trim() || !phone.trim() || !address.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create unique store ID
      const storeId = `store_${Date.now()}`;

      const storeData = {
        id: storeId,
        name: storeName,
        tagline: "Retail Intelligence Store",
        currency,
        address,
        phone,
        gstNumber: gstNumber || 'Not Registered',
        createdAt: new Date().toISOString()
      };

      // Create Store document
      await setDoc(doc(db, 'stores', storeId), storeData);

      // Update User profile document securely using setDoc with merge: true
      await setDoc(doc(db, 'users', userId), {
        displayName: displayName,
        storeId: storeId,
        onboardingCompleted: true,
        language: language,
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Invoke completion callback
      onComplete(storeId, language);
    } catch (err: any) {
      console.error("Onboarding failed:", err);
      setError(err.message || "Failed to create your merchant store account. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="onboarding-wrapper" className="min-h-screen bg-[#f8f9fe] dark:bg-[#030712] flex items-center justify-center p-6 text-slate-800 dark:text-slate-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-transparent to-transparent opacity-50 dark:opacity-20"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-indigo-100 dark:border-slate-800 p-8 sm:p-10"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Configure Your Retail Store</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">Welcome to Zentora. Set up your store workspace in just a few clicks.</p>
        </div>

        {/* Language Selection Bar */}
        <div className="bg-indigo-50/50 dark:bg-slate-950 border border-indigo-100/60 dark:border-slate-800/80 rounded-xl p-3 flex justify-between items-center mb-8">
          <span className="text-xs font-semibold text-slate-500">{t('set.language')}</span>
          <div className="flex space-x-1.5">
            {(['en', 'ta', 'hi'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  language === lang 
                    ? 'bg-indigo-600 text-white shadow' 
                    : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-indigo-50 dark:border-slate-800'
                }`}
              >
                {lang === 'en' ? 'English' : lang === 'ta' ? 'தமிழ்' : 'हिन्दी'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 mb-6 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Merchant Profile Details */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <User className="w-3.5 h-3.5" /> <span>Your Name</span>
            </label>
            <input 
              type="text" 
              required
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Anand Kumar"
              className="w-full px-4 py-3 text-sm rounded-xl border border-indigo-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950 font-medium"
            />
          </div>

          {/* Store Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Building className="w-3.5 h-3.5" /> <span>Store Name</span>
              </label>
              <input 
                type="text" 
                required
                value={storeName} 
                onChange={e => setStoreName(e.target.value)}
                placeholder="e.g. Zentora Organics Store"
                className="w-full px-4 py-3 text-sm rounded-xl border border-indigo-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950 font-medium"
              />
            </div>
            {/* Currency Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Currency</label>
              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-3 text-sm rounded-xl border border-indigo-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950 font-medium"
              >
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
                <option value="£">£ GBP</option>
              </select>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5" /> <span>Phone / Mobile</span>
            </label>
            <input 
              type="tel" 
              required
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-4 py-3 text-sm rounded-xl border border-indigo-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950 font-medium"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" /> <span>Store Address</span>
            </label>
            <input 
              type="text" 
              required
              value={address} 
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 14, Kamarajar Street, Chennai, Tamil Nadu"
              className="w-full px-4 py-3 text-sm rounded-xl border border-indigo-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950 font-medium"
            />
          </div>

          {/* GSTIN */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Landmark className="w-3.5 h-3.5" /> <span>GSTIN (GST Number - Optional)</span>
            </label>
            <input 
              type="text" 
              value={gstNumber} 
              onChange={e => setGstNumber(e.target.value)}
              placeholder="e.g. 33AAAAA1111A1Z1"
              className="w-full px-4 py-3 text-sm rounded-xl border border-indigo-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-950 font-medium uppercase"
            />
          </div>

          <button
            id="onboarding-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition disabled:opacity-50 mt-8"
          >
            <span>{loading ? "Creating Shop Workspace..." : "Initialize Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
