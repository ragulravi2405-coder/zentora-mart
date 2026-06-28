import { useEffect, useState } from 'react';
import { LanguageProvider, useLanguage, Language } from './contexts/LanguageContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { auth, db, signInWithGoogle } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Components
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import InvoiceScanner from './components/InvoiceScanner';
import Customers from './components/Customers';
import AICopilot from './components/AICopilot';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

// Icons
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  ScanLine, 
  Users, 
  MessageSquareCode, 
  BarChart4, 
  Settings2, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  Sun,
  Moon,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Authentication & Profile States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  
  // Store details
  const [storeId, setStoreId] = useState<string>('');
  const [storeData, setStoreData] = useState<any>(null);

  // Layout Tab Routing
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Check if user document exists in Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setOnboardingCompleted(!!data.onboardingCompleted);
            setStoreId(data.storeId || '');
            if (data.language) {
              setLanguage(data.language as Language);
            }
          } else {
            // New user! Create user document
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Retailer Partner',
              onboardingCompleted: false,
              storeId: '',
              language: 'en'
            });
            setOnboardingCompleted(false);
            setStoreId('');
          }
        } catch (err) {
          console.error("Firestore user fetch failed:", err);
          // Safe fallback for sandbox
          setOnboardingCompleted(false);
        }
      } else {
        setOnboardingCompleted(null);
        setStoreId('');
        setStoreData(null);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, [setLanguage]);

  // Load Store configs when storeId updates
  useEffect(() => {
    if (!storeId || storeId === 'demo_store_123') return;

    const fetchStore = async () => {
      try {
        const storeSnap = await getDoc(doc(db, 'stores', storeId));
        if (storeSnap.exists()) {
          setStoreData(storeSnap.data());
        }
      } catch (err) {
        console.error("Store load failed:", err);
      }
    };

    fetchStore();
  }, [storeId]);

  // On onboarding submit
  const handleOnboardingComplete = (newStoreId: string, preferredLang: Language) => {
    setStoreId(newStoreId);
    setLanguage(preferredLang);
    setOnboardingCompleted(true);
  };

  const triggerGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      alert("Sign-in failed. Please ensure Firebase configuration parameters are correct.");
    } finally {
      setAuthLoading(false);
    }
  };

  const triggerGuestSignIn = async () => {
    setAuthLoading(true);
    try {
      const { signInGuest } = await import('./firebase');
      await signInGuest();
    } catch (err) {
      console.warn("Firebase Guest Sign-In failed or was disabled, launching offline demo sandbox:", err);
      // Fallback to local demo profile
      const demoUser = {
        uid: 'demo_merchant_partner',
        email: 'demo@zentora.com',
        displayName: 'Demo Store Partner',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      };
      
      setUser(demoUser as any);
      setOnboardingCompleted(true);
      setStoreId('demo_store_123');
      setStoreData({
        name: "Zentora Demo Shop",
        tagline: "Retail Intelligence Demo Workspace",
        currency: "₹",
        gstEnabled: true,
        gstRate: 18,
        lowStockAlertValue: 5,
        paymentMethods: ["Cash", "Card", "UPI", "Credit"]
      });
    } finally {
      setAuthLoading(false);
    }
  };

  // Safe logout
  const triggerLogout = async () => {
    if (!confirm("Are you sure you want to sign out of Zentora?")) return;
    if (user?.uid === 'demo_merchant_partner') {
      setUser(null);
      setOnboardingCompleted(null);
      setStoreId('');
      setStoreData(null);
    } else {
      await auth.signOut();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fe] dark:bg-[#030712] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading Zentora SaaS workspace...</p>
        </div>
      </div>
    );
  }

  // Logged Out view: render beautiful Landing page
  if (!user) {
    return (
      <LandingPage 
        onStart={triggerGoogleSignIn} 
        onSignIn={triggerGoogleSignIn} 
        onGuestSignIn={triggerGuestSignIn}
      />
    );
  }

  // Logged In but Onboarding Incomplete
  if (onboardingCompleted === false) {
    return (
      <Onboarding 
        userId={user.uid} 
        userEmail={user.email || ''} 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  // Active Workspace: Sidebar + Tabs container
  const sidebarTabs = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'inventory', label: t('nav.inventory'), icon: <Package className="w-4 h-4" /> },
    { id: 'sales', label: t('nav.sales'), icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'vision', label: t('nav.invoiceVision'), icon: <ScanLine className="w-4 h-4" /> },
    { id: 'clients', label: t('nav.customers'), icon: <Users className="w-4 h-4" /> },
    { id: 'copilot', label: t('nav.aiCopilot'), icon: <MessageSquareCode className="w-4 h-4 text-indigo-500" /> },
    { id: 'analytics', label: t('nav.analytics'), icon: <BarChart4 className="w-4 h-4" /> },
    { id: 'settings', label: t('nav.settings'), icon: <Settings2 className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen flex bg-[#F5F7FF] dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Desktop Sidebar Panel */}
      <aside className="hidden lg:flex flex-col justify-between w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 shrink-0">
        <div className="space-y-6">
          {/* Logo brand line */}
          <div className="flex items-center space-x-2.5 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">Zentora</span>
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{storeData?.name || "Retail Intelligence"}</p>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1">
            {sidebarTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition duration-200 ${activeTab === tab.id ? 'bg-blue-50/70 dark:bg-blue-950/30 text-[#2563EB] dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/40' : 'text-slate-500 hover:text-[#2563EB] dark:text-slate-400 dark:hover:text-blue-300'}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="pt-4 border-t border-indigo-50/50 dark:border-slate-850 space-y-3">
          <div className="flex items-center space-x-2 px-2">
            <img src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} alt="avatar" className="w-8 h-8 rounded-full border border-indigo-100" referrerPolicy="no-referrer" />
            <div className="truncate max-w-[140px]">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.displayName || "Merchant Partner"}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={triggerLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Workspace Topbar Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
          
          {/* Left panel: mobile menu toggle + store branding */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-[#2563EB] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
                <span>{storeData?.name || "Zentora Shop"}</span>
                <span className="hidden sm:inline-block text-[9px] bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100/30 dark:border-blue-900/40">Grounded AI active</span>
              </h2>
              <p className="hidden sm:block text-[10px] text-slate-400 mt-0.5 font-medium">{storeData?.tagline || "Retail Intelligence dashboard"}</p>
            </div>
          </div>

          {/* Right panel: Controls & settings */}
          <div className="flex items-center space-x-3">
            
            {/* Quick toggle theme button */}
            <button 
              onClick={toggleTheme}
              className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 transition shadow-sm"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Quick language dropdown picker */}
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
              <select 
                value={language} 
                onChange={e => setLanguage(e.target.value as Language)}
                className="pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 focus:outline-none shadow-sm cursor-pointer"
              >
                <option value="en">English</option>
                <option value="ta">தமிழ்</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>

            {/* User profile bubble */}
            <img 
              src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
              alt="avatar" 
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 shrink-0" 
              referrerPolicy="no-referrer"
            />
          </div>
        </header>

        {/* Mobile menu modal drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-indigo-50 p-5 flex flex-col justify-between lg:hidden shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">Z</div>
                    <span className="font-extrabold text-slate-900 dark:text-white text-base">Zentora</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {sidebarTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button 
                  onClick={triggerLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Inner Tab Content Panel */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              storeId={storeId} 
              storeCurrency={storeData?.currency || '₹'} 
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'inventory' && (
            <Inventory 
              storeId={storeId} 
              storeCurrency={storeData?.currency || '₹'} 
            />
          )}
          {activeTab === 'sales' && (
            <Sales 
              storeId={storeId} 
              storeCurrency={storeData?.currency || '₹'} 
              storeName={storeData?.name || "Zentora Shop"}
              storeAddress={storeData?.address || "Zentora Address"}
              storePhone={storeData?.phone || "0000"}
              storeGst={storeData?.gstNumber || "Not Registered"}
            />
          )}
          {activeTab === 'vision' && (
            <InvoiceScanner 
              storeId={storeId} 
              storeCurrency={storeData?.currency || '₹'} 
            />
          )}
          {activeTab === 'clients' && (
            <Customers 
              storeId={storeId} 
              storeCurrency={storeData?.currency || '₹'} 
              storeName={storeData?.name || "Zentora Shop"}
            />
          )}
          {activeTab === 'copilot' && (
            <AICopilot 
              storeId={storeId} 
              storeCurrency={storeData?.currency || '₹'} 
            />
          )}
          {activeTab === 'analytics' && (
            <Analytics 
              storeId={storeId} 
              storeCurrency={storeData?.currency || '₹'} 
            />
          )}
          {activeTab === 'settings' && (
            <Settings 
              storeId={storeId} 
              storeName={storeData?.name || ''}
              storeTagline={storeData?.tagline || ''}
              storeCurrency={storeData?.currency || '₹'}
              storeAddress={storeData?.address || ''}
              storePhone={storeData?.phone || ''}
              storeGst={storeData?.gstNumber || ''}
              onStoreUpdate={(fields) => setStoreData({ ...storeData, ...fields })}
            />
          )}
        </main>

        {/* Footer Status Bar */}
        <footer className="h-8 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 uppercase tracking-wider">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block"></span>
              <span>Store Active: {storeData?.name || "Zentora Shop"}</span>
            </span>
            <span className="hidden md:inline">Cloud Sync: Real-time</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Version 1.0.4b</span>
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">Session: {user?.uid ? `ID-${user.uid.substring(0, 5)}` : "Merchant Partner"}</span>
          </div>
        </footer>

      </div>

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}
