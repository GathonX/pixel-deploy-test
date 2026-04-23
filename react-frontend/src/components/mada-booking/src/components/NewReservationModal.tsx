import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReservation, checkAvailability } from "@/hooks/use-reservations";
import { SiteWithProducts } from "@/hooks/use-sites";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, Bed, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { label: string; icon: typeof Bed; color: string }> = {
  chambre:   { label: "Chambre",   icon: Bed,    color: "bg-blue-50 text-blue-700 border-blue-200" },
  excursion: { label: "Excursion", icon: MapPin,  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  service:   { label: "Service",   icon: Package, color: "bg-orange-50 text-orange-700 border-orange-200" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  sites: SiteWithProducts[];
  preselectedSiteId?: string;
  preselectedProductId?: string;
  lockSite?: boolean;
}

export default function NewReservationModal({ open, onClose, sites, preselectedSiteId, preselectedProductId, lockSite }: Props) {
  const queryClient = useQueryClient();
  const [siteId, setSiteId] = useState(preselectedSiteId || "");
  const [productId, setProductId] = useState(preselectedProductId || "");

  // Chambre fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Excursion fields
  const [excDate, setExcDate] = useState("");
  const [excHeure, setExcHeure] = useState("");

  // Service fields
  const [svcDate, setSvcDate] = useState("");
  const [svcHeure, setSvcHeure] = useState("");
  const [svcDuration, setSvcDuration] = useState("");
  const [svcLocation, setSvcLocation] = useState("");

  // Client fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const persons = adults + children;
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<{ available: boolean; message?: string } | null>(null);

  const selectedSite = sites.find(s => s.id === siteId);
  const products = selectedSite?.products || [];
  const selectedProduct = products.find(p => p.id === productId);
  const productType = selectedProduct?.type || "";
  const typeInfo = typeConfig[productType];

  // For availability check and submit: derive effective dates
  const effectiveStart = productType === "chambre" ? startDate : productType === "excursion" ? excDate : svcDate;
  const effectiveEnd = productType === "chambre" ? endDate : effectiveStart; // same day for exc/svc

  useEffect(() => {
    if (preselectedSiteId) setSiteId(preselectedSiteId);
    if (preselectedProductId) setProductId(preselectedProductId);
  }, [preselectedSiteId, preselectedProductId]);

  // Reset type fields when product changes
  useEffect(() => {
    setStartDate(""); setEndDate("");
    setExcDate(""); setExcHeure("");
    setSvcDate(""); setSvcHeure(""); setSvcDuration(""); setSvcLocation("");
    setAvailability(null);
  }, [productId]);

  // Check availability when effective dates change
  useEffect(() => {
    if (!productId || !effectiveStart || !effectiveEnd) { setAvailability(null); return; }
    const timeout = setTimeout(async () => {
      const result = await checkAvailability(productId, effectiveStart, effectiveEnd, persons, undefined, siteId);
      setAvailability(result);
    }, 300);
    return () => clearTimeout(timeout);
  }, [productId, effectiveStart, effectiveEnd, persons]);

  const canSubmit = (() => {
    if (!productId || !clientName || submitting) return false;
    if (productType === "chambre") return !!(startDate && endDate) && !(availability !== null && !availability.available);
    if (productType === "excursion") return !!excDate;
    if (productType === "service") return !!svcDate;
    return !!(effectiveStart && effectiveEnd);
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Pack type-specific fields into notes
    let finalNotes = notes;
    if (productType === "excursion") {
      const parts = [excHeure && `Heure : ${excHeure}`, notes].filter(Boolean);
      finalNotes = parts.join(" | ");
    } else if (productType === "service") {
      const parts = [
        svcHeure && `Heure : ${svcHeure}`,
        svcDuration && `Durée : ${svcDuration}`,
        svcLocation && `Lieu : ${svcLocation}`,
        notes,
      ].filter(Boolean);
      finalNotes = parts.join(" | ");
    }

    setSubmitting(true);
    try {
      await createReservation({
        site_id: siteId,
        product_id: productId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        start_date: effectiveStart,
        end_date: effectiveEnd,
        persons,
        adults,
        children,
        notes: finalNotes,
      });
      queryClient.invalidateQueries({ queryKey: ["sites-with-products"] });
      toast.success("Réservation créée !");
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    if (!preselectedSiteId) setSiteId("");
    if (!preselectedProductId) setProductId("");
    setStartDate(""); setEndDate("");
    setExcDate(""); setExcHeure("");
    setSvcDate(""); setSvcHeure(""); setSvcDuration(""); setSvcLocation("");
    setClientName(""); setClientEmail(""); setClientPhone("");
    setAdults(1); setChildren(0); setNotes(""); setAvailability(null);
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Nouvelle réservation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Site selection */}
          {!lockSite && (
            <div className="space-y-1.5">
              <Label>Site *</Label>
              <Select value={siteId} onValueChange={v => { setSiteId(v); setProductId(""); }}>
                <SelectTrigger><SelectValue placeholder="Choisir un site" /></SelectTrigger>
                <SelectContent>
                  {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.location}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {lockSite && selectedSite && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium text-foreground">{selectedSite.name}</p>
              <p className="text-xs text-muted-foreground">{selectedSite.location}</p>
            </div>
          )}

          {/* Product selection */}
          {siteId && (
            <div className="space-y-1.5">
              <Label>Produit *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} <span className="text-muted-foreground capitalize ml-1">({p.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type badge */}
          {typeInfo && (
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium", typeInfo.color)}>
              <typeInfo.icon className="h-4 w-4 shrink-0" />
              {typeInfo.label}
            </div>
          )}

          {/* CHAMBRE: check-in / check-out */}
          {productType === "chambre" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Check-in *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Check-out *</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
              </div>
            </div>
          )}

          {/* EXCURSION: date + heure */}
          {productType === "excursion" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={excDate} onChange={e => setExcDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Heure de départ</Label>
                <Input type="time" value={excHeure} onChange={e => setExcHeure(e.target.value)} />
              </div>
            </div>
          )}

          {/* SERVICE: date + heure + durée + lieu */}
          {productType === "service" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={svcDate} onChange={e => setSvcDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Heure de début</Label>
                  <Input type="time" value={svcHeure} onChange={e => setSvcHeure(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Durée</Label>
                  <Input value={svcDuration} onChange={e => setSvcDuration(e.target.value)} placeholder="ex: 1h30" />
                </div>
                <div className="space-y-1.5">
                  <Label>Lieu</Label>
                  <Input value={svcLocation} onChange={e => setSvcLocation(e.target.value)} placeholder="ex: Chambre 12, Piscine…" />
                </div>
              </div>
            </>
          )}

          {/* Availability indicator (chambre only) */}
          {productType === "chambre" && availability && (
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-lg text-sm",
              availability.available ? "bg-emerald-light text-emerald" : "bg-coral-light text-coral"
            )}>
              {availability.available
                ? <><CheckCircle2 className="h-4 w-4" /> Disponible</>
                : <><AlertCircle className="h-4 w-4" /> {availability.message}</>
              }
            </div>
          )}

          {/* Client info */}
          {productId && (
            <>
              <div className="space-y-1.5">
                <Label>Nom du client *</Label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jean Dupont" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+261..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Adultes</Label>
                  <Input type="number" min={1} value={adults} onChange={e => setAdults(parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Enfants</Label>
                  <Input type="number" min={0} value={children} onChange={e => setChildren(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes spéciales..." rows={2} />
              </div>
            </>
          )}

          <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Création...</>
            ) : (
              "Créer la réservation"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
