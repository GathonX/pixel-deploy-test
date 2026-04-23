import { useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useSuppliers, useSupplierPrices, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useUpsertSupplierPrice, useDeleteSupplierPrice } from "@/hooks/use-suppliers";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import { useProducts, useSites } from "@/hooks/use-sites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Truck, DollarSign, Receipt } from "lucide-react";
import { toast } from "sonner";
import PlanUpgradeGate from "../components/PlanUpgradeGate";

export default function SuppliersPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { data: suppliers, isLoading, isError, error } = useSuppliers(siteId);
  const { data: allSites } = useSites();
  const { data: products } = useProducts();
  const { data: expenses } = useExpenses(siteId);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const upsertPrice = useUpsertSupplierPrice();
  const deletePrice = useDeleteSupplierPrice();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pricesSupplierId, setPricesSupplierId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contact_email: "", phone: "", notes: "", site_id: "" });
  const [newPriceProductId, setNewPriceProductId] = useState("");
  const [newPriceCost, setNewPriceCost] = useState(0);

  // Expense modal
  const [showExpense, setShowExpense] = useState(false);
  const [expForm, setExpForm] = useState({ label: "", amount: 0, expense_date: new Date().toISOString().split("T")[0], supplier_id: "", product_id: "", notes: "" });

  const { data: currentPrices } = useSupplierPrices(pricesSupplierId || undefined);

  const siteProducts = siteId ? (products || []).filter(p => p.site_id === siteId) : products;
  const siteProductIds = new Set((siteProducts || []).map(p => p.id));
  const filteredPrices = siteId
    ? (currentPrices || []).filter(sp => siteProductIds.has(sp.product_id))
    : currentPrices;

  const openCreate = () => {
    setForm({ name: "", contact_email: "", phone: "", notes: "", site_id: siteId || "" });
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (s: any) => {
    setForm({ name: s.name, contact_email: s.contact_email || "", phone: s.phone || "", notes: s.notes || "", site_id: s.site_id || "" });
    setEditingId(s.id);
    setShowCreate(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, site_id: form.site_id || undefined };
      if (editingId) {
        await updateSupplier.mutateAsync({ id: editingId, ...payload });
        toast.success("Fournisseur mis à jour");
      } else {
        await createSupplier.mutateAsync(payload);
        toast.success("Fournisseur créé");
      }
      setShowCreate(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    try {
      await deleteSupplier.mutateAsync(id);
      toast.success("Fournisseur supprimé");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddPrice = async () => {
    if (!pricesSupplierId || !newPriceProductId || newPriceCost <= 0) return;
    try {
      await upsertPrice.mutateAsync({ supplier_id: pricesSupplierId, product_id: newPriceProductId, cost_price: newPriceCost });
      toast.success("Prix fournisseur enregistré");
      setNewPriceProductId("");
      setNewPriceCost(0);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddExpense = async () => {
    if (!expForm.label || expForm.amount <= 0) return;
    const supplierSiteId = expForm.supplier_id ? (suppliers || []).find(s => s.id === expForm.supplier_id)?.site_id : null;
    const productSiteId = expForm.product_id ? (products || []).find(p => p.id === expForm.product_id)?.site_id : null;
    const finalSiteId = siteId || supplierSiteId || productSiteId || "";
    if (!finalSiteId) {
      toast.error("Veuillez sélectionner un produit ou un fournisseur lié à un site.");
      return;
    }
    try {
      await createExpense.mutateAsync({
        site_id: finalSiteId,
        supplier_id: expForm.supplier_id || undefined,
        product_id: expForm.product_id || undefined,
        label: expForm.label,
        amount: expForm.amount,
        expense_date: expForm.expense_date,
        notes: expForm.notes || undefined,
      });
      toast.success("Dépense ajoutée");
      setShowExpense(false);
      setExpForm({ label: "", amount: 0, expense_date: new Date().toISOString().split("T")[0], supplier_id: "", product_id: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <DashboardLayout><Skeleton className="h-96" /></DashboardLayout>;

  // 403 plan upgrade required
  if (isError && (error as any)?.response?.status === 403) {
    return <PlanUpgradeGate error={error} />;
  }

  const currentSite = siteId ? allSites?.find(s => s.id === siteId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Fournisseurs{currentSite ? ` — ${currentSite.name}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">Gestion des fournisseurs, prix d'achat et dépenses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setExpForm({ label: "", amount: 0, expense_date: new Date().toISOString().split("T")[0], supplier_id: "", product_id: "", notes: "" }); setShowExpense(true); }} className="gap-2">
              <Receipt className="h-4 w-4" /> Dépense
            </Button>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Fournisseur</Button>
          </div>
        </div>

        {/* Suppliers grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(suppliers || []).map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-primary" />
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{s.name}</h3>
                  {s.contact_email && <p className="text-xs text-muted-foreground truncate">{s.contact_email}</p>}
                </div>
              </div>
              {!siteId && s.sites && (
                <Badge variant="outline" className="text-[10px]">{s.sites.name}</Badge>
              )}
              {s.phone && <p className="text-xs text-muted-foreground">📞 {s.phone}</p>}
              {s.notes && <p className="text-xs text-muted-foreground">{s.notes}</p>}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openEdit(s)}>
                  <Pencil className="h-3 w-3" /> Modifier
                </Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setPricesSupplierId(s.id)}>
                  <DollarSign className="h-3 w-3" /> Prix
                </Button>
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Expenses section */}
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Dépenses</h2>
          {(expenses || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune dépense enregistrée.</p>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(expenses || []).map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{new Date(e.expense_date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="text-sm font-medium">{e.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.suppliers?.name || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.products?.name || "—"}</TableCell>
                      <TableCell className="text-right font-bold">{Number(e.amount).toLocaleString("fr-FR")}€</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Supprimer cette dépense ?")) deleteExpense.mutateAsync(e.id).then(() => toast.success("Supprimé")); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Supplier Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            {!siteId && (
              <div className="space-y-2">
                <Label>Site</Label>
                <Select value={form.site_id} onValueChange={v => setForm(f => ({ ...f, site_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un site" /></SelectTrigger>
                  <SelectContent>
                    {(allSites || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleSave} className="w-full" disabled={!form.name}>
              {editingId ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Prices Modal */}
      <Dialog open={!!pricesSupplierId} onOpenChange={() => setPricesSupplierId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Prix fournisseur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {(filteredPrices || []).map(sp => (
              <div key={sp.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{sp.products?.name}</p>
                  <Badge variant="secondary" className="text-[10px]">{sp.products?.type}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">{Number(sp.cost_price)}€</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePrice.mutateAsync(sp.id).then(() => toast.success("Supprimé"))}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-4 space-y-3">
              <Label>Ajouter un prix produit</Label>
              <div className="grid gap-2 grid-cols-2">
                <Select value={newPriceProductId} onValueChange={setNewPriceProductId}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Produit" /></SelectTrigger>
                  <SelectContent>
                    {(siteProducts || []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Prix fournisseur (€)" value={newPriceCost || ""} onChange={e => setNewPriceCost(Number(e.target.value))} />
              </div>
              <Button size="sm" onClick={handleAddPrice} disabled={!newPriceProductId || newPriceCost <= 0}>Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={showExpense} onOpenChange={setShowExpense}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Libellé *</Label><Input value={expForm.label} onChange={e => setExpForm(f => ({ ...f, label: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Montant (€) *</Label><Input type="number" value={expForm.amount || ""} onChange={e => setExpForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={expForm.expense_date} onChange={e => setExpForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select value={expForm.supplier_id} onValueChange={v => setExpForm(f => ({ ...f, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  {(suppliers || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produit</Label>
              <Select value={expForm.product_id} onValueChange={v => setExpForm(f => ({ ...f, product_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  {(siteProducts || []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleAddExpense} className="w-full" disabled={!expForm.label || expForm.amount <= 0}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
