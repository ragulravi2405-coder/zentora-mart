import React, { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Product } from '../types';
import { Upload, FileText, Sparkles, Check, Edit3, DatabaseZap, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface InvoiceScannerProps {
  storeId: string;
  storeCurrency: string;
}

interface ExtractedProduct {
  name: string;
  quantity: number;
  price: number;
  total: number;
  category?: string;
}

interface ExtractedInvoice {
  storeName: string;
  invoiceNumber: string;
  date: string;
  products: ExtractedProduct[];
  total: number;
}

export default function InvoiceScanner({ storeId, storeCurrency }: InvoiceScannerProps) {
  const { t } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Scanned results (editable!)
  const [invoiceResult, setInvoiceResult] = useState<ExtractedInvoice | null>(null);
  const [rawJsonOutput, setRawJsonOutput] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File loading helper
  const processFile = (file: File) => {
    if (!file) return;
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
      setInvoiceResult(null);
      setSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Run Gemini Vision Parser
  const handleScanInvoice = async () => {
    if (!imageBase64) return;
    setScanning(true);
    try {
      // Extract raw base64 data without metadata headers
      const base64Data = imageBase64.split(',')[1] || imageBase64;

      const response = await fetch('/api/gemini/analyze-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Default categories
      const formattedProducts = data.products.map((p: any) => ({
        ...p,
        category: p.category || 'Groceries'
      }));

      const finalInvoice: ExtractedInvoice = {
        storeName: data.storeName || 'Unknown Distributor',
        invoiceNumber: data.invoiceNumber || 'INV-TEMP',
        date: data.date || new Date().toISOString().slice(0, 10),
        products: formattedProducts,
        total: data.total || 0
      };

      setInvoiceResult(finalInvoice);
      setRawJsonOutput(JSON.stringify(finalInvoice, null, 2));
    } catch (err: any) {
      console.error(err);
      alert("Vision Extraction failed: " + (err.message || err));
    } finally {
      setScanning(false);
    }
  };

  // Edit fields locally
  const handleProductChange = (idx: number, field: keyof ExtractedProduct, value: any) => {
    if (!invoiceResult) return;
    const updatedProds = [...invoiceResult.products];
    updatedProds[idx] = {
      ...updatedProds[idx],
      [field]: value
    };
    // recompute totals
    if (field === 'price' || field === 'quantity') {
      const q = field === 'quantity' ? value : updatedProds[idx].quantity;
      const p = field === 'price' ? value : updatedProds[idx].price;
      updatedProds[idx].total = q * p;
    }

    const newTotal = updatedProds.reduce((sum, item) => sum + (item.total || 0), 0);

    const updatedInvoice = {
      ...invoiceResult,
      products: updatedProds,
      total: newTotal
    };

    setInvoiceResult(updatedInvoice);
    setRawJsonOutput(JSON.stringify(updatedInvoice, null, 2));
  };

  // Confirm and sync products to inventory
  const handleSyncToInventory = async () => {
    if (!invoiceResult || invoiceResult.products.length === 0) return;

    setScanning(true);
    try {
      const productsRef = collection(db, 'products');

      for (const item of invoiceResult.products) {
        // Query to check if product with this name already exists in this store
        const q = query(productsRef, where('storeId', '==', storeId), where('name', '==', item.name));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          // Product exists! Increase stock quantity
          const existingDoc = qSnap.docs[0];
          const existingData = existingDoc.data() as Product;
          const newQty = (existingData.quantity || 0) + item.quantity;
          
          await updateDoc(doc(db, 'products', existingData.id), {
            quantity: newQty,
            costPrice: item.price // update latest wholesale cost price
          });
        } else {
          // Product does not exist! Create a new product listing
          const newId = `prod_scan_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const newProduct: Product = {
            id: newId,
            storeId,
            name: item.name,
            category: item.category || 'Groceries',
            price: Math.round(item.price * 1.3), // 30% markup suggest
            costPrice: item.price,
            quantity: item.quantity,
            minStockAlert: 5,
            barcode: `BC_${Math.floor(100000 + Math.random() * 900000)}`,
            imageUrl: 'https://images.unsplash.com/photo-1546213290-e1b492ab3eee?w=150',
            description: `Auto-scanned from distributor ${invoiceResult.storeName} on invoice date ${invoiceResult.date}`,
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'products', newId), newProduct);
        }
      }

      setSuccess(true);
      setInvoiceResult(null);
      setImageBase64('');
    } catch (err) {
      console.error("Sync failed:", err);
      alert("Inventory synchronization error: " + err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and description */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{t('scan.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Scan distributor bills to auto-fill inventory catalogs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Upload Area and Image preview */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm space-y-4">
            
            {/* Drag & Drop File Container */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2.5 ${dragActive ? 'border-indigo-600 bg-indigo-50/50' : 'border-indigo-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950'}`}
            >
              <Upload className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Drag & drop invoice image</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, or JPEG up to 10MB</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Photo preview and Parse trigger */}
            {imageBase64 && (
              <div className="space-y-3 pt-2">
                <div className="w-full h-44 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-indigo-50/50 dark:border-slate-800 relative">
                  <img src={imageBase64} alt="invoice mockup preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <button
                  id="scan-trigger-btn"
                  onClick={handleScanInvoice}
                  disabled={scanning}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('scan.extracting')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract Supplier Invoice</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Scanned Results & Editable JSON */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Success Board */}
          {success && (
            <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-start space-x-3 shadow-sm">
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-950 dark:text-white text-xs sm:text-sm">Invoice Successfully Synced</h4>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Newly extracted products have been successfully written to your Firestore inventory records. Existing stock quantities have been safely added.</p>
              </div>
            </div>
          )}

          {/* Extracted Details Editable Interface */}
          {invoiceResult ? (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm space-y-6">
              
              {/* Bill Meta Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-indigo-50 dark:border-slate-800 pb-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Distributor Name</label>
                  <input 
                    type="text" 
                    value={invoiceResult.storeName}
                    onChange={e => setInvoiceResult({ ...invoiceResult, storeName: e.target.value })}
                    className="w-full text-xs font-bold bg-transparent border-b border-indigo-100 dark:border-slate-800 py-1 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Invoice Number</label>
                  <input 
                    type="text" 
                    value={invoiceResult.invoiceNumber}
                    onChange={e => setInvoiceResult({ ...invoiceResult, invoiceNumber: e.target.value })}
                    className="w-full text-xs font-mono bg-transparent border-b border-indigo-100 dark:border-slate-800 py-1 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Invoice Date</label>
                  <input 
                    type="text" 
                    value={invoiceResult.date}
                    onChange={e => setInvoiceResult({ ...invoiceResult, date: e.target.value })}
                    className="w-full text-xs font-mono bg-transparent border-b border-indigo-100 dark:border-slate-800 py-1 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Items List Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Extracted Line Items</h4>
                <div className="overflow-x-auto rounded-xl border border-indigo-50 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 border-b border-indigo-50 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">Product Name</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5 text-right">Quantity</th>
                        <th className="px-4 py-2.5 text-right">Wholesale Cost</th>
                        <th className="px-4 py-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50/50 dark:divide-slate-800/50 font-medium">
                      {invoiceResult.products.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              value={p.name}
                              onChange={e => handleProductChange(idx, 'name', e.target.value)}
                              className="w-full bg-transparent focus:outline-none focus:bg-indigo-50/50 p-1 rounded border-b border-transparent hover:border-slate-200"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={p.category || 'Groceries'}
                              onChange={e => handleProductChange(idx, 'category', e.target.value)}
                              className="bg-transparent focus:outline-none focus:bg-indigo-50/50 p-1 rounded border border-transparent hover:border-slate-200"
                            >
                              <option value="Groceries">Groceries</option>
                              <option value="Beverages">Beverages</option>
                              <option value="Personal Care">Personal Care</option>
                              <option value="Electronics">Electronics</option>
                              <option value="Apparel">Apparel</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input 
                              type="number" 
                              value={p.quantity}
                              onChange={e => handleProductChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-12 bg-transparent text-right focus:outline-none focus:bg-indigo-50/50 p-1 rounded border-b border-transparent"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            <input 
                              type="number" 
                              value={p.price}
                              onChange={e => handleProductChange(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-16 bg-transparent text-right focus:outline-none focus:bg-indigo-50/50 p-1 rounded border-b border-transparent"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-indigo-600">
                            {storeCurrency}{(p.total || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Editable JSON Panel */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Editable raw JSON output</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Double-direction binded</span>
                </div>
                <textarea
                  value={rawJsonOutput}
                  onChange={e => {
                    setRawJsonOutput(e.target.value);
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setInvoiceResult(parsed);
                    } catch (err) {
                      // ignore parse errors while typing
                    }
                  }}
                  rows={4}
                  className="w-full p-3 font-mono text-[10px] sm:text-xs rounded-xl border border-indigo-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none"
                />
              </div>

              {/* Sync Actions bar */}
              <div className="pt-4 border-t border-indigo-50 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 font-mono">
                  Bill Total: {storeCurrency}{invoiceResult.total.toFixed(2)}
                </span>
                <button
                  id="scan-sync-btn"
                  onClick={handleSyncToInventory}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
                >
                  <DatabaseZap className="w-4 h-4" />
                  <span>{t('scan.sync')}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-16 rounded-2xl border border-indigo-100/50 dark:border-slate-800 shadow-sm text-center text-slate-400">
              <FileText className="w-12 h-12 text-indigo-100 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">No scanned items</h3>
              <p className="text-xs max-w-sm mx-auto mt-1">Upload a supplier wholesale receipt, then trigger the Gemini AI vision parsing engine.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
