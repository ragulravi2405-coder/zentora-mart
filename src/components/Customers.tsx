import React, { useState, useEffect } from 'react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Customer, CreditTransaction } from '../types';
import { UserCheck, Search, Plus, Trash2, CreditCard, Landmark, DollarSign, Calendar, MessageSquare, ArrowUpRight, Share2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CustomersProps {
  storeId: string;
  storeCurrency: string;
  storeName: string;
}

export default function Customers({ storeId, storeCurrency, storeName }: CustomersProps) {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Add/Edit Customer modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Log Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [loggingPayment, setLoggingPayment] = useState(false);

  // AI WhatsApp Reminder state
  const [aiReminder, setAiReminder] = useState('');
  const [generatingReminder, setGeneratingReminder] = useState(false);
  const [reminderLang, setReminderLang] = useState<Language>('en');

  // Fetch customers and transactions
  useEffect(() => {
    if (!storeId) return;

    if (storeId === 'demo_store_123') {
      const localCustomers = localStorage.getItem('zentora_demo_customers');
      if (localCustomers) {
        const list = JSON.parse(localCustomers);
        setCustomers(list);
        if (list.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(list[0].id);
        }
      } else {
        const demoCustomers = [
          { id: 'c1', name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@gmail.com', outstandingCredit: 1250, storeId: 'demo_store_123', createdAt: new Date().toISOString() },
          { id: 'c2', name: 'Anand Mariyappan', phone: '+91 94440 12345', email: 'anand.m@outlook.com', outstandingCredit: 4500, storeId: 'demo_store_123', createdAt: new Date().toISOString() },
          { id: 'c3', name: 'Priya Sharma', phone: '+91 88877 66554', email: 'priya.sharma@yahoo.com', outstandingCredit: 0, storeId: 'demo_store_123', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('zentora_demo_customers', JSON.stringify(demoCustomers));
        setCustomers(demoCustomers);
        setSelectedCustomerId('c1');
      }

      const localTxs = localStorage.getItem('zentora_demo_creditTransactions');
      if (localTxs) {
        setTransactions(JSON.parse(localTxs));
      } else {
        const demoTxs = [
          { id: 't1', storeId: 'demo_store_123', customerId: 'c1', amount: 1250, type: 'credit', description: 'Credit Sale Ref: #s1', createdAt: new Date().toISOString() },
          { id: 't2', storeId: 'demo_store_123', customerId: 'c2', amount: 4500, type: 'credit', description: 'Credit Sale Ref: #s3', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('zentora_demo_creditTransactions', JSON.stringify(demoTxs));
        setTransactions(demoTxs);
      }
      return;
    }

    const custQ = query(collection(db, 'customers'), where('storeId', '==', storeId));
    const txQ = query(collection(db, 'creditTransactions'), where('storeId', '==', storeId));

    const unsubscribeCusts = onSnapshot(custQ, (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach(doc => items.push(doc.data() as Customer));
      setCustomers(items);
      if (items.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(items[0].id);
      }
    });

    const unsubscribeTxs = onSnapshot(txQ, (snapshot) => {
      const items: CreditTransaction[] = [];
      snapshot.forEach(doc => items.push(doc.data() as CreditTransaction));
      setTransactions(items);
    });

    return () => {
      unsubscribeCusts();
      unsubscribeTxs();
    };
  }, [storeId]);

  // Selected customer object
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Filtered customer transactions
  const customerTransactions = transactions
    .filter(tx => tx.customerId === selectedCustomerId)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Save new customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    try {
      const cid = `cust_${Date.now()}`;
      const payload: Customer = {
        id: cid,
        storeId,
        name: formName,
        phone: formPhone,
        email: formEmail || 'no-email@zentora.com',
        outstandingCredit: 0,
        createdAt: new Date().toISOString()
      };

      if (storeId === 'demo_store_123') {
        const localCustomers = localStorage.getItem('zentora_demo_customers');
        const list: Customer[] = localCustomers ? JSON.parse(localCustomers) : [];
        list.push(payload);
        localStorage.setItem('zentora_demo_customers', JSON.stringify(list));
        setCustomers(list);
        setFormName('');
        setFormPhone('');
        setFormEmail('');
        setIsAddOpen(false);
        setSelectedCustomerId(cid);
        return;
      }

      await setDoc(doc(db, 'customers', cid), payload);
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      setIsAddOpen(false);
      setSelectedCustomerId(cid);
    } catch (err) {
      console.error(err);
      alert("Error creating customer account: " + err);
    }
  };

  // Record fractional payment
  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount || loggingPayment) return;

    const amt = parseFloat(paymentAmount);
    if (amt <= 0) {
      alert("Payment amount must be greater than zero.");
      return;
    }

    setLoggingPayment(true);
    try {
      // 1. Write payment tx to creditTransactions
      const txId = `tx_pay_${Date.now()}`;
      const txPayload: CreditTransaction = {
        id: txId,
        storeId,
        customerId: selectedCustomerId,
        amount: amt,
        type: 'payment',
        description: paymentNote || 'Cash Payment Received',
        createdAt: new Date().toISOString()
      };

      if (storeId === 'demo_store_123') {
        const localTxs = localStorage.getItem('zentora_demo_creditTransactions');
        const txsList: CreditTransaction[] = localTxs ? JSON.parse(localTxs) : [];
        txsList.push(txPayload);
        localStorage.setItem('zentora_demo_creditTransactions', JSON.stringify(txsList));
        setTransactions(txsList);

        const localCustomers = localStorage.getItem('zentora_demo_customers');
        if (localCustomers) {
          const custsList: Customer[] = JSON.parse(localCustomers);
          const updated = custsList.map(c => {
            if (c.id === selectedCustomerId) {
              return { ...c, outstandingCredit: Math.max(0, (c.outstandingCredit || 0) - amt) };
            }
            return c;
          });
          localStorage.setItem('zentora_demo_customers', JSON.stringify(updated));
          setCustomers(updated);
        }

        setPaymentAmount('');
        setPaymentNote('');
        setAiReminder('');
        setLoggingPayment(false);
        return;
      }

      await setDoc(doc(db, 'creditTransactions', txId), txPayload);

      // 2. Reduce customer's outstanding credit in Firestore
      const newOutstanding = Math.max(0, (selectedCustomer.outstandingCredit || 0) - amt);
      await updateDoc(doc(db, 'customers', selectedCustomerId), { outstandingCredit: newOutstanding });

      setPaymentAmount('');
      setPaymentNote('');
      setAiReminder(''); // reset old reminders
    } catch (err) {
      console.error(err);
      alert("Error recording payment: " + err);
    } finally {
      setLoggingPayment(false);
    }
  };

  // Generate personalized AI WhatsApp debt reminder
  const handleGenerateReminder = async () => {
    if (!selectedCustomer) return;
    setGeneratingReminder(true);
    setAiReminder('');

    try {
      const prompt = `Write a extremely polite, professional, yet persuasive WhatsApp debt repayment reminder message from the store '${storeName}' to the client '${selectedCustomer.name}' who owes an outstanding balance of ${storeCurrency}${selectedCustomer.outstandingCredit.toFixed(2)}. Make the message in the language: ${reminderLang === 'ta' ? 'Tamil' : reminderLang === 'hi' ? 'Hindi' : 'English'}. Include a friendly thank you and sign off from '${storeName}'. Do not include markdown headers or brackets, make it WhatsApp-ready (e.g. use asterisks for bolding *like this*).`;

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });

      const data = await response.json();
      if (data.text) {
        setAiReminder(data.text);
      } else {
        setAiReminder("Error writing reminder. Try again.");
      }
    } catch (err) {
      console.error(err);
      setAiReminder("Error generating reminder text.");
    } finally {
      setGeneratingReminder(false);
    }
  };

  // Copy or Share via WhatsApp Web
  const triggerWhatsAppUrl = () => {
    if (!selectedCustomer || !aiReminder) return "";
    // Clean phone number (remove spacing)
    const cleanedPhone = selectedCustomer.phone.replace(/[^0-9+]/g, '');
    return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(aiReminder)}`;
  };

  // Delete customer account
  const handleDeleteCustomer = async (cid: string) => {
    if (!confirm("Are you sure you want to delete this customer? This will clear their record but not historical transaction logs.")) return;
    try {
      await deleteDoc(doc(db, 'customers', cid));
      setSelectedCustomerId('');
    } catch (err) {
      console.error(err);
    }
  };

  // Filter customers matching search queries
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      
      {/* LEFT COLUMN: Customer accounts selector & Quick register (4 cols) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Client Ledgers</h3>
            <button 
              id="cust-add-trigger"
              onClick={() => setIsAddOpen(true)}
              className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg flex items-center space-x-1 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>{t('cust.add')}</span>
            </button>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder={t('cust.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Customer list sidebar scroll */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filteredCustomers.map(c => {
            const hasDebt = c.outstandingCredit > 0;
            return (
              <div 
                key={c.id}
                onClick={() => setSelectedCustomerId(c.id)}
                className={`p-3.5 rounded-2xl cursor-pointer border hover:border-indigo-100 transition flex justify-between items-center ${selectedCustomerId === c.id ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200 shadow-sm' : 'bg-white dark:bg-slate-900 border-indigo-100/20'}`}
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-950 dark:text-white">{c.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.phone}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-extrabold font-mono ${hasDebt ? 'text-amber-500' : 'text-slate-400'}`}>
                    {storeCurrency}{c.outstandingCredit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">{hasDebt ? "Outstanding" : "Clear"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Ledger statement, Payments ledger, AI reminders (8 cols) */}
      <div className="lg:col-span-8">
        {selectedCustomer ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left inside panel: statement and transactions (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm space-y-4">
                
                {/* User Card Details */}
                <div className="flex justify-between items-start border-b border-indigo-50 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-950 dark:text-white">{selectedCustomer.name}</h2>
                    <p className="text-[10px] text-slate-400">{selectedCustomer.phone} • {selectedCustomer.email}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Total Balance Panel */}
                <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">{t('cust.balance')}</p>
                    <h3 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
                      {storeCurrency}{selectedCustomer.outstandingCredit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <CreditCard className="w-6 h-6 text-amber-500/70" />
                </div>

                {/* Transactions Audit Ledger list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Statement History</h4>
                  {customerTransactions.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-3">No credits or payments recorded yet for this client.</p>
                  ) : (
                    <div className="divide-y divide-indigo-50/50 dark:divide-slate-800/50 max-h-[35vh] overflow-y-auto pr-1">
                      {customerTransactions.map(tx => {
                        const isCredit = tx.type === 'credit';
                        return (
                          <div key={tx.id} className="py-2.5 flex justify-between items-center text-xs">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800 dark:text-slate-200">{tx.description}</p>
                              <p className="text-[9px] text-slate-400 flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                              </p>
                            </div>
                            <span className={`font-mono font-bold ${isCredit ? 'text-red-500' : 'text-emerald-500'}`}>
                              {isCredit ? '+' : '-'}{storeCurrency}{tx.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Right inside panel: payment entry and AI triggers (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              
              {/* Record payment widget */}
              {selectedCustomer.outstandingCredit > 0 && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm space-y-3.5">
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Landmark className="w-4 h-4 text-indigo-500" />
                    <span>{t('cust.collect')}</span>
                  </h4>
                  <form onSubmit={handleLogPayment} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount Paid ({storeCurrency}) *</label>
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Note / Reference</label>
                      <input 
                        type="text" 
                        value={paymentNote}
                        onChange={e => setPaymentNote(e.target.value)}
                        placeholder="e.g. Cash, GPay ref, cheque etc"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <button
                      id="cust-payment-btn"
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
                    >
                      Record Payment
                    </button>
                  </form>
                </div>
              )}

              {/* AI Reminders Panel */}
              {selectedCustomer.outstandingCredit > 0 && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-white uppercase flex items-center space-x-1">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      <span>{t('cust.reminder')}</span>
                    </h4>
                    
                    {/* language picker */}
                    <select
                      value={reminderLang}
                      onChange={e => setReminderLang(e.target.value as Language)}
                      className="text-[10px] font-bold border border-indigo-50 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-950 px-1 py-0.5"
                    >
                      <option value="en">English</option>
                      <option value="ta">Tamil</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </div>

                  <button
                    id="cust-ai-reminder-btn"
                    onClick={handleGenerateReminder}
                    disabled={generatingReminder}
                    className="w-full bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/70 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{generatingReminder ? "Drafting Reminders..." : "Draft AI Whatsapp Text"}</span>
                  </button>

                  {aiReminder && (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-indigo-50 dark:border-slate-850 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap select-all">
                        {aiReminder}
                      </div>
                      <a 
                        href={triggerWhatsAppUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition text-center shadow-sm"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Send on WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm text-center text-slate-400">
            <UserCheck className="w-12 h-12 text-indigo-100 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">No customer ledger selected</h3>
            <p className="text-xs max-w-sm mx-auto mt-1">Register client profiles or click on their card on the left panel to display transaction histories, fractional payments, or launch AI WhatsApp triggers.</p>
          </div>
        )}
      </div>

      {/* Add Customer Modal Drawer */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-indigo-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-center border-b border-indigo-50 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-950 dark:text-white">Register Customer</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cust.name')} *</label>
                <input 
                  type="text" 
                  required
                  value={formName} 
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cust.phone')} *</label>
                <input 
                  type="tel" 
                  required
                  value={formPhone} 
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email (Optional)</label>
                <input 
                  type="email" 
                  value={formEmail} 
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="e.g. ramesh@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-indigo-50 dark:border-slate-800 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button 
                  id="cust-save-btn"
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
