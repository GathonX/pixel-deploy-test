import { useState, useRef, useEffect, useCallback } from "react";
import { useCurrency } from "@/hooks/use-devis-config";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useSites } from "@/hooks/use-sites";
import {
  useAllProductSeasons,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUpsertSeason,
  useDeleteSeason,
  useAllProductImages,
  useUploadProductImage,
  useDeleteProductImage,
  seasonLabels,
  type ProductSeason,
  type ProductImage,
} from "@/hooks/use-products";
import { AMENITIES, AMENITY_CATEGORIES, AMENITIES_MAP, CATEGORIES_FOR_TYPE } from "@/data/amenities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, CalendarDays, Package, Bed, MapPin, Upload, X, Image as ImageIcon, ChevronLeft, ChevronRight, Users, Eye, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const typeIcons: Record<string, typeof Bed> = { chambre: Bed, excursion: MapPin, service: Package };
const typeLabels: Record<string, string> = { chambre: "Chambre", excursion: "Excursion", service: "Service" };
const typeColors: Record<string, string> = {
  chambre: "bg-blue-100 text-blue-700",
  excursion: "bg-emerald-100 text-emerald-700",
  service: "bg-violet-100 text-violet-700",
};
const seasonTypes = ["base", "moyenne", "haute", "tres_haute"] as const;
const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  p, pImages, pSeasons, currency,
  onEdit, onDelete, onSeasons, onManageImages, onView,
}: {
  p: any;
  pImages: ProductImage[];
  pSeasons: ProductSeason[];
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onSeasons: () => void;
  onManageImages: () => void;
  onView: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const Icon = typeIcons[p.type] || Package;

  const validImages = pImages.filter(img => !failedIds.has(img.id));
  const hasImages = validImages.length > 0;
  const safeIdx = validImages.length > 0 ? imgIdx % validImages.length : 0;
  const current = validImages[safeIdx];

  const handleImgError = useCallback((id: string) => {
    setFailedIds(prev => {
      if (prev.has(id)) return prev; // already failed, don't loop
      return new Set(prev).add(id);
    });
    // Advance to next so carousel keeps moving
    setImgIdx(i => (i + 1) % Math.max(pImages.length, 1));
  }, [pImages.length]);

  // Auto-rotate carousel every 4s, pause on hover
  useEffect(() => {
    if (validImages.length <= 1 || hovered) return;
    const timer = setInterval(() => {
      setImgIdx(i => (i + 1) % validImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [validImages.length, hovered]);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
      {/* ── Image area ── */}
      <div
        className="relative h-44 bg-muted/50 shrink-0"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hasImages ? (
          <>
            <img
              src={current?.url}
              alt={p.name}
              className="w-full h-full object-cover"
              onError={() => current?.id && handleImgError(current.id)}
            />
            {validImages.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx(i => (i - 1 + validImages.length) % validImages.length)}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setImgIdx(i => (i + 1) % validImages.length)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {validImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${i === safeIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              onClick={onManageImages}
              className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full px-2 py-1 text-[10px] flex items-center gap-1 transition-colors"
            >
              <ImageIcon className="h-3 w-3" /> {pImages.length}
            </button>
          </>
        ) : (
          <button
            onClick={onManageImages}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted transition-colors"
          >
            <ImageIcon className="h-8 w-8 opacity-40" />
            <span className="text-xs">Ajouter des photos</span>
          </button>
        )}
        {/* Type badge */}
        <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColors[p.type] || "bg-gray-100 text-gray-700"}`}>
          {typeLabels[p.type]}
        </span>
      </div>

      {/* ── Content ── */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex items-start gap-2">
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <h3 className="font-semibold text-foreground leading-tight">{p.name}</h3>
          </div>
          {p.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 ml-6">{p.description}</p>
          )}
        </div>

        {/* Price + capacity */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-primary">
              {Number(p.price).toLocaleString("fr-FR")}{currency}
            </span>
            {Number(p.price_child) > 0 && (
              <span className="text-xs text-muted-foreground">
                / enf. {Number(p.price_child).toLocaleString("fr-FR")}{currency}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" /> {p.capacity}
          </span>
        </div>

        {/* Seasons */}
        {pSeasons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pSeasons.map(s => (
              <Badge key={s.id} variant="outline" className="text-[10px] font-normal">
                {seasonLabels[s.season]}: {Number(s.price).toLocaleString("fr-FR")}{currency}
              </Badge>
            ))}
          </div>
        )}

        {/* Amenities */}
        {(p.amenities?.length > 0) && (
          <TooltipProvider>
            <div className="flex gap-1.5 flex-wrap">
              {(p.amenities as string[]).slice(0, 8).map((a: string) => {
                const am = AMENITIES_MAP[a];
                if (!am) return null;
                const AIcon = am.icon;
                return (
                  <Tooltip key={a}>
                    <TooltipTrigger>
                      <AIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent><p>{am.label}</p></TooltipContent>
                  </Tooltip>
                );
              })}
              {p.amenities.length > 8 && (
                <span className="text-[10px] text-muted-foreground">+{p.amenities.length - 8}</span>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-1 pt-2 border-t mt-auto">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs flex-1 min-w-0" onClick={onView}>
            <Eye className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Aperçu</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs flex-1 min-w-0" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Modifier</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs flex-1 min-w-0" onClick={onSeasons}>
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Saisons</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { siteId: routeSiteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const currency = useCurrency();
  const { data: sites, isLoading } = useSites();
  const { data: allSeasons } = useAllProductSeasons();
  const { data: allImages } = useAllProductImages();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const upsertSeason = useUpsertSeason();
  const deleteSeason = useDeleteSeason();
  const uploadImage = useUploadProductImage();
  const deleteImage = useDeleteProductImage();

  const [showCreate, setShowCreate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [seasonProductId, setSeasonProductId] = useState<string | null>(null);
  const [imagesProductId, setImagesProductId] = useState<string | null>(null);
  const [imagesProductSiteId, setImagesProductSiteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    site_id: "", name: "", type: "chambre" as "chambre" | "excursion" | "service",
    description: "", parcours: "", image: "", price: 0, price_child: 0, capacity: 1,
    max_capacity: 0, stock: 0, amenities: [] as string[],
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editImgRef = useRef<HTMLInputElement>(null);
  const createImgRef = useRef<HTMLInputElement>(null);

  const allProducts = sites?.flatMap(s => s.products.map(p => ({ ...p, siteName: s.name }))) || [];
  const filteredSites = routeSiteId ? (sites || []).filter(s => s.id === routeSiteId) : (sites || []);
  const currentSite = routeSiteId ? sites?.find(s => s.id === routeSiteId) : null;

  const openCreate = () => {
    setForm({
      site_id: routeSiteId || sites?.[0]?.id || "", name: "", type: "chambre",
      description: "", parcours: "", image: "", price: 0, price_child: 0,
      capacity: 1, max_capacity: 0, stock: 0, amenities: [],
    });
    setEditingId(null);
    setEditingSiteId(null);
    setPendingFiles([]);
    setShowCreate(true);
  };

  const openEdit = (p: any) => {
    setForm({
      site_id: p.site_id, name: p.name, type: p.type, description: p.description || "",
      parcours: p.parcours || "", image: p.image || "",
      price: Number(p.price), price_child: Number(p.price_child || 0),
      capacity: p.capacity, max_capacity: p.max_capacity || 0,
      stock: p.stock || 0, amenities: p.amenities || [],
    });
    setEditingId(p.id);
    setEditingSiteId(p.site_id);
    setShowCreate(true);
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      if (editingId) {
        await updateProduct.mutateAsync({
          id: editingId, site_id: editingSiteId!, name: form.name, description: form.description,
          price: form.price, price_child: form.price_child,
          capacity: form.capacity, max_capacity: form.max_capacity || undefined,
          stock: form.stock || undefined, amenities: form.amenities,
        });
        toast.success("Produit mis à jour");
      } else {
        const newProduct = await createProduct.mutateAsync({
          site_id: form.site_id, name: form.name, type: form.type,
          description: form.description, parcours: form.parcours,
          price: form.price, price_child: form.price_child, capacity: form.capacity,
          max_capacity: form.max_capacity || undefined, stock: form.stock || undefined,
          amenities: form.amenities,
        });
        if (pendingFiles.length > 0) {
          await handleUploadImages(pendingFiles, String(newProduct.id), form.site_id);
          setPendingFiles([]);
        }
        toast.success("Produit créé");
      }
      setShowCreate(false);
      setPendingFiles([]);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Une erreur est survenue.";
      setSaveError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string, siteId: string) => {
    if (!confirm("Supprimer ce produit et toutes ses réservations ?")) return;
    try {
      await deleteProduct.mutateAsync({ id, site_id: siteId });
      toast.success("Produit supprimé");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUploadImages = async (files: FileList | File[], productId: string, siteId: string) => {
    const currentImages = (allImages || []).filter(img => img.product_id === productId);
    let pos = currentImages.length;
    for (const file of Array.from(files)) {
      try {
        await uploadImage.mutateAsync({ productId, siteId, file, position: pos++ });
      } catch (e: any) {
        toast.error(`Erreur upload: ${e.message}`);
      }
    }
    toast.success("Photos ajoutées");
  };

  // For the standalone images modal (from card button)
  const handleUploadStandalone = async (files: FileList) => {
    if (!imagesProductId || !imagesProductSiteId) return;
    await handleUploadImages(files, imagesProductId, imagesProductSiteId);
    setImagesProductId(null);
    setImagesProductSiteId(null);
  };

  const productSeasons = (allSeasons || []).filter(s => s.product_id === seasonProductId);
  const productImages = (allImages || []).filter(img => img.product_id === imagesProductId);
  const editingImages = editingId ? (allImages || []).filter(img => img.product_id === editingId) : [];

  const handleSaveSeason = async (season: typeof seasonTypes[number], price: number, priceChild: number, startMonth: number, endMonth: number) => {
    const existing = productSeasons.find(s => s.season === season);
    try {
      await upsertSeason.mutateAsync({
        id: existing?.id, product_id: seasonProductId!, season,
        price, price_child: priceChild, start_month: startMonth, end_month: endMonth,
      });
      toast.success(`Saison ${seasonLabels[season]} enregistrée`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <DashboardLayout><Skeleton className="h-96" /></DashboardLayout>;

  const grouped = filteredSites.map(s => ({
    site: s,
    products: allProducts.filter(p => p.site_id === s.id),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Produits{currentSite ? ` — ${currentSite.name}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allProducts.filter(p => !routeSiteId || p.site_id === routeSiteId).length} produit(s)
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter un produit
          </Button>
        </div>

        {/* Products grid */}
        {grouped.map(({ site, products }) => (
          <div key={site.id} className="space-y-4">
            {!routeSiteId && (
              <h2 className="font-heading text-base font-semibold text-foreground border-b pb-2">
                {site.name}
              </h2>
            )}
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border-2 border-dashed">
                <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucun produit pour ce site.</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Créer le premier produit
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map(p => {
                  const pSeasons = (allSeasons || []).filter(s => s.product_id === p.id);
                  const pImages = (allImages || []).filter(img => img.product_id === p.id);
                  return (
                    <ProductCard
                      key={p.id}
                      p={p}
                      pImages={pImages}
                      pSeasons={pSeasons}
                      currency={currency}
                      onView={() => {
                        const base = routeSiteId
                          ? `/mada-booking/vue-site/${routeSiteId}/produits`
                          : "/mada-booking/dashboard/produits";
                        navigate(`${base}/${p.id}`);
                      }}
                      onEdit={() => openEdit(p)}
                      onDelete={() => handleDelete(p.id, p.site_id)}
                      onSeasons={() => setSeasonProductId(p.id)}
                      onManageImages={() => { setImagesProductId(p.id); setImagesProductSiteId(p.site_id); }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setSaveError(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Site + Type (create only) */}
            {!editingId && (
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Site *</Label>
                  <Select value={form.site_id} onValueChange={v => setForm(f => ({ ...f, site_id: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(routeSiteId ? filteredSites : sites || []).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chambre">Chambre</SelectItem>
                      <SelectItem value="excursion">Excursion</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Chambre Deluxe Vue Mer"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description détaillée du produit..."
                rows={3}
              />
            </div>

            {/* Parcours (excursion only) */}
            {form.type === "excursion" && (
              <div className="space-y-1.5">
                <Label>Parcours / Itinéraire</Label>
                <Textarea
                  value={form.parcours}
                  onChange={e => setForm(f => ({ ...f, parcours: e.target.value }))}
                  placeholder="Décrivez l'itinéraire détaillé..."
                  rows={3}
                />
              </div>
            )}

            {/* Prices + Capacity */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Prix adulte ({currency})</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Prix enfant ({currency})</Label>
                <Input type="number" value={form.price_child} onChange={e => setForm(f => ({ ...f, price_child: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label>Capacité</Label>
                <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
              </div>
              {form.type === "excursion" && (
                <div className="space-y-1.5 sm:col-span-1">
                  <Label>Max capacité</Label>
                  <Input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: Number(e.target.value) }))} />
                </div>
              )}
              {form.type === "service" && (
                <div className="space-y-1.5 sm:col-span-1">
                  <Label>Stock</Label>
                  <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                </div>
              )}
            </div>

            {/* Amenities */}
            {(CATEGORIES_FOR_TYPE[form.type] || []).length > 0 && (
              <div className="space-y-1.5">
                <Label>Équipements & Services</Label>
                <ScrollArea className="h-44 rounded-lg border p-3">
                  {AMENITY_CATEGORIES.filter(cat => (CATEGORIES_FOR_TYPE[form.type] || []).includes(cat)).map(cat => {
                    const items = AMENITIES.filter(a => a.category === cat);
                    return (
                      <div key={cat} className="mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{cat}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {items.map(am => {
                            const AIcon = am.icon;
                            const checked = form.amenities.includes(am.key);
                            return (
                              <label key={am.key} className="flex items-center gap-2 cursor-pointer text-sm py-0.5 hover:text-foreground transition-colors">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => setForm(f => ({
                                    ...f,
                                    amenities: checked
                                      ? f.amenities.filter(a => a !== am.key)
                                      : [...f.amenities, am.key],
                                  }))}
                                />
                                <AIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs">{am.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
              </div>
            )}

            {/* ── Photos ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Photos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => editingId ? editImgRef.current?.click() : createImgRef.current?.click()}
                  disabled={uploadImage.isPending}
                >
                  {uploadImage.isPending
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Upload className="h-3 w-3" />}
                  {uploadImage.isPending ? "Upload en cours..." : "Ajouter des photos"}
                </Button>
                {/* input création (stocke en mémoire) */}
                <input
                  ref={createImgRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) {
                      setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      e.target.value = "";
                    }
                  }}
                />
                {/* input édition (upload immédiat) */}
                <input
                  ref={editImgRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    if (e.target.files && editingId && editingSiteId) {
                      await handleUploadImages(e.target.files, editingId, editingSiteId);
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              {/* Mode création : preview local des fichiers en attente */}
              {!editingId && pendingFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {pendingFiles.map((file, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square bg-muted">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Mode édition : photos sauvegardées */}
              {editingId && editingImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {editingImages.map(img => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square bg-muted">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          deleteImage
                            .mutateAsync({ id: img.id, productId: editingId!, siteId: editingSiteId! })
                            .then(() => toast.success("Photo supprimée"))
                        }
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Zone drop vide */}
              {(editingId ? editingImages.length === 0 : pendingFiles.length === 0) && (
                <div
                  className="border-2 border-dashed rounded-lg h-24 flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => editingId ? editImgRef.current?.click() : createImgRef.current?.click()}
                >
                  <ImageIcon className="h-6 w-6 opacity-40" />
                  <span className="text-xs">Cliquez pour ajouter des photos</span>
                </div>
              )}
            </div>

            {/* Erreur inline */}
            {saveError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Save */}
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={!form.name || (!editingId && !form.site_id) || createProduct.isPending || updateProduct.isPending}
            >
              {(createProduct.isPending || updateProduct.isPending) ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{editingId ? "Enregistrement..." : "Création en cours..."}</>
              ) : (
                editingId ? "Enregistrer les modifications" : "Créer le produit"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Seasons Modal ── */}
      <Dialog open={!!seasonProductId} onOpenChange={() => setSeasonProductId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion des saisons</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {seasonTypes.map(season => {
              const existing = productSeasons.find(s => s.season === season);
              return (
                <SeasonRow
                  key={season}
                  season={season}
                  existing={existing}
                  currency={currency}
                  onSave={(price, priceChild, startMonth, endMonth) =>
                    handleSaveSeason(season, price, priceChild, startMonth, endMonth)
                  }
                  onDelete={
                    existing
                      ? () => deleteSeason.mutateAsync({ productId: seasonProductId!, season: existing.season }).then(() => toast.success("Supprimée"))
                      : undefined
                  }
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Standalone Images Modal (from card icon) ── */}
      <Dialog open={!!imagesProductId} onOpenChange={() => { setImagesProductId(null); setImagesProductSiteId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Photos du produit ({productImages.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {productImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {productImages.map(img => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-square bg-muted">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() =>
                        deleteImage
                          .mutateAsync({ id: img.id, productId: imagesProductId!, siteId: imagesProductSiteId! })
                          .then(() => toast.success("Photo supprimée"))
                      }
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ImageIcon className="h-8 w-8 opacity-30" />
                <p className="text-sm">Aucune photo pour ce produit</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files && handleUploadStandalone(e.target.files)}
            />
            <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Ajouter des photos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ─── SeasonRow ────────────────────────────────────────────────────────────────

function SeasonRow({ season, existing, currency, onSave, onDelete }: {
  season: string;
  existing?: ProductSeason;
  currency: string;
  onSave: (price: number, priceChild: number, start: number, end: number) => void;
  onDelete?: () => void;
}) {
  const [price, setPrice] = useState(existing ? Number(existing.price) : 0);
  const [priceChild, setPriceChild] = useState(existing ? Number(existing.price_child) : 0);
  const [startMonth, setStartMonth] = useState(existing?.start_month || 1);
  const [endMonth, setEndMonth] = useState(existing?.end_month || 12);

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{seasonLabels[season]}</span>
        {existing && <Badge variant="secondary" className="text-[10px]">Configurée</Badge>}
      </div>
      <div className="grid gap-3 grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Prix adulte ({currency})</Label>
          <Input type="number" className="h-8 text-sm" value={price} onChange={e => setPrice(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prix enfant ({currency})</Label>
          <Input type="number" className="h-8 text-sm" value={priceChild} onChange={e => setPriceChild(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mois début</Label>
          <Select value={String(startMonth)} onValueChange={v => setStartMonth(Number(v))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mois fin</Label>
          <Select value={String(endMonth)} onValueChange={v => setEndMonth(Number(v))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="text-xs" onClick={() => onSave(price, priceChild, startMonth, endMonth)} disabled={price <= 0}>
          Enregistrer
        </Button>
        {onDelete && (
          <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={onDelete}>
            Supprimer
          </Button>
        )}
      </div>
    </div>
  );
}
