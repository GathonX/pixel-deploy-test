// src/hooks/useCreateTicketMessage.ts
import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import api from "@/services/api";
import plain from "@/services/plain";
import { TicketMessage } from "@/models/TicketMessage";

export function useCreateTicketMessage(
  ticketId: number
): UseMutationResult<TicketMessage, Error, FormData, unknown> {
  const qc = useQueryClient();
  return useMutation<TicketMessage, Error, FormData>({
    mutationFn: async (formData) => {
      await plain.get("/sanctum/csrf-cookie");
      const res = await api.post<TicketMessage>(
        `/tickets/${ticketId}/messages`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res.data;
    },
    onSuccess: (newMessage) => {
      // ✅ OPTIMISATION : Mise à jour optimiste IMMÉDIATE
      qc.setQueryData(
        ["ticketMessages", ticketId],
        (oldMessages: TicketMessage[] | undefined) => {
          if (!oldMessages) return [newMessage];
          return [...oldMessages, newMessage];
        }
      );

      // ✅ Invalidation pour synchroniser avec le serveur
      qc.invalidateQueries({ queryKey: ["ticketMessages", ticketId] });
      qc.invalidateQueries({ queryKey: ["userTickets"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });

      console.log("✅ [useCreateTicketMessage] Message ajouté INSTANTANÉMENT", {
        ticketId,
        messageId: newMessage.id,
        sender: newMessage.sender,
      });
    },
    onError: (error) => {
      console.error("❌ [useCreateTicketMessage] Erreur:", error);
    },
  });
}
