// src/services/paymentHistoryService.ts - SERVICE OPTIONNEL
// Ce service peut être utilisé si vous voulez centraliser les appels API

import api from "./api";

export interface PaymentHistoryItem {
  id: number;
  feature_name: string;
  full_name: string;
  amount_claimed: number;
  payment_method: string;
  email: string;
  contact_number: string;
  status: "pending" | "approved" | "rejected";
  admin_response?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  user_message?: string;
  feature: {
    id: number;
    key: string;
    name: string;
    price: number;
    category: string;
  };
}

export interface PaymentHistoryResponse {
  success: boolean;
  data: PaymentHistoryItem[];
  message: string;
}

class PaymentHistoryService {
  /**
   * Récupérer l'historique des demandes d'activation
   */
  async getPaymentHistory(): Promise<PaymentHistoryResponse> {
    try {
      const response = await api.get("/features/request-history");
      return response.data;
    } catch (error) {
      console.error("Erreur récupération historique paiements:", error);
      throw error;
    }
  }

  /**
   * Récupérer les détails d'une demande spécifique
   */
  async getPaymentDetails(
    requestId: number
  ): Promise<{ success: boolean; data: PaymentHistoryItem }> {
    try {
      const response = await api.get(`/features/request-history/${requestId}`);
      return response.data;
    } catch (error) {
      console.error("Erreur récupération détails paiement:", error);
      throw error;
    }
  }

  /**
   * Statistiques utilisateur
   */
  async getPaymentStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    totalAmount: number;
  }> {
    try {
      const historyResponse = await this.getPaymentHistory();
      const history = historyResponse.data;

      return {
        total: history.length,
        approved: history.filter((p) => p.status === "approved").length,
        pending: history.filter((p) => p.status === "pending").length,
        rejected: history.filter((p) => p.status === "rejected").length,
        totalAmount: history
          .filter((p) => p.status === "approved")
          .reduce((sum, p) => sum + p.amount_claimed, 0),
      };
    } catch (error) {
      console.error("Erreur calcul statistiques:", error);
      return {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        totalAmount: 0,
      };
    }
  }
}

export default new PaymentHistoryService();
