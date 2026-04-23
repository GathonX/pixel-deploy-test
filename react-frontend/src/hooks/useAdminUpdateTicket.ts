// src/hooks/useAdminUpdateTicket.ts
import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import api from '@/services/api';
import type { Ticket } from '@/models/Ticket';

export interface UpdatePayload {
  ticketId: number;
  status?: 'open' | 'pending' | 'resolved';
  priority?: 'high' | 'medium' | 'low';
}

export function useAdminUpdateTicket(): UseMutationResult<
  Ticket,
  Error,
  UpdatePayload,
  unknown
> {
  const qc = useQueryClient();

  return useMutation<Ticket, Error, UpdatePayload>({
    mutationFn: async ({ ticketId, status, priority }: UpdatePayload) => {
      // On ne stocke plus de "any", mais un objet typé
      const updateData: Partial<Omit<UpdatePayload, 'ticketId'>> = {};
      if (status)   updateData.status   = status;
      if (priority) updateData.priority = priority;

      const res = await api.put<Ticket>(
        `/admin/tickets/${ticketId}`,
        updateData
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminTickets'] });
    },
  });
}
