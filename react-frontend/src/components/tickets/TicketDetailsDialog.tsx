// src/components/tickets/TicketDetailsDialog.tsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Ticket as TicketIcon, Trash2, ExternalLink } from "lucide-react";
import type { Ticket } from "@/models/Ticket";
import Messages from "./Messages";
import ReplyForm from "./ReplyForm";

// ✅ Composant FeedbackForm inline pour éviter de créer un nouveau fichier
const FeedbackForm: React.FC<{ ticketId: number; onFeedbackSubmitted: () => void }> = ({ 
  ticketId, 
  onFeedbackSubmitted 
}) => {
  const [rating, setRating] = React.useState<number>(0);
  const [comment, setComment] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [hoveredRating, setHoveredRating] = React.useState<number>(0);

  const submitFeedback = async () => {
    if (rating === 0) {
      toast({
        title: "Évaluation requise",
        description: "Merci de noter votre satisfaction de 1 à 5 étoiles.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Merci pour votre feedback !",
          description: `Votre évaluation ${rating}/5 étoiles a été enregistrée.`,
        });
        onFeedbackSubmitted();
      } else {
        toast({
          title: "Erreur",
          description: result.message || "Impossible d'enregistrer votre feedback.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur réseau",
        description: "Impossible de soumettre votre feedback. Réessayez plus tard.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (r: number): string => {
    const labels = ["", "Très insatisfait", "Insatisfait", "Neutre", "Satisfait", "Très satisfait"];
    return labels[r] || "";
  };

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-semibold text-gray-800">Comment était notre support ?</h3>
      </div>
      
      <div className="space-y-4">
        {/* Étoiles de notation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Votre satisfaction (obligatoire)
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="text-2xl hover:scale-110 transition-transform duration-150"
              >
                <span
                  className={`${
                    star <= (hoveredRating || rating)
                      ? "text-yellow-500"
                      : "text-gray-300"
                  }`}
                >
                  ⭐
                </span>
              </button>
            ))}
            {(hoveredRating || rating) > 0 && (
              <span className="ml-2 text-sm text-gray-600 font-medium">
                {getRatingLabel(hoveredRating || rating)}
              </span>
            )}
          </div>
        </div>

        {/* Commentaire optionnel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commentaire (optionnel)
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience avec notre équipe support..."
            className="resize-none"
            rows={3}
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/1000 caractères
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRating(0);
              setComment("");
            }}
            disabled={isSubmitting}
          >
            Réinitialiser
          </Button>
          <Button
            onClick={submitFeedback}
            disabled={isSubmitting || rating === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? "Envoi..." : "Envoyer mon avis"}
          </Button>
        </div>
      </div>
    </div>
  );
};

import { useTicketMessages } from "@/hooks/useTicketMessages";
import { useDeleteTicket } from "@/hooks/useTickets";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

interface Props {
  selectedTicket: Ticket | null;
  setSelectedTicket: React.Dispatch<React.SetStateAction<Ticket | null>>;
  getStatusColor: (s: Ticket["status"]) => string;
  getStatusIcon: (s: Ticket["status"]) => JSX.Element | null;
  statusLabels: Record<Ticket["status"], string>;
}

const TicketDetailsDialog: React.FC<Props> = ({
  selectedTicket,
  setSelectedTicket,
  getStatusColor,
  getStatusIcon,
  statusLabels,
}) => {
  const ticketId = selectedTicket?.id ?? 0;

  // ✅ CORRECTION CRITIQUE : Ne pas passer initialMessages pour permettre le rafraîchissement
  const { data: messages = [], isLoading, error } = useTicketMessages(ticketId);

  const deleteTx = useDeleteTicket();
  const [openModal, setOpenModal] = React.useState(false);

  // ✅ LOG DEBUG : Pour vérifier les re-renders
  React.useEffect(() => {
    if (selectedTicket) {
      console.log("🔍 [TicketDetailsDialog] Ticket sélectionné:", {
        ticketId,
        messagesCount: messages.length,
        isLoading,
        hasError: !!error,
      });
    }
  }, [ticketId, messages.length, isLoading, error]);

  if (!selectedTicket) return null;

  const onConfirmDelete = () => {
    deleteTx.mutate(ticketId, {
      onSuccess: () => {
        toast({
          title: "Ticket supprimé",
          description: `Le ticket #${ticketId} a été supprimé.`,
        });
        setSelectedTicket(null);
      },
      onError: (err) => {
        toast({
          title: "Erreur",
          description: err.message,
          variant: "destructive",
        });
      },
    });
    setOpenModal(false);
  };

  // ✅ FONCTION POUR EXTRAIRE LES URLs D'IMAGES SEULEMENT
  const extractImageUrls = (description: string): string[] => {
    const urlRegex = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi;
    return description.match(urlRegex) || [];
  };

  const imageUrls = extractImageUrls(selectedTicket.description);

  return (
    <div className="mt-6 border-t pt-6">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TicketIcon className="h-5 w-5" /> {selectedTicket.title}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Badge variant="outline">{selectedTicket.category}</Badge>
            <Badge className={getStatusColor(selectedTicket.status)}>
              {getStatusIcon(selectedTicket.status)}
              {statusLabels[selectedTicket.status]}
            </Badge>
            <span>#{ticketId}</span>
            {/* ✅ Affichage SLA dans les détails */}
            {selectedTicket.time_remaining && selectedTicket.status !== 'resolved' && (
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                selectedTicket.is_overdue 
                  ? 'bg-red-100 text-red-700' 
                  : selectedTicket.time_remaining.includes('restante') && !selectedTicket.time_remaining.includes('j')
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                ⏰ {selectedTicket.time_remaining}
              </div>
            )}
            {selectedTicket.estimated_response && (
              <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                📋 SLA: {selectedTicket.estimated_response}
              </div>
            )}
            {/* ✅ DEBUG : Affichage du nombre de messages */}
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {messages.length} messages
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTicket(null)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fermer"
          >
            ✕
          </button>
          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <h3>Confirmer la suppression</h3>
              </DialogHeader>
              <p>Voulez-vous vraiment supprimer ce ticket ?</p>
              <DialogFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenModal(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={onConfirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteTx.isPending ? "Suppression…" : "Supprimer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ✅ TEXTE ORIGINAL INCHANGÉ - comme vous le souhaitez */}
      <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
        {selectedTicket.description}
      </div>

      {/* ✅ AFFICHAGE DES IMAGES AMÉLIORÉ - comme vous l'aimez */}
      {imageUrls.length > 0 && (
        <div className="mt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Pièces justificatives ({imageUrls.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {imageUrls.map((url: string, index: number) => (
              <div
                key={`proof-${ticketId}-${index}`}
                className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <img
                  src={url}
                  alt={`Justificatif ${index + 1}`}
                  className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-image.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 text-gray-700 hover:bg-white"
                    onClick={() => window.open(url, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                  <span className="text-white text-xs">
                    Justificatif {index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mb-6">
        Créé le{" "}
        {new Date(selectedTicket.created_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      {/* ✅ GESTION DES ÉTATS DE CHARGEMENT ET D'ERREUR */}
      {isLoading ? (
        <div className="py-4 text-center text-gray-500">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          Chargement des messages…
        </div>
      ) : error ? (
        <div className="py-4 text-center text-red-500">
          Erreur lors du chargement des messages.
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </Button>
        </div>
      ) : (
        <Messages messages={messages} status={selectedTicket.status} />
      )}

      {!isLoading && !error && selectedTicket.status !== "resolved" && (
        <ReplyForm ticketId={ticketId} />
      )}

      {/* ✅ Formulaire de feedback de satisfaction */}
      {selectedTicket.status === "resolved" && selectedTicket.can_submit_feedback && (
        <FeedbackForm ticketId={ticketId} onFeedbackSubmitted={() => setSelectedTicket({ ...selectedTicket, can_submit_feedback: false })} />
      )}

      {/* ✅ Affichage du feedback déjà soumis */}
      {selectedTicket.satisfaction_rating && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-700 font-medium">Votre évaluation :</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-lg ${
                    star <= (selectedTicket.satisfaction_rating || 0)
                      ? "text-yellow-500"
                      : "text-gray-300"
                  }`}
                >
                  ⭐
                </span>
              ))}
            </div>
            <span className="text-lg">{selectedTicket.satisfaction_emoji}</span>
          </div>
          {selectedTicket.satisfaction_comment && (
            <p className="text-sm text-blue-700 bg-white p-2 rounded">
              "{selectedTicket.satisfaction_comment}"
            </p>
          )}
          <p className="text-xs text-blue-600 mt-2">
            Merci pour votre retour soumis le {new Date(selectedTicket.feedback_submitted_at!).toLocaleDateString("fr-FR")} !
          </p>
        </div>
      )}
    </div>
  );
};

export default TicketDetailsDialog;
