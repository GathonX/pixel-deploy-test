// src/hooks/useAdminDeleteTicket.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export function useDeleteAdminTicket() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (ticketId) => {
      await api.delete(`/admin/tickets/${ticketId}`);
    },
    onSuccess: (_void, ticketId) => {
      qc.invalidateQueries({ queryKey: ['adminTickets'] });
      qc.removeQueries({ queryKey: ['adminTicket', ticketId] });
    },
  });
}
