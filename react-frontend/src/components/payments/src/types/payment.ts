// src/components/payments/src/types/payment.ts
// ✅ INTÉGRATION : Compatible avec paymentService.ts
// ✅ PRÉSERVATION : Interfaces existantes maintenues
// ✅ AJOUT : Types manquants pour compatibilité backend

// ===== TYPES EXISTANTS PRÉSERVÉS =====

export interface User {
  id: string;
  email: string;
  credits: number;
  currentPlan?: string;
  subscriptionStatus?: 'active' | 'cancelled' | 'expired';
  autoRecharge?: AutoRechargeSettings;
}

export interface AutoRechargeSettings {
  enabled: boolean;
  triggerThreshold: number;
  rechargePackageId: string;
  maxPerMonth: number;
  lastRecharge?: Date;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice: number;
  discount: number;
  popular?: boolean;
  bestValue?: boolean;
  bonus?: {
    type: 'credits' | 'feature';
    value: number | string;
    description: string;
  };
  paypalProductId: string;
}

export interface SubscriptionPlan {
  plan_key: string;
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  popular?: boolean;
  recommended?: boolean;
  limitations?: {
    projects?: number;
    generations?: number;
    storage?: string;
  };
  paypalPlanId: {
    monthly: string;
    yearly: string;
  };
}

export interface Action {
  id: string;
  title: string;
  description: string;
  creditsReward: number;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'social' | 'review' | 'referral' | 'community' | 'content';
  requirements: string[];
  validationMethod: 'automatic' | 'manual' | 'hybrid';
  cooldownPeriod?: string;
  maxPerDay?: number;
  icon: React.ReactNode;
  status: 'available' | 'completed' | 'pending_validation' | 'cooldown';
}

export interface CompletedAction {
  id: string;
  actionId: string;
  userId: string;
  creditsEarned: number;
  completedAt: Date;
  validatedAt?: Date;
  validationStatus: 'pending' | 'approved' | 'rejected';
  validationNotes?: string;
  proofUrl?: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  type: 'credit_purchase' | 'subscription' | 'auto_recharge';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paypalOrderId?: string;
  paypalSubscriptionId?: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

// ===== TYPES VALIDATION PRÉSERVÉS =====

export interface ValidationSystem {
  automaticValidation: {
    trackReferralLinks: boolean;
    verifyEmailConfirmation: boolean;
    checkEventAttendance: boolean;
  };
  
  manualValidation: {
    queueForReview: (actionId: string, userId: string, proof: string) => void;
    adminReviewInterface: ReviewInterface;
    approvalWorkflow: ApprovalStep[];
  };
  
  fraudDetection: {
    duplicateContentDetection: boolean;
    socialAccountVerification: boolean;
    behaviorAnalysis: boolean;
    ipTracking: boolean;
    suspiciousActivityAlerts: boolean;
  };
}

export interface ReviewInterface {
  pendingReviews: CompletedAction[];
  reviewAction: (actionId: string, decision: 'approve' | 'reject', notes?: string) => void;
  bulkActions: {
    approveAll: () => void;
    rejectAll: () => void;
  };
}

export interface ApprovalStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  automate: boolean;
  criteria: string[];
}

// ===== TYPES PAYPAL PRÉSERVÉS =====

export interface PayPalOrder {
  orderID: string;
  status: string;
  amount: number;
  currency: string;
  items: PayPalOrderItem[];
}

export interface PayPalOrderItem {
  name: string;
  quantity: number;
  unit_amount: {
    currency_code: string;
    value: string;
  };
}

export interface PayPalSubscription {
  subscriptionID: string;
  planId: string;
  status: string;
  startTime: Date;
  nextBillingTime?: Date;
  subscriber: {
    email: string;
    name?: string;
  };
}

export interface WebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: unknown;
  create_time: string;
  event_version: string;
}

// ===== TYPES AJOUTÉS POUR COMPATIBILITÉ BACKEND =====

// Types pour l'import du paymentService
export interface UserCredit {
  current_balance: number;
  total_earned: number;
  total_spent: number;
  monthly_earned: number;
  monthly_spent: number;
  auto_recharge_enabled: boolean;
  auto_recharge_threshold: number | null;
  auto_recharge_package_id: number | null;
  auto_recharge_budget_monthly: number | null;
  daily_spend_limit: number | null;
  monthly_spend_limit: number | null;
  formatted_balance: string;
}

export interface UserSubscription {
  id: number;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'pending';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string | null;
  cancelled_at: string | null;
  amount: number;
  currency: string;
  paypal_subscription_id: string | null;
  paypal_plan_id: string | null;
  auto_renew: boolean;
  days_remaining: number;
  formatted_amount: string;
  status_description: string;
}

// Type générique pour les réponses API
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  error_code?: string;
}