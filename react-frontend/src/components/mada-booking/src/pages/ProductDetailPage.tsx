import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/use-devis-config";
import { useSites } from "@/hooks/use-sites";
import { useAllProductSeasons, useAllProductImages, seasonLabels } from "@/hooks/use-products";
import { AMENITIES_MAP } from "@/data/amenities";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Pencil, Bed, MapPin, Package, Users, ChevronLeft, ChevronRight,
  CalendarDays, Tag, Star, Info, Layers,
} from "lucide-react";

const typeIcons: Record<string, typeof Bed> = { chambre: Bed, excursion: MapPin, service: Package };
const typeLabels: Record<string, string> = { chambre: "Chambre", excursion: "Excursion", service: "Service" };
const typeColors: Record<string, string> = {
  chambre: "bg-blue-100 text-blue-700",
  excursion: "bg-emerald-100 text-emerald-700",
  service: "bg-violet-100 text-violet-700",
};
const seasonBadgeColors: Record<string, string> = {
  base: "bg-sky-50 text-sky-700 border-sky-200",
  moyenne: "bg-amber-50 text-amber-700 border-amber-200",
  haute: "bg-orange-50 text-orange-700 border-orange-200",
  tres_haute: "bg-rose-50 text-rose-700 border-rose-200",
};
const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default function ProductDetailPage() {
  const { siteId: routeSiteId, productId } = useParams<{ siteId: string; productId: string }>();
  const navigate = useNavigate();
  const currency = useCurrency();
  const { data: sites, isLoading } = useSites();
  const { data: allSeasons } = useAllProductSeasons();
  const { data: allImages } = useAllProductImages();

  const [imgIdx, setImgIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  // Find product across all sites
  const allProducts = sites?.flatMap(s => s.products.map(p => ({ ...p, siteName: s.name }))) || [];
  const product = allProducts.find(p => p.id === productId);
  const rawImages = (allImages || []).filter(img => img.product_id === productId);
  const productImages = rawImages.filter(img => !failedIds.has(img.id));
  const safeIdx = productImages.length > 0 ? imgIdx % productImages.length : 0;
  const current = productImages[safeIdx];
  const productSeasons = (allSeasons || []).filter(s => s.product_id === productId);

  const handleImgError = useCallback((id: string) => {
    setFailedIds(prev => {
      if (prev.has(id)) return prev;
      return new Set(prev).add(id);
    });
    setImgIdx(i => (i + 1) % Math.max(rawImages.length, 1));
  }, [rawImages.length]);

  // Auto-rotate carousel
  useEffect(() => {
    if (productImages.length <= 1 || hovered) return;
    const timer = setInterval(() => {
      setImgIdx(i => (i + 1) % productImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [productImages.length, hovered]);

  const backUrl = routeSiteId
    ? `/mada-booking/vue-site/${routeSiteId}/produits`
    : "/mada-booking/dashboard/produits";

  const editUrl = routeSiteId
    ? `/mada-booking/vue-site/${routeSiteId}/produits`
    : "/mada-booking/dashboard/produits";

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Produit introuvable.</p>
          <Button variant="outline" onClick={() => navigate(backUrl)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux produits
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const Icon = typeIcons[product.type] || Package;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(backUrl)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux produits
          </button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => navigate(editUrl)}
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        </div>

        {/* ── Hero carousel ── */}
        <div
          className="relative rounded-2xl overflow-hidden bg-muted h-72 sm:h-96"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {productImages.length > 0 ? (
            <>
              <img
                src={current?.url}
                alt={product.name}
                className="w-full h-full object-cover transition-opacity duration-500"
                onError={() => current?.id && handleImgError(current.id)}
              />
              {productImages.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIdx(i => (i - 1 + productImages.length) % productImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setImgIdx(i => (i + 1) % productImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                    {productImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIdx(i)}
                        className={`h-2 rounded-full transition-all ${i === safeIdx ? "w-6 bg-white" : "w-2 bg-white/50"}`}
                      />
                    ))}
                  </div>
                  <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    {safeIdx + 1} / {productImages.length}
                  </span>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Icon className="h-12 w-12 opacity-20" />
              <span className="text-sm">Aucune photo disponible</span>
            </div>
          )}

          {/* Type badge overlay */}
          <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full shadow ${typeColors[product.type] || "bg-gray-100 text-gray-700"}`}>
            {typeLabels[product.type]}
          </span>
        </div>

        {/* ── Thumbnail strip ── */}
        {productImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {productImages.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setImgIdx(i)}
                className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === safeIdx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* ── Main info ── */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 mt-0.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground font-heading">{product.name}</h1>
                  {product.siteName && (
                    <p className="text-sm text-muted-foreground mt-0.5">{product.siteName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Info className="h-4 w-4 text-muted-foreground" /> Description
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Parcours (excursion) */}
            {product.parcours && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> Itinéraire / Parcours
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{product.parcours}</p>
              </div>
            )}

            {/* Amenities */}
            {product.amenities?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Star className="h-4 w-4 text-muted-foreground" /> Équipements & Services
                </div>
                <TooltipProvider>
                  <div className="flex flex-wrap gap-2">
                    {(product.amenities as string[]).map((a: string) => {
                      const am = AMENITIES_MAP[a];
                      if (!am) return null;
                      const AIcon = am.icon;
                      return (
                        <Tooltip key={a}>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-muted/50 text-xs text-foreground">
                              <AIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              {am.label}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent><p>{am.label}</p></TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </div>
            )}

            {/* Seasons */}
            {productSeasons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" /> Tarifs par saison
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {productSeasons.map(s => (
                    <div key={s.id} className={`rounded-xl border p-3 space-y-1.5 ${seasonBadgeColors[s.season] || "bg-muted/50"}`}>
                      <div className="font-semibold text-sm">{seasonLabels[s.season]}</div>
                      <div className="text-xs opacity-80">
                        {months[(s.start_month || 1) - 1]} → {months[(s.end_month || 12) - 1]}
                      </div>
                      <Separator className="opacity-30" />
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-base">
                          {Number(s.price).toLocaleString("fr-FR")}{currency}
                        </span>
                        {Number(s.price_child) > 0 && (
                          <span className="text-xs opacity-70">
                            / enf. {Number(s.price_child).toLocaleString("fr-FR")}{currency}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: pricing card */}
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 sticky top-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Prix de base</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {Number(product.price).toLocaleString("fr-FR")}
                  </span>
                  <span className="text-muted-foreground text-sm">{currency} / adulte</span>
                </div>
                {Number(product.price_child) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {Number(product.price_child).toLocaleString("fr-FR")}{currency} / enfant
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Capacité
                  </span>
                  <span className="font-semibold">{product.capacity} pers.</span>
                </div>
                {product.max_capacity > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Max
                    </span>
                    <span className="font-semibold">{product.max_capacity} pers.</span>
                  </div>
                )}
                {product.stock > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="h-3.5 w-3.5" /> Stock
                    </span>
                    <span className="font-semibold">{product.stock}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Type
                  </span>
                  <Badge variant="outline" className={`text-xs font-normal ${typeColors[product.type]}`}>
                    {typeLabels[product.type]}
                  </Badge>
                </div>
              </div>

              <Separator />

              <Button className="w-full gap-2" onClick={() => navigate(editUrl)}>
                <Pencil className="h-4 w-4" /> Modifier ce produit
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
