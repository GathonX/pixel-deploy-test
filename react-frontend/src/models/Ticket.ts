// src/models/Ticket.ts
import { TicketMessage } from './TicketMessage';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  status: 'open' | 'pending' | 'resolved' | 'in_progress' | 'waiting_info' | 'escalated';
  priority: 'high' | 'medium' | 'low';
  estimated_response_hours?: number;
  first_response_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  // ✅ Propriétés calculées du backend
  estimated_response?: string;    // "4h" ou "2j"
  time_remaining?: string;        // "5h restantes" ou "En retard de 2h"
  is_overdue?: boolean;
  // ✅ Feedback de satisfaction
  satisfaction_rating?: number | null;      // 1-5 étoiles
  satisfaction_comment?: string | null;     // Commentaire optionnel
  satisfaction_emoji?: string;              // Emoji calculé
  feedback_submitted_at?: string | null;    // Date soumission
  can_submit_feedback?: boolean;            // Peut soumettre feedback
  // ✅ Assignation de tickets
  assigned_to?: number | null;              // ID de l'admin assigné
  assigned_at?: string | null;              // Date d'assignation
  assigned_admin?: {                        // Admin assigné
    id: number;
    name: string;
    email: string;
  } | null;
  user: {
    id: number;
    name: string;
    email: string;
  };
  messages: TicketMessage[];
}
