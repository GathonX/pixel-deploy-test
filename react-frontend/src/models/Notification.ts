// src/models/Notification.ts

// 1) Décris le payload attendu pour une notif de message de ticket
export interface TicketNotificationData {
  ticket_id: number;
  message_id: number;
  sender: 'user' | 'admin';
  excerpt: string;       // ← on ajoute cette propriété
  created_at: string;    // facultatif si tu préfères prendre created_at du root
}

// 2) Interface générique des notifications
export interface Notification<T = unknown> {
  id: string;
  type: string;
  data: T;
  read_at: string | null;
  created_at: string;
}

// 3) Alias spécialisé
export type TicketNotification = Notification<TicketNotificationData>;
