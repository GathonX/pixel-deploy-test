// src/components/admin/AdminDeleteUserCard.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { AxiosError } from "axios";
import { Trash } from "lucide-react";

interface AdminDeleteUserCardProps {
  userId: number;
  userName: string;
  onDeleted: () => void; // callback pour rafraîchir la liste
}

export default function AdminDeleteUserCard({
  userId,
  userName,
  onDeleted,
}: AdminDeleteUserCardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast({
        title: "Utilisateur supprimé",
        description: `${userName} a bien été supprimé.`,
        variant: "success",
      });
      onDeleted();
      setOpen(false);
    } catch (err: unknown) {
      let message = "Une erreur est survenue.";
      if (err instanceof AxiosError) {
        message =
          (err.response?.data as { message?: string })?.message ??
          err.message ??
          message;
      }
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-red-600">
          <Trash className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
        </DialogHeader>
        <p className="mt-2 text-sm">
          Voulez-vous vraiment supprimer <strong>{userName}</strong> ?
        </p>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Suppression…" : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
