

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  resourceName: string; // Nouveau prop pour le nom de la ressource
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  resourceName,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {count > 1 ? `Supprimer des ${resourceName}s` : `Supprimer un ${resourceName}`}
          </DialogTitle>
          <DialogDescription>
            {count > 1
              ? `Êtes-vous sûr de vouloir supprimer ${count} ${resourceName}s ? Cette action est irréversible.`
              : `Êtes-vous sûr de vouloir supprimer ce ${resourceName} ? Cette action est irréversible.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}