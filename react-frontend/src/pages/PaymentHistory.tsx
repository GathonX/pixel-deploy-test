import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import {
  Receipt,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  FileText,
  Search,
  Filter,
  Calendar,
  Euro,
  User,
  Phone,
  Hash,
  Eye,
  RefreshCw,
  AlertCircle,
  Star,
  Shield,
  Zap,
  Settings,
} from "lucide-react";
import jsPDF from "jspdf";

interface PaymentHistoryItem {
  id: number;
  feature_name: string;
  full_name: string;
  amount_claimed: number;
  payment_method: string;
  email: string;
  contact_number: string;
  status: "pending" | "approved" | "rejected";
  admin_response?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  user_message?: string;
  feature: {
    id: number;
    key: string;
    name: string;
    price: number;
    category: string;
  };
}

const PaymentHistory: React.FC = () => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(
    []
  );
  const [filteredHistory, setFilteredHistory] = useState<PaymentHistoryItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentHistoryItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [paymentHistory, searchTerm, statusFilter]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get("/features/request-history");

      // Mapper les données pour correspondre à notre interface
      const mappedData = response.data.data.map((item: any) => ({
        id: item.id,
        feature_name: item.feature_name,
        full_name: item.full_name,
        amount_claimed: parseFloat(item.amount_claimed) || 0, // ✅ Conversion en nombre
        payment_method: item.payment_method,
        email: item.email,
        contact_number: item.contact_number,
        status: item.status,
        admin_response: item.admin_response,
        created_at: item.created_at,
        processed_at: item.processed_at,
        user_message: item.user_message,
        feature: {
          id: item.feature?.id || 0,
          key: item.feature?.key || "",
          name: item.feature_name,
          price:
            parseFloat(item.feature?.price) ||
            parseFloat(item.amount_claimed) ||
            0, // ✅ Conversion en nombre
          category: item.feature?.category || "standard",
        },
      }));

      setPaymentHistory(mappedData);
    } catch (error) {
      console.error("Erreur chargement historique:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des paiements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterHistory = () => {
    let filtered = [...paymentHistory];

    // Filtre par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.feature_name.toLowerCase().includes(term) ||
          item.full_name.toLowerCase().includes(term) ||
          item.payment_method.toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredHistory(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approuvé
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeté
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "premium":
        return <Star className="w-4 h-4 text-yellow-500" />;
      case "enterprise":
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <Zap className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      orange: "Orange Money",
      airtel_money: "Airtel Money",
      mvola: "Mvola",
      tap_tap_send: "Tap Tap Send",
      bank_transfer: "Virement bancaire",
      other: "Autre",
    };
    return methods[method] || method;
  };

  const generateInvoicePDF = (payment: PaymentHistoryItem) => {
    if (payment.status !== "approved") {
      toast({
        title: "Accès refusé",
        description:
          "Les factures ne sont disponibles que pour les paiements approuvés",
        variant: "destructive",
      });
      return;
    }

    // ========== FONCTION POUR NETTOYER LES CARACTÈRES ==========
    const cleanText = (text: string): string => {
      return text
        .normalize("NFD") // Décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
        .replace(/[^\x20-\x7E]/g, "") // Supprime tous les caractères non-ASCII
        .replace(/[àáâãäå]/g, "a")
        .replace(/[èéêë]/g, "e")
        .replace(/[ìíîï]/g, "i")
        .replace(/[òóôõö]/g, "o")
        .replace(/[ùúûü]/g, "u")
        .replace(/[ç]/g, "c")
        .replace(/[ñ]/g, "n")
        .replace(/[À-ÿ]/g, "") // Supprime les caractères accentués restants
        .trim();
    };

    try {
      const doc = new jsPDF();

      // ========== HEADER PIXELRISE ==========
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(37, 99, 235); // brand-blue
      doc.text("PIXEL", 20, 25);
      doc.setTextColor(245, 158, 11); // brand-yellow
      doc.text("RISE", 65, 25);

      // Ligne de séparation premium
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(2);
      doc.line(20, 30, 190, 30);

      // ========== TITRE FACTURE ==========
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // brand-black
      doc.text("FACTURE", 105, 45, { align: "center" });

      // ========== INFORMATIONS ENTREPRISE ==========
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("PixelRise SAS", 20, 60);
      doc.text("Innovation & Solutions Digitales", 20, 65);
      doc.text("marketing@pixel-rise.com", 20, 70);
      doc.text("+261 37 88 367 14", 20, 75);
      doc.text("Rue Reine Tsiomeko la Baterie", 20, 80);
      doc.text("Hell ville, Nosy Be", 20, 85);

      // ========== INFORMATIONS CLIENT ==========
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Facture a :", 130, 60);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(cleanText(payment.full_name), 130, 67);
      doc.text(cleanText(payment.email), 130, 72);
      doc.text(cleanText(payment.contact_number), 130, 77);

      // ========== DÉTAILS FACTURE ==========
      const invoiceNumber = `INV-${payment.id.toString().padStart(6, "0")}`;
      const invoiceDate = new Date(
        payment.processed_at || payment.created_at
      ).toLocaleDateString("fr-FR");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("N° Facture :", 20, 105);
      doc.text("Date :", 20, 112);
      doc.text("Methode :", 20, 119);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(invoiceNumber, 55, 105);
      doc.text(invoiceDate, 55, 112);
      doc.text(
        cleanText(getPaymentMethodLabel(payment.payment_method)),
        55,
        119
      );

      // ========== TABLEAU SERVICES ==========
      const tableY = 135;

      // En-têtes
      doc.setFillColor(249, 250, 251); // gray-50
      doc.rect(20, tableY, 170, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text("DESCRIPTION", 25, tableY + 7);
      doc.text("CATEGORIE", 100, tableY + 7);
      doc.text("MONTANT", 160, tableY + 7);

      // Ligne service
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Activation ${cleanText(payment.feature_name)}`,
        25,
        tableY + 20
      );
      doc.text(
        cleanText(payment.feature.category.toUpperCase()),
        100,
        tableY + 20
      );
      doc.text(
        `${parseFloat(payment.amount_claimed.toString()).toFixed(2)} EUR`,
        160,
        tableY + 20
      );

      // Bordures tableau
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.rect(20, tableY, 170, 10); // Header
      doc.rect(20, tableY + 10, 170, 15); // Content
      doc.line(95, tableY, 95, tableY + 25); // Séparateur vertical 1
      doc.line(155, tableY, 155, tableY + 25); // Séparateur vertical 2

      // ========== TOTAL ==========
      doc.setFillColor(37, 99, 235); // brand-blue
      doc.rect(130, tableY + 35, 60, 15, "F");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text("TOTAL", 135, tableY + 45);
      doc.text(
        `${parseFloat(payment.amount_claimed.toString()).toFixed(2)} EUR`,
        175,
        tableY + 45
      );

      // ========== NOTES ==========
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Paiement valide et fonctionnalite activee", 20, tableY + 65);
      doc.text(`Traitement : ${invoiceDate}`, 20, tableY + 72);

      if (payment.admin_response) {
        doc.text(
          `Note admin : ${cleanText(payment.admin_response)}`,
          20,
          tableY + 79
        );
      }

      // ========== FOOTER PREMIUM ==========
      doc.setDrawColor(245, 158, 11); // brand-yellow
      doc.setLineWidth(1);
      doc.line(20, 260, 190, 260);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Merci de votre confiance | PixelRise - Votre partenaire digital",
        105,
        270,
        { align: "center" }
      );
      doc.text(
        "Cette facture certifie l'activation de votre fonctionnalite premium",
        105,
        275,
        { align: "center" }
      );

      // ========== TÉLÉCHARGEMENT ==========
      doc.save(`facture-pixelrise-${invoiceNumber}.pdf`);

      toast({
        title: "✅ Facture générée",
        description: `Facture ${invoiceNumber} téléchargée avec succès`,
      });
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la facture",
        variant: "destructive",
      });
    }
  };

  const openDetailsModal = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const getStats = () => {
    const total = paymentHistory.length;
    const approved = paymentHistory.filter(
      (p) => p.status === "approved"
    ).length;
    const pending = paymentHistory.filter((p) => p.status === "pending").length;
    const totalAmount = paymentHistory
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + parseFloat(p.amount_claimed.toString()), 0);

    return { total, approved, pending, totalAmount };
  };

  const stats = getStats();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Chargement de votre historique...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ========== HEADER ========== */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-brand-blue to-purple-600 bg-clip-text text-transparent">
            <Receipt className="w-8 h-8 text-brand-blue" />
            Historique des Paiements
          </h1>
          <p className="text-slate-600 mt-2">
            Consultez vos demandes d'activation et téléchargez vos factures
          </p>
        </div>

        {/* ========== STATISTIQUES ========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Total Demandes
                  </p>
                  <p className="text-2xl font-bold text-brand-blue">
                    {stats.total}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">
                    Approuvées
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {stats.approved}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">
                    En Attente
                  </p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {stats.pending}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">
                    Total Payé
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    {stats.totalAmount.toFixed(2)}€
                  </p>
                </div>
                <Euro className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========== FILTRES ========== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres et Recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="Nom, fonctionnalité, transaction..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={loadPaymentHistory}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== TABLEAU HISTORIQUE ========== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Historique des Demandes ({filteredHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fonctionnalité</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(payment.feature.category)}
                            <div>
                              <div className="font-medium text-slate-900">
                                {payment.feature_name}
                              </div>
                              <div className="text-sm text-slate-500">
                                ID: {payment.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-brand-blue">
                            {parseFloat(
                              payment.amount_claimed.toString()
                            ).toFixed(2)}
                            €
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(payment.created_at).toLocaleDateString(
                                "fr-FR"
                              )}
                            </div>
                            <div className="text-slate-500 text-xs">
                              {new Date(payment.created_at).toLocaleTimeString(
                                "fr-FR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailsModal(payment)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {payment.status === "approved" && (
                              <Button
                                size="sm"
                                onClick={() => generateInvoicePDF(payment)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Facture
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  Aucun paiement trouvé
                </h3>
                <p className="text-slate-500">
                  {searchTerm || statusFilter !== "all"
                    ? "Aucun résultat pour vos critères de recherche"
                    : "Vous n'avez pas encore effectué de demande d'activation"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== MODAL DÉTAILS ========== */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Détails de la Demande #{selectedPayment?.id}
              </DialogTitle>
              <DialogDescription>
                Informations complètes de votre demande d'activation
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-6">
                {/* Statut */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <span className="font-medium">Statut actuel :</span>
                  {getStatusBadge(selectedPayment.status)}
                </div>

                {/* Informations fonctionnalité */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Fonctionnalité
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nom :</span>
                        <span className="font-medium">
                          {selectedPayment.feature_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Catégorie :</span>
                        <Badge variant="outline">
                          {selectedPayment.feature.category}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Prix officiel :</span>
                        <span className="font-medium">
                          {selectedPayment.feature.price}€
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Informations Client
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nom :</span>
                        <span className="font-medium">
                          {selectedPayment.full_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Email :</span>
                        <span className="font-medium">
                          {selectedPayment.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Téléphone :</span>
                        <span className="font-medium">
                          {selectedPayment.contact_number}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations paiement */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Détails du Paiement
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Montant payé :</span>
                      <span className="font-bold text-brand-blue">
                        {parseFloat(
                          selectedPayment.amount_claimed.toString()
                        ).toFixed(2)}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Méthode :</span>
                      <span className="font-medium">
                        {getPaymentMethodLabel(selectedPayment.payment_method)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date demande :</span>
                      <span className="font-medium">
                        {new Date(
                          selectedPayment.created_at
                        ).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Message utilisateur */}
                {selectedPayment.user_message && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Message
                    </h4>
                    <div className="bg-slate-50 p-3 rounded text-sm">
                      {selectedPayment.user_message || "Aucun message"}
                    </div>
                  </div>
                )}

                {/* Réponse admin */}
                {selectedPayment.admin_response && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Réponse Administrateur
                    </h4>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm">
                      {selectedPayment.admin_response}
                    </div>
                  </div>
                )}

                {/* Dates importantes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-sm text-slate-500">
                      Date de demande :
                    </span>
                    <div className="font-medium">
                      {new Date(selectedPayment.created_at).toLocaleDateString(
                        "fr-FR",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                  {selectedPayment.processed_at && (
                    <div>
                      <span className="text-sm text-slate-500">
                        Date de traitement :
                      </span>
                      <div className="font-medium">
                        {new Date(
                          selectedPayment.processed_at
                        ).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  {selectedPayment.status === "approved" && (
                    <Button
                      onClick={() => generateInvoicePDF(selectedPayment)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger la facture
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PaymentHistory;
