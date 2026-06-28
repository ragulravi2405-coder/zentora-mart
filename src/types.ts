/**
 * Zentora - Business Entity Types and Interfaces
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  onboardingCompleted: boolean;
  storeId: string | null;
  language: 'en' | 'ta' | 'hi';
  createdAt: any;
}

export interface Store {
  id: string;
  name: string;
  tagline: string;
  currency: string;
  address: string;
  phone: string;
  gstNumber: string;
  createdAt: any;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  quantity: number;
  minStockAlert: number;
  barcode: string;
  imageUrl: string;
  description: string;
  createdAt: any;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  storeId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  gstAmount: number;
  total: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'credit';
  customerId: string | null;
  customerName: string | null;
  createdAt: any;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  email: string;
  phone: string;
  outstandingCredit: number;
  createdAt: any;
}

export interface CreditTransaction {
  id: string;
  storeId: string;
  customerId: string;
  amount: number; // positive for adding debt, negative for repayments
  type: 'credit' | 'payment';
  description: string;
  createdAt: any;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  createdAt: any;
}

export interface AIChat {
  id: string;
  storeId: string;
  userId: string;
  messages: ChatMessage[];
  updatedAt: any;
}
