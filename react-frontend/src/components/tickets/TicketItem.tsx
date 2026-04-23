// src/components/tickets/TicketItem.tsx
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Ticket as TicketIcon, Trash2, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import type { Ticket } from "@/models/Ticket";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteTicket } from "@/hooks/useTickets";
import { toast } from "@/components/ui/use-toast";

interface Props {
  ticket: Ticket;
  setSelectedTicket: (t: Ticket | null) => void;
  getStatusColor: (s: Ticket["status"]) => string;
  getStatusIcon: (s: Ticket["status"]) => JSX.Element | null;
  statusLabels: Record<Ticket["status"], string>;
}

export default function TicketItem({
  ticket,
  setSelectedTicket,
  getStatusColor,
  getStatusIcon,
  statusLabels,
}: Props) {
  const delTx = useDeleteTicket();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function onConfirm() {
    delTx.mutate(ticket.id, {
      onSuccess: () => {
        toast({
          title: "Ticket supprimé",
          description: `Le ticket #${ticket.id} a été supprimé avec succès.`,
        });
        setSelectedTicket(null);
      },
      onError: (err) =>
        toast({
          title: "Erreur",
          description: err.message,
          variant: "destructive",
        }),
    });
    setConfirmOpen(false);
  }

  // ✅ Extraire un aperçu propre de la description
  const getCleanPreview = (
    description: string,
    maxLength: number = 120
  ): string => {
    // Nettoyer des URLs et formatage
    const cleaned = description
      .replace(/https?:\/\/[^\s]+/g, "[Pièce jointe]")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.length > maxLength
      ? cleaned.substring(0, maxLength) + "..."
      : cleaned;
  };

  // ✅ Calculer le temps relatif
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Il y a moins d'une heure";
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 48) return "Hier";

    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // ✅ Obtenir la couleur de priorité basée sur le statut et l'âge
  const getPriorityIndicator = (): string => {
    const date = new Date(ticket.created_at);
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ticket.status === "open" && ageInDays > 3) return "bg-gradient-cta";
    if (ticket.status === "pending") return "bg-gradient-business";
    if (ticket.status === "resolved") return "bg-gradient-success";
    return "bg-gradient-dark";
  };

  return (
    <>
      <div
        onClick={() => setSelectedTicket(ticket)}
        className="group p-5 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 cursor-pointer border-b border-slate-100 last:border-b-0 transition-all duration-300 hover:shadow-sm"
      >
        <div className="flex justify-between items-start gap-4">
          {/* 🎯 CONTENU PRINCIPAL */}
          <div className="flex-1 space-y-3">
            {/* Header avec indicateur de priorité */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 bg-slate-100 group-hover:bg-white rounded-lg transition-colors duration-300">
                  <TicketIcon className="h-4 w-4 text-brand-blue" />
                </div>
                {/* Indicateur de priorité */}
                <div
                  className={`absolute -top-1 -right-1 w-3 h-3 ${getPriorityIndicator()} rounded-full border-2 border-white`}
                ></div>
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-brand-black group-hover:text-brand-blue transition-colors duration-300 line-clamp-1">
                  {ticket.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-xs bg-white/70 border-slate-300 text-slate-600"
                  >
                    {ticket.category}
                  </Badge>
                  <span className="text-xs text-slate-500">#{ticket.id}</span>
                </div>
              </div>
            </div>

            {/* Aperçu de la description */}
            <p className="text-sm text-slate-600 leading-relaxed pl-11">
              {getCleanPreview(ticket.description)}
            </p>

            {/* Métadonnées */}
            <div className="flex items-center gap-4 pl-11 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{getRelativeTime(ticket.created_at)}</span>
              </div>
              {ticket.messages && ticket.messages.length > 0 && (
                <span>
                  {ticket.messages.length} message
                  {ticket.messages.length > 1 ? "s" : ""}
                </span>
              )}
              {/* ✅ Affichage SLA temps de réponse */}
              {ticket.time_remaining && ticket.status !== 'resolved' && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  ticket.is_overdue 
                    ? 'bg-red-100 text-red-700' 
                    : ticket.time_remaining.includes('restante') && !ticket.time_remaining.includes('j')
                    ? 'bg-orange-100 text-orange-700'  // Urgent (moins de 24h)
                    : 'bg-blue-100 text-blue-700'      // Normal
                }`}>
                  {ticket.is_overdue ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  <span>{ticket.time_remaining}</span>
                </div>
              )}
              {ticket.status === 'resolved' && ticket.resolved_at && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  <span>Résolu</span>
                </div>
              )}
            </div>
          </div>

          {/* 🎨 STATUT ET ACTIONS */}
          <div className="flex flex-col items-end gap-3">
            <Badge
              className={`${getStatusColor(
                ticket.status
              )} font-medium shadow-sm`}
            >
              {getStatusIcon(ticket.status)}
              {statusLabels[ticket.status]}
            </Badge>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmOpen(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-slate-200">
                <DialogHeader>
                  <h3 className="text-lg font-semibold text-brand-black">
                    Confirmer la suppression
                  </h3>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-slate-600">
                    Êtes-vous sûr de vouloir supprimer ce ticket ?
                  </p>
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <div className="font-medium text-sm text-brand-black">
                      {ticket.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      #{ticket.id} • {ticket.category}
                    </div>
                  </div>
                  <p className="text-sm text-orange-600">
                    ⚠️ Cette action est irréversible.
                  </p>
                </div>
                <DialogFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmOpen(false)}
                    className="border-slate-300"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={onConfirm}
                    className="bg-gradient-cta hover:bg-gradient-cta-hover text-white"
                    disabled={delTx.isPending}
                  >
                    {delTx.isPending ? "Suppression…" : "Supprimer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </>
  );
}
