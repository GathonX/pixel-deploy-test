import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Power,
  Eye,
  Settings,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  X,
  Phone,
  Mail,
  Building2,
  FileText,
  Calendar,
  CreditCard,
  ExternalLink,
  AlertTriangle,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetRequests,
  adminGetStats,
  adminMarkInProgress,
  adminActivateRequest,
  adminRejectRequest,
  adminDeleteRequest,
  StudioRequest,
} from "@/services/studioDomainService";

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  active: number;
  rejected: number;
  cancelled: number;
}

// Badge statut paiement
const getPaymentBadge = (status: StudioRequest["purchase_status"]) => {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  switch (status) {
    case "awaiting_payment":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Non payé</span>;
    case "payment_submitted":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Preuve envoyée</span>;
    case "confirmed":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Payé ✓</span>;
    case "rejected":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">Paiement rejeté</span>;
    default:
      return <span className="text-xs text-muted-foreground">{status}</span>;
  }
};

const AdminStudioDomaine = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<StudioRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<StudioRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [activatingRequest, setActivatingRequest] = useState<StudioRequest | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState<StudioRequest | null>(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<StudioRequest | null>(null);

  const fetchRequests = useCallback(async (page: number) => {
    setIsLoadingRequests(true);
    try {
      const params: { status?: string; search?: string; page?: number; per_page?: number } = { page, per_page: 20 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await adminGetRequests(params);
      if (response.success && response.data) {
        setRequests(response.data.data);
        setCurrentPage(response.data.current_page);
        setLastPage(response.data.last_page);
        setTotal(response.data.total);
      } else {
        toast({ title: "Erreur", description: response.error || "Impossible de charger les demandes", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [statusFilter, searchTerm, toast]);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await adminGetStats();
      if (response.success && response.data) setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRequests(1);
  }, [fetchStats, fetchRequests]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRequests(page);
  };

  const handleMarkInProgress = async (request: StudioRequest) => {
    setProcessingId(request.id);
    try {
      const response = await adminMarkInProgress(request.id);
      if (response.success) {
        toast({ title: "En cours", description: `La demande ${request.domain} est marquée en cours.` });
        fetchRequests(currentPage);
        fetchStats();
      } else {
        toast({ title: "Erreur", description: response.error || "Impossible de changer le statut", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const openActivateModal = (request: StudioRequest) => {
    setActivatingRequest(request);
    setActivateModalOpen(true);
  };

  const handleActivate = async () => {
    if (!activatingRequest) return;
    setProcessingId(activatingRequest.id);
    try {
      const response = await adminActivateRequest(activatingRequest.id);
      if (response.success) {
        toast({ title: "Demande activée", description: `Le domaine ${activatingRequest.domain} a été activé.` });
        setActivateModalOpen(false);
        setActivatingRequest(null);
        setViewModalOpen(false);
        fetchRequests(currentPage);
        fetchStats();
      } else {
        toast({ title: "Erreur", description: response.error || "Impossible d'activer", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    setProcessingId(rejectingRequest.id);
    try {
      const response = await adminRejectRequest(rejectingRequest.id, rejectReason);
      if (response.success) {
        toast({ title: "Demande rejetée", description: `Demande pour ${rejectingRequest.domain} rejetée.` });
        setRejectModalOpen(false);
        setRejectingRequest(null);
        setRejectReason("");
        fetchRequests(currentPage);
        fetchStats();
      } else {
        toast({ title: "Erreur", description: response.error || "Impossible de rejeter", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const openDeleteModal = (request: StudioRequest) => {
    setDeletingRequest(request);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRequest) return;
    setProcessingId(deletingRequest.id);
    try {
      const response = await adminDeleteRequest(deletingRequest.id);
      if (response.success) {
        toast({ title: "Demande supprimée", description: `La demande pour ${deletingRequest.domain} a été supprimée.` });
        setDeleteModalOpen(false);
        setDeletingRequest(null);
        setViewModalOpen(false);
        fetchRequests(currentPage);
        fetchStats();
      } else {
        toast({ title: "Erreur", description: response.error || "Impossible de supprimer", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: StudioRequest["status"]) => {
    switch (status) {
      case "active":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3" />Actif</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-3 w-3" />En attente</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium dark:bg-blue-900/30 dark:text-blue-400"><Loader2 className="h-3 w-3" />En cours</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3" />Refusé</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium dark:bg-gray-900/30 dark:text-gray-400"><XCircle className="h-3 w-3" />Annulé</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <section className="py-8 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent">
              <Settings className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Studio Domaine - Administration</h1>
              <p className="text-primary-foreground/70">Gérez les demandes de noms de domaine</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-6 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {isLoadingStats ? (
              <div className="col-span-5 flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <Globe className="h-8 w-8 text-blue-500" />
                  <div><div className="text-2xl font-bold">{stats?.total || 0}</div><div className="text-xs text-muted-foreground">Total</div></div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div><div className="text-2xl font-bold">{stats?.pending || 0}</div><div className="text-xs text-muted-foreground">En attente</div></div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <Loader2 className="h-8 w-8 text-blue-400" />
                  <div><div className="text-2xl font-bold">{stats?.in_progress || 0}</div><div className="text-xs text-muted-foreground">En cours</div></div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div><div className="text-2xl font-bold">{stats?.active || 0}</div><div className="text-xs text-muted-foreground">Actifs</div></div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div><div className="text-2xl font-bold">{stats?.rejected || 0}</div><div className="text-xs text-muted-foreground">Rejetés</div></div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par domaine, client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-input bg-background"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="in_progress">En cours</option>
                <option value="active">Actifs</option>
                <option value="rejected">Refusés</option>
                <option value="cancelled">Annulés</option>
              </select>
              <Button variant="outline" onClick={() => fetchRequests(currentPage)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {isLoadingRequests ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Aucune demande trouvée</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Domaine</th>
                        <th className="text-left p-4 font-medium">Client</th>
                        <th className="text-left p-4 font-medium">Statut</th>
                        <th className="text-left p-4 font-medium">Paiement</th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id} className="border-t border-border hover:bg-muted/30">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <span className="font-medium">{request.domain}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium">{request.client_name}</div>
                            <div className="text-xs text-muted-foreground">{request.client_email}</div>
                            {request.company_name && <div className="text-xs text-muted-foreground">{request.company_name}</div>}
                          </td>
                          <td className="p-4">{getStatusBadge(request.status)}</td>
                          <td className="p-4">
                            <div className="space-y-1">
                              {getPaymentBadge(request.purchase_status)}
                              {/* Alerte si preuve soumise — besoin de validation */}
                              {request.purchase_status === "payment_submitted" && (
                                <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                                  <AlertTriangle className="h-3 w-3" />
                                  À valider
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">
                            {new Date(request.created_at).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" disabled={processingId === request.id}>
                                    {processingId === request.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {/* Voir les détails */}
                                  <DropdownMenuItem onClick={() => { setViewingRequest(request); setViewModalOpen(true); }}>
                                    <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                                    Voir les détails
                                  </DropdownMenuItem>

                                  {/* Voir la facture */}
                                  {request.purchase_id && (
                                    <DropdownMenuItem onClick={() => navigate(`/purchases/invoice/${request.purchase_id}`)}>
                                      <CreditCard className="h-4 w-4 mr-2 text-purple-500" />
                                      Voir la facture
                                    </DropdownMenuItem>
                                  )}

                                  {/* Marquer en cours */}
                                  {request.status === "pending" && (
                                    <DropdownMenuItem onClick={() => handleMarkInProgress(request)}>
                                      <PlayCircle className="h-4 w-4 mr-2 text-blue-500" />
                                      Marquer en cours
                                    </DropdownMenuItem>
                                  )}

                                  {/* Activer */}
                                  {(request.status === "pending" || request.status === "in_progress") && (
                                    <DropdownMenuItem onClick={() => openActivateModal(request)}>
                                      <Power className="h-4 w-4 mr-2 text-green-600" />
                                      Activer
                                      {request.purchase_status !== "confirmed" && (
                                        <span className="ml-auto text-orange-500 text-xs">⚠️</span>
                                      )}
                                    </DropdownMenuItem>
                                  )}

                                  {/* Rejeter */}
                                  {(request.status === "pending" || request.status === "in_progress") && (
                                    <DropdownMenuItem onClick={() => { setRejectingRequest(request); setRejectModalOpen(true); }}>
                                      <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                                      Rejeter
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />

                                  {/* Supprimer */}
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={() => openDeleteModal(request)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-muted-foreground">
                  Total : <strong>{total}</strong> demandes — Page <strong>{currentPage}</strong> / <strong>{lastPage}</strong>
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || isLoadingRequests}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(lastPage, 7) }, (_, i) => {
                    let page: number;
                    if (lastPage <= 7) page = i + 1;
                    else if (currentPage <= 4) page = i + 1;
                    else if (currentPage >= lastPage - 3) page = lastPage - 6 + i;
                    else page = currentPage - 3 + i;
                    return (
                      <Button key={page} variant={page === currentPage ? "default" : "outline"} size="sm" onClick={() => handlePageChange(page)} disabled={isLoadingRequests} className="w-9">
                        {page}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= lastPage || isLoadingRequests}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
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
              <Button variant="ghost" size="sm" onClick={() => { setViewModalOpen(false); setViewingRequest(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div><div className="text-xs text-muted-foreground">Référence</div><div className="font-medium">#STUDIO-{viewingRequest.id}</div></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <span className="h-4 w-4 flex-shrink-0 text-center text-muted-foreground">👤</span>
                <div><div className="text-xs text-muted-foreground">Client</div><div className="font-medium">{viewingRequest.client_name}</div></div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div><div className="text-xs text-muted-foreground">Email</div><div className="font-medium">{viewingRequest.client_email}</div></div>
              </div>
              {viewingRequest.client_phone && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div><div className="text-xs text-muted-foreground">Téléphone</div><div className="font-medium">{viewingRequest.client_phone}</div></div>
                </div>
              )}
              {viewingRequest.company_name && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div><div className="text-xs text-muted-foreground">Entreprise</div><div className="font-medium">{viewingRequest.company_name}</div></div>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div><div className="text-xs text-muted-foreground">Date de demande</div><div className="font-medium">{new Date(viewingRequest.created_at).toLocaleString("fr-FR")}</div></div>
              </div>

              {/* Statut paiement dans le modal */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">Paiement</div>
                    <div className="mt-0.5">{getPaymentBadge(viewingRequest.purchase_status)}</div>
                  </div>
                </div>
                {viewingRequest.purchase_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-400 text-purple-600 hover:bg-purple-50 text-xs"
                    onClick={() => navigate(`/purchases/invoice/${viewingRequest.purchase_id}`)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Voir preuve
                  </Button>
                )}
              </div>

              {viewingRequest.purchase_status === "payment_submitted" && (
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-xs">
                  <strong>⚠️ Action requise :</strong> Le client a soumis une preuve de paiement. Vérifiez-la avant d'activer le domaine.
                </div>
              )}
              {viewingRequest.purchase_status === "awaiting_payment" && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
                  Le client n'a pas encore payé. Le domaine ne devrait pas être activé avant paiement confirmé.
                </div>
              )}

              {viewingRequest.description && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Message client</div>
                  <div>{viewingRequest.description}</div>
                </div>
              )}
              {viewingRequest.rejection_reason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-xs text-destructive mb-1 font-medium">Raison du rejet</div>
                  <div>{viewingRequest.rejection_reason}</div>
                </div>
              )}
              {viewingRequest.notes && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/10">
                  <div className="text-xs text-yellow-700 mb-1 font-medium">Notes admin</div>
                  <div>{viewingRequest.notes}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 flex-wrap">
              {(viewingRequest.status === "pending" || viewingRequest.status === "in_progress") && (
                <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setViewModalOpen(false); openActivateModal(viewingRequest); }}>
                    <Power className="h-4 w-4 mr-1" />Activer
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { setRejectingRequest(viewingRequest); setViewModalOpen(false); setRejectModalOpen(true); }}>
                    <XCircle className="h-4 w-4 mr-1" />Rejeter
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => { setViewModalOpen(false); openDeleteModal(viewingRequest); }}>
                <Trash2 className="h-4 w-4 mr-1" />Supprimer
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setViewModalOpen(false); setViewingRequest(null); }}>Fermer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Confirmation Modal */}
      {activateModalOpen && activatingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-green-100 flex-shrink-0">
                <Power className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Activer le domaine ?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 text-sm">
              <span className="font-medium">{activatingRequest.domain}</span>
              <span className="text-muted-foreground ml-2">· {activatingRequest.client_name}</span>
            </div>

            {activatingRequest.purchase_status !== "confirmed" && (
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span><strong>Attention :</strong> Le paiement n'est pas encore confirmé. Voulez-vous activer quand même ?</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Un email de confirmation sera envoyé au client. Le domaine sera marqué comme actif.
            </p>

            <div className="flex justify-end gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setActivateModalOpen(false); setActivatingRequest(null); }}
                disabled={processingId === activatingRequest.id}
              >
                Annuler
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleActivate}
                disabled={processingId === activatingRequest.id}
              >
                {processingId === activatingRequest.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Power className="h-4 w-4 mr-2" />
                )}
                Confirmer l'activation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deletingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-red-100 flex-shrink-0">
                <Trash2 className="h-6 w-6 text-red-600" />
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

            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>La demande sera définitivement supprimée de la base de données. Cette opération ne peut pas être annulée.</span>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setDeleteModalOpen(false); setDeletingRequest(null); }}
                disabled={processingId === deletingRequest.id}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={processingId === deletingRequest.id}
              >
                {processingId === deletingRequest.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Supprimer définitivement
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold">Rejeter la demande</h3>
            <p className="text-sm text-muted-foreground">
              Vous êtes sur le point de rejeter la demande pour <strong>{rejectingRequest.domain}</strong>.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">Raison du rejet (optionnel)</label>
              <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex: Domaine non disponible..." />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setRejectModalOpen(false); setRejectingRequest(null); setRejectReason(""); }}>Annuler</Button>
              <Button variant="destructive" onClick={handleReject} disabled={processingId === rejectingRequest.id}>
                {processingId === rejectingRequest.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminStudioDomaine;
