// src/hooks/useTicketMessages.ts
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import type { TicketMessage } from "@/models/TicketMessage";

/**
 * Récupère les messages d'un ticket.
 * ✅ CORRECTION : Suppression de initialData pour permettre le rafraîchissement
 */
export function useTicketMessages(ticketId: string | number) {
  const key = ["ticketMessages", String(ticketId)];

  return useQuery<TicketMessage[], Error>({
    queryKey: key,
    queryFn: async () => {
      console.log(
        `🔄 [useTicketMessages] Chargement messages pour ticket ${ticketId}`
      );
      const res = await api.get<TicketMessage[]>(
        `/tickets/${ticketId}/messages`
      );
      console.log(
        `✅ [useTicketMessages] ${res.data.length} messages chargés pour ticket ${ticketId}`
      );
      return res.data;
    },
    // n'appelle la requête que si on a un ticketId non vide
    enabled: Boolean(ticketId) && ticketId !== 0,
    // ✅ SUPPRIMÉ : initialData qui bloquait le rafraîchissement
    // ✅ NOUVEAU : Configuration pour un rafraîchissement plus réactif
    staleTime: 0, // Considère les données comme obsolètes immédiatement
    refetchOnWindowFocus: true, // Recharge quand la fenêtre reprend le focus
    refetchInterval: 30000, // Recharge toutes les 30 secondes (optionnel)
  });
}
