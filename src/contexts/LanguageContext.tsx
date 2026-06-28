import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export type Language = 'en' | 'ta' | 'hi';

interface TranslationDictionary {
  [key: string]: {
    en: string;
    ta: string;
    hi: string;
  };
}

const translations: TranslationDictionary = {
  // Brand & Navigation
  "brand.name": { en: "Zentora", ta: "சென்டோரா", hi: "जेंटोरा" },
  "brand.tagline": { en: "AI-Powered Retail Intelligence", ta: "AI-இயங்கும் சில்லறை வணிக நுண்ணறிவு", hi: "एआई-संचालित रिटेल इंटेलिजेंस" },
  "nav.dashboard": { en: "Dashboard", ta: "டாஷ்போர்டு", hi: "डैशबोर्ड" },
  "nav.inventory": { en: "Inventory", ta: "சரக்கு இருப்பு", hi: "इन्वेंट्री" },
  "nav.sales": { en: "Sales / POS", ta: "விற்பனை / POS", hi: "बिक्री / पीओएस" },
  "nav.scanner": { en: "Invoice Scanner", ta: "விலைப்பட்டியல் ஸ்கேனர்", hi: "चालान स्कैनर" },
  "nav.customers": { en: "Customers Ledger", ta: "வாடிக்கையாளர்கள்", hi: "ग्राहक लेजर" },
  "nav.copilot": { en: "AI Copilot", ta: "AI துணையாளர்", hi: "एआई कोपायलट" },
  "nav.analytics": { en: "Financial Reports", ta: "நிதி அறிக்கைகள்", hi: "वित्तीय रिपोर्ट" },
  "nav.settings": { en: "Settings", ta: "அமைப்புகள்", hi: "सेटिंग्स" },
  "nav.signout": { en: "Sign Out", ta: "வெளியேறு", hi: "साइन आउट" },
  "nav.signin": { en: "Sign In", ta: "உள்நுழைக", hi: "साइन इन" },

  // Dashboard KPI
  "dash.revenue": { en: "Total Revenue", ta: "மொத்த வருவாய்", hi: "कुल राजस्व" },
  "dash.profit": { en: "Total Profit", ta: "மொத்த லாபம்", hi: "कुल लाभ" },
  "dash.salesCount": { en: "Sales Transactions", ta: "விற்பனை பரிவர்த்தனைகள்", hi: "बिक्री लेनदेन" },
  "dash.lowStock": { en: "Low Stock Items", ta: "குறைந்த இருப்பு பொருட்கள்", hi: "कम स्टॉक आइटम" },
  "dash.credit": { en: "Outstanding Credit", ta: "நிலுவையில் உள்ள கடன்", hi: "बकाया क्रेडिट" },
  "dash.recentActivity": { en: "Recent Transactions", ta: "சமீபத்திய பரிவர்த்தனைகள்", hi: "हाल के लेनदेन" },
  "dash.insights": { en: "Zentora AI Insights", ta: "சென்டோரா AI நுண்ணறிவு", hi: "जेंटोरा एआई अंतर्दृष्टि" },

  // Inventory
  "inv.title": { en: "Product Inventory", ta: "தயாரிப்பு சரக்கு", hi: "उत्पाद सूची" },
  "inv.addProduct": { en: "Add Product", ta: "தயாரிப்பைச் சேர்", hi: "उत्पाद जोड़ें" },
  "inv.search": { en: "Search products...", ta: "தயாரிப்புகளைத் தேடு...", hi: "उत्पाद खोजें..." },
  "inv.name": { en: "Product Name", ta: "தயாரிப்பு பெயர்", hi: "उत्पाद का नाम" },
  "inv.category": { en: "Category", ta: "வகை", hi: "श्रेणी" },
  "inv.price": { en: "Selling Price", ta: "விற்பனை விலை", hi: "विक्रय मूल्य" },
  "inv.cost": { en: "Cost Price", ta: "அடக்க விலை", hi: "लागत मूल्य" },
  "inv.quantity": { en: "Stock Level", ta: "சரக்கு அளவு", hi: "स्टॉक स्तर" },
  "inv.barcode": { en: "Barcode / SKU", ta: "பார்கோடு / SKU", hi: "बारकोड / SKU" },
  "inv.actions": { en: "Actions", ta: "செயல்கள்", hi: "कार्रवाई" },
  "inv.analyze": { en: "AI Product Analysis", ta: "AI தயாரிப்பு பகுப்பாய்வு", hi: "एआई उत्पाद विश्लेषण" },

  // POS
  "pos.title": { en: "Point of Sale", ta: "விற்பனை புள்ளி", hi: "बिक्री केंद्र" },
  "pos.walkin": { en: "Walk-in Customer", ta: "நேரடி வாடிக்கையாளர்", hi: "वॉक-इन ग्राहक" },
  "pos.selectCustomer": { en: "Select Customer", ta: "வாடிக்கையாளரைத் தேர்ந்தெடு", hi: "ग्राहक चुनें" },
  "pos.subtotal": { en: "Subtotal", ta: "துணைத் தொகை", hi: "उपयोग" },
  "pos.discount": { en: "Discount", ta: "தள்ளுபடி", hi: "छूट" },
  "pos.gst": { en: "GST (18%)", ta: "ஜிஎஸ்டி (18%)", hi: "जीएसटी (18%)" },
  "pos.total": { en: "Total Amount", ta: "மொத்த தொகை", hi: "कुल राशि" },
  "pos.paymentMethod": { en: "Payment Method", ta: "பணம் செலுத்தும் முறை", hi: "भुगतान विधि" },
  "pos.checkout": { en: "Complete Sale", ta: "விற்பனையை முடி", hi: "बिक्री पूरी करें" },
  "pos.print": { en: "Print Invoice", ta: "விலைப்பட்டியல் அச்சிடு", hi: "चालान प्रिंट करें" },

  // Scanner
  "scan.title": { en: "AI Invoice Scanner", ta: "AI விலைப்பட்டியல் ஸ்கேனர்", hi: "एआई चालान स्कैनर" },
  "scan.desc": { en: "Upload supplier invoices or receipts. Zentora Vision automatically extracts products, pricing, quantities, and populates your stock database.", ta: "வழங்குநரின் விலைப்பட்டியல்களைப் பதிவேற்றவும். தயாரிப்புகள் மற்றும் விலைகளை தானாகவே பிரித்தெடுத்து உங்கள் சரக்கில் சேர்க்கும்.", hi: "आपूर्तिकर्ता चालान या रसीदें अपलोड करें। जेंटोरा विज़न स्वचालित रूप से उत्पादों, मूल्य निर्धारण को निकालता है।" },
  "scan.upload": { en: "Upload Invoice Image", ta: "விலைப்பட்டியல் படத்தை பதிவேற்றுக", hi: "चालान छवि अपलोड करें" },
  "scan.extracting": { en: "AI extracting invoice data...", ta: "AI விலைப்பட்டியல் தரவைப் பிரித்தெடுக்கிறது...", hi: "एआई चालान डेटा निकाल रहा है..." },
  "scan.sync": { en: "Confirm & Sync to Inventory", ta: "சரக்குடன் ஒத்திசைப்பதை உறுதிசெய்", hi: "पुष्टि करें और इन्वेंट्री सिंक करें" },

  // Customers
  "cust.title": { en: "Customer Relations & Credit", ta: "வாடிக்கையாளர் உறவுகள் & கடன்", hi: "ग्राहक संबंध और क्रेडिट" },
  "cust.addCustomer": { en: "Add Customer", ta: "வாடிக்கையாளரைச் சேர்", hi: "ग्राहक जोड़ें" },
  "cust.outstanding": { en: "Credit Ledger", ta: "கடன் பதிவேடு", hi: "क्रेडिट बही" },
  "cust.history": { en: "Purchase History", ta: "வாங்குதல் வரலாறு", hi: "खरीद इतिहास" },
  "cust.reminder": { en: "AI WhatsApp Reminder", ta: "AI வாட்ஸ்அப் நினைவூட்டல்", hi: "एआई व्हाट्सएप रिमाइंडर" },
  "cust.recordPayment": { en: "Record Payment", ta: "பணம் செலுத்தலைப் பதிவுசெய்", hi: "भुगतान दर्ज करें" },

  // Settings
  "set.title": { en: "Platform Settings", ta: "தள அமைப்புகள்", hi: "प्लेटफ़ॉर्म सेटिंग्स" },
  "set.language": { en: "Preferred Language", ta: "விருப்பமான மொழி", hi: "पसंदीदा भाषा" },
  "set.business": { en: "Business Profile", ta: "வணிக விவரங்கள்", hi: "व्यावसायिक प्रोफ़ाइल" },
  "set.theme": { en: "Interface Theme", ta: "இடைமுக தீம்", hi: "इंटरफ़ेस थीम" }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('zentora_language');
    return (saved as Language) || 'en';
  });

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('zentora_language', lang);
    
    // Persist to user profile if signed in
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, { language: lang });
      } catch (err) {
        console.warn("Failed to persist language preference:", err);
      }
    }
  };

  const t = (key: string): string => {
    const term = translations[key];
    if (!term) return key;
    return term[language] || term['en'];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
