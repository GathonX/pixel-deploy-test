import api from '@/services/api';
import {
  PurchaseOrder,
  CreatePurchaseRequest,
  SubmitPaymentProofRequest,
  AdminConfirmPurchaseRequest,
} from '../types/purchase';

const API_BASE = '/purchases';

// ============ USER ============

export async function createPurchase(data: CreatePurchaseRequest): Promise<PurchaseOrder> {
  const response = await api.post(API_BASE, {
    source: data.source,
    source_item_id: data.sourceItemId,
    site_name: data.siteName,
    item_name: data.itemName,
    item_description: data.itemDescription,
    item_thumbnail: data.itemThumbnail,
    price_eur: data.priceEur,
    price_ariary: data.priceAriary,
  });
  return response.data.data;
}

export async function getUserPurchases(): Promise<PurchaseOrder[]> {
  const response = await api.get(API_BASE);
  return response.data.data;
}

export async function getPurchase(id: string): Promise<PurchaseOrder> {
  const response = await api.get(`${API_BASE}/${id}`);
  return response.data.data;
}

export async function submitPaymentProof(data: SubmitPaymentProofRequest): Promise<PurchaseOrder> {
  const response = await api.post(
    `${API_BASE}/${data.orderId}/proof`,
    {
      payment_method: data.paymentMethod,
      payment_proof_url: data.paymentProofUrl,
    }
  );
  return response.data.data;
}

export async function cancelPurchase(orderId: string): Promise<PurchaseOrder> {
  const response = await api.post(`${API_BASE}/${orderId}/cancel`);
  return response.data.data;
}

export async function submitPurchasePayment(orderId: string, formData: FormData): Promise<PurchaseOrder> {
  const response = await api.post(
    `${API_BASE}/${orderId}/submit-payment`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data.data;
}

// ============ ADMIN ============

export async function getAdminPurchases(status?: string): Promise<PurchaseOrder[]> {
  const params = status ? { status } : {};
  const response = await api.get(`${API_BASE}/admin/list`, { params });
  return response.data.data;
}

export async function confirmPurchase(data: AdminConfirmPurchaseRequest): Promise<PurchaseOrder> {
  const response = await api.post(
    `${API_BASE}/${data.orderId}/confirm`,
    {
      approved: data.approved,
      admin_note: data.adminNote,
    }
  );
  return response.data.data;
}

// ============ UPLOAD PROOF ============

export async function uploadPaymentProof(orderId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('proof', file);
  const response = await api.post(
    `${API_BASE}/${orderId}/upload-proof`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data.data.url;
}

const purchaseService = {
  createPurchase,
  getUserPurchases,
  getPurchase,
  submitPaymentProof,
  submitPurchasePayment,
  cancelPurchase,
  getAdminPurchases,
  confirmPurchase,
  uploadPaymentProof,
};

export default purchaseService;
