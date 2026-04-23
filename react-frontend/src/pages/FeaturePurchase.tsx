
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { Upload, CreditCard, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import PaymentInformation from "@/components/PaymentInformation";
import { formatPrice, getDualPrice } from "@/utils/currency";

interface Feature {
  id: number;
  key: string;
  name: string;
  description: string;
  price: number;
  category: string;
  pricing?: {
    monthly: {
      price: number;
      period: string;
      display: string;
    };
    yearly: {
      price: number;
      period: string;
      original_price: number;
      discount_percentage: number;
      savings: number;
      display: string;
      monthly_equivalent: number;
    };
  };
}

const FeaturePurchase: React.FC = () => {
  const { featureId } = useParams<{ featureId: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // Ajouter cette importation
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [invoiceData, setInvoiceData] = useState<{
    monthlyPrice?: number;
    yearlyPrice?: number;
  }>({});
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    invoice_number: "",
    amount_claimed: "",
    payment_method: "",
    user_message: "",
    payment_proofs: [] as File[],
    billing_period: "monthly",
    original_price: "",
    discount_percentage: "0",
  });

  useEffect(() => {
    if (featureId) {
      loadFeature();

      // Récupérer les paramètres de la facture depuis location state
      const locationState = location.state as {
        invoiceNumber?: string;
        amount?: number;
        currency?: string;
        pdfPath?: string;
        billingPeriod?: 'monthly' | 'yearly';
        monthlyPrice?: number;
        yearlyPrice?: number;
      } | null;

      if (locationState) {
        console.log('📥 [FeaturePurchase] ========== RÉCEPTION LOCATION STATE ==========');
        console.log('📥 [FeaturePurchase] Location state complet:', locationState);
        console.log('📥 [FeaturePurchase] invoiceNumber:', locationState.invoiceNumber);
        console.log('📥 [FeaturePurchase] amount:', locationState.amount);
        console.log('📥 [FeaturePurchase] currency:', locationState.currency);
        console.log('📥 [FeaturePurchase] billingPeriod:', locationState.billingPeriod);
        console.log('📥 [FeaturePurchase] monthlyPrice:', locationState.monthlyPrice);
        console.log('📥 [FeaturePurchase] yearlyPrice:', locationState.yearlyPrice);
        console.log('📥 [FeaturePurchase] ================================================');
        
        // 🔒 SÉCURITÉ : Vérifier que le numéro de facture existe
        if (!locationState.invoiceNumber || !locationState.amount) {
          console.error('❌ [FeaturePurchase] Numéro de facture ou montant manquant');
          toast({
            title: "Facture requise",
            description: "Vous devez d'abord générer une facture avant de procéder au paiement.",
            variant: "destructive",
          });
          navigate(`/features/invoice/${featureId}`);
          return;
        }
        
        // Synchroniser la période de facturation depuis la facture
        console.log('🔄 [FeaturePurchase] Synchronisation de la période:', locationState.billingPeriod);
        if (locationState.billingPeriod) {
          setBillingPeriod(locationState.billingPeriod);
          console.log('✅ [FeaturePurchase] billingPeriod défini à:', locationState.billingPeriod);
        }
        
        // Stocker les prix depuis la facture
        console.log('💰 [FeaturePurchase] Stockage des prix:');
        console.log('  - monthlyPrice:', locationState.monthlyPrice || 0);
        console.log('  - yearlyPrice:', locationState.yearlyPrice || 0);
        setInvoiceData({
          monthlyPrice: locationState.monthlyPrice || 0,
          yearlyPrice: locationState.yearlyPrice || 0,
        });
        
        console.log('📝 [FeaturePurchase] Mise à jour formData:');
        console.log('  - invoice_number:', locationState.invoiceNumber);
        console.log('  - amount_claimed:', locationState.amount?.toString());
        console.log('  - billing_period:', locationState.billingPeriod);
        
        setFormData((prev) => ({
          ...prev,
          invoice_number: locationState.invoiceNumber || '',
          amount_claimed: locationState.amount?.toString() || prev.amount_claimed,
          billing_period: locationState.billingPeriod || prev.billing_period,
        }));

        if (locationState.pdfPath) {
          console.log('📄 [FeaturePurchase] PDF de facture disponible:', locationState.pdfPath);
        }
        
        console.log('✅ [FeaturePurchase] Initialisation terminée');
      } else {
        // 🔒 SÉCURITÉ : Pas de location state = accès direct non autorisé
        console.error('❌ [FeaturePurchase] Accès direct sans facture détecté');
        toast({
          title: "Facture requise",
          description: "Vous devez d'abord générer une facture avant de procéder au paiement.",
          variant: "destructive",
        });
        navigate(`/features/invoice/${featureId}`);
        return;
      }
    }
  }, [featureId, location, navigate, toast]);

  const loadFeature = async () => {
    try {
      setLoading(true);
      console.log('🔍 [FeaturePurchase] Chargement de la fonctionnalité');
      console.log('🔍 [FeaturePurchase] featureId depuis URL:', featureId);
      console.log('🔍 [FeaturePurchase] featureId parsé:', parseInt(featureId!));
      
      // Si on a les données de l'invoice (location.state), utiliser ces données
      const locationState = location.state as {
        invoiceNumber?: string;
        amount?: number;
        currency?: string;
        pdfPath?: string;
        billingPeriod?: 'monthly' | 'yearly';
        monthlyPrice?: number;
        yearlyPrice?: number;
      } | null;
      
      // Essayer de charger depuis /features/available-for-purchase (toutes les fonctionnalités)
      const response = await api.get("/features/available-for-purchase");
      const features = response.data.data;
      
      console.log('🔍 [FeaturePurchase] Nombre de fonctionnalités disponibles:', features.length);
      console.log('🔍 [FeaturePurchase] IDs des fonctionnalités:', features.map((f: Feature) => f.id));
      
      let selectedFeature = features.find(
        (f: Feature) => f.id === parseInt(featureId!)
      );

      console.log('🔍 [FeaturePurchase] Fonctionnalité trouvée:', selectedFeature);

      // Si pas trouvée dans available-for-purchase, créer un objet feature minimal depuis location.state
      if (!selectedFeature && locationState) {
        console.log('⚠️ [FeaturePurchase] Fonctionnalité non trouvée dans API, utilisation des données de la facture');
        
        // Créer un objet feature minimal
        selectedFeature = {
          id: parseInt(featureId!),
          key: 'unknown',
          name: 'Fonctionnalité',
          description: 'Détails de la fonctionnalité',
          price: locationState.monthlyPrice || 0,
          category: 'premium',
          pricing: {
            monthly: {
              price: locationState.monthlyPrice || 0,
              period: 'monthly',
              display: `${locationState.monthlyPrice || 0}€/mois`
            },
            yearly: {
              price: locationState.yearlyPrice || 0,
              period: 'yearly',
              original_price: (locationState.monthlyPrice || 0) * 12,
              discount_percentage: 20,
              savings: ((locationState.monthlyPrice || 0) * 12) - (locationState.yearlyPrice || 0),
              display: `${locationState.yearlyPrice || 0}€/an`,
              monthly_equivalent: (locationState.yearlyPrice || 0) / 12
            }
          }
        } as Feature;
        
        console.log('✅ [FeaturePurchase] Feature créée depuis location.state:', selectedFeature);
      }

      if (selectedFeature) {
        console.log('✅ [FeaturePurchase] Fonctionnalité chargée avec succès:', selectedFeature.name);
        console.log('🔍 [FeaturePurchase] Pricing:', selectedFeature.pricing);
        console.log('🔍 [FeaturePurchase] Price:', selectedFeature.price);
        
        setFeature(selectedFeature);
        
        // ⚠️ NE PAS écraser amount_claimed et billing_period s'ils ont déjà été définis par location.state
        console.log('🔍 [FeaturePurchase] Vérification formData actuel avant écrasement:');
        console.log('  - formData.amount_claimed actuel:', formData.amount_claimed);
        console.log('  - formData.billing_period actuel:', formData.billing_period);
        console.log('  - locationState?.amount:', locationState?.amount);
        console.log('  - locationState?.billingPeriod:', locationState?.billingPeriod);
        
        // ✅ Utiliser les valeurs de location.state si disponibles, sinon utiliser les valeurs par défaut
        const finalAmount = locationState?.amount || selectedFeature.pricing?.monthly?.price || selectedFeature.price || 0;
        const finalBillingPeriod = locationState?.billingPeriod || "monthly";
        
        console.log('✅ [FeaturePurchase] Valeurs finales à utiliser:');
        console.log('  - finalAmount:', finalAmount);
        console.log('  - finalBillingPeriod:', finalBillingPeriod);
        
        // ✅ Ne mettre à jour que si formData n'a pas déjà été défini par location.state
        if (!formData.invoice_number) {
          console.log('📝 [FeaturePurchase] Initialisation formData (pas de location.state)');
          setFormData((prev) => ({
            ...prev,
            amount_claimed: finalAmount.toString(),
            billing_period: finalBillingPeriod,
            original_price: finalAmount.toString(),
            discount_percentage: "0",
          }));
        } else {
          console.log('✅ [FeaturePurchase] formData déjà initialisé par location.state, pas d\'écrasement');
        }
      } else {
        console.error('❌ [FeaturePurchase] Fonctionnalité introuvable !');
        console.error('❌ [FeaturePurchase] featureId recherché:', parseInt(featureId!));
        console.error('❌ [FeaturePurchase] IDs disponibles:', features.map((f: Feature) => f.id));
        toast({
          title: "Erreur",
          description: "Fonctionnalité introuvable",
          variant: "destructive",
        });
        navigate("/features");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger la fonctionnalité",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.payment_proofs.length > 5) {
      toast({
        title: "Limite atteinte",
        description: "Maximum 5 fichiers autorisés",
        variant: "destructive",
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      payment_proofs: [...prev.payment_proofs, ...files],
    }));
  };

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      payment_proofs: prev.payment_proofs.filter((_, i) => i !== index),
    }));
  };

  const handleBillingPeriodChange = (period: 'monthly' | 'yearly') => {
    setBillingPeriod(period);

    if (!feature) return;

    let newPrice: number;
    let originalPrice: number;
    let discountPercentage: number;

    if (period === 'yearly' && feature.pricing) {
      newPrice = feature.pricing.yearly.price;
      originalPrice = feature.pricing.yearly.original_price;
      discountPercentage = feature.pricing.yearly.discount_percentage;
    } else {
      newPrice = feature.pricing?.monthly.price || feature.price;
      originalPrice = newPrice;
      discountPercentage = 0;
    }

    setFormData((prev) => ({
      ...prev,
      amount_claimed: newPrice.toString(),
      billing_period: period,
      original_price: originalPrice.toString(),
      discount_percentage: discountPercentage.toString(),
    }));
  };

  // Remplacez votre fonction handleSubmit par ceci :

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔒 SÉCURITÉ : Vérifier que le numéro de facture et le montant existent
    if (!formData.invoice_number || !formData.amount_claimed) {
      toast({
        title: "Facture requise",
        description: "Le numéro de facture et le montant sont obligatoires. Veuillez d'abord générer une facture.",
        variant: "destructive",
      });
      navigate(`/features/invoice/${featureId}`);
      return;
    }

    if (!formData.payment_method) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une méthode de paiement",
        variant: "destructive",
      });
      return;
    }

    if (formData.payment_proofs.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez joindre au moins une preuve de paiement",
        variant: "destructive",
      });
      return;
    }

    const featureIdNum = parseInt(featureId!);
    if (isNaN(featureIdNum)) {
      toast({
        title: "Erreur",
        description: "ID de fonctionnalité invalide",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      console.log('📤 [FeaturePurchase] ========== DÉBUT SOUMISSION ==========');
      console.log('📤 [FeaturePurchase] État billingPeriod:', billingPeriod);
      console.log('📤 [FeaturePurchase] État formData.billing_period:', formData.billing_period);
      console.log('📤 [FeaturePurchase] État formData.amount_claimed:', formData.amount_claimed);
      console.log('📤 [FeaturePurchase] Préparation des données de paiement...');
      console.log('📋 [FeaturePurchase] Données du formulaire complètes:', {
        feature_id: featureIdNum,
        full_name: formData.full_name,
        email: formData.email,
        contact_number: formData.contact_number,
        invoice_number: formData.invoice_number,
        amount_claimed: formData.amount_claimed,
        payment_method: formData.payment_method,
        user_message: formData.user_message,
        billing_period: formData.billing_period,
        original_price: formData.original_price,
        discount_percentage: formData.discount_percentage,
        payment_proofs_count: formData.payment_proofs.length
      });

      const submitData = new FormData();
      submitData.append("feature_id", featureIdNum.toString());
      submitData.append("full_name", formData.full_name);
      submitData.append("email", formData.email);
      submitData.append("contact_number", formData.contact_number);
      submitData.append("invoice_number", formData.invoice_number);
      submitData.append("amount_claimed", formData.amount_claimed);
      submitData.append("payment_method", formData.payment_method);
      submitData.append("user_message", formData.user_message);
      submitData.append("billing_period", formData.billing_period);
      submitData.append("original_price", formData.original_price);
      submitData.append("discount_percentage", formData.discount_percentage);

      formData.payment_proofs.forEach((file, index) => {
        submitData.append(`payment_proofs[${index}]`, file);
        console.log(`📎 [Soumission] Preuve ${index + 1}:`, {
          name: file.name,
          size: `${(file.size / 1024).toFixed(2)} KB`,
          type: file.type
        });
      });

      console.log('🚀 [Soumission] Envoi de la demande d\'activation...');

      // ✅ APPEL API
      const response = await api.post(
        "/features/request-activation",
        submitData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log('✅ [Soumission] Réponse reçue:', response.data);

      // ✅ NAVIGATION APRÈS SUCCÈS
      navigate(`/payment-confirmation?request_id=${response.data.data.id}`);

      toast({
        title: "Succès",
        description: "Demande soumise avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description:
          error.response?.data?.message || "Impossible de soumettre la demande",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-slate-600">
            Fonctionnalité introuvable
          </h2>
          <Button onClick={() => navigate("/features")} className="mt-4">
            Retour aux fonctionnalités
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Demande Soumise !
            </h2>
            <p className="text-slate-600 mb-6">
              Votre demande d'activation pour <strong>{feature.name}</strong> a
              été soumise avec succès. L'équipe admin va examiner votre preuve
              de paiement et vous recevrez une notification.
            </p>
            <div className="space-x-4">
              <Button onClick={() => navigate("/features")}>
                Voir mes fonctionnalités
              </Button>
              <Button variant="outline" onClick={() => navigate("/workspace")}>
                Retour au dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/features")}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Activer {feature.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Informations de la fonctionnalité */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-2">{feature.name}</h3>
              <p className="text-sm text-slate-600 mb-4">
                {feature.description}
              </p>

              {/* Période de facturation (lecture seule - synchronisée depuis la facture) */}
              <div className="mb-4">
                <Label className="mb-2 block font-semibold">Période de facturation :</Label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Option Mensuelle (lecture seule) */}
                  <div
                    className={`border-2 rounded-lg p-4 transition-all opacity-75 cursor-not-allowed ${
                      billingPeriod === 'monthly'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">📅 Mensuel</span>
                      <input
                        type="radio"
                        checked={billingPeriod === 'monthly'}
                        disabled
                        className="w-4 h-4 cursor-not-allowed"
                      />
                    </div>
                    <p className={`text-2xl font-bold ${billingPeriod === 'monthly' ? 'text-blue-600' : 'text-gray-400'}`}>
                      {invoiceData.monthlyPrice || feature.pricing?.monthly?.price || feature.price || 0}€
                    </p>
                    <p className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-blue-500' : 'text-gray-500'}`}>
                      {getDualPrice(invoiceData.monthlyPrice || feature.pricing?.monthly?.price || feature.price || 0).ariary}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">par mois</p>
                    {billingPeriod === 'monthly' && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-xs font-semibold text-blue-600">✓ Période sélectionnée</p>
                      </div>
                    )}
                  </div>

                  {/* Option Annuelle (lecture seule) */}
                  <div
                    className={`border-2 rounded-lg p-4 transition-all relative opacity-75 cursor-not-allowed ${
                      billingPeriod === 'yearly'
                        ? 'border-green-600 bg-green-50'
                        : 'border-slate-200 bg-gray-50'
                    }`}
                  >
                    {feature.pricing?.yearly && (
                      <div className="absolute -top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                        -{feature.pricing.yearly.discount_percentage}%
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">🎉 Annuel</span>
                      <input
                        type="radio"
                        checked={billingPeriod === 'yearly'}
                        disabled
                        className="w-4 h-4 cursor-not-allowed"
                      />
                    </div>
                    <div className="mb-1">
                      <span className={`text-2xl font-bold ${billingPeriod === 'yearly' ? 'text-green-600' : 'text-gray-400'}`}>
                        {invoiceData.yearlyPrice ? (invoiceData.yearlyPrice / 12).toFixed(2) : (feature.pricing?.yearly?.monthly_equivalent || ((feature.price * 12 * 0.8) / 12).toFixed(2))}€
                      </span>
                      <span className="text-sm text-slate-600">/mois</span>
                    </div>
                    <p className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-green-500' : 'text-gray-500'}`}>
                      {getDualPrice(invoiceData.yearlyPrice ? (invoiceData.yearlyPrice / 12) : (feature.pricing?.yearly?.monthly_equivalent || ((feature.price * 12 * 0.8) / 12))).ariary}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">par mois</p>
                    {billingPeriod === 'yearly' && (
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <p className="text-xs font-semibold text-green-600">✓ Période sélectionnée</p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-3 bg-blue-50 p-2 rounded border border-blue-200">
                  ℹ️ La période a été choisie sur la page de facture et ne peut pas être modifiée ici.
                </p>
              </div>

              {/* Résumé du prix */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700">Total à payer :</span>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      {formData.amount_claimed}€
                    </p>
                    <p className="text-lg font-semibold text-blue-500">
                      {getDualPrice(parseFloat(formData.amount_claimed) || 0).ariary}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {billingPeriod === 'yearly' ? 'pour 12 mois' : 'pour 1 mois'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions de paiement */}
            <div className="bg-yellow-50 border-2 border-yellow-300 p-5 rounded-lg mb-6 shadow-sm">
              <h4 className="font-bold text-yellow-900 mb-3 text-lg flex items-center gap-2">
                📋 Instructions de Paiement - À suivre obligatoirement
              </h4>
              <div className="text-sm text-yellow-800 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">1.</span>
                  <p><strong>Effectuez le paiement</strong> via votre méthode préférée (Orange Money, Airtel Money, Mvola, etc.)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">2.</span>
                  <p><strong>Conservez TOUTES les preuves</strong> de transaction fournies par l'opérateur</p>
                </div>
                <div className="flex items-start gap-2 bg-red-100 border border-red-300 p-2 rounded">
                  <span className="font-bold text-red-700">⚠️</span>
                  <p className="text-red-800"><strong>OBLIGATOIRE :</strong> Téléchargez la <strong>facture PixelRise</strong> (PDF) depuis la page de facture et joignez-la ci-dessous</p>
                </div>
                <div className="flex items-start gap-2 bg-red-100 border border-red-300 p-2 rounded">
                  <span className="font-bold text-red-700">⚠️</span>
                  <p className="text-red-800"><strong>OBLIGATOIRE :</strong> Ajoutez le <strong>reçu/facture de l'opérateur</strong> (Orange Money, Airtel Money, Mvola, etc.)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">5.</span>
                  <p><strong>Ajoutez des screenshots</strong> de la transaction si disponibles (recommandé)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">6.</span>
                  <p><strong>Remplissez le formulaire</strong> ci-dessous avec toutes les informations demandées</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-yellow-900">7.</span>
                  <p><strong>Soumettez votre demande</strong> - L'activation se fera après validation par notre équipe admin</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
                <p className="text-xs text-yellow-900 font-medium">
                  💡 <strong>Important :</strong> Sans les 2 factures (PixelRise + Opérateur), votre demande ne pourra pas être traitée.
                </p>
              </div>
            </div>

            <PaymentInformation />

            <div className="pt-6 pb-3 text-center">
              <CardTitle>Formulaire de confirmation de payment</CardTitle>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ligne 1: Nom complet | Email */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email pour les mises à jour</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Ligne 2: Numéro de contact | Méthode de paiement */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Numéro de contact</Label>
                  <Input
                    id="contact_number"
                    type="tel"
                    value={formData.contact_number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact_number: e.target.value,
                      }))
                    }
                    required
                    className="w-full"
                    placeholder="Ex: +261 34 12 345 67"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Méthode de Paiement</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_method: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orange">Orange Money</SelectItem>
                      <SelectItem value="airtel_money">Airtel Money</SelectItem>
                      <SelectItem value="mvola">Mvola</SelectItem>
                      <SelectItem value="tap_tap_send">Tap Tap Send</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ligne 3: Numéro de facture (disabled) | Montant payé */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">
                    Numéro de facture
                    <span className="ml-2 text-xs text-gray-500">(Référence interne)</span>
                  </Label>
                  <Input
                    id="invoice_number"
                    type="text"
                    value={formData.invoice_number}
                    disabled
                    className="w-full bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Montant Payé (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount_claimed}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount_claimed: e.target.value,
                      }))
                    }
                    required
                    className="w-full"
                  />
                </div>
              </div>

              {/* Ligne 4: Preuves de paiement (pleine largeur) */}
              <div className="space-y-2">
                <Label>
                  Preuves de Paiement
                  <span className="ml-2 text-xs text-red-500">* (Minimum 1 fichier)</span>
                </Label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <p className="text-sm text-blue-800 font-medium mb-2">📎 Documents à fournir :</p>
                  <ul className="text-xs text-blue-700 space-y-1 ml-4">
                    <li>✓ Facture générée par l'application (PDF téléchargé)</li>
                    <li>✓ Reçu/Facture de l'opérateur (Orange Money, Airtel, Mvola, etc.)</li>
                    <li>✓ Screenshot de la transaction</li>
                    <li>✓ Autres preuves de paiement (si disponibles)</li>
                  </ul>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Formats acceptés : Images (JPG, PNG) et PDF | Max 5 fichiers
                  </p>
                </div>
                <div>
                  <input
                    id="proofs"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("proofs")?.click()}
                    className="w-full flex items-center gap-2 border-2 border-blue-300 hover:bg-blue-50"
                  >
                    <Upload className="w-4 h-4" />
                    📤 Ajouter des fichiers (max 5)
                  </Button>
                </div>

                {formData.payment_proofs.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-medium text-green-600">
                      ✅ {formData.payment_proofs.length} fichier(s) ajouté(s)
                    </p>
                    {formData.payment_proofs.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-green-600">📄</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                          🗑️
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ligne 5: Message (pleine largeur) */}
              <div className="space-y-2">
                <Label htmlFor="message">Message </Label>
                <Textarea
                  id="message"
                  placeholder="Ajoutez des détails sur votre paiement..."
                  value={formData.user_message}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      user_message: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 py-3 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-md transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Soumission en cours...
                  </span>
                ) : (
                  "Soumettre la Demande"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FeaturePurchase;
