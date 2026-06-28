import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Product, Sale, Customer } from '../types';
import { Sparkles, Send, Trash2, HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface AICopilotProps {
  storeId: string;
  storeCurrency: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export default function AICopilot({ storeId, storeCurrency }: AICopilotProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Grounding Context States
  const [storeState, setStoreState] = useState<any>(null);
  const [gatheringState, setGatheringState] = useState(false);

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Gather Store Grounding Details from Firestore
  const gatherStoreContext = async () => {
    if (!storeId) return;
    setGatheringState(true);
    try {
      if (storeId === 'demo_store_123') {
        const localProducts = localStorage.getItem('zentora_demo_products');
        const products: Product[] = localProducts ? JSON.parse(localProducts) : [];

        const localSales = localStorage.getItem('zentora_demo_sales');
        const sales: Sale[] = localSales ? JSON.parse(localSales) : [];

        const localCustomers = localStorage.getItem('zentora_demo_customers');
        const customers: Customer[] = localCustomers ? JSON.parse(localCustomers) : [];

        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
        const lowStockProducts = products.filter(p => p.quantity <= p.minStockAlert).map(p => `${p.name} (${p.quantity} left)`);
        const debtors = customers.filter(c => (c.outstandingCredit || 0) > 0).map(c => `${c.name}: ${storeCurrency}${c.outstandingCredit}`);

        const stateSummary = {
          storeCurrency,
          productsCount: products.length,
          salesCount: sales.length,
          totalRevenue: `${storeCurrency}${totalRevenue}`,
          lowStockItemsList: lowStockProducts,
          debtorsCreditList: debtors,
          allProductsCatalog: products.map(p => ({ name: p.name, stock: p.quantity, price: `${storeCurrency}${p.price}`, category: p.category }))
        };

        setStoreState(stateSummary);
        setGatheringState(false);
        return;
      }

      // 1. Fetch all products
      const pSnap = await getDocs(query(collection(db, 'products'), where('storeId', '==', storeId)));
      const products: Product[] = [];
      pSnap.forEach(doc => products.push(doc.data() as Product));

      // 2. Fetch sales
      const sSnap = await getDocs(query(collection(db, 'sales'), where('storeId', '==', storeId)));
      const sales: Sale[] = [];
      sSnap.forEach(doc => sales.push(doc.data() as Sale));

      // 3. Fetch customers
      const cSnap = await getDocs(query(collection(db, 'customers'), where('storeId', '==', storeId)));
      const customers: Customer[] = [];
      cSnap.forEach(doc => customers.push(doc.data() as Customer));

      // Calculate aggregated parameters
      const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const lowStockProducts = products.filter(p => p.quantity <= p.minStockAlert).map(p => `${p.name} (${p.quantity} left)`);
      const debtors = customers.filter(c => c.outstandingCredit > 0).map(c => `${c.name}: ${storeCurrency}${c.outstandingCredit}`);

      const stateSummary = {
        storeCurrency,
        productsCount: products.length,
        salesCount: sales.length,
        totalRevenue: `${storeCurrency}${totalRevenue}`,
        lowStockItemsList: lowStockProducts,
        debtorsCreditList: debtors,
        allProductsCatalog: products.map(p => ({ name: p.name, stock: p.quantity, price: `${storeCurrency}${p.price}`, category: p.category }))
      };

      setStoreState(stateSummary);
    } catch (err) {
      console.error("Context assembly error:", err);
    } finally {
      setGatheringState(false);
    }
  };

  // Initialize and gather context
  useEffect(() => {
    gatherStoreContext();
    // Add default initial greeting
    setMessages([
      {
        role: 'model',
        text: "Hello! I am Zentora Copilot, your retail artificial intelligence partner. I am fully synchronized with your live inventory stock listings, POS receipts, and customer credit ledger. Ask me any business questions in English, தமிழ் (Tamil), or हिन्दी (Hindi)."
      }
    ]);
  }, [storeId]);

  // Handle Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    // Add user message
    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      // Re-gather context to ensure it is latest
      await gatherStoreContext();

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: storeState
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, {
        role: 'model',
        text: data.text || "I have synced your statistics successfully. Type another query to execute operations."
      }]);
    } catch (err: any) {
      console.error("Copilot error:", err);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "Apologies, I hit a minor connection bump. Please confirm your internet connection and submit your prompt again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'model',
        text: "Chat ledger reset. Ask me anything about your current sales performance, low stocks warning limits, or debtor accounts."
      }
    ]);
  };

  // Quick action tags
  const promptSuggestions = [
    { label: "Check Low Stock Status", prompt: "Identify all items which are below minimum stock warning limits and recommend a re-order plan." },
    { label: "Summarize Store Credit Debt", prompt: "Who owes us the most outstanding credit balance? Display the top debtor names." },
    { label: "Tamil: Store Operations Advice", prompt: "தமிழ் மொழியில்: எனது விற்பனை செயல்திறனை அதிகரிக்க 3 எளிய குறிப்புகள் வழங்கவும்." },
    { label: "Hindi: Stock Summary Help", prompt: "हिन्दी में: मुझे स्टॉक रीऑर्डर करने के लिए क्या करना चाहिए?" },
    { label: "Analyze Category Margins", prompt: "Which of our product categories is performing best based on catalog distribution?" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[76vh] items-stretch">
      
      {/* LEFT CHAT AREA (8 cols) */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
        
        {/* Chat Header controls */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm">
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white flex items-center space-x-1">
                <span>Zentora Copilot</span>
                <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
              </h2>
              <span className="text-[10px] text-[#2563EB] font-semibold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                <span>Grounded Business Brain</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={gatherStoreContext}
              disabled={gatheringState}
              className="p-1.5 text-slate-400 hover:text-[#2563EB] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Refresh grounding cache"
            >
              <RefreshCw className={`w-4 h-4 ${gatheringState ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={clearChat}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Conversation Scroll area */}
        <div className="grow p-5 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => {
            const isModel = msg.role === 'model';
            return (
              <div 
                key={idx} 
                className={`flex ${isModel ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs sm:text-sm leading-relaxed ${isModel ? 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none font-medium' : 'bg-[#2563EB] text-white rounded-tr-none font-semibold'}`}>
                  {isModel && (
                    <div className="text-[10px] font-bold text-[#2563EB] dark:text-[#7C3AED] uppercase mb-1 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" /> <span>Zentora Copilot</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl rounded-tl-none flex items-center space-x-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                <span>Zentora is querying live metrics and thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Text Form bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex items-center space-x-2"
          >
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask me: 'Which product has low stock?' or 'Summarize Tamil debt records'..."
              className="grow px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-medium"
            />
            <button 
              type="submit"
              disabled={loading || !inputText.trim()}
              className="bg-[#2563EB] hover:bg-blue-700 text-white p-3 rounded-xl shadow transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT SIDEBAR: suggestions list (4 cols) */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-start">
        <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
          <HelpCircle className="w-4 h-4 text-[#2563EB]" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Quick Query Grounding</h3>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">Click any of these pre-configured business scenarios to automatically trigger a regional, grounded audit of your store collection catalogs.</p>
        
        <div className="space-y-2.5">
          {promptSuggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(sug.prompt)}
              className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-blue-50/30 dark:bg-slate-950 dark:hover:bg-slate-800/50 hover:border-[#2563EB] text-xs font-semibold text-slate-700 dark:text-slate-300 transition duration-200"
            >
              {sug.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
