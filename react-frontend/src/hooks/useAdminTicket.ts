import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { Ticket } from '@/models/Ticket';

export function useAdminTicket(ticketId: number) {
  return useQuery<Ticket, Error>({
    queryKey: ['adminTicket', ticketId],
    queryFn: async () => {
      const res = await api.get<Ticket>(`/admin/tickets/${ticketId}`);
      return res.data;
    },
    enabled: Boolean(ticketId),
  });
}
