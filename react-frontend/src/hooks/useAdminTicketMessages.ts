import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { TicketMessage } from '@/models/TicketMessage';

export function useAdminTicketMessages(ticketId: number) {
  return useQuery<TicketMessage[], Error>({
    queryKey: ['adminTicketMessages', ticketId],
    queryFn: async () => {
      const res = await api.get<TicketMessage[]>(
        `/admin/tickets/${ticketId}/messages`
      );
      return res.data;
    },
    enabled: Boolean(ticketId),
  });
}
