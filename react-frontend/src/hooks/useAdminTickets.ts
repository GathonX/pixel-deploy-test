// src/hooks/useAdminTickets.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { Ticket } from '@/models/Ticket';

export function useAdminTickets() {
  return useQuery<Ticket[], Error>({
    queryKey: ['adminTickets'],
    queryFn: async () => {
      const res = await api.get<Ticket[]>('/admin/tickets');
      return res.data;
    },
  });
}
