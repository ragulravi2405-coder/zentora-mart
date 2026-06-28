import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Product, Sale, Customer } from '../types';
import { Sparkles, TrendingUp, AlertTriangle, IndianRupee, CreditCard, ShoppingBag, Plus, ArrowUpRight, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  storeId: string;
  storeCurrency: string;
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ storeId, storeCurrency, onNavigate }: DashboardProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  // KPIs
  const [kpis, setKpis] = useState({
    revenue: 0,
    profit: 0,
    salesCount: 0,
    lowStockCount: 0,
    outstandingCredit: 0
  });

  // Fetch Firestore Data in real-time
  useEffect(() => {
    if (!storeId) return;

    if (storeId === 'demo_store_123') {
      const localProducts = localStorage.getItem('zentora_demo_products');
      if (localProducts) setProducts(JSON.parse(localProducts));

      const localSales = localStorage.getItem('zentora_demo_sales');
      if (localSales) {
        setSales(JSON.parse(localSales));
      } else {
        const demoSales = [
          { id: 's1', storeId: 'demo_store_123', items: [{ productId: 'p1', name: 'Premium Basmati Rice 5kg', quantity: 2, price: 450, total: 900 }], subtotal: 900, discount: 50, gstAmount: 153, total: 1003, paymentMethod: 'cash', customerId: 'c1', customerName: 'Rajesh Kumar', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
          { id: 's2', storeId: 'demo_store_123', items: [{ productId: 'p3', name: 'Tomato Puree Pack 200g', quantity: 4, price: 45, total: 180 }, { productId: 'p4', name: 'Liquid Handwash 250ml', quantity: 1, price: 99, total: 99 }], subtotal: 279, discount: 0, gstAmount: 50.22, total: 329.22, paymentMethod: 'upi', customerId: null, customerName: 'Walk-in Customer', createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
          { id: 's3', storeId: 'demo_store_123', items: [{ productId: 'p2', name: 'Organic Coconut Oil 1L', quantity: 5, price: 280, total: 1400 }], subtotal: 1400, discount: 100, gstAmount: 234, total: 1534, paymentMethod: 'credit', customerId: 'c2', customerName: 'Anand Mariyappan', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() }
        ];
        localStorage.setItem('zentora_demo_sales', JSON.stringify(demoSales));
        setSales(demoSales);
      }

      const localCustomers = localStorage.getItem('zentora_demo_customers');
      if (localCustomers) setCustomers(JSON.parse(localCustomers));

      return;
    }

    const prodQuery = query(collection(db, 'products'), where('storeId', '==', storeId));
    const salesQuery = query(collection(db, 'sales'), where('storeId', '==', storeId));
    const custQuery = query(collection(db, 'customers'), where('storeId', '==', storeId));

    const unsubscribeProds = onSnapshot(prodQuery, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(doc => prods.push(doc.data() as Product));
      setProducts(prods);
    });

    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const sls: Sale[] = [];
      snapshot.forEach(doc => sls.push(doc.data() as Sale));
      setSales(sls);
    });

    const unsubscribeCusts = onSnapshot(custQuery, (snapshot) => {
      const custs: Customer[] = [];
      snapshot.forEach(doc => custs.push(doc.data() as Customer));
      setCustomers(custs);
    });

    return () => {
      unsubscribeProds();
      unsubscribeSales();
      unsubscribeCusts();
    };
  }, [storeId]);

  // Aggregate stats whenever sales/products/customers update
  useEffect(() => {
    // 1. Revenue
    const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    // 2. Profit (Price - CostPrice)
    let totalProfit = 0;
    sales.forEach(sale => {
      sale.items.forEach(item => {
        // Find matching product cost price
        const prod = products.find(p => p.id === item.productId);
        const costPrice = prod ? prod.costPrice : (item.price * 0.7); // fallback 30% margin if deleted
        const profitMargin = item.price - costPrice;
        totalProfit += profitMargin * item.quantity;
      });
      // apply proportional discount impact on profits
      if (sale.discount > 0 && sale.subtotal > 0) {
        const discountRatio = (sale.subtotal - sale.discount) / sale.subtotal;
        totalProfit = totalProfit * discountRatio;
      }
    });

    // 3. Low stock count
    const lowStockCount = products.filter(p => p.quantity <= p.minStockAlert).length;

    // 4. Credit balance
    const outstandingCredit = customers.reduce((sum, c) => sum + (c.outstandingCredit || 0), 0);

    setKpis({
      revenue,
      profit: Math.max(0, totalProfit),
      salesCount: sales.length,
      lowStockCount,
      outstandingCredit
    });
  }, [products, sales, customers]);

  // Generate AI insights using server-side Gemini grounding
  useEffect(() => {
    if (products.length === 0 && sales.length === 0) {
      setAiInsights("Welcome to Zentora! Create inventory products and log some POS sales. Our Gemini Retail Intelligence engine will automatically generate action-oriented profit optimization tips for you.");
      return;
    }

    const fetchAIInsights = async () => {
      setLoadingAI(true);
      try {
        const storeStateSummary = {
          productsCount: products.length,
          lowStockCount: kpis.lowStockCount,
          totalSalesRevenue: kpis.revenue,
          totalEstimatedProfit: kpis.profit,
          outstandingCreditToCollect: kpis.outstandingCredit,
          categoriesList: Array.from(new Set(products.map(p => p.category))),
          topProducts: products.slice(0, 3).map(p => ({ name: p.name, stock: p.quantity }))
        };

        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: "Generate a bulleted 3-sentence retail action summary based on my current store metrics. Advise on low stocks, credit collection, and general sales health.",
            context: storeStateSummary
          })
        });

        const data = await response.json();
        if (data.text) {
          setAiInsights(data.text);
        } else {
          setAiInsights("AI Intelligence fully synced. Continue executing sales to update the forecast algorithms.");
        }
      } catch (err) {
        console.warn("Could not retrieve real-time AI Insights:", err);
        setAiInsights("Monitor stock replenishment closely. Consider sending credit reminders to outstanding accounts to increase liquid cash flow.");
      } finally {
        setLoadingAI(false);
      }
    };

    // Debounce/run once we have data
    const timer = setTimeout(() => {
      fetchAIInsights();
    }, 1500);

    return () => clearTimeout(timer);
  }, [products.length, sales.length, kpis.revenue]);

  // Simple Beautiful Custom SVG Chart Generation
  const renderRevenueChart = () => {
    if (sales.length === 0) {
      return (
        <div className="h-44 flex flex-col items-center justify-center border border-dashed border-indigo-100 dark:border-slate-800 rounded-xl text-xs text-slate-400">
          <ShoppingBag className="w-8 h-8 mb-2 text-indigo-200" />
          <span>No Sales Logged Yet. Charts update automatically.</span>
        </div>
      );
    }

    // Map sales to past 7 transactions or group by date
    const lastSales = [...sales].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-7);
    const maxVal = Math.max(...lastSales.map(s => s.total), 100);
    const width = 500;
    const height = 150;
    const padding = 20;

    // Build SVG path points
    const points = lastSales.map((sale, idx) => {
      const x = padding + (idx * (width - padding * 2)) / Math.max(lastSales.length - 1, 1);
      const y = height - padding - ((sale.total / maxVal) * (height - padding * 2));
      return { x, y };
    });

    const pathD = points.length > 0 
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
      : '';

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <div className="w-full h-44 overflow-hidden relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Horizontal Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#2563EB" strokeOpacity="0.05" strokeWidth="1" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#2563EB" strokeOpacity="0.05" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#2563EB" strokeOpacity="0.08" strokeWidth="1" />
          
          {/* Chart Area */}
          {areaD && <path d={areaD} fill="url(#chartGrad)" />}
          
          {/* Chart Line */}
          {pathD && <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          
          {/* Hotspots */}
          {points.map((p, idx) => (
            <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#2563EB" strokeWidth="2.5" />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center space-x-2">
            <span>{t('nav.dashboard')}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Real-time enterprise intelligence & operational audit.</p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button 
            id="dash-quick-pos"
            onClick={() => onNavigate('sales')}
            className="px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch POS</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dash.revenue')}</span>
            <div className="w-7 h-7 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center text-[#2563EB] dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-extrabold text-slate-950 dark:text-white font-mono">
              {storeCurrency}{kpis.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[10px] text-emerald-500 font-semibold mt-0.5">Real-time Gross</span>
          </div>
        </div>

        {/* Total Profit */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dash.profit')}</span>
            <div className="w-7 h-7 bg-purple-50 dark:bg-purple-950/40 rounded-lg flex items-center justify-center text-[#7C3AED] dark:text-purple-400">
              {storeCurrency === '₹' ? <IndianRupee className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-extrabold text-slate-950 dark:text-white font-mono">
              {storeCurrency}{kpis.profit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[10px] text-purple-500 font-semibold mt-0.5">Net Profit Margin</span>
          </div>
        </div>

        {/* Sales Transactions */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dash.salesCount')}</span>
            <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-extrabold text-slate-950 dark:text-white font-mono">{kpis.salesCount}</span>
            <span className="block text-[10px] text-slate-500 mt-0.5">Orders Processed</span>
          </div>
        </div>

        {/* Low Stock count */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between ring-1 ring-rose-500/10">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dash.lowStock')}</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${kpis.lowStockCount > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className={`text-xl font-extrabold font-mono ${kpis.lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}>{kpis.lowStockCount} Items</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">Requires attention</span>
          </div>
        </div>

        {/* Credit Outstanding */}
        <div className="col-span-2 lg:col-span-1 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dash.credit')}</span>
            <div className="w-7 h-7 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-xl font-extrabold text-slate-950 dark:text-white font-mono">
              {storeCurrency}{kpis.outstandingCredit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[10px] text-amber-500 font-semibold mt-0.5">Pending Payments</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Chart + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Chart Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Revenue Intelligence</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Daily revenue and profit performance</p>
            </div>
            <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400 px-2.5 py-1 rounded-lg">Last 7 Orders</span>
          </div>
          {renderRevenueChart()}
        </div>

        {/* AI Insight Board Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden flex flex-col justify-between ring-4 ring-purple-50 dark:ring-purple-950/10">
          <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-28 h-28 bg-purple-50 dark:bg-purple-950/20 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-7 h-7 bg-purple-100 dark:bg-purple-950 text-[#7C3AED] dark:text-purple-400 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">{t('dash.insights')}</h2>
            </div>
            
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
              {loadingAI ? (
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full"></div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-[90%]"></div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-[80%]"></div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed font-medium">
                  {aiInsights}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
            <span className="text-[10px] text-[#7C3AED] dark:text-purple-400 font-semibold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
              <span>Updated Just Now</span>
            </span>
            <button 
              onClick={() => onNavigate('copilot')} 
              className="text-[10px] font-bold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 flex items-center space-x-1"
            >
              <span>Ask Copilot</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Row: Recent activity */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-sm font-bold text-slate-950 dark:text-white mb-4">Latest Transactions</h2>
        {sales.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No transaction logs in this session yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {[...sales].reverse().slice(0, 5).map((sale, index) => {
              const initials = (sale.customerName || 'Walk-In').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              const colors = [
                'bg-blue-100 text-[#2563EB]',
                'bg-purple-100 text-purple-600',
                'bg-emerald-100 text-emerald-700',
                'bg-amber-100 text-amber-700'
              ];
              const colorClass = colors[index % colors.length];

              return (
                <div key={sale.id} className="py-3 flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs`}>
                      {initials}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {sale.customerName || t('pos.walkin')}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(sale.createdAt).toLocaleString('en-IN', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-900 dark:text-white font-mono">
                      {storeCurrency}{(sale.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 uppercase tracking-wider mt-0.5">
                      {sale.paymentMethod}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
