import React, { useState } from 'react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Settings as SettingsIcon, LogOut, CheckCircle2, ShieldAlert, Moon, Sun, Landmark } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  storeId: string;
  storeName: string;
  storeTagline: string;
  storeCurrency: string;
  storeAddress: string;
  storePhone: string;
  storeGst: string;
  onStoreUpdate: (updatedFields: { name: string; tagline: string; currency: string; address: string; phone: string; gstNumber: string }) => void;
}

export default function Settings({ storeId, storeName, storeTagline, storeCurrency, storeAddress, storePhone, storeGst, onStoreUpdate }: SettingsProps) {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Store profile form states
  const [formName, setFormName] = useState(storeName);
  const [formTagline, setFormTagline] = useState(storeTagline);
  const [formCurrency, setFormCurrency] = useState(storeCurrency);
  const [formAddress, setFormAddress] = useState(storeAddress);
  const [formPhone, setFormPhone] = useState(storePhone);
  const [formGst, setFormGst] = useState(storeGst);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      setError("Please fill in all mandatory store profile fields.");
      return;
    }

    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      const storeRef = doc(db, 'stores', storeId);
      const updatedData = {
        name: formName,
        tagline: formTagline,
        currency: formCurrency,
        address: formAddress,
        phone: formPhone,
        gstNumber: formGst || 'Not Registered'
      };

      await updateDoc(storeRef, updatedData);
      onStoreUpdate(updatedData);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update store configurations. Please check credentials.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to sign out of Zentora?")) return;
    try {
      await auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      
      {/* LEFT COLUMN: Store Profile configuration (7 cols) */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 border-b border-indigo-50 dark:border-slate-800 pb-3">
          <SettingsIcon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">Enterprise Store Profile</h2>
        </div>

        {success && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Store preferences successfully updated.</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveStore} className="space-y-4 text-xs sm:text-sm">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Retail Store Name *</label>
              <input 
                type="text" 
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency Symbol</label>
              <select 
                value={formCurrency}
                onChange={e => setFormCurrency(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
                <option value="£">£ GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tagline / Brand Vision</label>
            <input 
              type="text" 
              value={formTagline}
              onChange={e => setFormTagline(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Store Address *</label>
            <input 
              type="text" 
              required
              value={formAddress}
              onChange={e => setFormAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Store Phone / Mobile *</label>
            <input 
              type="tel" 
              required
              value={formPhone}
              onChange={e => setFormPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center space-x-1">
              <Landmark className="w-3.5 h-3.5" /> <span>GSTIN (GST Number)</span>
            </label>
            <input 
              type="text" 
              value={formGst}
              onChange={e => setFormGst(e.target.value)}
              placeholder="e.g. 33AAAAA1111A1Z1"
              className="w-full px-3 py-2 rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium uppercase"
            />
          </div>

          <div className="pt-3 border-t border-indigo-50 dark:border-slate-800 flex justify-end">
            <button 
              id="settings-save-btn"
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition"
            >
              {saving ? "Updating Profile..." : "Save Store Preferences"}
            </button>
          </div>
        </form>

      </div>

      {/* RIGHT COLUMN: Appearance, languages & log out (5 cols) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-indigo-50 dark:border-slate-800 pb-3">Platform Layout Controls</h3>
        
        {/* Theme select option */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Appearance Theme</label>
          <button 
            type="button"
            onClick={toggleTheme}
            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-indigo-50 dark:border-slate-850 hover:bg-slate-100 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 transition"
          >
            <div className="flex items-center space-x-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-indigo-600" />}
              <span>{theme === 'dark' ? 'Dark Mode active' : 'Light Mode active'}</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-bold uppercase">Toggle</span>
          </button>
        </div>

        {/* Language option */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase">Active Workspace Language</label>
          <div className="grid grid-cols-3 gap-2">
            {(['en', 'ta', 'hi'] as Language[]).map(lang => (
              <button 
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${language === lang ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-indigo-100/10 hover:bg-slate-100 text-slate-600 dark:text-slate-400'}`}
              >
                {lang === 'en' ? 'English' : lang === 'ta' ? 'தமிழ்' : 'हिन्दी'}
              </button>
            ))}
          </div>
        </div>

        {/* Log Out option */}
        <div className="pt-6 border-t border-indigo-50 dark:border-slate-800">
          <button 
            id="settings-logout"
            onClick={handleLogout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Logout</span>
          </button>
        </div>
      </div>

    </div>
  );
}
