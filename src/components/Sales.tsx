import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Product, Customer, Sale, SaleItem, CreditTransaction } from '../types';
import { Search, ShoppingCart, Trash2, Plus, Minus, UserCheck, ShieldAlert, CheckCircle2, Printer, Landmark, CreditCard, Wallet, Banknote } from 'lucide-react';
import { motion } from 'motion/react';

interface SalesProps {
  storeId: string;
  storeCurrency: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeGst: string;
}

export default function Sales({ storeId, storeCurrency, storeName, storeAddress, storePhone, storeGst }: SalesProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // POS Search/Cart State
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  
  // Checkout Modal / Invoice Modal
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  // Fetch products and customers
  useEffect(() => {
    if (!storeId) return;

    if (storeId === 'demo_store_123') {
      const localProducts = localStorage.getItem('zentora_demo_products');
      if (localProducts) setProducts(JSON.parse(localProducts));
      
      const localCustomers = localStorage.getItem('zentora_demo_customers');
      if (localCustomers) {
        setCustomers(JSON.parse(localCustomers));
      } else {
        const demoCustomers = [
          { id: 'c1', name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@gmail.com', outstandingCredit: 1250, storeId: 'demo_store_123', createdAt: new Date().toISOString() },
          { id: 'c2', name: 'Anand Mariyappan', phone: '+91 94440 12345', email: 'anand.m@outlook.com', outstandingCredit: 4500, storeId: 'demo_store_123', createdAt: new Date().toISOString() },
          { id: 'c3', name: 'Priya Sharma', phone: '+91 88877 66554', email: 'priya.sharma@yahoo.com', outstandingCredit: 0, storeId: 'demo_store_123', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('zentora_demo_customers', JSON.stringify(demoCustomers));
        setCustomers(demoCustomers);
      }
      return;
    }

    const prodQ = query(collection(db, 'products'), where('storeId', '==', storeId));
    const custQ = query(collection(db, 'customers'), where('storeId', '==', storeId));

    const unsubscribeProds = onSnapshot(prodQ, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach(doc => items.push(doc.data() as Product));
      setProducts(items);
    });

    const unsubscribeCusts = onSnapshot(custQ, (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach(doc => items.push(doc.data() as Customer));
      setCustomers(items);
    });

    return () => {
      unsubscribeProds();
      unsubscribeCusts();
    };
  }, [storeId]);

  // Cart operations
  const addToCart = (prod: Product) => {
    if (prod.quantity <= 0) {
      alert("This item is currently out of stock!");
      return;
    }

    const existing = cart.find(item => item.productId === prod.id);
    if (existing) {
      if (existing.quantity >= prod.quantity) {
        alert(`Cannot add more than ${prod.quantity} available items in stock.`);
        return;
      }
      setCart(cart.map(item => 
        item.productId === prod.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } 
          : item
      ));
    } else {
      setCart([...cart, {
        productId: prod.id,
        name: prod.name,
        quantity: 1,
        price: prod.price,
        total: prod.price
      }]);
    }
  };

  const updateCartQuantity = (prodId: string, delta: number) => {
    const item = cart.find(i => i.productId === prodId);
    if (!item) return;

    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.productId !== prodId));
      return;
    }

    if (delta > 0 && newQty > prod.quantity) {
      alert(`Cannot add more than ${prod.quantity} items available in stock.`);
      return;
    }

    setCart(cart.map(i => 
      i.productId === prodId 
        ? { ...i, quantity: newQty, total: newQty * i.price } 
        : i
    ));
  };

  const removeFromCart = (prodId: string) => {
    setCart(cart.filter(item => item.productId !== prodId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const gstAmount = ((subtotal - discountAmount) * 18) / 118; // assuming 18% inclusive GST
  const netTotal = subtotal - discountAmount;

  // Perform checkout transaction
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutError("Your checkout cart is empty.");
      return;
    }

    if (paymentMethod === 'credit' && selectedCustomerId === 'walkin') {
      setCheckoutError("Credit sales require registering and selecting a registered Customer profile to track the ledger debt.");
      return;
    }

    setCheckoutError('');
    try {
      const saleId = `sale_${Date.now()}`;
      const selectedCust = customers.find(c => c.id === selectedCustomerId);

      const salePayload: Sale = {
        id: saleId,
        storeId,
        items: cart,
        subtotal,
        discount: discountAmount,
        gstAmount,
        total: netTotal,
        paymentMethod,
        customerId: selectedCustomerId === 'walkin' ? null : selectedCustomerId,
        customerName: selectedCustomerId === 'walkin' ? 'Walk-in Customer' : (selectedCust?.name || 'Walk-in Customer'),
        createdAt: new Date().toISOString()
      };

      if (storeId === 'demo_store_123') {
        // 1. Save Sale to localStorage
        const localSales = localStorage.getItem('zentora_demo_sales');
        const salesList: Sale[] = localSales ? JSON.parse(localSales) : [];
        salesList.push(salePayload);
        localStorage.setItem('zentora_demo_sales', JSON.stringify(salesList));

        // 2. Deduct quantities from products list in localStorage
        const localProducts = localStorage.getItem('zentora_demo_products');
        if (localProducts) {
          let prodsList: Product[] = JSON.parse(localProducts);
          prodsList = prodsList.map(p => {
            const cartItem = cart.find(item => item.productId === p.id);
            if (cartItem) {
              return { ...p, quantity: Math.max(0, p.quantity - cartItem.quantity) };
            }
            return p;
          });
          localStorage.setItem('zentora_demo_products', JSON.stringify(prodsList));
          setProducts(prodsList);
        }

        // 3. Update customer outstanding balances in localStorage
        if (paymentMethod === 'credit' && selectedCustomerId !== 'walkin' && selectedCust) {
          const localCustomers = localStorage.getItem('zentora_demo_customers');
          if (localCustomers) {
            let custsList: Customer[] = JSON.parse(localCustomers);
            custsList = custsList.map(c => {
              if (c.id === selectedCustomerId) {
                return { ...c, outstandingCredit: (c.outstandingCredit || 0) + netTotal };
              }
              return c;
            });
            localStorage.setItem('zentora_demo_customers', JSON.stringify(custsList));
            setCustomers(custsList);
          }

          // record credit ledger transaction in localStorage
          const txId = `tx_${Date.now()}`;
          const txPayload: CreditTransaction = {
            id: txId,
            storeId,
            customerId: selectedCustomerId,
            amount: netTotal,
            type: 'credit',
            description: `Credit Sale Ref: #${saleId}`,
            createdAt: new Date().toISOString()
          };
          const localTxs = localStorage.getItem('zentora_demo_creditTransactions');
          const txsList: CreditTransaction[] = localTxs ? JSON.parse(localTxs) : [];
          txsList.push(txPayload);
          localStorage.setItem('zentora_demo_creditTransactions', JSON.stringify(txsList));
        }

        setLastCompletedSale(salePayload);
        setCart([]);
        setDiscountPercent(0);
        setShowReceipt(true);
        return;
      }

      // 1. Save Sale to Firestore
      await setDoc(doc(db, 'sales', saleId), salePayload);

      // 2. Deduct quantities from products list in Firestore
      for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const newQty = Math.max(0, prod.quantity - item.quantity);
          await updateDoc(doc(db, 'products', item.productId), { quantity: newQty });
        }
      }

      // 3. If credit sale, update customer outstanding balances
      if (paymentMethod === 'credit' && selectedCustomerId !== 'walkin' && selectedCust) {
        const newOutstanding = (selectedCust.outstandingCredit || 0) + netTotal;
        await updateDoc(doc(db, 'customers', selectedCustomerId), { outstandingCredit: newOutstanding });

        // record credit ledger transaction
        const txId = `tx_${Date.now()}`;
        const txPayload: CreditTransaction = {
          id: txId,
          storeId,
          customerId: selectedCustomerId,
          amount: netTotal,
          type: 'credit',
          description: `Credit Sale Ref: #${saleId}`,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'creditTransactions', txId), txPayload);
      }

      setLastCompletedSale(salePayload);
      setCart([]);
      setDiscountPercent(0);
      setShowReceipt(true);
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setCheckoutError(err.message || "Failed to log transaction. Try again.");
    }
  };

  // Filter products for POS matching query
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      
      {/* LEFT COLUMN: POS search and product grid (8 cols) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search POS catalog by name, SKU, or barcode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const inCart = cart.find(i => i.productId === p.id);
            const isOutOfStock = p.quantity <= 0;
            return (
              <div 
                key={p.id} 
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`p-3 bg-white dark:bg-slate-900 border rounded-2xl cursor-pointer hover:border-indigo-200 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-2 relative shadow-sm ${inCart ? 'ring-2 ring-indigo-500' : 'border-indigo-100/40 dark:border-slate-800/80'} ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {inCart && (
                  <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {inCart.quantity}
                  </span>
                )}
                <div className="space-y-1.5">
                  <div className="w-full h-24 bg-slate-50 dark:bg-slate-950 rounded-lg overflow-hidden border border-indigo-50/50 dark:border-slate-900/60 flex items-center justify-center">
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white truncate" title={p.name}>{p.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold">{p.category}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-indigo-50/40 dark:border-slate-800/50">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {storeCurrency}{p.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isOutOfStock ? 'bg-red-50 text-red-500 dark:bg-red-950/20' : p.quantity <= p.minStockAlert ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
                    {isOutOfStock ? "Out of Stock" : `${p.quantity} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Checkout Cart & Summary (5 cols) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100/50 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between h-full min-h-[500px]">
        <div>
          <div className="flex items-center space-x-2 border-b border-indigo-50 dark:border-slate-800 pb-3.5 mb-3.5">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">Active POS Checkout</h2>
          </div>

          {/* Customer Selection Dropdown */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" /> <span>Customer Billing Account</span>
            </label>
            <select 
              value={selectedCustomerId} 
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="walkin">{t('pos.walkin')}</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} (Credit: {storeCurrency}{c.outstandingCredit || 0})</option>
              ))}
            </select>
          </div>

          {/* Cart Products list */}
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2.5 text-indigo-100" />
              <span>Checkout cart is empty.</span>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[25vh] overflow-y-auto pr-1 divide-y divide-indigo-50/30 dark:divide-slate-800/30">
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between items-center text-xs pt-2 first:pt-0">
                  <div className="grow pr-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{storeCurrency}{item.price} / unit</p>
                  </div>
                  <div className="flex items-center space-x-2 mr-3 shrink-0">
                    <button 
                      onClick={() => updateCartQuantity(item.productId, -1)}
                      className="p-1 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950"
                    >
                      <Minus className="w-3 h-3 text-slate-500" />
                    </button>
                    <span className="font-bold font-mono">{item.quantity}</span>
                    <button 
                      onClick={() => updateCartQuantity(item.productId, 1)}
                      className="p-1 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950"
                    >
                      <Plus className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                      {storeCurrency}{item.total}
                    </span>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1 text-slate-400 hover:text-red-500 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing breakups & Checkout trigger */}
        <div className="border-t border-indigo-50 dark:border-slate-800 pt-4 space-y-3">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>{t('pos.subtotal')}</span>
            <span className="font-mono">{storeCurrency}{subtotal.toFixed(2)}</span>
          </div>

          {/* Discount Picker */}
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-500">{t('pos.discount')}</span>
            <div className="flex items-center space-x-1.5">
              <select 
                value={discountPercent} 
                onChange={e => setDiscountPercent(parseInt(e.target.value))}
                className="px-2 py-1 rounded-lg border border-indigo-50 dark:border-slate-800 text-[11px] font-bold bg-slate-50 dark:bg-slate-950"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="10">10%</option>
                <option value="15">15%</option>
                <option value="20">20%</option>
              </select>
              <span className="font-mono text-slate-400">-{storeCurrency}{discountAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>Incl. GST (18%)</span>
            <span className="font-mono">{storeCurrency}{gstAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm font-extrabold text-indigo-950 dark:text-white pt-2 border-t border-dashed border-indigo-50 dark:border-slate-800">
            <span>{t('pos.total')}</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{storeCurrency}{netTotal.toFixed(2)}</span>
          </div>

          {/* Payment options bar */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{t('pos.paymentMethod')}</label>
            <div className="grid grid-cols-4 gap-1.5">
              <button 
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center space-y-1 transition ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-indigo-50/50 dark:border-slate-800'}`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>
              <button 
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center space-y-1 transition ${paymentMethod === 'upi' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-indigo-50/50 dark:border-slate-800'}`}
              >
                <Wallet className="w-4 h-4" />
                <span>UPI</span>
              </button>
              <button 
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center space-y-1 transition ${paymentMethod === 'card' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-indigo-50/50 dark:border-slate-800'}`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>
              <button 
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center space-y-1 transition ${paymentMethod === 'credit' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-indigo-50/50 dark:border-slate-800'}`}
              >
                <Landmark className="w-4 h-4" />
                <span>Credit</span>
              </button>
            </div>
          </div>

          {checkoutError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl text-[11px] text-red-600 dark:text-red-400 font-medium flex items-start space-x-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{checkoutError}</span>
            </div>
          )}

          <button 
            id="pos-checkout-trigger"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow transition disabled:opacity-50 text-xs tracking-wider uppercase mt-2.5"
          >
            {t('pos.checkout')}
          </button>
        </div>
      </div>

      {/* Printable Invoice Receipt Modal */}
      {showReceipt && lastCompletedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 text-slate-800"
          >
            {/* Header controls for receipt */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-1 text-emerald-600 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Sale Logged Successfully</span>
              </div>
              <button onClick={() => setShowReceipt(false)} className="text-slate-400 hover:text-slate-600 font-extrabold text-sm">×</button>
            </div>

            {/* Printable Receipt Layout */}
            <div id="receipt-print-area" className="bg-slate-50/60 p-5 rounded-xl border border-slate-100 text-xs space-y-4 font-mono">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-slate-900 text-base">{storeName}</h3>
                <p className="text-[10px] text-slate-500">{storeAddress}</p>
                <p className="text-[10px] text-slate-500">Ph: {storePhone}</p>
                {storeGst && <p className="text-[9px] text-slate-400 uppercase">GSTIN: {storeGst}</p>}
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-[10px] text-slate-500">
                <div className="flex justify-between">
                  <span>Invoice No:</span>
                  <span className="font-bold text-slate-800">#{lastCompletedSale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span>{new Date(lastCompletedSale.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{lastCompletedSale.customerName}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between font-bold text-slate-800 border-b border-dashed border-slate-200 pb-1">
                  <span>Item</span>
                  <div className="flex space-x-6">
                    <span>Qty</span>
                    <span>Total</span>
                  </div>
                </div>
                {lastCompletedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[150px]">{item.name}</span>
                    <div className="flex space-x-8">
                      <span>{item.quantity}</span>
                      <span className="font-bold">{storeCurrency}{item.total}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Aggregates */}
              <div className="border-t border-dashed border-slate-300 pt-2.5 space-y-1.5 text-[10px] text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{storeCurrency}{lastCompletedSale.subtotal.toFixed(2)}</span>
                </div>
                {lastCompletedSale.discount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Discount:</span>
                    <span>-{storeCurrency}{lastCompletedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[9px]">
                  <span>GST Breakup (18% inclusive):</span>
                  <span>{storeCurrency}{lastCompletedSale.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-xs border-t border-dashed border-slate-300 pt-1.5">
                  <span>GRAND TOTAL:</span>
                  <span>{storeCurrency}{lastCompletedSale.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-400 uppercase">
                <span>Payment Mode: {lastCompletedSale.paymentMethod}</span>
                <p className="mt-1 font-semibold">Thank you for visiting Zentora!</p>
              </div>
            </div>

            {/* Print trigger button */}
            <div className="mt-5 flex space-x-2">
              <button 
                onClick={() => window.print()}
                className="grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>{t('pos.print')}</span>
              </button>
              <button 
                onClick={() => setShowReceipt(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
