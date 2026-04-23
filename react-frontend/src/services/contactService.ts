// src/services/contactService.ts - SERVICE CONTACT DASHBOARD

import api from "./api";
import { AxiosResponse } from "axios";

// Types pour les contacts
export interface Contact {
  id: number;
  name: string;
  first_name?: string;
  phone?: string;
  subject: string;
  message?: string;
  email?: string;
  status: 'pending' | 'read' | 'replied';
  source: string;
  client_id: number;
  created_at: string;
  updated_at: string;
  formatted_date?: string;
  formatted_time?: string;
}

// Types pour les statistiques
export interface ContactStatsData {
  stats: {
    total_contacts: number;
    pending_contacts: number;
    read_contacts: number;
    replied_contacts: number;
    today_contacts: number;
  };
}

// Types pour les filtres
export interface ContactFilters {
  per_page?: number;
  page?: number;
  sort_by?: 'created_at' | 'name' | 'status';
  sort_order?: 'asc' | 'desc';
  search?: string;
  status?: 'pending' | 'read' | 'replied';
  date_from?: string;
  date_to?: string;
}

// Réponse paginée
export interface ContactPaginationResponse {
  data: Contact[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  from: number;
  to: number;
}

// Types pour mise à jour du statut
export interface ContactStatusUpdate {
  status: 'pending' | 'read' | 'replied';
  note?: string;
}

/**
 * Service pour la gestion des contacts dashboard
 */
class ContactService {
  private readonly LOG_PREFIX = "📧 [ContactService]";

  /**
   * Récupérer les contacts pour le dashboard avec filtres et pagination
   */
  async getDashboardContacts(filters: ContactFilters = {}): Promise<ContactPaginationResponse> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération contacts dashboard:`, filters);

      const response: AxiosResponse<{
        success: boolean;
        data: ContactPaginationResponse;
        message: string;
      }> = await api.get("/contacts/dashboard", {
        params: filters,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la récupération des contacts");
      }

      console.log(`${this.LOG_PREFIX} Contacts récupérés:`, response.data.data.data.length);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération contacts:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques des contacts
   */
  async getDashboardStats(): Promise<ContactStatsData> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération statistiques contacts`);

      const response: AxiosResponse<{
        success: boolean;
        data: ContactStatsData;
        message: string;
      }> = await api.get("/contacts/dashboard/stats");

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la récupération des statistiques");
      }

      console.log(`${this.LOG_PREFIX} Statistiques récupérées:`, response.data.data.stats);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération statistiques:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les détails d'un contact
   */
  async getContactDetails(contactId: number): Promise<Contact> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération détails contact:`, contactId);

      const response: AxiosResponse<{
        success: boolean;
        data: Contact;
        message: string;
      }> = await api.get(`/contacts/${contactId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Contact non trouvé");
      }

      console.log(`${this.LOG_PREFIX} Détails contact récupérés:`, response.data.data.name);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération détails:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un contact
   */
  async updateContactStatus(contactId: number, statusUpdate: ContactStatusUpdate): Promise<Contact> {
    try {
      console.log(`${this.LOG_PREFIX} Mise à jour statut contact:`, contactId, statusUpdate);

      const response: AxiosResponse<{
        success: boolean;
        data: Contact;
        message: string;
      }> = await api.patch(`/contacts/${contactId}/status`, statusUpdate);

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la mise à jour");
      }

      console.log(`${this.LOG_PREFIX} Statut mis à jour:`, response.data.data.status);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur mise à jour statut:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un contact
   */
  async deleteContact(contactId: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Suppression contact:`, contactId);

      const response: AxiosResponse<{
        success: boolean;
        message: string;
      }> = await api.delete(`/contacts/${contactId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la suppression");
      }

      console.log(`${this.LOG_PREFIX} Contact supprimé avec succès`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur suppression contact:`, error);
      throw error;
    }
  }

  /**
   * Marquer un contact comme lu
   */
  async markAsRead(contactId: number): Promise<Contact> {
    return this.updateContactStatus(contactId, { status: 'read' });
  }

  /**
   * Marquer un contact comme répondu
   */
  async markAsReplied(contactId: number, note?: string): Promise<Contact> {
    return this.updateContactStatus(contactId, { status: 'replied', note });
  }
}

// Export singleton
export const contactService = new ContactService();
export default contactService;