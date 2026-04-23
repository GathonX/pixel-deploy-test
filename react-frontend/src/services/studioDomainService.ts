/**
 * Studio Domain Service
 * Service pour la gestion des noms de domaine
 */

import api from './api';

// ===== TYPES =====

export interface DomainCheckResult {
  success: boolean;
  domain?: string;
  available?: boolean;
  price?: string | number;
  currency?: string;
  error?: string;
}

export interface DomainSearchResult {
  domain: string;
  extension: string;
  available: boolean;
  price?: string | number;          // prix annuel (montant réel facturé)
  price_monthly?: string | number;  // prix mensuel affiché au client
  price_category?: 'ultra' | 'popular' | 'premium';
  currency?: string;
  error?: string;
}

export interface DomainSearchResponse {
  success: boolean;
  baseName?: string;
  results?: DomainSearchResult[];
  error?: string;
}

export interface TldPricing {
  success: boolean;
  data?: Record<string, {
    registration: number;
    renewal: number;
    transfer: number;
    currency: string;
  }>;
  error?: string;
}

export interface WhoisResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ===== REQUEST TYPES =====

export interface StudioRequest {
  id: number;
  user_id: number;
  domain: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  company_name: string | null;
  description: string | null;
  notes: string | null;
  status: 'pending' | 'in_progress' | 'active' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  activated_at: string | null;
  rejected_at: string | null;
  processed_by: number | null;
  created_at: string;
  updated_at: string;
  // Paiement associé (retourné par index() et adminIndex())
  purchase_id?: string | null;
  purchase_status?: 'awaiting_payment' | 'payment_submitted' | 'confirmed' | 'rejected' | 'cancelled' | null;
  purchase_total_eur?: number | null;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface UpdateRequestData {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  company_name?: string;
  description?: string;
}

export interface CreateRequestData {
  domain: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  company_name?: string;
  description?: string;
}

export interface RequestsResponse {
  success: boolean;
  data?: StudioRequest[];
  error?: string;
}

export interface PaginatedRequestsResponse {
  success: boolean;
  data?: {
    data: StudioRequest[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  error?: string;
}

export interface RequestResponse {
  success: boolean;
  data?: StudioRequest;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

// ===== API CALLS =====

/**
 * Vérifier la disponibilité d'un domaine unique
 */
export const checkDomainAvailability = async (domain: string): Promise<DomainCheckResult> => {
  try {
    const response = await api.post('/studio-domaine/domain/check', { domain });
    return response.data;
  } catch (error: unknown) {
    console.error('Error checking domain:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la vérification';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Rechercher un nom sur plusieurs extensions
 */
export const searchDomains = async (
  name: string,
  extensions: string[] = ['.fr', '.com', '.net', '.org', '.io', '.co']
): Promise<DomainSearchResponse> => {
  try {
    const response = await api.post('/studio-domaine/domain/search', {
      name,
      extensions,
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error searching domains:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la recherche';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Obtenir les prix des TLDs
 */
export const getTldPricing = async (): Promise<TldPricing> => {
  try {
    const response = await api.get('/studio-domaine/domain/pricing');
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching TLD pricing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération des prix';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Obtenir les informations WHOIS d'un domaine
 */
export const getWhoisInfo = async (domain: string): Promise<WhoisResult> => {
  try {
    const response = await api.get(`/studio-domaine/domain/whois/${encodeURIComponent(domain)}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching WHOIS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération WHOIS';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// ===== REQUESTS API =====

/**
 * Récupérer mes demandes
 */
export const getMyRequests = async (): Promise<RequestsResponse> => {
  try {
    const response = await api.get('/studio-domaine/requests');
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching requests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération des demandes';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Récupérer une demande spécifique
 */
export const getRequest = async (id: number): Promise<RequestResponse> => {
  try {
    const response = await api.get(`/studio-domaine/requests/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération de la demande';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Créer une nouvelle demande
 */
export const createRequest = async (data: CreateRequestData): Promise<RequestResponse> => {
  try {
    const response = await api.post('/studio-domaine/requests', data);
    return response.data;
  } catch (error: unknown) {
    console.error('Error creating request:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = error as any;
    if (axiosError.response?.data) {
      return axiosError.response.data;
    }
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création de la demande';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Modifier une demande en attente
 */
export const updateRequest = async (id: number, data: UpdateRequestData): Promise<RequestResponse> => {
  try {
    const response = await api.put(`/studio-domaine/requests/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (axiosError.response?.data) return axiosError.response.data;
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
};

/**
 * Annuler une demande
 */
export const cancelRequest = async (id: number): Promise<RequestResponse> => {
  try {
    const response = await api.delete(`/studio-domaine/requests/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error cancelling request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'annulation';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// ===== ADMIN API =====

export interface AdminStatsResponse {
  success: boolean;
  data?: {
    total: number;
    pending: number;
    in_progress: number;
    active: number;
    rejected: number;
    cancelled: number;
  };
  error?: string;
}

export interface AdminRequestsParams {
  status?: string;
  search?: string;
  per_page?: number;
  page?: number;
}

/**
 * [Admin] Récupérer toutes les demandes (paginées)
 */
export const adminGetRequests = async (params?: AdminRequestsParams): Promise<PaginatedRequestsResponse> => {
  try {
    const response = await api.get('/studio-domaine/admin/requests', { params });
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching admin requests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération des demandes';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * [Admin] Marquer une demande comme en cours
 */
export const adminMarkInProgress = async (id: number): Promise<RequestResponse> => {
  try {
    const response = await api.post(`/studio-domaine/admin/requests/${id}/in-progress`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error marking in progress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors du changement de statut';
    return { success: false, error: errorMessage };
  }
};

/**
 * [Admin] Récupérer les statistiques des demandes
 */
export const adminGetStats = async (): Promise<AdminStatsResponse> => {
  try {
    const response = await api.get('/studio-domaine/admin/requests/stats');
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching admin stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération des statistiques';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * [Admin] Activer une demande
 */
export const adminActivateRequest = async (id: number): Promise<RequestResponse> => {
  try {
    const response = await api.post(`/studio-domaine/admin/requests/${id}/activate`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error activating request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'activation';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * [Admin] Rejeter une demande
 */
export const adminRejectRequest = async (id: number, reason?: string): Promise<RequestResponse> => {
  try {
    const response = await api.post(`/studio-domaine/admin/requests/${id}/reject`, { reason });
    return response.data;
  } catch (error: unknown) {
    console.error('Error rejecting request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors du rejet';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * [Admin] Supprimer définitivement une demande
 */
export const adminDeleteRequest = async (id: number): Promise<RequestResponse> => {
  try {
    const response = await api.delete(`/studio-domaine/admin/requests/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error deleting request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// ===== UTILITAIRES =====

/**
 * Nettoyer et valider un nom de domaine
 */
export const sanitizeDomainName = (input: string): string => {
  // Retirer http://, https://, www.
  let cleaned = input.replace(/^(https?:\/\/)?(www\.)?/, '');

  // Retirer tout ce qui suit le premier /
  cleaned = cleaned.split('/')[0];

  // Retirer les espaces et mettre en minuscule
  cleaned = cleaned.trim().toLowerCase();

  // Retirer les caractères invalides (garder lettres, chiffres, tirets)
  cleaned = cleaned.replace(/[^a-z0-9-]/g, '');

  return cleaned;
};

/**
 * Extraire le nom de base (sans extension)
 */
export const extractBaseName = (domain: string): string => {
  const cleaned = sanitizeDomainName(domain);
  // Retirer l'extension (.fr, .com, etc.)
  const parts = cleaned.split('.');
  return parts[0] || cleaned;
};

/**
 * Vérifier si un nom de domaine est valide
 */
export const isValidDomainName = (name: string): boolean => {
  // Doit commencer et finir par une lettre ou un chiffre
  // Peut contenir des tirets au milieu
  // Longueur entre 1 et 63 caractères
  const regex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return regex.test(name) && name.length >= 1 && name.length <= 63;
};

// ===== EXPORT PAR DÉFAUT =====

const studioDomainService = {
  // Domain
  checkDomainAvailability,
  searchDomains,
  getTldPricing,
  getWhoisInfo,
  // Requests
  getMyRequests,
  getRequest,
  createRequest,
  updateRequest,
  cancelRequest,
  // Admin
  adminGetRequests,
  adminGetStats,
  adminMarkInProgress,
  adminActivateRequest,
  adminRejectRequest,
  // Utils
  sanitizeDomainName,
  extractBaseName,
  isValidDomainName,
};

export default studioDomainService;
