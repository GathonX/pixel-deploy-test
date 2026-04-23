// src/models/TicketMessage.ts
export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender: 'user' | 'admin';
  text: string;
  image_url?: string;
  created_at: string;
}
