import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ChatMessage {
  id: number;
  user_id: number | null;
  user: { name: string } | null; // Changement : user au lieu de user_name
  message: string;
  origin: 'user' | 'bot';
  ip_address: string;
  created_at: string;
}

interface ChatMessageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatMessage: ChatMessage | null;
  onDelete: (id: number) => void;
}

const ChatMessageDetailsModal: React.FC<ChatMessageDetailsModalProps> = ({
  isOpen,
  onClose,
  chatMessage,
  onDelete,
}) => {
  if (!chatMessage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Détails du message</DialogTitle>
          <DialogDescription>
            Informations détaillées sur le message IA.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-medium col-span-1">ID:</span>
            <span className="col-span-3">{chatMessage.id}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-medium col-span-1">Utilisateur:</span>
            <span className="col-span-3">{chatMessage.user?.name ?? "Inconnu"}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-medium col-span-1">Message:</span>
            <span className="col-span-3">{chatMessage.message}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-medium col-span-1">Origine:</span>
            <span className="col-span-3">{chatMessage.origin === 'user' ? 'Utilisateur' : 'Bot'}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-medium col-span-1">IP:</span>
            <span className="col-span-3">{chatMessage.ip_address}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="font-medium col-span-1">Date:</span>
            <span className="col-span-3">{new Date(chatMessage.created_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(chatMessage.id);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatMessageDetailsModal;