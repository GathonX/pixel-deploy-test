// src/services/userFeatureService.ts
import api from "./api";

export interface UserFeatureExpiration {
  id: number;
  key: string;
  name: string;
  is_expired: boolean;
  expires_at?: string;
  days_remaining?: number;
  can_renew: boolean;
  billing_period?: 'monthly' | 'yearly';
  period_label?: string;
  amount_paid?: number;
  original_price?: number;
  discount_percentage?: number;
}

export interface ExpirationSummary {
  total: number;
  active: number;
  expired: number;
  expiring_soon: number;
  urgent: number;
  features: UserFeatureExpiration[];
}

class UserFeatureService {
  /**
   * Récupérer le résumé des expirations
   */
  async getExpirationSummary(): Promise<ExpirationSummary> {
    try {
      const response = await api.get("/features/available");
      const features: UserFeatureExpiration[] = response.data.data || [];

      const expired = features.filter((f) => f.is_expired).length;
      const expiring_soon = features.filter(
        (f) => f.days_remaining && f.days_remaining <= 7
      ).length;
      const urgent = features.filter(
        (f) => f.days_remaining && f.days_remaining <= 1
      ).length;
      const active = features.filter((f) => !f.is_expired).length;

      return {
        total: features.length,
        active,
        expired,
        expiring_soon,
        urgent,
        features,
      };
    } catch (error) {
      console.error("Erreur récupération résumé expiration:", error);
      return {
        total: 0,
        active: 0,
        expired: 0,
        expiring_soon: 0,
        urgent: 0,
        features: [],
      };
    }
  }

  /**
   * ✅ SUPPRIMÉ : Plus de renouvellement automatique
   * Pour "renouveler", rediriger vers /features/purchase/{id}
   */
}

export default new UserFeatureService();
