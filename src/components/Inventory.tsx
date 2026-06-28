import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Product } from '../types';
import { Plus, Search, Edit2, Trash2, ArrowUpFromLine, ArrowDownToLine, Sparkles, AlertTriangle, FileText, Barcode, Image as ImageIcon, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface InventoryProps {
  storeId: string;
  storeCurrency: string;
}

const CATEGORIES = ["Beverages", "Groceries", "Personal Care", "Electronics", "Apparel", "Snacks", "Dairy", "Household"];

export default function Inventory({ storeId, storeCurrency }: InventoryProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formBarcode, setFormBarcode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageBase64, setFormImageBase64] = useState('');
  
  // AI analysis state
  const [analyzingProduct, setAnalyzingProduct] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  // Fetch products real-time
  useEffect(() => {
    if (!storeId) return;

    if (storeId === 'demo_store_123') {
      const localProducts = localStorage.getItem('zentora_demo_products');
      if (localProducts) {
        setProducts(JSON.parse(localProducts));
      } else {
        const demoProducts = [
          { id: 'p1', name: 'Premium Basmati Rice 5kg', category: 'Groceries', price: 450, costPrice: 380, quantity: 12, minStockAlert: 5, barcode: '8901234567890', description: 'Long grain aromatic basmati rice.', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150', storeId: 'demo_store_123', createdAt: new Date().toISOString() },
          { id: 'p2', name: 'Organic Coconut Oil 1L', category: 'Groceries', price: 280, costPrice: 220, quantity: 3, minStockAlert: 5, barcode: '8901234567891', description: 'Cold pressed organic coconut oil.', imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150', storeId: 'demo_store_123', createdAt: new Date().toISOString() },
          { id: 'p3', name: 'Tomato Puree Pack 200g', category: 'Groceries', price: 45, costPrice: 32, quantity: 85, minStockAlert: 10, barcode: '8901234567892', description: 'Rich tomato paste.', imageUrl: 'https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=150', storeId: 'demo_store_123', createdAt: new Date().toISOString() },
          { id: 'p4', name: 'Liquid Handwash 250ml', category: 'Personal Care', price: 99, costPrice: 75, quantity: 25, minStockAlert: 5, barcode: '8901234567893', description: 'Antibacterial liquid handwash.', imageUrl: '', storeId: 'demo_store_123', createdAt: new Date().toISOString() },
          { id: 'p5', name: 'Choco Chip Cookies 150g', category: 'Snacks', price: 60, costPrice: 45, quantity: 2, minStockAlert: 5, barcode: '8901234567894', description: 'Delicious chocolate chip cookies.', imageUrl: '', storeId: 'demo_store_123', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('zentora_demo_products', JSON.stringify(demoProducts));
        setProducts(demoProducts);
      }
      return;
    }

    const q = query(collection(db, 'products'), where('storeId', '==', storeId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach(doc => items.push(doc.data() as Product));
      setProducts(items);
    });
    return unsubscribe;
  }, [storeId]);

  // Handle form edit loading
  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormPrice(prod.price.toString());
    setFormCostPrice(prod.costPrice.toString());
    setFormQuantity(prod.quantity.toString());
    setFormMinStock(prod.minStockAlert.toString());
    setFormBarcode(prod.barcode);
    setFormDescription(prod.description);
    setFormImageBase64(prod.imageUrl);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(CATEGORIES[0]);
    setFormPrice('');
    setFormCostPrice('');
    setFormQuantity('');
    setFormMinStock('5');
    setFormBarcode('');
    setFormDescription('');
    setFormImageBase64('');
    setIsModalOpen(false);
    setIsModalOpen(true);
  };

  // Convert uploaded file to base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini Vision Product Analyzer
  const handleAIAnalyzeProduct = async () => {
    if (!formImageBase64) {
      alert("Please upload or take a product photo first to enable AI Auto-Fill.");
      return;
    }

    setAnalyzingProduct(true);
    setAiSuccessMessage('');
    try {
      // split base64 prefix
      const base64Data = formImageBase64.split(',')[1] || formImageBase64;
      
      const response = await fetch('/api/gemini/analyze-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          nameHint: formName
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Auto-fill form fields!
      if (data.category) {
        // match category closest or fallback
        const matched = CATEGORIES.find(c => c.toLowerCase() === data.category.toLowerCase()) || data.category;
        setFormCategory(matched);
      }
      if (data.suggestedPrice) {
        setFormPrice(data.suggestedPrice.toString());
        // set default cost price as 70% of price
        setFormCostPrice(Math.round(data.suggestedPrice * 0.7).toString());
      }
      if (data.minStockAlert) {
        setFormMinStock(data.minStockAlert.toString());
      }
      if (data.description) {
        setFormDescription(data.description);
      }

      setAiSuccessMessage("Zentora Vision successfully filled category, description, and suggested competitive pricing!");
    } catch (err: any) {
      console.error(err);
      alert("AI Analysis failed: " + (err.message || err));
    } finally {
      setAnalyzingProduct(false);
    }
  };

  // Save Product to Firestore
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice || !formQuantity) return;

    try {
      const prodId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
      const productPayload: Product = {
        id: prodId,
        storeId,
        name: formName,
        category: formCategory,
        price: parseFloat(formPrice),
        costPrice: parseFloat(formCostPrice || '0'),
        quantity: parseInt(formQuantity),
        minStockAlert: parseInt(formMinStock || '5'),
        barcode: formBarcode || `BC_${Date.now().toString().slice(-6)}`,
        imageUrl: formImageBase64 || 'https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=150', // placeholder box
        description: formDescription || 'Standard inventory product',
        createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
      };

      if (storeId === 'demo_store_123') {
        const localProducts = localStorage.getItem('zentora_demo_products');
        let list: Product[] = localProducts ? JSON.parse(localProducts) : [];
        if (editingProduct) {
          list = list.map(p => p.id === prodId ? productPayload : p);
        } else {
          list.push(productPayload);
        }
        localStorage.setItem('zentora_demo_products', JSON.stringify(list));
        setProducts(list);
        setIsModalOpen(false);
        return;
      }

      await setDoc(doc(db, 'products', prodId), productPayload);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save product failed:", err);
      alert("Error saving product: " + err);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product from your inventory?")) return;
    try {
      if (storeId === 'demo_store_123') {
        const localProducts = localStorage.getItem('zentora_demo_products');
        if (localProducts) {
          const list: Product[] = JSON.parse(localProducts);
          const filtered = list.filter(p => p.id !== id);
          localStorage.setItem('zentora_demo_products', JSON.stringify(filtered));
          setProducts(filtered);
        }
        return;
      }
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = ["ID", "Name", "Category", "Price", "CostPrice", "Quantity", "MinStockAlert", "Barcode", "Description"];
    const rows = products.map(p => [p.id, p.name, p.category, p.price, p.costPrice, p.quantity, p.minStockAlert, p.barcode, p.description]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zentora_inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple Mock CSV Import (creates standard objects)
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length <= 1) return;

        // Skip headers, iterate items
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cells.length < 3) continue;

          const prodId = `prod_csv_${Date.now()}_${i}`;
          const payload: Product = {
            id: prodId,
            storeId,
            name: cells[1] || `CSV Import Item ${i}`,
            category: cells[2] || "Groceries",
            price: parseFloat(cells[3] || '0'),
            costPrice: parseFloat(cells[4] || '0'),
            quantity: parseInt(cells[5] || '10'),
            minStockAlert: parseInt(cells[6] || '5'),
            barcode: cells[7] || `BC_${Date.now()}_${i}`,
            imageUrl: 'https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=150',
            description: cells[8] || 'CSV Imported Product',
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'products', prodId), payload);
        }
        alert("Products successfully imported into Firestore database!");
      } catch (err) {
        alert("Import failed: " + err);
      }
    };
    reader.readAsText(file);
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{t('inv.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Manage products, verify low stock, or triggers Gemini image parsing.</p>
        </div>
        <div className="flex items-center space-x-2">
          {/* CSV Import */}
          <label className="px-3 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl border border-indigo-100 dark:border-slate-800 cursor-pointer flex items-center space-x-1 transition shadow-sm">
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Import</span>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
          {/* Export */}
          <button 
            id="inv-export"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl border border-indigo-100 dark:border-slate-800 flex items-center space-x-1 transition shadow-sm"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          {/* Add Product button */}
          <button 
            id="inv-add-btn"
            onClick={openAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('inv.addProduct')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-between items-center">
        <div className="w-full sm:w-80 relative">
          <input 
            type="text" 
            placeholder={t('inv.search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        
        {/* Category Pill Filters */}
        <div className="flex space-x-2 overflow-x-auto w-full sm:w-auto scrollbar-none py-1">
          <button 
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'All' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-slate-600 dark:text-slate-400'}`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow' : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-slate-600 dark:text-slate-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table/Grid view */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100/50 dark:border-slate-800 p-16 text-center text-slate-400">
          <FileText className="w-12 h-12 text-indigo-100 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">No products found</h3>
          <p className="text-xs max-w-sm mx-auto mt-1">There are no products fitting your criteria. Add products to populate your retail inventory.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-indigo-50/50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider border-b border-indigo-100/30 dark:border-slate-800/60">
                <tr>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">{t('inv.category')}</th>
                  <th className="px-6 py-4 text-right">{t('inv.price')}</th>
                  <th className="px-6 py-4 text-right">{t('inv.cost')}</th>
                  <th className="px-6 py-4 text-right">{t('inv.quantity')}</th>
                  <th className="px-6 py-4">{t('inv.barcode')}</th>
                  <th className="px-6 py-4 text-center">{t('inv.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50/50 dark:divide-slate-800/50">
                {filteredProducts.map((p) => {
                  const isLowStock = p.quantity <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-indigo-50/10 dark:hover:bg-slate-800/10 transition">
                      {/* Item Details */}
                      <td className="px-6 py-4 flex items-center space-x-3">
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-8 h-8 rounded-lg object-cover border border-indigo-50 dark:border-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-slate-950 dark:text-white">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[150px]">{p.description}</p>
                        </div>
                      </td>
                      {/* Category */}
                      <td className="px-6 py-4">
                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-bold text-[10px]">
                          {p.category}
                        </span>
                      </td>
                      {/* Price */}
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {storeCurrency}{p.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      {/* Cost */}
                      <td className="px-6 py-4 text-right font-semibold text-slate-500 font-mono">
                        {storeCurrency}{p.costPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      {/* Quantity */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <span className={`font-bold font-mono ${isLowStock ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {p.quantity}
                          </span>
                          {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                      </td>
                      {/* Barcode */}
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                        {p.barcode}
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => openEditModal(p)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-indigo-100 dark:border-slate-800 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center border-b border-indigo-50 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-950 dark:text-white">
                {editingProduct ? "Modify Product Details" : "Register New Product"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs sm:text-sm">
              
              {/* Image Upload Block & AI auto-fill triggers */}
              <div className="bg-indigo-50/30 dark:bg-slate-950/40 p-4 rounded-xl border border-dashed border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="relative w-16 h-16 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-indigo-100 text-slate-400 overflow-hidden shrink-0">
                  {formImageBase64 ? (
                    <img src={formImageBase64} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                </div>
                <div className="grow w-full text-center sm:text-left">
                  <p className="font-bold text-indigo-950 dark:text-white text-xs">Product Image</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="text-[10px] text-slate-500 mt-1 cursor-pointer block w-full"
                  />
                  {formImageBase64 && (
                    <button
                      type="button"
                      disabled={analyzingProduct}
                      onClick={handleAIAnalyzeProduct}
                      className="mt-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold px-3 py-1 rounded text-[10px] flex items-center space-x-1 shadow-sm hover:opacity-90 transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{analyzingProduct ? "AI Analyzing..." : "AI Auto-Fill From Image"}</span>
                    </button>
                  )}
                </div>
              </div>

              {aiSuccessMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {aiSuccessMessage}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('inv.name')} *</label>
                <input 
                  type="text" 
                  required
                  value={formName} 
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Organic Basmati Rice"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('inv.category')}</label>
                <select 
                  value={formCategory} 
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full px-2 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('inv.price')} ({storeCurrency}) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formPrice} 
                    onChange={e => setFormPrice(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('inv.cost')} ({storeCurrency})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formCostPrice} 
                    onChange={e => setFormCostPrice(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Quantity and Threshold alerts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('inv.quantity')} *</label>
                  <input 
                    type="number" 
                    required
                    value={formQuantity} 
                    onChange={e => setFormQuantity(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Stock Warning Limit</label>
                  <input 
                    type="number" 
                    value={formMinStock} 
                    onChange={e => setFormMinStock(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center space-x-1">
                  <Barcode className="w-3.5 h-3.5" /> <span>Barcode / SKU (Optional)</span>
                </label>
                <input 
                  type="text" 
                  value={formBarcode} 
                  onChange={e => setFormBarcode(e.target.value)}
                  placeholder="Scan or type barcode reference"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Description</label>
                <textarea 
                  value={formDescription} 
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="e.g. Pure organically processed basmati long grain rice"
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-indigo-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-indigo-50 dark:border-slate-800 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button 
                  id="inv-modal-save"
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Save Product
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
