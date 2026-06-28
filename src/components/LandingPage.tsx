import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, CheckCircle2, Shield, Eye, BarChart3, Receipt, Users, Zap, MessageSquare, Plus, Minus, HelpCircle, Mail, Lock, User as UserIcon, AlertTriangle } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onSignIn: () => void;
  onGuestSignIn?: () => void;
}

export default function LandingPage({ onStart, onSignIn, onGuestSignIn }: LandingPageProps) {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Email Auth Modal States
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (authMode === 'signup' && !name)) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { registerWithEmailAndPassword, loginWithEmailAndPassword } = await import('../firebase');
      if (authMode === 'signup') {
        await registerWithEmailAndPassword(email, name, password);
      } else {
        await loginWithEmailAndPassword(email, password);
      }
      setShowAuthModal(false);
    } catch (err: any) {
      console.warn("Email auth error:", err);
      let friendlyMessage = err.message || "Authentication failed. Please verify your credentials.";
      
      // Map common Firebase errors to human-friendly messages
      if (err.code === 'auth/invalid-email') {
        friendlyMessage = "Invalid email format. Please check and try again.";
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = "Password should be at least 6 characters long.";
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMessage = "Incorrect email or password.";
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "This email is already registered. Please sign in instead.";
      } else if (err.message && err.message.includes('auth/unauthorized-domain')) {
        friendlyMessage = "This domain is unauthorized by Firebase. Please use Instant Demo Access or update Firebase configuration.";
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen(faqOpen === idx ? null : idx);
  };

  const features = [
    {
      icon: <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: "Google Gemini Copilot",
      desc: "An intelligent, retail-grounded chatbot. Talk to your shop's inventory, query daily profits, or ask how to manage sluggish stocks in plain English, Tamil, or Hindi."
    },
    {
      icon: <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: "AI Vision Invoice Scanner",
      desc: "Drag and drop any distributor invoice. Our Gemini Vision model extracts product items, quantities, and prices, and updates your inventory automatically in seconds."
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: "Instant Point of Sale (POS)",
      desc: "Perform quick sales with auto GST computation, discounts, and custom payment options (Cash, Card, UPI, and Credit Sales) with beautiful, printable receipts."
    },
    {
      icon: <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: "Smart Credit Ledger",
      desc: "No more notebook logs. Keep track of customer credits, record fractional payments, and auto-generate persuasive AI WhatsApp reminders."
    },
    {
      icon: <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: "Safe Local-to-Cloud Sync",
      desc: "Enterprise-grade Firestore cloud database. Your inventory, profiles, and transactions are synchronized in real-time, safely secure behind Firebase Google Sign-In."
    },
    {
      icon: <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: "High-Fidelity Analytics",
      desc: "Stripe-style interactive reports showing Revenue vs Cost margins, order distributions, and category-split inventory counts."
    }
  ];

  const faqs = [
    {
      q: "What makes Zentora different from traditional POS systems?",
      a: "Zentora brings direct artificial intelligence to your shop floor. Instead of just entering tables of numbers, you can upload physical invoices to automatically import products, and talk directly to your business data through our Gemini AI Copilot."
    },
    {
      q: "Does it support regional Indian languages?",
      a: "Yes! Zentora is fully localized in English, Tamil, and Hindi, allowing your store staff to toggle preferred languages instantly. The AI Copilot also understands and responds in all three languages."
    },
    {
      q: "How does the Invoice Scanner work?",
      a: "Simply take a photo or upload a PDF/Image of your supplier's invoice. Zentora uses the multi-modal Gemini Vision model to read and structure the visual data, returning an editable list of items to sync with your database."
    },
    {
      q: "Is our store's data safe?",
      a: "Absolutely. Zentora uses Google Firebase Auth to enforce secure Google Sign-In, and stores all business ledgers within sandboxed Firestore collections protected by security access rules."
    }
  ];

  return (
    <div id="landing-container" className="min-h-screen bg-[#f8f9fe] dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Header */}
      <header id="landing-header" className="sticky top-0 z-50 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-md border-b border-indigo-100/50 dark:border-slate-800/50 px-6 py-4 flex justify-between items-center max-w-7xl mx-auto rounded-b-xl">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200 dark:shadow-none">
            Z
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">Zentora</span>
            <span className="hidden sm:inline-block ml-2 text-xs bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-medium border border-indigo-100 dark:border-indigo-900/50">SaaS Platform</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            id="landing-signin-btn"
            onClick={() => setShowAuthModal(true)} 
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition"
          >
            Sign In
          </button>
          <button 
            id="landing-getstarted-btn"
            onClick={() => setShowAuthModal(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-md shadow-indigo-100 dark:shadow-none transition"
          >
            <span>Launch App</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero-section" className="relative px-6 pt-20 pb-16 text-center max-w-4xl mx-auto">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-40 dark:opacity-10 pointer-events-none">
          <div className="w-72 h-72 bg-indigo-300 rounded-full blur-[100px] animate-pulse"></div>
          <div className="w-72 h-72 bg-purple-300 rounded-full blur-[100px] animate-pulse ml-24"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-900/40 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-8"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zen-mode Retail operations powered by Google Gemini</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.1] mb-6"
        >
          Bring Complete Zen to Your <br />
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">Retail Shop Operations</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Zentora is the modern enterprise SaaS platform built for smart retailers. Experience automated AI stock parsing, localized English, Tamil, and Hindi controls, credit tracing ledgers, and intelligent predictions in one beautiful workspace.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4"
        >
          <button 
            id="hero-start-btn"
            onClick={() => setShowAuthModal(true)} 
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 dark:shadow-none transition transform hover:-translate-y-0.5"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            id="hero-demo-btn"
            onClick={() => setShowAuthModal(true)} 
            className="w-full sm:w-auto bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-800 font-bold px-8 py-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-sm"
          >
            <span>Merchant Sign In</span>
          </button>
        </motion.div>
      </section>

      {/* Visual Mockup Dashboard Section */}
      <section id="mockup-section" className="px-6 pb-24 max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-white dark:bg-slate-900/60 p-3 sm:p-4 rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-none border border-indigo-100/80 dark:border-slate-800/80 backdrop-blur-sm"
        >
          <div className="bg-[#fcfcff] dark:bg-slate-950 rounded-xl overflow-hidden border border-indigo-50 dark:border-slate-900/80">
            {/* Mock Header Controls */}
            <div className="px-4 py-3 bg-indigo-50/50 dark:bg-slate-900/50 border-b border-indigo-100/50 dark:border-slate-800/50 flex justify-between items-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="text-xs font-medium text-indigo-600/80 dark:text-indigo-400/80 tracking-wide font-mono">Zentora Retail Interface v1.4</div>
              <div className="w-4 h-4 rounded bg-indigo-100 dark:bg-slate-800"></div>
            </div>
            
            {/* Visual Workspace Mock */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sidebar list mock */}
              <div className="space-y-3.5">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100/50 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="text-xs font-semibold">Tomato Puree Pack</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">84 In Stock</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100/50 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <span className="text-xs font-semibold">Basmati Rice 5kg</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600">3 Low Stock</span>
                </div>
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40 shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                    <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Organic Coconut Oil</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">120 In Stock</span>
                </div>
              </div>
              {/* Analytics graph mock */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100/50 dark:border-slate-800 flex flex-col justify-between h-48 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Monthly Retail Revenue</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400 px-2 py-0.5 rounded">+18.4%</span>
                </div>
                {/* Simulated Chart Bars */}
                <div className="flex items-end justify-between space-x-3 h-28 pt-4">
                  <div className="bg-indigo-100 dark:bg-indigo-950 w-full h-[30%] rounded-md"></div>
                  <div className="bg-indigo-100 dark:bg-indigo-950 w-full h-[45%] rounded-md"></div>
                  <div className="bg-indigo-200 dark:bg-indigo-900 w-full h-[60%] rounded-md"></div>
                  <div className="bg-indigo-300 dark:bg-indigo-800 w-full h-[55%] rounded-md"></div>
                  <div className="bg-indigo-600 dark:bg-indigo-500 w-full h-[85%] rounded-md relative group">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap shadow opacity-0 group-hover:opacity-100 transition">₹1.48L Profit</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Bento Grid Section */}
      <section id="features-section" className="bg-white dark:bg-slate-950 py-24 border-y border-indigo-100/50 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white mb-4">
              Everything Your Store Needs to Elevate Operations
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              A comprehensive set of tools crafted specifically to bring simplicity, automated tracking, and artificial intelligence into everyday retail workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="p-6 bg-[#f8f9fe] dark:bg-slate-900 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-slate-700 transition duration-300 group"
              >
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition duration-300">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-indigo-950 dark:text-white mb-2">{feat.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive AI Chat Mock Showcase Section */}
      <section id="ai-showcase-section" className="py-24 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Context-Aware AI Assistant</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              Ask Your Store Anything with Zentora Copilot
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Our embedded business copilot connects directly to your products, sales volumes, and credit logs. Type commands naturally in Tamil, Hindi, or English to scan sales charts, extract actionable advice, or generate messages.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>"Who owes me the most credit?"</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>"Which category brought the most margin?"</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>"Review my milk inventory status."</span>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100/80 dark:border-slate-800 shadow-xl overflow-hidden p-6 font-sans">
            <div className="flex items-center justify-between border-b border-indigo-50 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow">Z</div>
                <div>
                  <div className="text-xs font-bold text-indigo-950 dark:text-white">Zentora Copilot</div>
                  <div className="text-[10px] text-indigo-600 flex items-center space-x-1 font-medium"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span> <span>Online & Grounded</span></div>
                </div>
              </div>
            </div>
            <div className="space-y-4 h-64 overflow-y-auto pr-1 text-xs">
              <div className="flex justify-end">
                <div className="bg-indigo-50 dark:bg-slate-800 text-indigo-950 dark:text-slate-100 p-3 rounded-2xl rounded-tr-none max-w-[80%] font-medium">
                  Show me low-stock products in Tamil and advise what to buy.
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-50 dark:border-slate-900 p-3 rounded-2xl rounded-tl-none max-w-[90%] leading-relaxed text-slate-700 dark:text-slate-300">
                  <p className="font-bold mb-1 text-indigo-600">சென்டோரா துணையாளர்:</p>
                  உங்கள் கடையில் தற்போது 2 பொருட்கள் மிகவும் குறைவாக உள்ளன:
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li><strong>ஆர்கானிக் அரிசி 5kg:</strong> மீதமுள்ள அளவு: <strong>3 மூட்டைகள்</strong> (மறுஆர்டர் எச்சரிக்கை அளவு: 5)</li>
                    <li><strong>தேங்காய் எண்ணெய்:</strong> மீதமுள்ள அளவு: <strong>1 பாட்டில்</strong> (மறுஆர்டர் எச்சரிக்கை அளவு: 10)</li>
                  </ul>
                  <p className="mt-2 text-indigo-600 font-bold">Zentora Recommendation:</p>
                  அடுத்த வாரம் பண்டிகை என்பதால், குறைந்தபட்சம் 20 மூட்டை அரிசியும், 15 பாட்டில் தேங்காய் எண்ணெயும் உடனடியாக ஆர்டர் செய்ய பரிந்துரைக்கிறேன்.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Pricing Section */}
      <section id="pricing-section" className="bg-indigo-50/40 dark:bg-slate-950/60 py-24 border-y border-indigo-100/50 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">Simple, Growth-Aligned Pricing</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-3 text-sm">Empower your single shop or multi-store chain with flexible premium features. Free trial included.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Standard Plan */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Single Shop</h3>
                <p className="text-xs text-slate-500 mt-1">Perfect for local retail boutiques</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-slate-950 dark:text-white">₹999</span>
                  <span className="text-xs text-slate-500"> / month</span>
                </div>
                <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Up to 500 Products</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Standard Point of Sale (POS)</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Manual Invoice Entries</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Outstanding Debt Ledger</span></li>
                </ul>
              </div>
              <button onClick={() => setShowAuthModal(true)} className="w-full mt-8 py-3 px-4 border border-indigo-100 hover:bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs transition">Get Started</button>
            </div>

            {/* AI Growth Plan */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 shadow-md flex flex-col justify-between relative transform lg:-translate-y-2">
              <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</div>
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Zentora Pro AI</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">Ideal for high-growth merchants</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-slate-950 dark:text-white">₹1,999</span>
                  <span className="text-xs text-slate-500"> / month</span>
                </div>
                <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Unlimited Products</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Gemini Vision Invoice Scanner</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Interactive AI Copilot (Tamil/Hindi)</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>AI Credit reminders & payments</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Advanced Financial Exports</span></li>
                </ul>
              </div>
              <button onClick={() => setShowAuthModal(true)} className="w-full mt-8 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 dark:shadow-none transition">Launch Pro Trial</button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Multi-Store Chain</h3>
                <p className="text-xs text-slate-500 mt-1">Enterprise scale for larger retailers</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-slate-950 dark:text-white">Custom</span>
                </div>
                <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Multi-branch Consolidation</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>Dedicated AI models & fine-tuning</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>custom API endpoints / webhooks</span></li>
                  <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> <span>24/7 dedicated account manager</span></li>
                </ul>
              </div>
              <button onClick={() => setShowAuthModal(true)} className="w-full mt-8 py-3 px-4 border border-indigo-100 hover:bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs transition">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials-section" className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-extrabold text-center text-slate-950 dark:text-white mb-16">Trusted by Smart Store Operators</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white dark:bg-slate-900 border border-indigo-50 dark:border-slate-800 rounded-2xl shadow-sm">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">"Since toggling Zentora, I've discarded our paper stock book entirely. The invoice scanner is exceptionally precise; it saves me hours of manual inputting every Monday."</p>
            <div className="mt-4 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs">RK</div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 dark:text-white">Rajesh Kumar</h4>
                <p className="text-[10px] text-slate-500">Owner, Kumar Grocery Mart</p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-indigo-50 dark:border-slate-800 rounded-2xl shadow-sm">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">"கடன் நினைவூட்டல் அம்சம் மிகவும் அருமை. AI உருவாக்கிய தமிழ் வாட்ஸ்அப் செய்திகளை வாடிக்கையாளர்களுக்கு அனுப்புவதன் மூலம் பல வாரங்களாக நிலுவையில் இருந்த கடன் தொகையை எளிதாக வசூலிக்க முடிந்தது."</p>
            <div className="mt-4 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs">AM</div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 dark:text-white">ஆனந்த் மாரியப்பன்</h4>
                <p className="text-[10px] text-slate-500">மளிகை கடை உரிமையாளர், சென்னை</p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-indigo-50 dark:border-slate-800 rounded-2xl shadow-sm">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">"Zentora's theme is incredibly polished, and the dashboard is comparable to Stripe. Having Hindi translation allows our shop boys to easily lookup products and perform sales transactions."</p>
            <div className="mt-4 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xs">PS</div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 dark:text-white">Pooja Sharma</h4>
                <p className="text-[10px] text-slate-500">Operations Head, Organic Retail Chain</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faq-section" className="bg-white dark:bg-slate-950 py-24 border-t border-indigo-100/50 dark:border-slate-900">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-center text-slate-950 dark:text-white mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-indigo-100/50 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40">
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/40 transition"
                >
                  <span className="font-bold text-sm sm:text-base text-slate-950 dark:text-white">{faq.q}</span>
                  {faqOpen === idx ? <Minus className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-indigo-600" />}
                </button>
                {faqOpen === idx && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-indigo-50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="landing-footer" className="bg-slate-50 dark:bg-slate-950 border-t border-indigo-100/30 dark:border-slate-900/60 py-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-[10px]">Z</div>
            <span className="font-bold text-slate-900 dark:text-white text-sm">Zentora</span>
          </div>
          <p>© {new Date().getFullYear()} Zentora Enterprise. All rights reserved. Bringing Zen to retail operations.</p>
          <div className="flex space-x-4 text-[11px] text-slate-500">
            <a href="#" className="hover:text-indigo-600">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600">Terms of Service</a>
            <a href="#" className="hover:text-indigo-600">Documentation</a>
          </div>
        </div>
      </footer>

      {/* Auth Selector Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative"
          >
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] rounded-xl flex items-center justify-center text-white font-bold mx-auto shadow-md">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">Access Zentora Retail</h3>
              <p className="text-xs text-slate-500">Sign in or create a custom merchant workspace instantly.</p>
            </div>

            {/* Tab Toggles */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMsg(''); }}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition ${authMode === 'signin' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition ${authMode === 'signup' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Create Account
              </button>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start space-x-2.5 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {authMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Merchant Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand Mariyappan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. partner@zentora.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">Secure Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 shadow-md hover:shadow-indigo-100 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In with Email' : 'Register Merchant Profile'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Alternates separator */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-bold tracking-wider">or alternate gateways</span>
              </div>
            </div>

            {/* Instant Demo (Offline Sandbox) & Google Sign In options */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  if (onGuestSignIn) {
                    onGuestSignIn();
                  } else {
                    onStart();
                  }
                }}
                className="w-full text-left px-4 py-3 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/10 hover:border-blue-300 dark:hover:border-blue-800 transition duration-150 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 bg-blue-50 dark:bg-blue-950/50 rounded-lg flex items-center justify-center text-blue-600">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-white flex items-center space-x-1.5">
                      <span>Instant Demo Sandbox</span>
                      <span className="text-[8px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded font-bold uppercase">Safe for iframe</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Bypasses external domain errors. Runs offline immediately.</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  onSignIn();
                }}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900/60 transition duration-150 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-white">Google Auth Popup</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Requires "Open in New Tab" to bypass iframe blockages.</p>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400 mt-5 leading-relaxed">
              * Zentora encrypts and isolates merchant sessions. Demo sandbox databases are preserved in localized caches.
            </p>
          </motion.div>
        </div>
      )}

    </div>
  );
}
