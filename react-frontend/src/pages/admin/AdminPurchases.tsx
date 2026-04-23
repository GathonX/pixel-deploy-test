import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  RefreshCw,
  Eye,
  Crown,
  CreditCard,
  FileText,
  ExternalLink,
  ImageIcon,
  Download,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Hash,
  Banknote,
  MessageSquare,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getAdminPurchases,
  confirmPurchase,
} from "@/components/payments/src/services/purchaseService";
import { PurchaseOrder } from "@/components/payments/src/types/purchase";

const AdminPurchases = () => {
  const { toast } = useToast();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState<PurchaseOrder | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = statusFilter !== "all" ? statusFilter : undefined;
      const data = await getAdminPurchases(statusParam);
      setOrders(data);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleApprove = async (order: PurchaseOrder) => {
    setProcessingId(order.id);
    try {
      await confirmPurchase({
        orderId: order.id,
        approved: true,
        adminNote: undefined,
      });
      toast({
        title: "Commande approuvée",
        description: `La commande de ${order.userName || order.userId} a été approuvée.`,
      });
      fetchOrders();
    } catch (error) {
      console.error("Error approving order:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver la commande",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingOrder) return;
    setProcessingId(rejectingOrder.id);
    try {
      await confirmPurchase({
        orderId: rejectingOrder.id,
        approved: false,
        adminNote: adminNote || undefined,
      });
      toast({
        title: "Commande rejetée",
        description: `La commande de ${rejectingOrder.userName || rejectingOrder.userId} a été rejetée.`,
      });
      setRejectModalOpen(false);
      setRejectingOrder(null);
      setAdminNote("");
      fetchOrders();
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la commande",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "awaiting_payment":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3 w-3" />
            En attente de paiement
          </span>
        );
      case "payment_submitted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium dark:bg-blue-900/30 dark:text-blue-400">
            <CreditCard className="h-3 w-3" />
            Paiement soumis
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Confirmée
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Rejetée
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium dark:bg-gray-900/30 dark:text-gray-400">
            <XCircle className="h-3 w-3" />
            Annulée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const stats = {
    total: orders.length,
    awaitingPayment: orders.filter((o) => o.status === "awaiting_payment").length,
    paymentSubmitted: orders.filter((o) => o.status === "payment_submitted").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    rejected: orders.filter((o) => o.status === "rejected").length,
  };

  const filteredOrders = orders.filter((order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (order.userName || "").toLowerCase().includes(searchLower) ||
      (order.userEmail || "").toLowerCase().includes(searchLower) ||
      (order.siteName || "").toLowerCase().includes(searchLower) ||
      order.items.some((item) => item.name.toLowerCase().includes(searchLower)) ||
      order.id.toLowerCase().includes(searchLower);
    return matchesSearch;
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPrice = (eur: number, ariary: number) =>
    `${eur.toFixed(2)}€ / ${ariary.toLocaleString("fr-FR")} Ar`;

  const getProofFullUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    const base = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
    return base + url;
  };

  const isImageUrl = (url: string) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <AdminLayout>
      {/* Header */}
      <section className="py-8 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent">
              <ShoppingCart className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Site Builder - Administration</h1>
              <p className="text-primary-foreground/70">
                Gérez les achats de sites, templates et sections premium
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-6 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {isLoading ? (
              <div className="col-span-5 flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <ShoppingCart className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total commandes</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.awaitingPayment}</div>
                    <div className="text-xs text-muted-foreground">En attente</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.paymentSubmitted}</div>
                    <div className="text-xs text-muted-foreground">Paiement soumis</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.confirmed}</div>
                    <div className="text-xs text-muted-foreground">Confirmées</div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.rejected}</div>
                    <div className="text-xs text-muted-foreground">Rejetées</div>
                  </div>
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
                  placeholder="Rechercher par client, email, site..."
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
                <option value="awaiting_payment">En attente de paiement</option>
                <option value="payment_submitted">Paiement soumis</option>
                <option value="confirmed">Confirmées</option>
                <option value="rejected">Rejetées</option>
                <option value="cancelled">Annulées</option>
              </select>
              <Button variant="outline" onClick={fetchOrders}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>

            {/* Orders Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucune commande trouvée
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Commande</th>
                        <th className="text-left p-4 font-medium">Client</th>
                        <th className="text-left p-4 font-medium">Article</th>
                        <th className="text-left p-4 font-medium">Montant</th>
                        <th className="text-left p-4 font-medium">Statut</th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-t border-border hover:bg-muted/30"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-amber-500" />
                              <div>
                                <span className="font-mono text-xs text-muted-foreground">
                                  #{order.id.slice(0, 8)}
                                </span>
                                {order.siteName && (
                                  <div className="text-sm font-medium">{order.siteName}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium">{order.userName || "-"}</div>
                              <div className="text-xs text-muted-foreground">
                                {order.userEmail || "-"}
                              </div>
                              {order.userPhone && (
                                <div className="text-xs text-muted-foreground">
                                  {order.userPhone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {order.items[0]?.thumbnail && (
                                <img
                                  src={order.items[0].thumbnail}
                                  alt=""
                                  className="w-10 h-8 rounded object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium text-sm">
                                  {order.items[0]?.name || "-"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {order.items[0]?.source || "-"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-sm">
                              {order.totalEur.toFixed(2)}€
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.totalAriary.toLocaleString("fr-FR")} Ar
                            </div>
                          </td>
                          <td className="p-4">{getStatusBadge(order.status)}</td>
                          <td className="p-4 text-muted-foreground text-sm">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              {order.status === "payment_submitted" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(order)}
                                    disabled={processingId === order.id}
                                  >
                                    {processingId === order.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approuver
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setRejectingOrder(order);
                                      setRejectModalOpen(true);
                                    }}
                                    disabled={processingId === order.id}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rejeter
                                  </Button>
                                </>
                              )}
                              {order.status === "awaiting_payment" && (
                                <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium">
                                  <Clock className="h-3.5 w-3.5" />
                                  En attente du client
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Détails
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      {detailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-3xl w-full space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Commande #{selectedOrder.id.slice(0, 8)}
              </h3>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedOrder.status)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDetailOpen(false); setSelectedOrder(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Infos commande */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Client (compte)</div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedOrder.userName || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {selectedOrder.userEmail || "-"}
                </div>
                {selectedOrder.userPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {selectedOrder.userPhone}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Montant</div>
                <div className="text-xl font-bold">{selectedOrder.totalEur.toFixed(2)}€</div>
                <div className="text-sm text-muted-foreground">
                  {selectedOrder.totalAriary.toLocaleString("fr-FR")} Ar
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Date</div>
                <div className="text-sm">{formatDate(selectedOrder.createdAt)}</div>
                {selectedOrder.siteName && (
                  <>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-2">Nom du site</div>
                    <div className="text-sm font-medium">{selectedOrder.siteName}</div>
                  </>
                )}
              </div>
            </div>

            {/* Article commandé */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Article commandé</h4>
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt="" className="w-16 h-12 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{item.description}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{item.priceEur.toFixed(2)}€</div>
                    <div className="text-xs text-muted-foreground">{item.priceAriary.toLocaleString("fr-FR")} Ar</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Informations de paiement du formulaire */}
            {(selectedOrder.fullName || selectedOrder.paymentMethod) && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Informations de paiement (envoyées par le client)
                </h4>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {selectedOrder.fullName && (
                        <tr className="border-b border-border">
                          <td className="p-3 bg-muted/30 font-medium w-1/3 flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            Nom complet
                          </td>
                          <td className="p-3">{selectedOrder.fullName}</td>
                        </tr>
                      )}
                      {selectedOrder.email && (
                        <tr className="border-b border-border">
                          <td className="p-3 bg-muted/30 font-medium flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            Email
                          </td>
                          <td className="p-3">{selectedOrder.email}</td>
                        </tr>
                      )}
                      {selectedOrder.contactNumber && (
                        <tr className="border-b border-border">
                          <td className="p-3 bg-muted/30 font-medium flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            Numéro de contact
                          </td>
                          <td className="p-3">{selectedOrder.contactNumber}</td>
                        </tr>
                      )}
                      {selectedOrder.paymentMethod && (
                        <tr className="border-b border-border">
                          <td className="p-3 bg-muted/30 font-medium flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            Méthode de paiement
                          </td>
                          <td className="p-3 capitalize">{selectedOrder.paymentMethod}</td>
                        </tr>
                      )}
                      {selectedOrder.amountClaimed && (
                        <tr className="border-b border-border">
                          <td className="p-3 bg-muted/30 font-medium flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-muted-foreground" />
                            Montant déclaré
                          </td>
                          <td className="p-3 font-semibold">{selectedOrder.amountClaimed}</td>
                        </tr>
                      )}
                      {selectedOrder.userMessage && (
                        <tr>
                          <td className="p-3 bg-muted/30 font-medium flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            Message
                          </td>
                          <td className="p-3">{selectedOrder.userMessage}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Preuves de paiement - Images inline */}
            {selectedOrder.paymentProofs && selectedOrder.paymentProofs.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Preuves de paiement ({selectedOrder.paymentProofs.length} fichier{selectedOrder.paymentProofs.length > 1 ? "s" : ""})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedOrder.paymentProofs.map((proof, idx) => {
                    const fullUrl = getProofFullUrl(proof);
                    const isImage = isImageUrl(proof);
                    return (
                      <div key={idx} className="rounded-xl border border-border overflow-hidden bg-muted/20">
                        {isImage ? (
                          <div
                            className="cursor-pointer group relative"
                            onClick={() => setPreviewImage(fullUrl)}
                          >
                            <img
                              src={fullUrl}
                              alt={`Preuve ${idx + 1}`}
                              className="w-full h-48 object-contain bg-white"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                              }}
                            />
                            <div className="hidden items-center justify-center h-48 bg-muted">
                              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-48 flex items-center justify-center bg-muted/50">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Preuve {idx + 1}</span>
                          <div className="flex gap-1">
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ouvrir
                            </a>
                            <a
                              href={fullUrl}
                              download
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* paymentProofUrl fallback */}
                {!selectedOrder.paymentProofs.length && selectedOrder.paymentProofUrl && (
                  <a
                    href={getProofFullUrl(selectedOrder.paymentProofUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 text-sm"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                    Voir la preuve de paiement
                  </a>
                )}
              </div>
            )}

            {/* Note admin existante */}
            {selectedOrder.adminNote && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Note admin :</span>
                <p className="text-sm mt-1">{selectedOrder.adminNote}</p>
              </div>
            )}

            {/* Status info pour awaiting_payment */}
            {selectedOrder.status === "awaiting_payment" && (
              <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 space-y-2">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">En attente de paiement</span>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  Le client n'a pas encore soumis sa preuve de paiement. Les boutons Approuver / Rejeter apparaîtront une fois que le client aura envoyé ses preuves de paiement.
                </p>
              </div>
            )}

            {/* Status info pour confirmed */}
            {selectedOrder.status === "confirmed" && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">Commande approuvée</span>
                </div>
                {selectedOrder.confirmedAt && (
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Confirmée le {formatDate(selectedOrder.confirmedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-between border-t border-border pt-4">
              <div className="flex gap-2">
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setDetailOpen(false); setSelectedOrder(null); }}
                >
                  Fermer
                </Button>
                {selectedOrder.status === "payment_submitted" && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleApprove(selectedOrder);
                        setDetailOpen(false);
                        setSelectedOrder(null);
                      }}
                      disabled={processingId === selectedOrder.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDetailOpen(false);
                        setSelectedOrder(null);
                        setRejectingOrder(selectedOrder);
                        setRejectModalOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal - Full screen */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={previewImage}
            alt="Aperçu preuve de paiement"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold">Rejeter la commande</h3>
            <p className="text-sm text-muted-foreground">
              Vous êtes sur le point de rejeter la commande{" "}
              <strong>#{rejectingOrder.id.slice(0, 8)}</strong> de{" "}
              <strong>{rejectingOrder.userName || rejectingOrder.userId}</strong>.
            </p>
            <div>
              <label className="block text-sm font-medium mb-2">
                Note admin (optionnel)
              </label>
              <Input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Ex: Preuve de paiement invalide..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectingOrder(null);
                  setAdminNote("");
                }}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processingId === rejectingOrder.id}
              >
                {processingId === rejectingOrder.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPurchases;
