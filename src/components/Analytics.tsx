import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Product, Sale } from '../types';
import { Sparkles, BarChart3, TrendingUp, DollarSign, Wallet, Award, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsProps {
  storeId: string;
  storeCurrency: string;
}

export default function Analytics({ storeId, storeCurrency }: AnalyticsProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Analytics aggregates
  const [totals, setTotals] = useState({
    grossRevenue: 0,
    costOfGoods: 0,
    netProfit: 0,
    profitMarginPercent: 0
  });

  const [paymentStats, setPaymentStats] = useState({
    cash: 0,
    upi: 0,
    card: 0,
    credit: 0
  });

  // Fetch data
  useEffect(() => {
    if (!storeId) return;

    if (storeId === 'demo_store_123') {
      const localProducts = localStorage.getItem('zentora_demo_products');
      if (localProducts) setProducts(JSON.parse(localProducts));

      const localSales = localStorage.getItem('zentora_demo_sales');
      if (localSales) setSales(JSON.parse(localSales));
      return;
    }

    const prodQ = query(collection(db, 'products'), where('storeId', '==', storeId));
    const salesQ = query(collection(db, 'sales'), where('storeId', '==', storeId));

    const unsubscribeProds = onSnapshot(prodQ, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach(doc => items.push(doc.data() as Product));
      setProducts(items);
    });

    const unsubscribeSales = onSnapshot(salesQ, (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach(doc => items.push(doc.data() as Sale));
      setSales(items);
    });

    return () => {
      unsubscribeProds();
      unsubscribeSales();
    };
  }, [storeId]);

  // Perform financial calculations
  useEffect(() => {
    let revenue = 0;
    let cost = 0;
    let pCash = 0;
    let pUpi = 0;
    let pCard = 0;
    let pCredit = 0;

    sales.forEach(sale => {
      revenue += sale.total;
      
      // Calculate costs
      sale.items.forEach(item => {
        const matchingProd = products.find(p => p.id === item.productId);
        const costPrice = matchingProd ? matchingProd.costPrice : (item.price * 0.7);
        cost += costPrice * item.quantity;
      });

      // apply discount reduction to costs proportionally
      if (sale.discount > 0 && sale.subtotal > 0) {
        const discountRatio = (sale.subtotal - sale.discount) / sale.subtotal;
        cost = cost * discountRatio;
      }

      // Group payments
      if (sale.paymentMethod === 'cash') pCash += sale.total;
      else if (sale.paymentMethod === 'upi') pUpi += sale.total;
      else if (sale.paymentMethod === 'card') pCard += sale.total;
      else if (sale.paymentMethod === 'credit') pCredit += sale.total;
    });

    const profit = Math.max(0, revenue - cost);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    setTotals({
      grossRevenue: revenue,
      costOfGoods: cost,
      netProfit: profit,
      profitMarginPercent: margin
    });

    setPaymentStats({
      cash: pCash,
      upi: pUpi,
      card: pCard,
      credit: pCredit
    });
  }, [products, sales]);

  // Compute category counts
  const categoryCounts = products.reduce((acc: Record<string, number>, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.quantity;
    return acc;
  }, {});

  const categoryList = Object.entries(categoryCounts).map(([name, qty]) => ({ name, qty: qty as number }));

  // Custom Horizontal Category Progress Bar split
  const renderCategoryBars = () => {
    if (categoryList.length === 0) {
      return <p className="text-xs text-slate-400 py-6 text-center">No catalog catalog stock available.</p>;
    }

    const maxQty = Math.max(...categoryList.map(c => c.qty), 1);

    return (
      <div className="space-y-3.5">
        {categoryList.slice(0, 5).map((cat, idx) => {
          const ratio = (cat.qty / maxQty) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{cat.name}</span>
                <span className="font-mono">{cat.qty} Items</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${ratio}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and description */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{t('nav.analytics')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Store revenue sheets, profit margin percentages, and channel distributions.</p>
      </div>

      {/* Main Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gross Revenue</p>
          <h3 className="text-xl font-extrabold text-slate-950 dark:text-white font-mono mt-1">
            {storeCurrency}{totals.grossRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </h3>
          <span className="text-[9px] text-emerald-500 font-bold">Total Sales Inflow</span>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cost of Goods (COGS)</p>
          <h3 className="text-xl font-extrabold text-slate-950 dark:text-white font-mono mt-1">
            {storeCurrency}{totals.costOfGoods.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </h3>
          <span className="text-[9px] text-slate-400 font-medium">Estimated Purchase cost</span>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Net Profit Margin</p>
          <h3 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-1">
            {storeCurrency}{totals.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </h3>
          <span className="text-[9px] text-indigo-500 font-bold">Retained profit balance</span>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Profit Margin Ratio</p>
          <h3 className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
            {totals.profitMarginPercent.toFixed(1)}%
          </h3>
          <span className="text-[9px] text-emerald-500 font-bold">Profit/Revenue ratio</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart Card 1: Revenue vs Cost Bars */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Revenue vs Wholesale Cost Comparison</h3>
              <p className="text-[11px] text-slate-400">Comparing transacted retail pricing against raw inventory acquisition costs.</p>
            </div>
          </div>

          {/* Visual SVG bar graphs */}
          {sales.length === 0 ? (
            <div className="h-48 border border-dashed border-indigo-100 dark:border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-400">
              No sales logged to compute margin breakdowns.
            </div>
          ) : (
            <div className="flex flex-col space-y-4 pt-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-indigo-950 dark:text-white">
                  <span>Gross Sales Revenue</span>
                  <span className="font-mono">{storeCurrency}{totals.grossRevenue.toFixed(2)}</span>
                </div>
                <div className="w-full h-8 bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden border border-indigo-50/20">
                  <div 
                    className="h-full bg-indigo-600 rounded-lg transition-all duration-500"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Acquisition COGS</span>
                  <span className="font-mono">{storeCurrency}{totals.costOfGoods.toFixed(2)}</span>
                </div>
                <div className="w-full h-8 bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden border border-indigo-50/20">
                  <div 
                    className="h-full bg-slate-400 dark:bg-slate-700 rounded-lg transition-all duration-500"
                    style={{ width: `${totals.grossRevenue > 0 ? (totals.costOfGoods / totals.grossRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chart Card 2: Payment Mode splits */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-950 dark:text-white mb-1">Receipt Income Split by Payment Channel</h3>
          <p className="text-[11px] text-slate-400 mb-6">Financial volume distribution across Cash, Card, UPI, and Client Credit books.</p>

          {sales.length === 0 ? (
            <div className="h-48 border border-dashed border-indigo-100 dark:border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-400">
              No payments captured yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Cash channel */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-indigo-100/10 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Cash Drawer</span>
                <p className="text-sm font-extrabold font-mono text-indigo-950 dark:text-white mt-1">
                  {storeCurrency}{paymentStats.cash.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </p>
              </div>
              {/* UPI channel */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-indigo-100/10 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">UPI Payments</span>
                <p className="text-sm font-extrabold font-mono text-indigo-950 dark:text-white mt-1">
                  {storeCurrency}{paymentStats.upi.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </p>
              </div>
              {/* Card channel */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-indigo-100/10 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Debit / Credit Card</span>
                <p className="text-sm font-extrabold font-mono text-indigo-950 dark:text-white mt-1">
                  {storeCurrency}{paymentStats.card.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </p>
              </div>
              {/* Client Credit channel */}
              <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/25 rounded-xl">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold">Outstanding Credit</span>
                <p className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {storeCurrency}{paymentStats.credit.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Row 3: Category distribution list */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-950 dark:text-white mb-1">Catalog Stock split across Categories</h3>
        <p className="text-[11px] text-slate-400 mb-6">Quantity concentration of product SKUs stored inside live Firestore catalog drawers.</p>
        {renderCategoryBars()}
      </div>

    </div>
  );
}
