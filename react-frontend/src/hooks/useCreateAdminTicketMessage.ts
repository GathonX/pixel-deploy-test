// src/hooks/useCreateAdminTicketMessage.ts
import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import api from "@/services/api";
import plain from "@/services/plain";
import type { TicketMessage } from "@/models/TicketMessage";

export function useCreateAdminTicketMessage(
  ticketId: number
): UseMutationResult<TicketMessage, Error, FormData, unknown> {
  const qc = useQueryClient();

  return useMutation<TicketMessage, Error, FormData>({
    mutationFn: async (formData) => {
      // nécessaire si tu protèges avec sanctum + stateful
      await plain.get("/sanctum/csrf-cookie");

      const res = await api.post<TicketMessage>(
        `/admin/tickets/${ticketId}/messages`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res.data;
    },
    onSuccess: (newMessage) => {
      // ✅ CORRECTION : Invalidation multiple pour rafraîchissement instantané
      qc.invalidateQueries({ queryKey: ["adminTickets"] });
      qc.invalidateQueries({ queryKey: ["adminTicketMessages", ticketId] });
      qc.invalidateQueries({ queryKey: ["ticketMessages", ticketId] }); // ✅ NOUVEAU : Si utilisateur voit aussi
      qc.invalidateQueries({ queryKey: ["userTickets"] }); // ✅ NOUVEAU : Si utilisateur voit la liste

      // ✅ OPTIMISATION : Mise à jour optimiste du cache admin
      qc.setQueryData(
        ["adminTicketMessages", ticketId],
        (oldMessages: TicketMessage[] | undefined) => {
          if (!oldMessages) return [newMessage];
          return [...oldMessages, newMessage];
        }
      );

      console.log(
        "✅ [useCreateAdminTicketMessage] Message admin ajouté et cache invalidé",
        {
          ticketId,
          messageId: newMessage.id,
          sender: newMessage.sender,
        }
      );
    },
    onError: (error) => {
      console.error("❌ [useCreateAdminTicketMessage] Erreur:", error);
    },
  });
}
