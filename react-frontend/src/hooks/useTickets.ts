// src/hooks/useTickets.ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import api from "@/services/api";
import plain from "@/services/plain";
import type { Ticket } from "@/models/Ticket";

/** Récupère la liste des tickets de l'utilisateur */
export function useUserTickets() {
  return useQuery<Ticket[], Error>({
    queryKey: ["userTickets"],
    queryFn: async () => {
      const res = await api.get<Ticket[]>("/tickets");
      return res.data;
    },
    // ✅ NOUVEAU : Refetch automatique pour garder les données à jour
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 secondes avant de considérer les données comme obsolètes
  });
}

/** Crée un nouveau ticket */
export function useCreateTicket(): UseMutationResult<
  Ticket,
  Error,
  FormData,
  unknown
> {
  const qc = useQueryClient();
  return useMutation<Ticket, Error, FormData>({
    mutationFn: async (fd) => {
      await plain.get("/sanctum/csrf-cookie");
      const res = await api.post<Ticket>("/tickets", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (newTicket) => {
      // ✅ CORRECTION : Invalidation multiple + mise à jour optimiste
      qc.invalidateQueries({ queryKey: ["userTickets"] });
      qc.invalidateQueries({ queryKey: ["tickets"] }); // Si utilisé ailleurs

      // ✅ OPTIMISATION : Mise à jour optimiste du cache
      qc.setQueryData(["userTickets"], (oldTickets: Ticket[] | undefined) => {
        if (!oldTickets) return [newTicket];
        return [newTicket, ...oldTickets]; // Nouveau ticket en premier
      });

      console.log("✅ [useCreateTicket] Ticket créé et cache invalidé", {
        ticketId: newTicket.id,
        title: newTicket.title,
        hasMessages: newTicket.messages?.length > 0,
      });
    },
    onError: (error) => {
      console.error("❌ [useCreateTicket] Erreur:", error);
    },
  });
}

/** Supprime un ticket côté user */
export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (ticketId) => {
      await api.delete(`/tickets/${ticketId}`);
    },
    onSuccess: (_void, ticketId) => {
      // ✅ CORRECTION : Invalidation multiple
      qc.invalidateQueries({ queryKey: ["userTickets"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticketMessages", ticketId] }); // ✅ NOUVEAU : Nettoie les messages

      // ✅ OPTIMISATION : Mise à jour optimiste du cache
      qc.setQueryData(["userTickets"], (oldTickets: Ticket[] | undefined) => {
        if (!oldTickets) return [];
        return oldTickets.filter((ticket) => ticket.id !== ticketId);
      });

      console.log("✅ [useDeleteTicket] Ticket supprimé et cache nettoyé", {
        ticketId,
      });
    },
    onError: (error) => {
      console.error("❌ [useDeleteTicket] Erreur:", error);
    },
  });
}
