import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Globe,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  X,
  Loader2,
  Mail,
  Phone,
  Building2,
  FileText,
  Calendar,
  CreditCard,
  Pencil,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getMyRequests,
  cancelRequest,
  updateRequest,
  StudioRequest,
  UpdateRequestData,
} from "@/services/studioDomainService";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState<StudioRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Modal de détail / vue
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<StudioRequest | null>(null);

  // Modal de confirmation de suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState<StudioRequest | null>(null);

  // Modal d'édition
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<StudioRequest | null>(null);
  const [editForm, setEditForm] = useState<UpdateRequestData>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await getMyRequests();
      if (response.success && response.data) {
        // Exclure les demandes annulées (inutiles pour l'utilisateur)
        const data = (response.data as unknown as StudioRequest[]).filter((r) => r.status !== "cancelled");
        setRequests(data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteModal = (request: StudioRequest) => {
    setDeletingRequest(request);
    setDeleteModalOpen(true);
  };

  const handleCancel = async () => {
    if (!deletingRequest) return;
    const id = deletingRequest.id;
    setCancellingId(id);
    try {
      const response = await cancelRequest(id);
      if (response.success) {
        // Supprimer de la liste (annulé = terminé pour l'utilisateur)
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setDeleteModalOpen(false);
        if (viewingRequest?.id === id) setViewModalOpen(false);
        toast({ title: "Demande supprimée", description: "Votre demande a été supprimée." });
      } else {
        toast({ title: "Erreur", description: response.error || "Impossible de supprimer", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCancellingId(null);
      setDeletingRequest(null);
    }
  };

  const openEditModal = (request: StudioRequest) => {
    setEditingRequest(request);
    setEditForm({
      client_name:  request.client_name,
      client_email: request.client_email,
      client_phone: request.client_phone  || "",
      company_name: request.company_name  || "",
      description:  request.description   || "",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;
    setIsSaving(true);
    try {
      const response = await updateRequest(editingRequest.id, editForm);
      if (response.success && response.data) {
        setRequests((prev) => prev.map((r) => (r.id === editingRequest.id ? { ...r, ...response.data } : r)));
        setEditModalOpen(false);
        toast({ title: "Mis à jour", description: "Vos informations ont été enregistrées." });
      } else {
        toast({ title: "Erreur", description: response.error || "Impossible de mettre à jour", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: StudioRequest["status"]) => {
    switch (status) {
      case "active":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/20 text-success text-xs font-medium"><CheckCircle className="h-3 w-3" />Actif</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-medium"><Clock className="h-3 w-3" />En attente</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-600 text-xs font-medium"><Loader2 className="h-3 w-3" />En cours</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium"><XCircle className="h-3 w-3" />Refusé</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium"><XCircle className="h-3 w-3" />Annulé</span>;
    }
  };

  const getPaymentBadge = (status: StudioRequest["purchase_status"]) => {
    if (!status) return null;
    switch (status) {
      case "awaiting_payment":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">Non payé</span>;
      case "payment_submitted":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">Preuve soumise</span>;
      case "confirmed":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">Payé ✓</span>;
      default:
        return null;
    }
  };

  const stats = {
    active:  requests.filter((r) => r.status === "active").length,
    pending: requests.filter((r) => r.status === "pending" || r.status === "in_progress").length,
    total:   requests.length,
  };

  return (
    <>
      {/* Header */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">Mon espace client</h1>
              <p className="text-muted-foreground mt-2">Gérez vos noms de domaine</p>
            </div>
            <Link to="/studio-domaine/search">
              <Button variant="default" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle demande
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-6 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 max-w-lg">
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <div className="text-2xl font-bold text-success">{stats.active}</div>
              <div className="text-xs text-muted-foreground mt-1">Domaines actifs</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
              <div className="text-xs text-muted-foreground mt-1">En attente</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">Total demandes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Requests list */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <Globe className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Aucune demande</h2>
              <p className="text-muted-foreground">Commencez par rechercher un nom de domaine.</p>
              <Link to="/studio-domaine/search">
                <Button>Rechercher un domaine</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="p-5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Icône */}
                  <div className="p-3 rounded-xl bg-muted/50 flex-shrink-0">
                    <Globe className="h-6 w-6 text-blue-500" />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{request.domain}</span>
                      {getStatusBadge(request.status)}
                      {getPaymentBadge(request.purchase_status)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {request.client_name} · {new Date(request.created_at).toLocaleDateString("fr-FR")}
                    </div>
                    {request.rejection_reason && (
                      <div className="mt-2 text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg inline-block">
                        Rejeté : {request.rejection_reason}
                      </div>
                    )}
                    {request.status === "active" && request.activated_at && (
                      <div className="mt-1 text-xs text-success">
                        Activé le {new Date(request.activated_at).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {/* Bouton payer / voir facture */}
                    {request.purchase_id && request.purchase_status === "awaiting_payment" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => navigate(`/purchases/invoice/${request.purchase_id}`)}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Payer
                      </Button>
                    )}
                    {request.purchase_id && request.purchase_status !== "awaiting_payment" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-400 text-purple-600 hover:bg-purple-50"
                        onClick={() => navigate(`/purchases/invoice/${request.purchase_id}`)}
                        title="Voir la facture"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Éditer (uniquement pending) */}
                    {request.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-400 text-blue-600 hover:bg-blue-50"
                        onClick={() => openEditModal(request)}
                        title="Modifier mes informations"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Voir détails */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setViewingRequest(request); setViewModalOpen(true); }}
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* Supprimer (uniquement pending) */}
                    {request.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteModal(request)}
                        title="Supprimer la demande"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* View Modal */}
      {viewModalOpen && viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Globe className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">{viewingRequest.domain}</h3>
                {getStatusBadge(viewingRequest.status)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div><div className="text-xs text-muted-foreground">Référence</div><div className="font-medium">#STUDIO-{viewingRequest.id}</div></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div><div className="text-xs text-muted-foreground">Email</div><div className="font-medium">{viewingRequest.client_email}</div></div>
              </div>
              {viewingRequest.client_phone && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div><div className="text-xs text-muted-foreground">Téléphone</div><div className="font-medium">{viewingRequest.client_phone}</div></div>
                </div>
              )}
              {viewingRequest.company_name && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div><div className="text-xs text-muted-foreground">Entreprise</div><div className="font-medium">{viewingRequest.company_name}</div></div>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div><div className="text-xs text-muted-foreground">Date de demande</div><div className="font-medium">{new Date(viewingRequest.created_at).toLocaleString("fr-FR")}</div></div>
              </div>
              {viewingRequest.activated_at && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <div><div className="text-xs text-success/70">Date d'activation</div><div className="font-medium text-success">{new Date(viewingRequest.activated_at).toLocaleString("fr-FR")}</div></div>
                </div>
              )}
              {/* Paiement */}
              {viewingRequest.purchase_id && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Paiement</div>
                      <div className="mt-0.5">{getPaymentBadge(viewingRequest.purchase_status)}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => { setViewModalOpen(false); navigate(`/purchases/invoice/${viewingRequest.purchase_id}`); }}
                  >
                    Voir facture
                  </Button>
                </div>
              )}
              {viewingRequest.description && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Message</div>
                  <div>{viewingRequest.description}</div>
                </div>
              )}
              {viewingRequest.rejection_reason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-xs text-destructive mb-1 font-medium">Raison du rejet</div>
                  <div>{viewingRequest.rejection_reason}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 flex-wrap">
              {viewingRequest.status === "pending" && (
                <>
                  <Button size="sm" variant="outline" className="border-blue-400 text-blue-600" onClick={() => { setViewModalOpen(false); openEditModal(viewingRequest); }}>
                    <Pencil className="h-4 w-4 mr-1" />Modifier
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setViewModalOpen(false); openDeleteModal(viewingRequest); }}>
                    <X className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setViewModalOpen(false)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deletingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-destructive/10 flex-shrink-0">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Supprimer la demande ?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 text-sm">
              <span className="font-medium">{deletingRequest.domain}</span>
              <span className="text-muted-foreground ml-2">· {deletingRequest.client_name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              La demande sera définitivement supprimée. Vous pourrez en soumettre une nouvelle si besoin.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setDeleteModalOpen(false); setDeletingRequest(null); }}
                disabled={cancellingId === deletingRequest.id}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancellingId === deletingRequest.id}
              >
                {cancellingId === deletingRequest.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Modifier la demande</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Domaine : <strong>{editingRequest.domain}</strong> (non modifiable)
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom complet *</label>
                  <Input
                    value={editForm.client_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Entreprise</label>
                  <Input
                    value={editForm.company_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={editForm.client_email || ""}
                    onChange={(e) => setEditForm({ ...editForm, client_email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <Input
                    type="tel"
                    value={editForm.client_phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, client_phone: e.target.value })}
                    placeholder="Optionnel"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <Textarea
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
