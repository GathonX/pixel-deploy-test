// Types génériques pour le système d'achat partagé (site-builder, studio-domain, etc.)

export type PurchaseSource = 'site-builder' | 'studio-domain' | 'marketplace' | 'workspace-user' | 'client-workspace' | 'workspace-subscription' | 'site-language' | 'site-subscription';

export type PurchaseStatus = 'pending' | 'awaiting_payment' | 'payment_submitted' | 'confirmed' | 'rejected' | 'cancelled';

export type PaymentMethod = 'mobile_money' | 'bank_transfer' | 'card' | 'orange' | 'airtel_money' | 'mvola' | 'tap_tap_send' | 'other';

export interface PurchaseItem {
  id: string;
  source: PurchaseSource;
  sourceItemId: string; // ex: template ID, domain ID
  name: string;
  description?: string;
  thumbnail?: string;
  priceEur: number;
  priceAriary: number;
}

export interface PurchaseOrder {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  siteName?: string;
  items: PurchaseItem[];
  totalEur: number;
  totalAriary: number;
  status: PurchaseStatus;
  paymentMethod?: string;
  paymentProofUrl?: string;
  paymentProofs?: string[];
  fullName?: string;
  email?: string;
  contactNumber?: string;
  userMessage?: string;
  amountClaimed?: string;
  adminNote?: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface CreatePurchaseRequest {
  source: PurchaseSource;
  sourceItemId: string;
  siteName?: string;
  itemName: string;
  itemDescription?: string;
  itemThumbnail?: string;
  priceEur: number;
  priceAriary: number;
}

export interface SubmitPaymentProofRequest {
  orderId: string;
  paymentMethod: PaymentMethod;
  paymentProofUrl: string;
}

export interface AdminConfirmPurchaseRequest {
  orderId: string;
  approved: boolean;
  adminNote?: string;
}
