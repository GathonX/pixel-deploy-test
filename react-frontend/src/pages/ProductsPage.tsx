import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package, Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight,
  AlertCircle, RefreshCw, X, ChevronDown, ChevronUp, ImagePlus, Link, Upload, Loader2, ArrowRight,
} from 'lucide-react';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PlatformProvider, usePlatform } from '@/components/site-builder/src/contexts/PlatformContext';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SeasonPrice {
  price: number;
  date_start: string;
  date_end: string;
}

interface SiteProduct {
  id: number;
  site_id: string;
  name: string;
  description: string | null;
  images: string[];
  base_price: number;
  price_low_season: SeasonPrice | null;
  price_mid_season: SeasonPrice | null;
  price_high_season: SeasonPrice | null;
  price_peak_season: SeasonPrice | null;
  is_active: boolean;
  created_at: string;
}

type SeasonKey = 'price_low_season' | 'price_mid_season' | 'price_high_season' | 'price_peak_season';

const SEASON_META: { key: SeasonKey; label: string; color: string; bg: string }[] = [
  { key: 'price_low_season',  label: 'Basse saison',   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
  { key: 'price_mid_season',  label: 'Moyenne saison', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'price_high_season', label: 'Haute saison',   color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
  { key: 'price_peak_season', label: 'Pic de saison',  color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
];

const MONTHS = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Fév' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Avr' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Aoû' }, { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Déc' },
];

function formatPrice(p: number): string {
  return p.toLocaleString('fr-MG') + ' Ar';
}

function formatMonthDay(md: string): string {
  if (!md) return '—';
  const [mm, dd] = md.split('-');
  return `${dd} ${MONTHS.find(x => x.value === mm)?.label ?? mm}`;
}

// ─── Season Price Editor ──────────────────────────────────────────────────────

function SeasonEditor({
  label, bg, color, value, onChange,
}: {
  label: string; bg: string; color: string;
  value: SeasonPrice | null;
  onChange: (v: SeasonPrice | null) => void;
}) {
  const [open, setOpen] = useState(!!value);
  const v = value ?? { price: 0, date_start: '01-01', date_end: '03-31' };

  return (
    <div className={`border rounded-lg overflow-hidden ${bg}`}>
      <button
        type="button"
        onClick={() => { if (open) { onChange(null); setOpen(false); } else { setOpen(true); onChange(v); } }}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium"
      >
        <span className={color}>{label}</span>
        <div className="flex items-center gap-2">
          {value && <span className="text-xs font-semibold text-slate-700">{formatPrice(value.price)}</span>}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-200">
          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Prix (Ar)</label>
            <input
              type="number" min="0"
              value={v.price}
              onChange={e => onChange({ ...v, price: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="50000"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['date_start', 'date_end'] as const).map(field => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {field === 'date_start' ? 'Début' : 'Fin'}
                </label>
                <div className="flex gap-1">
                  <select
                    value={v[field].split('-')[0] ?? '01'}
                    onChange={e => onChange({ ...v, [field]: `${e.target.value}-${v[field].split('-')[1] ?? '01'}` })}
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none"
                  >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <input
                    type="number" min="1" max="31"
                    value={parseInt(v[field].split('-')[1] ?? '1')}
                    onChange={e => onChange({ ...v, [field]: `${v[field].split('-')[0]}-${String(e.target.value).padStart(2, '0')}` })}
                    className="w-12 border border-slate-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product Modal ────────────────────────────────────────────────────────────

interface ProductFormData {
  name: string;
  description: string;
  images: string[];
  base_price: number;
  price_low_season: SeasonPrice | null;
  price_mid_season: SeasonPrice | null;
  price_high_season: SeasonPrice | null;
  price_peak_season: SeasonPrice | null;
}

function ProductModal({
  product, siteId, onClose, onSaved,
}: {
  product: SiteProduct | null;
  siteId: string;
  onClose: () => void;
  onSaved: (p: SiteProduct) => void;
}) {
  const { toast } = useToast();
  const isEdit = !!product;

  const [form, setForm] = useState<ProductFormData>({
    name: product?.name ?? '',
    description: product?.description ?? '',
    images: product?.images ?? [],
    base_price: product?.base_price ?? 0,
    price_low_season: product?.price_low_season ?? null,
    price_mid_season: product?.price_mid_season ?? null,
    price_high_season: product?.price_high_season ?? null,
    price_peak_season: product?.price_peak_season ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setForm(f => ({ ...f, images: [...f.images, url] }));
    setNewImageUrl('');
  };

  const removeImage = (idx: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append('image', file);
      const res = await import('@/services/api').then(m => m.default.post(
        `/site-builder/sites/${siteId}/products/upload-image`, data,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      ));
      if (res.data?.url) {
        setForm(f => ({ ...f, images: [...f.images, res.data.url] }));
      }
    } catch {
      setError("Erreur lors de l'upload de l'image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        images: form.images,
        base_price: form.base_price,
        price_low_season: form.price_low_season,
        price_mid_season: form.price_mid_season,
        price_high_season: form.price_high_season,
        price_peak_season: form.price_peak_season,
      };
      const url = isEdit
        ? `/site-builder/sites/${siteId}/products/${product!.id}`
        : `/site-builder/sites/${siteId}/products`;
      const res = isEdit ? await api.put(url, payload) : await api.post(url, payload);
      onSaved(res.data.data);
      toast({ title: isEdit ? 'Produit mis à jour' : 'Produit créé' });
      onClose();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Nom du produit <span className="text-red-400">*</span>
            </label>
            <input
              type="text" autoFocus
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Circuit 3 jours Ambositra…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Description du produit, inclusions, exclusions…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Images</label>
            {form.images.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {form.images.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <img
                      src={url} alt=""
                      className="w-8 h-8 rounded object-cover shrink-0 bg-slate-200"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="flex-1 text-xs text-slate-500 truncate">{url}</span>
                    <button type="button" onClick={() => removeImage(idx)}
                      className="text-slate-300 hover:text-red-500 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={e => setNewImageUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
                  placeholder="https://exemple.com/photo.jpg"
                  className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button type="button" onClick={addImage}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-600 transition-colors shrink-0">
                <ImagePlus className="w-4 h-4" />
                Ajouter
              </button>
            </div>
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">ou</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-sm text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              {uploadingImage
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Upload className="w-4 h-4" />}
              {uploadingImage ? 'Upload en cours…' : 'Uploader depuis l\'ordinateur'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prix de base (Ar)</label>
            <input
              type="number" min="0"
              value={form.base_price}
              onChange={e => setForm(f => ({ ...f, base_price: parseInt(e.target.value) || 0 }))}
              placeholder="150000"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Utilisé en dehors des périodes saisonnières.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Prix saisonniers <span className="text-slate-400 font-normal">(optionnels — cliquez pour activer)</span></p>
            <div className="space-y-2">
              {SEASON_META.map(s => (
                <SeasonEditor
                  key={s.key}
                  label={s.label} bg={s.bg} color={s.color}
                  value={form[s.key]}
                  onChange={v => setForm(f => ({ ...f, [s.key]: v }))}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Le pic de saison prend priorité sur la haute, puis la moyenne, puis la basse saison.
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {saving ? 'Sauvegarde…' : isEdit ? 'Mettre à jour' : 'Créer le produit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onEdit, onToggle, onDelete }: {
  product: SiteProduct;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const activeSeasons = SEASON_META.filter(s => product[s.key] !== null);

  return (
    <div className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!product.is_active ? 'opacity-60' : ''}`}>
      {product.images.length > 0 && (
        <img
          src={product.images[0]} alt={product.name}
          className="w-full h-36 object-cover"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm truncate">{product.name}</h3>
            {product.description && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{product.description}</p>
            )}
          </div>
          <Badge variant="outline" className={product.is_active
            ? 'border-green-300 text-green-700 bg-green-50 shrink-0'
            : 'border-slate-200 text-slate-500 shrink-0'}>
            {product.is_active ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        <div className="mb-3">
          <p className="text-xl font-bold text-orange-600">{formatPrice(product.base_price)}</p>
          <p className="text-xs text-slate-400">Prix de base</p>
        </div>

        {activeSeasons.length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-3">
            {activeSeasons.map(s => {
              const sp = product[s.key]!;
              return (
                <span key={s.key} className={`text-xs px-2 py-0.5 rounded-full border ${s.bg} ${s.color} font-medium`}>
                  {s.label.split(' ')[0]} · {formatPrice(sp.price)}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-300 mb-3 italic">Pas de saisonnalité</p>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
            <Pencil className="w-3.5 h-3.5" />Modifier
          </button>
          <button onClick={onToggle}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
            {product.is_active
              ? <ToggleRight className="w-3.5 h-3.5 text-green-500" />
              : <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />}
            {product.is_active ? 'Désactiver' : 'Activer'}
          </button>
          <button onClick={onDelete}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors" title="Supprimer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function ProductsPageContent({ initialSiteId }: { initialSiteId?: string }) {
  const { setOpenMobile } = useSidebar();
  const { sites } = usePlatform();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(initialSiteId ?? null);

  const currentSite = sites.find(s => String(s.id) === selectedSiteId);
  const effectivePlanKey = (currentSite as any)?.effectivePlanKey ?? 'draft';

  const [products, setProducts]   = useState<SiteProduct[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [editTarget, setEditTarget] = useState<SiteProduct | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) {
      setSelectedSiteId(initialSiteId ?? String(sites[0].id));
    }
  }, [sites, selectedSiteId, initialSiteId]);

  const loadProducts = useCallback(async (siteId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/site-builder/sites/${siteId}/products`);
      setProducts(res.data.data ?? []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les produits.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedSiteId) loadProducts(selectedSiteId);
  }, [selectedSiteId, loadProducts]);

  const handleToggle = async (p: SiteProduct) => {
    try {
      await api.patch(`/site-builder/sites/${selectedSiteId}/products/${p.id}/toggle`);
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
      toast({ title: p.is_active ? 'Produit désactivé' : 'Produit activé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDelete = async (p: SiteProduct) => {
    if (!confirm(`Supprimer "${p.name}" définitivement ?`)) return;
    try {
      await api.delete(`/site-builder/sites/${selectedSiteId}/products/${p.id}`);
      setProducts(prev => prev.filter(x => x.id !== p.id));
      toast({ title: 'Produit supprimé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleSaved = (saved: SiteProduct) => {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-4 px-6 border-b bg-background shrink-0">
        <button className="md:hidden p-2 rounded-md hover:bg-accent" onClick={() => setOpenMobile(true)}>
          <Package className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Package className="w-5 h-5 text-orange-500" />
          <h1 className="text-lg font-semibold">Produits & offres</h1>
        </div>
        <Button
          className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
          disabled={!selectedSiteId}
          onClick={() => { setEditTarget(null); setShowModal(true); }}
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </header>

      <div className="flex-1 p-4 sm:p-6 space-y-5">
        {/* Banner plan Draft */}
        {selectedSiteId && effectivePlanKey === 'draft' && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">Plan actuel : Gratuit (Draft)</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Passez à Starter ou Pro pour publier votre site et débloquer toutes les fonctionnalités.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/dashboard/site/${selectedSiteId}/billing`)}
              className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              Voir les plans
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {sites.length > 1 && (
          <Select value={selectedSiteId ?? ''} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sélectionner un site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',    value: products.length,                                color: 'text-slate-700' },
            { label: 'Actifs',   value: products.filter(p => p.is_active).length,      color: 'text-green-600' },
            { label: 'Inactifs', value: products.filter(p => !p.is_active).length,     color: 'text-slate-400' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mb-2" />
            <p className="text-sm text-slate-400">Chargement…</p>
          </div>
        ) : !selectedSiteId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Sélectionnez un site pour voir ses produits.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
              <Package className="w-8 h-8 text-orange-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">
                {search ? 'Aucun résultat' : 'Aucun produit encore'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {search
                  ? `Aucun produit correspondant à "${search}".`
                  : 'Ajoutez vos circuits, excursions, hébergements et services.'}
              </p>
            </div>
            {!search && (
              <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => { setEditTarget(null); setShowModal(true); }}>
                <Plus className="w-4 h-4" />Créer mon premier produit
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <ProductCard
                key={p.id} product={p}
                onEdit={() => { setEditTarget(p); setShowModal(true); }}
                onToggle={() => handleToggle(p)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && selectedSiteId && (
        <ProductModal
          product={editTarget}
          siteId={selectedSiteId}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
    </SidebarInset>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  return (
    <DashboardLayout>
      <PlatformProvider>
        <ProductsPageContent initialSiteId={siteId} />
      </PlatformProvider>
    </DashboardLayout>
  );
}
