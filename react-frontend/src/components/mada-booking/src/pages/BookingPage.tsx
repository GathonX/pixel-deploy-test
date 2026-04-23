import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MapPin, ArrowLeft, ArrowRight, Check, Users, ShoppingCart, Trash2,
  ChevronLeft, ChevronRight, Eye, CalendarDays, X, Ban, Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AMENITIES_MAP, AMENITY_CATEGORIES } from "@/data/amenities";
import { useQuery } from "@tanstack/react-query";
import { getSeasonalPrice, type ProductImage } from "@/hooks/use-products";
import api from "@/services/api";
import { toast } from "sonner";
import { useDevisConfig, hexToRgb, useCurrency } from "@/hooks/use-devis-config";
import { Skeleton } from "@/components/ui/skeleton";

const steps = ["Produits", "Panier", "Infos", "Confirmation"];

interface CartItem {
  productId: string;
  name: string;
  priceAdult: number;
  priceChild: number;
  type: string;
  image: string;
}

const typeLabels: Record<string, string> = { chambre: "🏨 Chambre", excursion: "🌊 Excursion", service: "🚐 Service" };

/* ─── Image Thumbnails (for cards) ─── */
function ImageThumbnails({ images, mainImage, name }: { images: ProductImage[]; mainImage?: string; name: string }) {
  const allUrls = images.length > 0 ? images.map(i => i.url) : mainImage ? [mainImage] : [];
  if (allUrls.length === 0) return <div className="h-44 bg-muted flex items-center justify-center text-muted-foreground text-sm rounded-t-xl">Pas de photo</div>;
  if (allUrls.length === 1) {
    return (
      <div className="h-44 overflow-hidden rounded-t-xl">
        <img src={allUrls[0]} alt={name} className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="space-y-1 p-2">
      <div className="h-36 overflow-hidden rounded-lg">
        <img src={allUrls[0]} alt={name} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {allUrls.slice(1).map((url, i) => (
          <img key={i} src={url} alt={`${name} ${i + 2}`} className="h-12 w-16 rounded object-cover shrink-0" loading="lazy" />
        ))}
      </div>
    </div>
  );
}

/* ─── Full product detail dialog ─── */
function ProductDetailDialog({ product, images, prices, open, onClose }: {
  product: any;
  images: ProductImage[];
  prices: { price: number; priceChild: number; season: string | null };
  open: boolean;
  onClose: () => void;
}) {
  const currency = useCurrency();
  const [imgIdx, setImgIdx] = useState(0);
  const allUrls = images.length > 0 ? images.map(i => i.url) : product.image ? [product.image] : [];
  const amenities = (product.amenities as string[] | null) || [];
  const grouped = AMENITY_CATEGORIES.reduce((acc, cat) => {
    const items = amenities.map(a => AMENITIES_MAP[a]).filter(a => a && a.category === cat);
    if (items.length > 0) acc.push({ category: cat, items });
    return acc;
  }, [] as { category: string; items: any[] }[]);

  const isExcursion = product.type === "excursion";

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Image carousel */}
        {allUrls.length > 0 && (
          <div className="relative">
            <img src={allUrls[imgIdx]} alt={product.name} className="h-64 sm:h-80 w-full object-cover" />
            {allUrls.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + allUrls.length) % allUrls.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 backdrop-blur-sm">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setImgIdx(i => (i + 1) % allUrls.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 backdrop-blur-sm">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <div className="absolute top-3 right-3">
              <Badge className="bg-card/90 text-card-foreground backdrop-blur-sm">{typeLabels[product.type]}</Badge>
            </div>
          </div>
        )}
        {/* Thumbnails row */}
        {allUrls.length > 1 && (
          <div className="flex gap-1.5 px-4 pt-3 overflow-x-auto">
            {allUrls.map((url, i) => (
              <button key={i} onClick={() => setImgIdx(i)}
                className={cn("h-14 w-20 rounded-md overflow-hidden shrink-0 border-2 transition-colors", i === imgIdx ? "border-primary" : "border-transparent")}>
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{product.name}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-primary">{prices.price}{currency}</span>
            <span className="text-sm text-muted-foreground">/ adulte / {product.type === "chambre" ? "nuit" : "pers"}</span>
            {prices.priceChild > 0 && (
              <>
                <span className="text-lg font-semibold text-primary/70">{prices.priceChild}{currency}</span>
                <span className="text-sm text-muted-foreground">/ enfant</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Max {product.type === "excursion" ? product.max_capacity || product.capacity : product.capacity} pers.</span>
            {prices.season && <Badge variant="secondary" className="text-xs capitalize">{prices.season.replace("_", " ")}</Badge>}
          </div>

          {/* Excursion: parcours */}
          {isExcursion && product.parcours && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                🗺️ Parcours du circuit
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.parcours}</p>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {grouped.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                {isExcursion ? "Ce qui est inclus" : "Équipements & Services"}
              </h4>
              <TooltipProvider>
                <div className="space-y-2">
                  {grouped.map(g => (
                    <div key={g.category}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{g.category}</p>
                      <div className="flex flex-wrap gap-2">
                        {g.items.map(am => {
                          const AIcon = am.icon;
                          return (
                            <div key={am.key} className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                              <AIcon className="h-3.5 w-3.5 text-primary" />
                              {am.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Availability hook ─── */
// Pas de pré-vérification côté client : le backend gère la disponibilité (409 si indisponible)
function useAvailability(_startDate: string, _endDate: string) {
  const isUnavailable = (_product: any): boolean => false;
  const remainingCapacity = (_product: any): number | null => null;
  return { isUnavailable, remainingCapacity, loading: false };
}

/* ─── Main Booking Page ─── */
export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const siteId = searchParams.get("site_id") ?? "";
  const { config: devisConfig } = useDevisConfig(siteId);
  const currency = useCurrency(siteId);

  // Chargement public — pas d'authentification requise
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["public-products", siteId],
    queryFn: async () => {
      if (!siteId) return [];
      const { data } = await api.get(`/public/booking/${siteId}/products`);
      return data as any[];
    },
    enabled: !!siteId,
    staleTime: 60_000,
  });

  const filteredProducts = products;
  const [step, setStep] = useState(0);
  // Sélecteur de type actif dans Step 0
  const [activeType, setActiveType] = useState<"chambre" | "excursion" | "service">("chambre");

  // Chambre : dates globales de séjour
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Excursion : formulaire global de l'onglet
  const [excDate, setExcDate] = useState("");
  const [excTime, setExcTime] = useState("");

  // Service : formulaire global de l'onglet
  const [svcDate, setSvcDate] = useState("");
  const [svcTime, setSvcTime] = useState("");
  const [svcDuration, setSvcDuration] = useState("");
  const [svcLocation, setSvcLocation] = useState("");

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedExcursions, setSelectedExcursions] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [detailProduct, setDetailProduct] = useState<string | null>(null);

  // Détails spécifiques par produit
  const [excursionDetails, setExcursionDetails] = useState<Record<string, { date: string; time: string }>>({});
  const [serviceDetails, setServiceDetails] = useState<Record<string, { date: string; time: string; duration: string; location: string }>>({});

  const setExcursionDetail = (id: string, field: "date" | "time", value: string) =>
    setExcursionDetails(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const setServiceDetail = (id: string, field: "date" | "time" | "duration" | "location", value: string) =>
    setServiceDetails(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [clientInfo, setClientInfo] = useState({ nom: "", prenom: "", email: "", phone: "", pays: "", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isUnavailable, remainingCapacity } = useAvailability(startDate, endDate);

  const month = startDate ? new Date(startDate).getMonth() + 1 : new Date().getMonth() + 1;

  const getProductPrices = (p: any) => {
    const pSeasons = (p.seasons as any[] | null) || [];
    return getSeasonalPrice(pSeasons, Number(p.price), month, Number(p.price_child || 0));
  };

  const rooms = useMemo(() => filteredProducts.filter(p => p.type === "chambre"), [filteredProducts]);
  const excursions = useMemo(() => filteredProducts.filter(p => p.type === "excursion"), [filteredProducts]);
  const services = useMemo(() => filteredProducts.filter(p => p.type === "service"), [filteredProducts]);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 1;
    return Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000));
  }, [startDate, endDate]);

  const cart = useMemo(() => {
    const items: CartItem[] = [];
    const addItem = (p: any) => {
      const prices = getProductPrices(p);
      const pImages = (p.images as any[] | null) || [];
      items.push({
        productId: p.id, name: p.name,
        priceAdult: prices.price, priceChild: prices.priceChild,
        type: p.type,
        image: pImages[0]?.url || p.image || "",
      });
    };
    if (selectedRoom) {
      const room = filteredProducts.find(p => p.id === selectedRoom);
      if (room) addItem(room);
    }
    selectedExcursions.forEach(id => {
      const exc = filteredProducts.find(p => p.id === id);
      if (exc) addItem(exc);
    });
    selectedServices.forEach(id => {
      const svc = filteredProducts.find(p => p.id === id);
      if (svc) addItem(svc);
    });
    return items;
  }, [selectedRoom, selectedExcursions, selectedServices, filteredProducts, month]);

  const calcItemTotal = (item: CartItem) => {
    const mult = item.type === "chambre" ? nights : 1;
    return (item.priceAdult * adults + item.priceChild * children) * mult;
  };
  const total = cart.reduce((sum, item) => sum + calcItemTotal(item), 0);

  const toggleExcursion = (id: string) => {
    setSelectedExcursions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Pré-remplir depuis le formulaire de l'onglet Excursion
        if (excDate || excTime) {
          setExcursionDetails(prev => ({ ...prev, [id]: { date: excDate, time: excTime } }));
        }
      }
      return next;
    });
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Pré-remplir depuis le formulaire de l'onglet Service
        if (svcDate || svcTime) {
          setServiceDetails(prev => ({ ...prev, [id]: { date: svcDate, time: svcTime, duration: svcDuration, location: svcLocation } }));
        }
      }
      return next;
    });
  };

  const removeFromCart = (productId: string, type: string) => {
    if (type === "chambre") setSelectedRoom(null);
    else if (type === "excursion") toggleExcursion(productId);
    else toggleService(productId);
  };

  const handleSubmit = async () => {
    if (selectedRoom && (!startDate || !endDate)) {
      toast.error("Veuillez sélectionner vos dates d'arrivée et de départ.");
      setStep(0);
      return;
    }
    if (selectedRoom && new Date(endDate) <= new Date(startDate)) {
      toast.error("La date de départ doit être après la date d'arrivée.");
      setStep(0);
      return;
    }
    if (cart.length === 0) {
      toast.error("Votre panier est vide. Sélectionnez au moins un produit.");
      setStep(1);
      return;
    }
    setIsSubmitting(true);
    try {
      for (const item of cart) {
        let itemStartDate = startDate;
        let itemEndDate = endDate;
        let itemNotes = clientInfo.notes || null;

        if (item.type === "excursion") {
          const d = excursionDetails[item.productId] ?? { date: "", time: "" };
          itemStartDate = d.date || startDate;
          itemEndDate = d.date || startDate;
          const parts: string[] = [];
          if (d.time) parts.push(`Heure de départ: ${d.time}`);
          if (clientInfo.notes) parts.push(clientInfo.notes);
          itemNotes = parts.join(" | ") || null;
        }

        if (item.type === "service") {
          const d = serviceDetails[item.productId] ?? { date: "", time: "", duration: "", location: "" };
          itemStartDate = d.date || startDate;
          itemEndDate = d.date || startDate;
          const parts: string[] = [];
          if (d.time) parts.push(`Heure de début: ${d.time}`);
          if (d.duration) parts.push(`Durée: ${d.duration}`);
          if (d.location) parts.push(`Lieu: ${d.location}`);
          if (clientInfo.notes) parts.push(clientInfo.notes);
          itemNotes = parts.join(" | ") || null;
        }

        await api.post(`/public/booking/${siteId}/reservations`, {
          product_id: Number(item.productId),
          client_name: `${clientInfo.prenom} ${clientInfo.nom}`.trim(),
          client_email: clientInfo.email || null,
          client_phone: clientInfo.phone || null,
          client_country: clientInfo.pays || null,
          start_date: itemStartDate,
          end_date: itemEndDate,
          adults,
          children,
          notes: itemNotes,
          accept_cgv: true,
        });
      }
      setStep(3);
      toast.success("Réservation confirmée !");
    } catch (err) {
      toast.error("Erreur lors de la réservation. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateDevisPDF = () => {
    const doc = new jsPDF();
    const refNum = `DEV-${Date.now().toString(36).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

    const rgb = hexToRgb(devisConfig.primaryColor);

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(devisConfig.companyName, 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (devisConfig.address) { doc.text(devisConfig.address, 14, 23); }
    const contactParts: string[] = [];
    if (devisConfig.phone) contactParts.push(devisConfig.phone);
    if (devisConfig.email) contactParts.push(devisConfig.email);
    if (contactParts.length) { doc.text(contactParts.join(" | "), 14, devisConfig.address ? 28 : 23); }
    const headerInfoY = 25 + (devisConfig.address ? 5 : 0) + (contactParts.length ? 5 : 0);
    doc.text(`Devis n° ${refNum}`, 14, headerInfoY);
    doc.text(`Date : ${dateStr}`, 14, headerInfoY + 5);
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.5);
    doc.line(14, headerInfoY + 8, 196, headerInfoY + 8);

    // Client info
    let y = 40;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Informations client", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nom : ${clientInfo.prenom} ${clientInfo.nom}`, 14, y); y += 5;
    doc.text(`Email : ${clientInfo.email}`, 14, y); y += 5;
    if (clientInfo.phone) { doc.text(`Tél : ${clientInfo.phone}`, 14, y); y += 5; }
    if (clientInfo.pays) { doc.text(`Pays : ${clientInfo.pays}`, 14, y); y += 5; }

    // Stay details
    y += 5;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Détails du séjour", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Arrivée : ${new Date(startDate).toLocaleDateString("fr-FR")}`, 14, y); y += 5;
    doc.text(`Départ : ${new Date(endDate).toLocaleDateString("fr-FR")}`, 14, y); y += 5;
    doc.text(`Durée : ${nights} nuit${nights > 1 ? "s" : ""}`, 14, y); y += 5;
    doc.text(`Adultes : ${adults}  |  Enfants : ${children}`, 14, y); y += 8;

    // Table
    const tableBody = cart.map(item => {
      const mult = item.type === "chambre" ? nights : 1;
      const subtotal = (item.priceAdult * adults + item.priceChild * children) * mult;
      return [
        item.name,
        typeLabels[item.type].replace(/[^\w\sÉé]/g, "").trim(),
        `${item.priceAdult}${currency} × ${adults}`,
        item.priceChild > 0 ? `${item.priceChild}${currency} × ${children}` : "-",
        item.type === "chambre" ? `${nights} nuit${nights > 1 ? "s" : ""}` : "1",
        `${subtotal}${currency}`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Produit", "Type", "Prix adulte", "Prix enfant", "Qté", "Sous-total"]],
      body: tableBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: rgb },
      foot: [["", "", "", "", "TOTAL", `${total}${currency}`]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(devisConfig.conditionsText, 14, finalY + 12);
    doc.text(devisConfig.footerText, 14, finalY + 18);

    doc.save(`devis-${devisConfig.companyName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("Devis téléchargé !");
  };

  // Les dates globales ne sont obligatoires que si une chambre est sélectionnée
  const canProceedStep0 = (selectedRoom ? (startDate && endDate) : true) && adults >= 1 && cart.length > 0;

  // Étape 1 → 2 : chaque excursion doit avoir une date ; chaque service doit avoir une date + heure
  const canProceedStep1 = (() => {
    for (const item of cart) {
      if (item.type === "excursion") {
        const d = excursionDetails[item.productId];
        if (!d?.date) return false;
      }
      if (item.type === "service") {
        const d = serviceDetails[item.productId];
        if (!d?.date || !d?.time) return false;
      }
    }
    return cart.length > 0;
  })();

  const detailProd = detailProduct ? filteredProducts.find(p => p.id === detailProduct) : null;
  const detailImages: ProductImage[] = detailProd ? ((detailProd.images as any[] | null) || []) : [];
  const detailPrices = detailProd ? getProductPrices(detailProd) : { price: 0, priceChild: 0, season: null };

  /* ─── Product card renderer ─── */
  const renderProductCard = (p: any, isSelected: boolean, onSelect: () => void) => {
    const pImages: ProductImage[] = (p.images as any[] | null) || [];
    const prices = getProductPrices(p);
    const amenities = ((p.amenities as string[] | null) || []).slice(0, 5);
    const unavailable = isUnavailable(p);
    const remaining = remainingCapacity(p);

    return (
      <div key={p.id}
        className={cn(
          "group overflow-hidden rounded-xl border bg-card transition-all",
          unavailable ? "border-border opacity-60" :
          isSelected ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border hover:border-primary/30 hover:shadow-md"
        )}>
        <div className="relative">
          <ImageThumbnails images={pImages} mainImage={p.image || undefined} name={p.name} />
          {unavailable && (
            <div className="absolute inset-0 rounded-t-xl bg-background/50 backdrop-blur-[2px] flex items-center justify-center">
              <Badge variant="destructive" className="gap-1 text-sm"><Ban className="h-3.5 w-3.5" /> Complet</Badge>
            </div>
          )}
        </div>
        <div className="relative">
          <Badge className="absolute -top-8 left-3 bg-card/90 text-card-foreground text-[10px] backdrop-blur-sm">{typeLabels[p.type]}</Badge>
          <div className="absolute -top-8 right-3 rounded-full bg-card/90 px-2.5 py-1 backdrop-blur-sm">
            <span className="text-sm font-bold text-primary">{prices.price}{currency}</span>
            {prices.priceChild > 0 && <span className="text-[10px] text-muted-foreground ml-1">/ Enf. {prices.priceChild}{currency}</span>}
            <span className="text-[10px] text-muted-foreground font-normal">/{p.type === "chambre" ? "nuit" : "pers"}</span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-heading font-semibold text-card-foreground">{p.name}</h3>
          {p.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
          )}
          {amenities.length > 0 && (
            <TooltipProvider>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {amenities.map(a => {
                  const am = AMENITIES_MAP[a];
                  if (!am) return null;
                  const AIcon = am.icon;
                  return (
                    <Tooltip key={a}>
                      <TooltipTrigger><AIcon className="h-4 w-4 text-primary/70" /></TooltipTrigger>
                      <TooltipContent><p>{am.label}</p></TooltipContent>
                    </Tooltip>
                  );
                })}
                {(p.amenities?.length || 0) > 5 && (
                  <span className="text-[10px] text-muted-foreground self-center">+{p.amenities.length - 5}</span>
                )}
              </div>
            </TooltipProvider>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Max {p.type === "excursion" ? p.max_capacity || p.capacity : p.capacity}
              {remaining !== null && !unavailable && (
                <span className="text-primary ml-1">({remaining} place{remaining > 1 ? "s" : ""})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); setDetailProduct(p.id); }}>
                <Eye className="h-3.5 w-3.5" /> Voir plus
              </Button>
              {unavailable ? (
                <Button size="sm" variant="secondary" disabled>
                  <Ban className="h-3.5 w-3.5 mr-1" /> Complet
                </Button>
              ) : (
                <Button size="sm" variant={isSelected ? "secondary" : "default"} onClick={onSelect}>
                  {isSelected ? <><X className="h-3.5 w-3.5 mr-1" /> Retirer</> : <><Check className="h-3.5 w-3.5 mr-1" /> Choisir</>}
                </Button>
              )}
            </div>
          </div>
          {isSelected && p.type === "chambre" && (
            <p className="mt-2 text-xs text-primary font-medium">
              Estimation : {(prices.price * adults + prices.priceChild * children) * nights}{currency} pour {nights} nuit{nights > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">{devisConfig.companyName || "Réservation"}</span>
          </Link>
          <button onClick={() => cart.length > 0 ? setStep(1) : null} className="relative">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            {cart.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{cart.length}</span>
            )}
          </button>
        </div>
      </header>

      <div className="container max-w-5xl py-8">
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < step ? "bg-secondary text-secondary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("hidden text-xs sm:inline", i === step ? "font-medium text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < steps.length - 1 && <div className="mx-2 h-px w-6 bg-border sm:w-10" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>

            {/* ═══ Step 0: Sélection type + formulaire dynamique + produits ═══ */}
            {step === 0 && (
              <div className="space-y-6">

                {/* 1. Sélecteur de type */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">Que souhaitez-vous réserver ?</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "chambre" as const, emoji: "🏨", label: "Chambre", sub: "Hébergement", count: rooms.length, color: "border-blue-300 bg-blue-50 text-blue-700" },
                      { key: "excursion" as const, emoji: "🌊", label: "Excursion", sub: "Activité", count: excursions.length, color: "border-green-300 bg-green-50 text-green-700" },
                      { key: "service" as const, emoji: "🛎️", label: "Service", sub: "Prestation", count: services.length, color: "border-orange-300 bg-orange-50 text-orange-700" },
                    ].filter(t => !isLoading && t.count > 0 || isLoading).map(t => (
                      <button
                        key={t.key}
                        onClick={() => setActiveType(t.key)}
                        className={cn(
                          "rounded-xl border-2 p-4 text-center transition-all",
                          activeType === t.key
                            ? `${t.color} shadow-md scale-[1.02]`
                            : "border-border bg-card hover:border-primary/30"
                        )}
                      >
                        <div className="text-2xl mb-1">{t.emoji}</div>
                        <p className="font-semibold text-sm text-foreground">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.sub}</p>
                        {!isLoading && t.count > 0 && (
                          <span className="mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {t.count} disponible{t.count > 1 ? "s" : ""}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Formulaire dynamique selon le type */}
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">

                  {/* CHAMBRE */}
                  {activeType === "chambre" && (
                    <>
                      <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" /> 🏨 Détails du séjour
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date d'arrivée *</Label>
                          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                        </div>
                        <div className="space-y-2">
                          <Label>Date de départ *</Label>
                          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split("T")[0]} />
                        </div>
                        <div className="space-y-2">
                          <Label>Adultes *</Label>
                          <Input type="number" min={1} value={adults} onChange={e => setAdults(Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Enfants</Label>
                          <Input type="number" min={0} value={children} onChange={e => setChildren(Math.max(0, parseInt(e.target.value) || 0))} />
                        </div>
                      </div>
                      {startDate && endDate && (
                        <p className="text-sm text-muted-foreground">
                          {nights} nuit{nights > 1 ? "s" : ""} · {adults} adulte{adults > 1 ? "s" : ""}{children > 0 && ` · ${children} enfant${children > 1 ? "s" : ""}`}
                        </p>
                      )}
                    </>
                  )}

                  {/* EXCURSION */}
                  {activeType === "excursion" && (
                    <>
                      <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-green-500" /> 🌊 Détails de l'excursion
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date de l'excursion *</Label>
                          <Input type="date" value={excDate} onChange={e => setExcDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                        </div>
                        <div className="space-y-2">
                          <Label>Heure de départ</Label>
                          <Input type="time" value={excTime} onChange={e => setExcTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Adultes *</Label>
                          <Input type="number" min={1} value={adults} onChange={e => setAdults(Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Enfants</Label>
                          <Input type="number" min={0} value={children} onChange={e => setChildren(Math.max(0, parseInt(e.target.value) || 0))} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Choix multiple possible — sélectionnez une ou plusieurs excursions ci-dessous.</p>
                    </>
                  )}

                  {/* SERVICE */}
                  {activeType === "service" && (
                    <>
                      <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-orange-500" /> 🛎️ Détails du service
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date du service *</Label>
                          <Input type="date" value={svcDate} onChange={e => setSvcDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                        </div>
                        <div className="space-y-2">
                          <Label>Heure de début *</Label>
                          <Input type="time" value={svcTime} onChange={e => setSvcTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Durée</Label>
                          <Input placeholder="ex: 2h, demi-journée" value={svcDuration} onChange={e => setSvcDuration(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Lieu</Label>
                          <Input placeholder="ex: Chambre 12, Piscine…" value={svcLocation} onChange={e => setSvcLocation(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Adultes *</Label>
                          <Input type="number" min={1} value={adults} onChange={e => setAdults(Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Enfants</Label>
                          <Input type="number" min={0} value={children} onChange={e => setChildren(Math.max(0, parseInt(e.target.value) || 0))} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Choix multiple possible — sélectionnez un ou plusieurs services ci-dessous.</p>
                    </>
                  )}
                </div>

                {/* 3. Produits filtrés par type actif */}
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
                  </div>
                ) : (
                  <>
                    {activeType === "chambre" && rooms.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                        Aucune chambre disponible pour ce site.
                      </div>
                    )}
                    {activeType === "chambre" && rooms.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-3">Choisissez une chambre pour votre séjour</p>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {rooms.map(p => renderProductCard(p, selectedRoom === p.id, () => {
                            if (isUnavailable(p)) return;
                            setSelectedRoom(selectedRoom === p.id ? null : p.id);
                          }))}
                        </div>
                      </div>
                    )}

                    {activeType === "excursion" && excursions.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                        Aucune excursion disponible pour ce site.
                      </div>
                    )}
                    {activeType === "excursion" && excursions.length > 0 && (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {excursions.map(p => renderProductCard(p, selectedExcursions.has(p.id), () => {
                          if (isUnavailable(p)) return;
                          toggleExcursion(p.id);
                        }))}
                      </div>
                    )}

                    {activeType === "service" && services.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                        Aucun service disponible pour ce site.
                      </div>
                    )}
                    {activeType === "service" && services.length > 0 && (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {services.map(p => renderProductCard(p, selectedServices.has(p.id), () => toggleService(p.id)))}
                      </div>
                    )}
                  </>
                )}

                {/* Barre panier sticky */}
                {cart.length > 0 && (
                  <div className="sticky bottom-4 rounded-xl border border-primary/30 bg-card p-4 shadow-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{cart.length} article{cart.length > 1 ? "s" : ""} dans votre panier</p>
                      <p className="text-xs text-muted-foreground">Total estimé : <span className="font-bold text-primary">{total}{currency}</span></p>
                    </div>
                    <Button onClick={() => setStep(1)} disabled={!canProceedStep0} className="gap-2">
                      Voir le panier <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ═══ Step 1: Cart ═══ */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="font-heading text-xl font-bold text-foreground">Votre panier</h2>
                {cart.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-8 text-center">
                    <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/30" />
                    <p className="mt-3 text-muted-foreground">Aucun produit sélectionné.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setStep(0)}>Choisir des produits</Button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                      {selectedRoom && startDate && endDate
                        ? `${startDate} → ${endDate} · ${adults} ad.${children > 0 ? ` + ${children} enf.` : ""} · ${nights} nuit${nights > 1 ? "s" : ""}`
                        : `${adults} adulte${adults > 1 ? "s" : ""}${children > 0 ? ` + ${children} enfant${children > 1 ? "s" : ""}` : ""}`}
                    </div>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.productId} className="rounded-xl border border-border bg-card overflow-hidden">
                          {/* Ligne principale */}
                          <div className="flex items-center gap-4 p-4">
                            {item.image && <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-card-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {typeLabels[item.type]} · {item.priceAdult}{currency}/ad.{item.priceChild > 0 && ` + ${item.priceChild}${currency}/enf.`}
                                {item.type === "chambre" && ` × ${nights} nuit${nights > 1 ? "s" : ""}`}
                              </p>
                            </div>
                            <p className="font-heading font-bold text-foreground shrink-0">{calcItemTotal(item)}{currency}</p>
                            <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId, item.type)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          {/* Excursion : date + heure de départ */}
                          {item.type === "excursion" && (
                            <div className="border-t border-border bg-muted/30 px-4 py-3 grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Date de l'excursion *</Label>
                                <Input
                                  type="date"
                                  min={new Date().toISOString().split("T")[0]}
                                  value={excursionDetails[item.productId]?.date ?? ""}
                                  onChange={e => setExcursionDetail(item.productId, "date", e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Heure de départ</Label>
                                <Input
                                  type="time"
                                  value={excursionDetails[item.productId]?.time ?? ""}
                                  onChange={e => setExcursionDetail(item.productId, "time", e.target.value)}
                                />
                              </div>
                            </div>
                          )}

                          {/* Service : date + heure + durée + lieu */}
                          {item.type === "service" && (
                            <div className="border-t border-border bg-muted/30 px-4 py-3 grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Date du service *</Label>
                                <Input
                                  type="date"
                                  min={new Date().toISOString().split("T")[0]}
                                  value={serviceDetails[item.productId]?.date ?? ""}
                                  onChange={e => setServiceDetail(item.productId, "date", e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Heure de début *</Label>
                                <Input
                                  type="time"
                                  value={serviceDetails[item.productId]?.time ?? ""}
                                  onChange={e => setServiceDetail(item.productId, "time", e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Durée</Label>
                                <Input
                                  placeholder="ex: 2h, demi-journée"
                                  value={serviceDetails[item.productId]?.duration ?? ""}
                                  onChange={e => setServiceDetail(item.productId, "duration", e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Lieu</Label>
                                <Input
                                  placeholder="ex: Chambre 12, Piscine…"
                                  value={serviceDetails[item.productId]?.location ?? ""}
                                  onChange={e => setServiceDetail(item.productId, "location", e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-muted p-4">
                      <span className="font-medium text-foreground">Total</span>
                      <span className="font-heading text-2xl font-bold text-primary">{total}{currency}</span>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(0)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Modifier</Button>
                      <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="gap-2">Continuer <ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ Step 2: Client info ═══ */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="font-heading text-xl font-bold text-foreground">Vos informations</h2>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Nom *</Label><Input placeholder="Rakoto" value={clientInfo.nom} onChange={e => setClientInfo(p => ({ ...p, nom: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Prénom *</Label><Input placeholder="Jean" value={clientInfo.prenom} onChange={e => setClientInfo(p => ({ ...p, prenom: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="jean@exemple.com" value={clientInfo.email} onChange={e => setClientInfo(p => ({ ...p, email: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Téléphone *</Label><Input placeholder="+261 34 00 000 00" value={clientInfo.phone} onChange={e => setClientInfo(p => ({ ...p, phone: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Pays</Label><Input placeholder="Madagascar" value={clientInfo.pays} onChange={e => setClientInfo(p => ({ ...p, pays: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Notes</Label><Input placeholder="Demandes spéciales..." value={clientInfo.notes} onChange={e => setClientInfo(p => ({ ...p, notes: e.target.value }))} /></div>
                  </div>
                  <div className="mt-6 flex items-start gap-2">
                    <Checkbox id="cgv" checked={cgvAccepted} onCheckedChange={v => setCgvAccepted(v === true)} />
                    <Label htmlFor="cgv" className="text-sm leading-relaxed text-muted-foreground">
                      J'accepte les <a href={`/mada-booking/cgv${siteId ? `/${siteId}` : ''}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">conditions générales de vente</a> *
                    </Label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button>
                  <Button onClick={handleSubmit} disabled={!cgvAccepted || !clientInfo.nom || !clientInfo.email || (!!selectedRoom && (!startDate || !endDate)) || isSubmitting} className="gap-2">
                    {isSubmitting ? "Envoi..." : "Confirmer la réservation"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ═══ Step 3: Confirmation ═══ */}
            {step === 3 && (
              <div className="space-y-6 text-center">
                <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                    <Check className="h-8 w-8 text-secondary" />
                  </div>
                  <h2 className="mt-4 font-heading text-xl font-bold text-foreground">Réservation confirmée !</h2>
                  <p className="mt-2 text-muted-foreground">
                    Montant total : <span className="font-bold text-foreground">{total}{currency}</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Le paiement s'effectue sur place. Un email de confirmation vous a été envoyé.
                  </p>
                  <div className="mt-6 space-y-2">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 rounded-lg bg-muted p-3 text-left text-sm">
                        {item.image && <img src={item.image} alt={item.name} className="h-10 w-10 rounded object-cover" />}
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{typeLabels[item.type]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button onClick={generateDevisPDF} variant="outline" className="mt-6 w-full gap-2" size="lg">
                    <Download className="h-5 w-5" /> Télécharger le devis (PDF)
                  </Button>
                  <Link to="/">
                    <Button className="mt-2 w-full" size="lg">Retour à l'accueil</Button>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Product detail dialog */}
      {detailProd && (
        <ProductDetailDialog
          product={detailProd}
          images={detailImages}
          prices={detailPrices}
          open={!!detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </div>
  );
}
