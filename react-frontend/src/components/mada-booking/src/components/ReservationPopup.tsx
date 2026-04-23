import { useState } from "react";
import { useCurrency } from "@/hooks/use-devis-config";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { DbReservation } from "@/hooks/use-sites";
import { updateReservationStatus, updateReservation } from "@/hooks/use-reservations";
import { User, Mail, Phone, FileText, Clock, Users, XCircle, Bell, CheckCircle, Wrench, LogIn, LogOut, ArrowRight, DollarSign, Edit3, Save, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  reservation: (DbReservation & { productName?: string; productType?: string; productPrice?: number }) | null;
  open: boolean;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  confirmed: "Confirmée",
  pending: "En attente",
  cancelled: "Annulée",
  maintenance: "Maintenance",
  checked_in: "Check-in effectué",
  checked_out: "Check-out effectué",
};

const statusBadgeVariant: Record<string, string> = {
  confirmed: "bg-status-confirmed/15 text-emerald border-status-confirmed/30",
  pending: "bg-status-pending/15 text-sunset border-status-pending/30",
  cancelled: "bg-status-cancelled/15 text-coral border-status-cancelled/30",
  maintenance: "bg-status-maintenance/15 text-muted-foreground border-status-maintenance/30",
  checked_in: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  checked_out: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};

export default function ReservationPopup({ reservation, open, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const [editDates, setEditDates] = useState({ start: "", end: "", persons: 1, price_override: "" });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const currency = useCurrency();

  if (!reservation) return null;

  const history = (reservation.history as any[]) || [];
  const price = reservation.productPrice || 0;
  const nights = Math.max(1, Math.ceil((new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / 86400000));
  const autoPrice = price * reservation.persons * nights;
  const totalPrice = reservation.price_override != null ? reservation.price_override : autoPrice;

  const handleAction = async (action: string, newStatus?: "confirmed" | "cancelled" | "maintenance" | "checked_in" | "checked_out") => {
    try {
      if (newStatus) {
        await updateReservationStatus(reservation.id, newStatus, action, reservation.site_id);
      }
      await queryClient.invalidateQueries({ queryKey: ["sites-with-products"] });
      toast.success(`Action "${action}" effectuée`);
      onClose();
    } catch (err) {
      toast.error("Erreur lors de l'action");
    }
  };

  const handleEdit = () => {
    setEditDates({ start: reservation.start_date, end: reservation.end_date, persons: reservation.persons, price_override: reservation.price_override != null ? String(reservation.price_override) : "" });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateReservation(reservation.id, {
        start_date: editDates.start,
        end_date: editDates.end,
        persons: editDates.persons,
        price_override: editDates.price_override !== "" ? parseFloat(editDates.price_override) : null,
        site_id: reservation.site_id,
      });
      await queryClient.invalidateQueries({ queryKey: ["sites-with-products"] });
      toast.success("Réservation modifiée");
      setEditing(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  const isRoom = reservation.productType === "chambre";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-heading">{reservation.productName || "Réservation"}</span>
            <Badge className={cn("text-xs border", statusBadgeVariant[reservation.status])}>
              {statusLabels[reservation.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{reservation.client_name}</span>
            </div>
            {reservation.client_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" /><span>{reservation.client_email}</span>
              </div>
            )}
            {reservation.client_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" /><span>{reservation.client_phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{reservation.persons} personne{reservation.persons > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{reservation.start_date} → {reservation.end_date} ({nights} nuit{nights > 1 ? "s" : ""})</span>
            </div>
            {(totalPrice > 0 || reservation.price_override != null) && (
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                {reservation.price_override != null ? (
                  <span>
                    {reservation.price_override.toLocaleString("fr-FR")} {currency}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through">{autoPrice.toLocaleString("fr-FR")} {currency}</span>
                    <span className="ml-1 text-xs font-normal text-amber-600">(prix personnalisé)</span>
                  </span>
                ) : (
                  <span>{totalPrice.toLocaleString("fr-FR")} {currency} ({price}{currency} × {reservation.persons}p × {nights}n)</span>
                )}
              </div>
            )}
          </div>

          {/* Edit mode */}
          {editing && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Début</label>
                    <Input type="date" value={editDates.start} onChange={e => setEditDates(p => ({ ...p, start: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Fin</label>
                    <Input type="date" value={editDates.end} onChange={e => setEditDates(p => ({ ...p, end: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Personnes</label>
                  <Input type="number" min={1} value={editDates.persons} onChange={e => setEditDates(p => ({ ...p, persons: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Prix total ({currency}) — laisser vide pour calcul auto ({autoPrice.toLocaleString("fr-FR")} {currency})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={`Calcul auto : ${autoPrice.toLocaleString("fr-FR")}`}
                    value={editDates.price_override}
                    onChange={e => setEditDates(p => ({ ...p, price_override: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {reservation.notes && (
            <>
              <Separator />
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-muted-foreground">{reservation.notes}</p>
              </div>
            </>
          )}

          {/* History */}
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Historique</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {history.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Clock className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-foreground">{h.action}</span>
                    <span className="text-muted-foreground"> — {h.by}, {h.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <Separator />
          <div className="flex flex-wrap gap-2">
            {/* Common actions */}
            {reservation.status === "pending" && (
              <Button size="sm" className="gap-1.5" onClick={() => handleAction("Confirmée par admin", "confirmed")}>
                <CheckCircle className="h-3.5 w-3.5" /> Confirmer
              </Button>
            )}

            {/* Room-specific */}
            {isRoom && reservation.status === "confirmed" && (
              <Button size="sm" variant="outline" className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50" onClick={() => handleAction("Check-in effectué", "checked_in")}>
                <LogIn className="h-3.5 w-3.5" /> Check-in
              </Button>
            )}
            {isRoom && reservation.status === "checked_in" && (
              <Button size="sm" variant="outline" className="gap-1.5 text-purple-600 border-purple-300 hover:bg-purple-50" onClick={() => handleAction("Check-out effectué", "checked_out")}>
                <LogOut className="h-3.5 w-3.5" /> Check-out
              </Button>
            )}

            {/* Prolonger / Nouvelle résa (continue stay) */}
            {isRoom && (reservation.status === "confirmed" || reservation.status === "pending") && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleEdit}>
                <ArrowRight className="h-3.5 w-3.5" /> Prolonger
              </Button>
            )}

            {/* Edit */}
            {!editing && reservation.status !== "cancelled" && reservation.status !== "maintenance" && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleEdit}>
                <Edit3 className="h-3.5 w-3.5" /> Modifier
              </Button>
            )}

            {/* Maintenance (rooms only) */}
            {isRoom && reservation.status !== "maintenance" && reservation.status !== "cancelled" && (
              <Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground" onClick={() => handleAction("Mise en maintenance", "maintenance")}>
                <Wrench className="h-3.5 w-3.5" /> Maintenance
              </Button>
            )}

            {/* Cancel */}
            {reservation.status !== "cancelled" && reservation.status !== "maintenance" && (
              <Button size="sm" variant="outline" className="gap-1.5 text-coral hover:text-coral" onClick={() => handleAction("Annulée par admin", "cancelled")}>
                <XCircle className="h-3.5 w-3.5" /> Annuler
              </Button>
            )}

            {/* Notify */}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleAction("Client notifié")}>
              <Bell className="h-3.5 w-3.5" /> Notifier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
