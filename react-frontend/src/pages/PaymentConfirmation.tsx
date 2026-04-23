import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { getDualPrice } from "@/utils/currency";
import {
  CheckCircle,
  Clock,
  CreditCard,
  MessageSquare,
  User,
  Phone,
  Hash,
  ShoppingCart,
  ArrowRight,
  Star,
  Shield,
  Mail,
  Calendar,
  Package,
  Tag,
} from "lucide-react";

interface PaymentConfirmation {
  transaction: {
    id: string;
    feature_name: string;
    full_name: string;
    amount_claimed: number;
    payment_method: string;
    email: string;
    contact_number: string;
    invoice_number?: string;
    status: string;
    created_at: string;
    billing_period?: 'monthly' | 'yearly';
    billing_period_label?: string;
    duration_label?: string;
    original_price?: number;
    discount_percentage?: number;
  };
}

interface AvailableFeature {
  id: number;
  key: string;
  name: string;
  description: string;
  price: string; // ✅ L'API retourne price comme string (ex: "5.99")
  category: string;
}

const PaymentConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(
    null
  );
  const [suggestedFeatures, setSuggestedFeatures] = useState<
    AvailableFeature[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const requestId = searchParams.get("request_id");
    if (requestId) {
      loadConfirmationData(requestId);
    } else {
      // Rediriger si pas de request_id
      navigate("/features");
    }
  }, [searchParams, navigate]);

  const loadConfirmationData = async (requestId: string) => {
    try {
      setLoading(true);

      console.log('🎯 [PaymentConfirmation] ========== CHARGEMENT DONNÉES ==========');
      console.log('🎯 [PaymentConfirmation] Request ID:', requestId);

      // Charger les détails de la confirmation et les fonctionnalités suggérées
      const [confirmationRes, featuresRes] = await Promise.all([
        // Simuler la récupération des détails de la demande
        api.get(`/features/request-history`),
        api.get("/features/available-for-purchase"),
      ]);

      console.log('📥 [PaymentConfirmation] Réponse request-history:', confirmationRes.data);
      console.log('📥 [PaymentConfirmation] Nombre de requêtes:', confirmationRes.data.data.length);

      // Trouver la demande correspondante (simulation)
      const requests = confirmationRes.data.data;
      const latestRequest = requests[0]; // Prendre la plus récente pour la demo

      console.log('📋 [PaymentConfirmation] ========== DERNIÈRE REQUÊTE ==========');
      console.log('📋 [PaymentConfirmation] Requête complète:', latestRequest);

      if (latestRequest) {
        console.log('💰 [PaymentConfirmation] Données de facturation reçues:');
        console.log('  - feature_name:', latestRequest.feature_name);
        console.log('  - amount_claimed:', latestRequest.amount_claimed);
        console.log('  - billing_period:', latestRequest.billing_period);
        console.log('  - billing_period_label:', latestRequest.billing_period_label);
        console.log('  - duration_label:', latestRequest.duration_label);
        console.log('  - original_price:', latestRequest.original_price);
        console.log('  - discount_percentage:', latestRequest.discount_percentage);
        console.log('  - invoice_number:', latestRequest.invoice_number);
        const confirmationData = {
          transaction: {
            id: `TXN${Date.now()}`,
            feature_name: latestRequest.feature_name,
            full_name: latestRequest.full_name,
            amount_claimed: latestRequest.amount_claimed,
            payment_method: latestRequest.payment_method,
            email: latestRequest.email,
            contact_number: latestRequest.contact_number,
            invoice_number: latestRequest.invoice_number,
            status: "pending",
            created_at: latestRequest.created_at,
            billing_period: latestRequest.billing_period,
            billing_period_label: latestRequest.billing_period_label,
            duration_label: latestRequest.duration_label,
            original_price: latestRequest.original_price,
            discount_percentage: latestRequest.discount_percentage,
          },
        };

        console.log('💾 [PaymentConfirmation] Données de confirmation créées:', confirmationData);
        setConfirmation(confirmationData);

        // ✅ Le backend retourne déjà les fonctionnalités disponibles (exclut activées + en attente)
        // Limiter aux 3 premières fonctionnalités suggérées
        setSuggestedFeatures(featuresRes.data.data.slice(0, 3));
        console.log('✅ [PaymentConfirmation] Initialisation terminée');
      } else {
        console.warn('⚠️ [PaymentConfirmation] Aucune requête trouvée');
        // Si pas de requête, afficher quand même les fonctionnalités
        setSuggestedFeatures(featuresRes.data.data.slice(0, 3));
      }
    } catch (error) {
      console.error('❌ [PaymentConfirmation] Erreur lors du chargement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de confirmation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "premium":
        return <Star className="w-4 h-4 text-yellow-500" />;
      case "enterprise":
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-blue-500" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "premium":
        return "default";
      case "enterprise":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!confirmation) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-slate-600">
              Confirmation introuvable
            </h2>
            <Button onClick={() => navigate("/features")} className="mt-4">
              Retour aux fonctionnalités
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header Success */}
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            Merci pour votre paiement !
          </h1>
          <p className="text-slate-600">
            Votre paiement a été traité avec succès. Un email de confirmation
            sera envoyé sous peu. Nous vérifierons votre paiement rapidement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Détails de la Transaction */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Détails de la Transaction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informations principales */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Fonctionnalité achetée</h3>
                  </div>
                  <p className="text-lg font-bold text-blue-700">
                    {confirmation.transaction.feature_name}
                  </p>
                </div>

                {/* Informations client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Nom complet</p>
                        <p className="font-semibold text-slate-900">
                          {confirmation.transaction.full_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                        <p className="font-medium text-slate-700 text-sm break-all">
                          {confirmation.transaction.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Contact</p>
                        <p className="font-medium text-slate-700">
                          {confirmation.transaction.contact_number}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Méthode de paiement</p>
                        <p className="font-semibold text-slate-900 capitalize">
                          {confirmation.transaction.payment_method}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Date de transaction</p>
                        <p className="font-medium text-slate-700">
                          {new Date(confirmation.transaction.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Hash className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">N° Transaction</p>
                        <p className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {confirmation.transaction.id}
                        </p>
                      </div>
                    </div>

                    {confirmation.transaction.invoice_number && (
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 uppercase tracking-wide">N° Facture</p>
                          <p className="font-mono text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 text-blue-700 font-semibold">
                            {confirmation.transaction.invoice_number}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Détails de facturation */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Détails de facturation
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Formule</p>
                      <Badge variant="outline" className="font-semibold">
                        {confirmation.transaction.billing_period_label || 'Mensuel'}
                      </Badge>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Durée</p>
                      <p className="font-semibold text-slate-900">
                        {confirmation.transaction.duration_label || '1 mois'}
                      </p>
                    </div>

                    {confirmation.transaction.original_price && confirmation.transaction.discount_percentage && confirmation.transaction.discount_percentage > 0 ? (
                      <>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs text-green-600 mb-1">Prix normal</p>
                          <p className="font-medium text-slate-500 line-through">
                            {confirmation.transaction.original_price}€
                          </p>
                          <p className="text-xs text-slate-400 line-through">
                            {getDualPrice(confirmation.transaction.original_price).ariary}
                          </p>
                        </div>

                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs text-green-600 mb-1">Réduction</p>
                          <p className="font-bold text-green-600">
                            -{confirmation.transaction.discount_percentage}%
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2"></div>
                    )}
                  </div>
                </div>

                {/* Montant et statut */}
                <div className="border-t pt-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Montant total payé</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {confirmation.transaction.amount_claimed}€
                      </p>
                      <p className="text-lg text-slate-600 mt-1">
                        {getDualPrice(confirmation.transaction.amount_claimed).ariary}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-sm text-slate-500 mb-2">Statut de la transaction</p>
                      <Badge className="bg-yellow-100 text-yellow-800 px-4 py-2">
                        <Clock className="w-4 h-4 mr-2" />
                        En traitement
                      </Badge>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Support */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Besoin d'assistance ?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Si vous avez des questions concernant votre paiement,
                    n'hésitez pas à nous contacter.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/dashboard/tickets")}
                    >
                      Créer un ticket
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("https://pixel-rise.com/contact.html", "_blank")}
                    >
                      Nous contacter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions */}
          <div className="space-y-6">
            {/* Fonctionnalité achetée */}
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-800 text-lg">
                  Paiement via {confirmation.transaction.payment_method}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium text-green-800">
                    {confirmation.transaction.feature_name}
                  </p>
                  <p className="text-sm text-green-700">
                    Montant: {confirmation.transaction.amount_claimed}€
                  </p>
                  <div className="pt-2">
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirmation envoyée
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Autres fonctionnalités */}
            {suggestedFeatures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Autres Fonctionnalités
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Complétez votre expérience avec ces fonctionnalités
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestedFeatures.map((feature) => (
                    <div
                      key={String(feature.id)}
                      className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(feature.category)}
                          <h4 className="font-medium text-sm">
                            {feature.name}
                          </h4>
                        </div>
                        <Badge
                          variant={
                            getCategoryBadge(feature.category) as
                              | "default"
                              | "destructive"
                              | "secondary"
                          }
                        >
                          {feature.category}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                        {feature.description}
                      </p>

                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-600">
                            {feature.price}€
                          </span>
                          <span className="text-xs text-slate-500">
                            {getDualPrice(parseFloat(feature.price)).ariary}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            console.log('🛒 [PaymentConfirmation] Achat de la fonctionnalité:', feature.id);
                            try {
                              // Générer une nouvelle facture pour cette fonctionnalité
                              const response = await api.post(`/features/invoices/generate-for-feature/${feature.id}`, {
                                billing_period: 'monthly'
                              });
                              
                              if (response.data.success) {
                                const newInvoiceId = response.data.data.invoice.id;
                                console.log('✅ [PaymentConfirmation] Nouvelle facture générée:', newInvoiceId);
                                
                                // Naviguer vers la nouvelle facture
                                navigate(`/features/invoice/${newInvoiceId}`);
                              }
                            } catch (error: any) {
                              console.error('❌ [PaymentConfirmation] Erreur génération facture:', error);
                              toast({
                                title: "Erreur",
                                description: error.response?.data?.message || "Impossible de générer la facture",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="flex items-center gap-1"
                        >
                          Acheter
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button onClick={() => navigate("/features")} className="w-full">
                Voir toutes les fonctionnalités
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/workspace")}
                className="w-full"
              >
                Retour au dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentConfirmation;
