import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import api, { longOperationApi } from "@/services/api";
import ProgressiveLoadingModal from "@/components/ui/ProgressiveLoadingModal";
import { SocialPlatformSelector } from "@/components/ui/SocialPlatformSelector";
import { getDualPrice } from "@/utils/currency";
import {
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingCart,
  Star,
  Shield,
  Zap,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface UserFeature {
  id: number;
  key: string;
  name: string;
  description: string;
  user_activated: boolean;
  can_toggle: boolean;
  status: string;
  status_label: string;
  // ✅ Champs d'expiration
  is_expired?: boolean;
  expires_at?: string;
  days_remaining?: number;
  // ✅ Champs de facturation
  billing_period?: 'monthly' | 'yearly';
  period_label?: string;
  amount_paid?: number;
  original_price?: number;
  discount_percentage?: number;
}

interface PurchaseHistory {
  id: number;
  purchase_id: string;
  feature_id: number;
  feature_key: string;
  feature_name: string;
  feature_description: string;
  status: string;
  status_label: string;
  is_expired: boolean;
  is_active: boolean;
  purchased_at: string;
  admin_enabled_at: string;
  user_activated_at?: string;
  expires_at?: string;
  days_remaining?: number;
  amount_paid: number;
  original_price: number;
  discount_percentage: number;
  payment_method: string;
  billing_period: 'monthly' | 'yearly';
  billing_period_label: string;
  duration_days: number;
  admin_enabled_by_name?: string;
  admin_notes?: string;
}

interface AvailableFeature {
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

const UserFeatures: React.FC = () => {
  const [availableFeatures, setAvailableFeatures] = useState<UserFeature[]>([]);
  const [allFeatures, setAllFeatures] = useState<AvailableFeature[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-features");
  // ✅ NOUVEAU : États pour le modal de loading progressif
  const [showProgressiveModal, setShowProgressiveModal] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null); // 🎯 NOUVEAU : job_id pour polling
  const [currentGeneratingFeature, setCurrentGeneratingFeature] = useState<"blog" | "social_media" | "sprint" | null>(null);
  // ✅ NOUVEAU : États pour le modal de sélection des plateformes sociales
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [pendingFeatureId, setPendingFeatureId] = useState<number | null>(null);
  // ✅ NOUVEAU : États pour le modal de confirmation de renouvellement
  const { toast } = useToast();

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);

      const [availableRes, allFeaturesRes, historyRes] = await Promise.all([
        api.get("/features/available").catch(() => ({ data: { data: [] } })),
        api
          .get("/features/available-for-purchase")
          .catch(() => ({ data: { data: [] } })),
        api.get("/features/purchase-history").catch(() => ({ data: { data: [] } })),
      ]);

      setAvailableFeatures(availableRes.data.data || []);
      setAllFeatures(allFeaturesRes.data.data || []);
      setPurchaseHistory(historyRes.data.data || []);
    } catch (error) {
      console.error("Erreur chargement fonctionnalités:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fonctionnalités",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ MODIFIÉ : Rediriger vers nouvel achat au lieu de renouveler
  const buyAgain = (featureId: number) => {
    const feature = availableFeatures.find(f => f.id === featureId);

    if (!feature) return;

    // ✅ BLOQUER si fonctionnalité encore active (non expirée)
    if (!feature.is_expired) {
      const daysRemaining = feature.days_remaining || 0;
      const expiresAt = feature.expires_at
        ? new Date(feature.expires_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      toast({
        title: "⏸️ Achat impossible",
        description: `Vous avez déjà un accès actif (${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}). Vous pourrez racheter après expiration le ${expiresAt}.`,
        variant: "destructive",
        duration: 6000,
      });

      return; // Bloquer l'achat
    }

    // Fonctionnalité expirée - achat autorisé
    toast({
      title: "📦 Nouvel achat",
      description: `Vous allez être redirigé vers la page d'achat de ${feature.name}`,
    });

    setTimeout(() => {
      window.location.href = `/features/purchase/${featureId}`;
    }, 1000);
  };


  // ✅ NOUVEAU : Obtenir l'alerte d'expiration avec date/heure précise
  const getExpirationAlert = (feature: UserFeature) => {
    if (feature.is_expired) {
      const expiryDate = feature.expires_at ? new Date(feature.expires_at).toLocaleDateString('fr-FR') : '';
      return {
        type: "expired" as const,
        icon: AlertTriangle,
        message: expiryDate ? `Fonctionnalité expirée le ${expiryDate}` : "Cette fonctionnalité a expiré",
        className: "border-red-200 bg-red-50",
        textColor: "text-red-700",
      };
    }

    if (!feature.days_remaining) return null;

    // Afficher date et heure pour les expirations imminentes
    if (feature.days_remaining <= 1 && feature.expires_at) {
      const expiryDate = new Date(feature.expires_at);
      const timeStr = expiryDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      return {
        type: "urgent" as const,
        icon: AlertTriangle,
        message: feature.days_remaining === 0
          ? `Expire aujourd'hui à ${timeStr} !`
          : `Expire demain à ${timeStr} !`,
        className: "border-red-200 bg-red-50",
        textColor: "text-red-700",
      };
    }

    if (feature.days_remaining <= 3) {
      return {
        type: "warning" as const,
        icon: AlertCircle,
        message: `Expire dans ${feature.days_remaining} jours`,
        className: "border-orange-200 bg-orange-50",
        textColor: "text-orange-700",
      };
    }

    if (feature.days_remaining <= 7) {
      return {
        type: "info" as const,
        icon: Calendar,
        message: `Expire dans ${feature.days_remaining} jours`,
        className: "border-blue-200 bg-blue-50",
        textColor: "text-blue-700",
      };
    }

    return null;
  };

  // ✅ NOUVEAU : Badge d'expiration
  const getExpirationBadge = (feature: UserFeature) => {
    if (feature.is_expired) {
      return (
        <Badge variant="destructive" className="text-xs">
          Expirée
        </Badge>
      );
    }

    if (!feature.days_remaining) return null;

    if (feature.days_remaining <= 1) {
      return (
        <Badge variant="destructive" className="text-xs animate-pulse">
          Expire {feature.days_remaining === 0 ? "aujourd'hui" : "demain"}
        </Badge>
      );
    }

    if (feature.days_remaining <= 3) {
      return (
        <Badge
          variant="outline"
          className="text-xs border-orange-500 text-orange-600"
        >
          {feature.days_remaining}j restants
        </Badge>
      );
    }

    if (feature.days_remaining <= 7) {
      return (
        <Badge
          variant="outline"
          className="text-xs border-blue-500 text-blue-600"
        >
          {feature.days_remaining}j restants
        </Badge>
      );
    }

    // Affichage personnalisé selon la période
    const periodInfo = feature.billing_period === 'yearly' ? ' (annuel)' : '';

    return (
      <Badge variant="outline" className="text-xs">
        {feature.days_remaining} jours restants{periodInfo}
      </Badge>
    );
  };

  // ✅ NOUVEAU : Gérer la confirmation des plateformes sélectionnées
  const handlePlatformConfirm = async (platforms: string[]) => {
    console.log('🎯 [handlePlatformConfirm] Plateformes confirmées:', platforms);
    console.log('🎯 [handlePlatformConfirm] pendingFeatureId:', pendingFeatureId);
    
    setShowPlatformSelector(false);
    
    if (pendingFeatureId) {
      console.log('✅ [handlePlatformConfirm] Continuation de l\'activation...');
      
      // ✅ CORRECTION : Passer true directement pour éviter le problème de state asynchrone
      await toggleFeature(pendingFeatureId, true, true); // 3ème paramètre = skipModal
      
      // Réinitialiser
      setPendingFeatureId(null);
    } else {
      console.error('❌ [handlePlatformConfirm] pendingFeatureId est null !');
    }
  };

  const toggleFeature = async (featureId: number, activate: boolean, skipModal: boolean = false) => {
    try {
      const feature = availableFeatures.find((f) => f.id === featureId);

      // Vérifier si la fonctionnalité est expirée
      if (activate && feature?.is_expired) {
        toast({
          title: "❌ Fonctionnalité expirée",
          description: "Veuillez renouveler votre accès avant de l'activer",
          variant: "destructive",
        });
        return;
      }

      // ✅ NOUVEAU : Afficher le modal de sélection des plateformes pour social_media
      // Mais seulement si on n'a pas déjà confirmé les plateformes
      if (activate && feature?.key === 'social_media' && !skipModal) {
        console.log('📱 [toggleFeature] Affichage modal sélection plateformes', {
          featureId,
          featureKey: feature.key,
          skipModal
        });
        setPendingFeatureId(featureId);
        setShowPlatformSelector(true);
        return; // Arrêter ici, la suite sera gérée par handlePlatformConfirm
      }

      // 🎯 NOUVEAU : Mise à jour optimiste IMMÉDIATE de l'interface
      setAvailableFeatures((prev) =>
        prev.map((f) =>
          f.id === featureId ? { ...f, user_activated: activate } : f
        )
      );

      // ✅ Détection des fonctionnalités avec génération
      const needsGeneration =
        feature &&
        (feature.key === "blog" || feature.key === "social_media" || feature.key === "sprint_planning") &&
        activate;

      // 🎯 Toast immédiat selon le type d'activation
      if (needsGeneration) {
        console.log(
          `🤖 [UserFeatures] Activation avec génération pour: ${feature.key}`
        );

        toast({
          title: "🚀 Génération démarrée",
          description: feature.key === "sprint_planning"
            ? `${feature.name} activée ! Génération de votre sprint hebdomadaire en cours...`
            : `${feature.name} activée ! Génération de votre premier ${feature.key === "blog" ? "article" : "post"} en cours...`,
        });
      } else if (activate) {
        toast({
          title: "✅ Succès",
          description: `${feature.name} activée pour 30 jours`,
        });
      } else {
        toast({
          title: "✅ Succès",
          description: "Fonctionnalité désactivée",
        });
      }

      // 🔥 API call en arrière-plan (sans bloquer l'interface)
      const apiCall = needsGeneration ? longOperationApi : api;

      apiCall
        .post("/features/toggle", {
          feature_id: featureId,
          activate,
        })
        .then((response) => {
          console.log("✅ [UserFeatures] Toggle réussi", response.data);

          // 🎯 CORRECTION : Mettre à jour l'état avec la réponse du serveur
          setAvailableFeatures((prev) =>
            prev.map((f) =>
              f.id === featureId
                ? {
                    ...f,
                    user_activated: response.data.user_activated ?? activate,
                    expires_at: response.data.expires_at ?? f.expires_at,
                    days_remaining: response.data.days_remaining ?? f.days_remaining
                  }
                : f
            )
          );

          // 🎯 NOUVEAU : Stocker le job_id et ouvrir le modal pour le polling
          if (response.data.job_id && needsGeneration) {
            console.log("🆔 [UserFeatures] Job ID reçu:", response.data.job_id);
            setCurrentJobId(response.data.job_id);

            // ✅ Ouvrir le modal de progression maintenant qu'on a le job_id
            const featureType = feature.key === "sprint_planning" ? "sprint" : feature.key as "blog" | "social_media";
            setCurrentGeneratingFeature(featureType);
            setShowProgressiveModal(true);

            console.log("✅ [UserFeatures] Modal de progression ouvert avec job_id:", response.data.job_id);
          }

          // 🎯 NOUVEAU : Cache d'accès temporaire (évite "Vérification d'accès..." après activation)
          if (activate && feature.key) {
            const cacheKey = `feature_access_${feature.key}`;
            const cacheData = {
              hasAccess: true,
              expiresAt: response.data.expires_at,
              cachedAt: new Date().toISOString()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log("💾 [UserFeatures] Cache d'accès créé:", cacheKey);

            // Expirer le cache après 2 minutes
            setTimeout(() => {
              localStorage.removeItem(cacheKey);
              console.log("🗑️ [UserFeatures] Cache expiré:", cacheKey);
            }, 120000); // 2 minutes
          }

          // ✅ NOUVEAU : Afficher information d'expiration
          if (activate && response.data.expires_at) {
            const expiresAt = new Date(response.data.expires_at);
            toast({
              title: "📅 Accès activé",
              description: `Fonctionnalité active jusqu'au ${expiresAt.toLocaleDateString(
                "fr-FR"
              )}`,
            });
          }

          // ✅ NOUVEAU : Émettre événement si premier post existe (mais NE PAS fermer le modal si job_id existe)
          if (needsGeneration && response.data.first_post) {
            console.log(
              "🚀 [UserFeatures] Premier post reçu",
              {
                featureKey: feature.key,
                firstPost: response.data.first_post,
                hasJobId: !!response.data.job_id
              }
            );

            // Émettre l'événement personnalisé pour les pages qui écoutent
            const event = new CustomEvent("featureActivated", {
              detail: {
                featureKey: feature.key,
                featureName: feature.name,
                firstPost: response.data.first_post,
                postsRemaining: response.data.posts_remaining || 0,
              },
            });
            window.dispatchEvent(event);

            // ❌ NE PAS fermer le modal si job_id existe (le modal gère la fermeture via polling)
            // Le modal se fermera automatiquement quand le job sera terminé
          }

          // 🎯 CORRECTION : Recharger SEULEMENT si pas de génération (pour éviter la race condition)
          if (!needsGeneration) {
            setTimeout(() => loadFeatures(), 500);
          }
        })
        .catch((error) => {
          console.error(
            "❌ [UserFeatures] Erreur toggle fonctionnalité:",
            error
          );

          // ✅ NOUVEAU : Fermer le modal en cas d'erreur
          if (needsGeneration) {
            setShowProgressiveModal(false);
            setCurrentGeneratingFeature(null);
          }

          // 🔄 Rollback : annuler la mise à jour optimiste
          setAvailableFeatures((prev) =>
            prev.map((f) =>
              f.id === featureId ? { ...f, user_activated: !activate } : f
            )
          );

          // Toast d'erreur spécifique pour expiration
          if (error.response?.data?.error_type === "feature_expired") {
            toast({
              title: "📅 Fonctionnalité expirée",
              description:
                error.response.data.message || "Cette fonctionnalité a expiré",
              variant: "destructive",
            });
          } else {
            toast({
              title: "❌ Erreur",
              description:
                error.response?.data?.message ||
                "Impossible de modifier la fonctionnalité",
              variant: "destructive",
            });
          }
        });
    } catch (error: any) {
      console.error("❌ [UserFeatures] Erreur toggle fonctionnalité:", error);

      // Rollback en cas d'erreur immédiate
      setAvailableFeatures((prev) =>
        prev.map((f) =>
          f.id === featureId ? { ...f, user_activated: !activate } : f
        )
      );

      toast({
        title: "❌ Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "ready_to_activate":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "waiting_admin":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "expired":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case "ready_to_activate":
        return (
          <Badge className="bg-blue-100 text-blue-800">Prêt à activer</Badge>
        );
      case "waiting_admin":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
        );
      case "expired":
        return <Badge variant="destructive">Expirée</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "premium":
        return <Star className="w-5 h-5 text-yellow-500" />;
      case "enterprise":
        return <Shield className="w-5 h-5 text-purple-500" />;
      default:
        return <Zap className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryBadge = (
    category: string
  ): "default" | "destructive" | "secondary" => {
    switch (category) {
      case "premium":
        return "default";
      case "enterprise":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // ✅ NOUVEAU : Statistiques d'expiration
  const expirationStats = {
    total: availableFeatures.length,
    expired: availableFeatures.filter((f) => f.is_expired).length,
    expiringSoon: availableFeatures.filter(
      (f) => f.days_remaining && f.days_remaining <= 7
    ).length,
    expiringToday: availableFeatures.filter(
      (f) => f.days_remaining && f.days_remaining <= 1 && !f.is_expired
    ).length,
    active: availableFeatures.filter((f) => !f.is_expired && f.user_activated)
      .length,
  };

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse text-lg">
            Chargement des fonctionnalités...
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Mes Fonctionnalités
            </h1>
            <p className="text-slate-600">
              Gérez vos fonctionnalités actives et découvrez de nouvelles
              options
            </p>
          </div>

          {/* 🚨 ALERTE URGENTE : Expiration aujourd'hui/demain */}
          {expirationStats.expiringToday > 0 && (
            <Alert className="border-red-500 bg-red-100 shadow-lg animate-pulse">
              <AlertTriangle className="h-5 w-5 text-red-700" />
              <AlertDescription className="text-red-900 font-bold text-lg">
                🚨 URGENT : {expirationStats.expiringToday} fonctionnalité
                {expirationStats.expiringToday > 1 ? "s expirent" : " expire"}{" "}
                {availableFeatures.find((f) => f.days_remaining === 0)
                  ? "AUJOURD'HUI"
                  : "DEMAIN"} !
                <br />
                <span className="text-base font-normal">
                  Renouvelez immédiatement pour éviter l'interruption de service.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* ✅ NOUVEAU : Alertes d'expiration globales */}
          {(expirationStats.expired > 0 ||
            expirationStats.expiringSoon > 0) && (
            <div className="space-y-4">
              {expirationStats.expired > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    <strong>
                      {expirationStats.expired} fonctionnalité
                      {expirationStats.expired > 1 ? "s ont" : " a"} expiré
                      {expirationStats.expired > 1 ? "s" : "e"}.
                    </strong>{" "}
                    Renouvelez votre accès pour continuer à les utiliser.
                  </AlertDescription>
                </Alert>
              )}

              {expirationStats.expiringSoon > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700">
                    <strong>
                      {expirationStats.expiringSoon} fonctionnalité
                      {expirationStats.expiringSoon > 1
                        ? "s expirent"
                        : " expire"}{" "}
                      dans les 7 prochains jours.
                    </strong>{" "}
                    Pensez à renouveler votre accès.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Tabs Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="my-features"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Mes Fonctionnalités ({availableFeatures.length})
              </TabsTrigger>
              <TabsTrigger value="explore" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Explorer & Acheter ({allFeatures.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Historique d'achats ({purchaseHistory.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab: Mes Fonctionnalités */}
            <TabsContent value="my-features" className="space-y-6">
              {availableFeatures.length > 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Fonctionnalités Disponibles</CardTitle>
                      <div className="flex gap-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {expirationStats.active} actives
                        </span>
                        {expirationStats.expiringSoon > 0 && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            {expirationStats.expiringSoon} bientôt expirées
                          </span>
                        )}
                        {expirationStats.expired > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            {expirationStats.expired} expirées
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {availableFeatures.map((feature) => {
                        const expirationAlert = getExpirationAlert(feature);
                        const expirationBadge = getExpirationBadge(feature);

                        return (
                          <div
                            key={feature.id}
                            className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                              feature.is_expired
                                ? "border-red-200 bg-red-50/50"
                                : expirationAlert
                                ? "border-orange-200 bg-orange-50/50 hover:bg-orange-50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getStatusIcon(
                                  feature.is_expired
                                    ? "expired"
                                    : feature.status
                                )}
                                <h3 className="font-medium">{feature.name}</h3>
                                {getStatusBadge(
                                  feature.is_expired
                                    ? "expired"
                                    : feature.status
                                )}
                                {expirationBadge}

                                {/* Badge période de facturation */}
                                {feature.billing_period === 'yearly' && (
                                  <Badge variant="outline" className="text-xs border-green-500 text-green-600 bg-green-50">
                                    📅 Annuel
                                  </Badge>
                                )}

                                {/* Badge génération de posts */}
                                {(feature.key === "blog" ||
                                  feature.key === "social_media") && (
                                  <Badge variant="outline" className="text-xs">
                                    🤖 Auto-posts
                                  </Badge>
                                )}
                              </div>

                              <p className="text-sm text-slate-600 mb-2">
                                {feature.description}
                                {/* Description étendue pour fonctionnalités avec génération */}
                                {(feature.key === "blog" ||
                                  feature.key === "social_media") && (
                                  <span className="block text-xs text-blue-600 mt-1">
                                    ✨ Premier post créé immédiatement, les
                                    autres générés automatiquement
                                  </span>
                                )}
                              </p>

                              {/* 🎯 NOUVEAU : Barre de progression des jours restants */}
                              {!feature.is_expired && feature.days_remaining !== null && feature.days_remaining !== undefined && (
                                <div className="mt-3 mb-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-slate-600">
                                      {feature.billing_period === 'yearly' ? 'Temps restant (365 jours)' : 'Temps restant (30 jours)'}
                                    </span>
                                    <span className={`text-xs font-semibold ${
                                      feature.days_remaining <= 3
                                        ? 'text-red-600'
                                        : feature.days_remaining <= 7
                                        ? 'text-orange-600'
                                        : 'text-green-600'
                                    }`}>
                                      {feature.days_remaining} jour{feature.days_remaining > 1 ? 's' : ''} restant{feature.days_remaining > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                    <div
                                      className={`h-2.5 rounded-full transition-all duration-500 ${
                                        feature.days_remaining <= 3
                                          ? 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse'
                                          : feature.days_remaining <= 7
                                          ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                          : 'bg-gradient-to-r from-green-400 to-green-500'
                                      }`}
                                      style={{
                                        width: `${Math.max(
                                          5,
                                          (feature.days_remaining / (feature.billing_period === 'yearly' ? 365 : 30)) * 100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  {feature.expires_at && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      Expire le {new Date(feature.expires_at).toLocaleDateString("fr-FR", {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* ✅ NOUVEAU : Alerte d'expiration */}
                              {expirationAlert && (
                                <div
                                  className={`flex items-center gap-2 text-xs ${expirationAlert.textColor} mt-2`}
                                >
                                  <expirationAlert.icon className="w-3 h-3" />
                                  {expirationAlert.message}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              {/* ✅ MODIFIÉ : Bouton "Acheter à nouveau" pour fonctionnalités expirées */}
                              {feature.is_expired && (
                                <Button
                                  size="sm"
                                  onClick={() => buyAgain(feature.id)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <ShoppingCart className="w-3 h-3 mr-1" />
                                  Acheter à nouveau
                                </Button>
                              )}

                              {/* ✅ Bouton "Renouveler" uniquement si expire dans ≤3 jours */}
                              {!feature.is_expired &&
                                feature.days_remaining !== null &&
                                feature.days_remaining !== undefined &&
                                feature.days_remaining <= 3 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => buyAgain(feature.id)}
                                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Renouveler
                                  </Button>
                                )}

                              {/* ✅ Toggle désactivé si expiré */}
                              {feature.can_toggle &&
                                feature.status !== "waiting_admin" &&
                                !feature.is_expired && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {feature.user_activated
                                        ? "Activé"
                                        : "Désactivé"}
                                    </span>

                                    <Switch
                                      checked={feature.user_activated}
                                      onCheckedChange={(checked) =>
                                        toggleFeature(feature.id, checked)
                                      }
                                    />
                                  </div>
                                )}

                              {feature.status === "waiting_admin" && (
                                <div className="text-center">
                                  <div className="text-sm text-yellow-600 font-medium">
                                    En attente de validation admin
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Votre demande est en cours de traitement
                                  </div>
                                </div>
                              )}

                              {feature.is_expired && (
                                <div className="text-center">
                                  <div className="text-sm text-red-600 font-medium">
                                    Fonctionnalité expirée
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Faites un nouvel achat pour réactiver
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Settings className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">
                      Aucune fonctionnalité activée
                    </h3>
                    <p className="text-slate-500 mb-4">
                      Vous n'avez pas encore de fonctionnalités activées
                    </p>
                    <Button
                      onClick={() => setActiveTab("explore")}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Découvrir les fonctionnalités
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Explorer & Acheter */}
            <TabsContent value="explore" className="space-y-6">
              {allFeatures.length > 0 ? (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {
                            allFeatures.filter((f) => f.category === "premium")
                              .length
                          }
                        </div>
                        <div className="text-sm text-blue-600">
                          Fonctionnalités Premium
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {
                            allFeatures.filter(
                              (f) => f.category === "enterprise"
                            ).length
                          }
                        </div>
                        <div className="text-sm text-purple-600">
                          Solutions Enterprise
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {availableFeatures.length}
                        </div>
                        <div className="text-sm text-green-600">
                          Déjà Activées
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Fonctionnalités Disponibles */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Toutes les Fonctionnalités Disponibles
                      </CardTitle>
                      <p className="text-sm text-slate-600">
                        Choisissez les fonctionnalités qui correspondent à vos
                        besoins. <strong>Durée : 30 jours par achat.</strong>
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allFeatures.map((feature) => {
                          const isAlreadyOwned = availableFeatures.some(
                            (af) => af.key === feature.key
                          );

                          return (
                            <div
                              key={feature.id}
                              className={`border rounded-lg p-6 transition-all hover:shadow-md ${
                                isAlreadyOwned
                                  ? "bg-green-50 border-green-200"
                                  : "hover:border-blue-300"
                              }`}
                            >
                              {/* Header */}
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                  {getCategoryIcon(feature.category)}
                                  <h3 className="font-semibold text-lg">
                                    {feature.name}
                                  </h3>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Badge
                                    variant={getCategoryBadge(feature.category)}
                                  >
                                    {feature.category}
                                  </Badge>

                                  {/* Badge génération automatique */}
                                  {(feature.key === "blog" ||
                                    feature.key === "social_media") && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      🤖 Auto-posts
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-sm text-slate-600 mb-6 line-clamp-3">
                                {feature.description}
                                {/* Note génération automatique */}
                                {(feature.key === "blog" ||
                                  feature.key === "social_media") && (
                                  <span className="block text-xs text-blue-600 mt-2">
                                    ✨ Premier post créé immédiatement lors de
                                    l'activation
                                  </span>
                                )}
                              </p>

                              {/* Prix et Action */}
                              <div className="flex flex-col gap-3">
                                {/* Prix Mensuel */}
                                <div className="flex justify-between items-center border-b pb-2">
                                  <div className="text-left">
                                    <div className="text-sm text-slate-500 mb-1">Mensuel</div>
                                    <div className="text-2xl font-bold text-blue-600">
                                      {feature.pricing?.monthly.price || feature.price}€
                                    </div>
                                    <div className="text-sm font-medium text-blue-500">
                                      {getDualPrice(feature.pricing?.monthly.price || feature.price).ariary}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      par mois
                                    </div>
                                  </div>
                                </div>

                                {/* Prix Annuel avec Réduction */}
                                <div className="relative">
                                  <div className="absolute -top-3 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                    -20%
                                  </div>
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="text-sm text-green-700 font-medium mb-1">
                                      💎 Offre Annuelle
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                      <div className="text-left">
                                        <div className="text-3xl font-bold text-green-600">
                                          {feature.pricing?.yearly.monthly_equivalent || ((feature.price * 12 * 0.8) / 12).toFixed(2)}€
                                        </div>
                                        <div className="text-sm font-medium text-green-500">
                                          {getDualPrice(feature.pricing?.yearly.monthly_equivalent || parseFloat(((feature.price * 12 * 0.8) / 12).toFixed(2))).ariary}
                                        </div>
                                        <div className="text-xs text-slate-600 mt-1">
                                          par mois
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-slate-600 border-t border-green-200 pt-2">
                                      <div className="mb-1">
                                        <div className="flex justify-between">
                                          <span>Facturé annuellement:</span>
                                          <span className="font-bold text-green-700">
                                            {feature.pricing?.yearly.price || (feature.price * 12 * 0.8).toFixed(2)}€
                                          </span>
                                        </div>
                                        <div className="flex justify-end">
                                          <span className="text-green-600 font-medium text-xs">
                                            {getDualPrice(feature.pricing?.yearly.price || parseFloat((feature.price * 12 * 0.8).toFixed(2))).ariary}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="mb-1">
                                        <div className="flex justify-between text-slate-500">
                                          <span className="line-through">Prix normal:</span>
                                          <span className="line-through">
                                            {feature.pricing?.yearly.original_price || (feature.price * 12).toFixed(2)}€
                                          </span>
                                        </div>
                                        <div className="flex justify-end">
                                          <span className="text-slate-400 text-xs line-through">
                                            {getDualPrice(feature.pricing?.yearly.original_price || parseFloat((feature.price * 12).toFixed(2))).ariary}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="mb-1">
                                        <div className="flex justify-between text-green-600 font-medium">
                                          <span>🎉 Économie:</span>
                                          <span>
                                            {feature.pricing?.yearly.savings.toFixed(2) || (feature.price * 12 * 0.2).toFixed(2)}€
                                          </span>
                                        </div>
                                        <div className="flex justify-end">
                                          <span className="text-green-600 font-medium text-xs">
                                            {getDualPrice(feature.pricing?.yearly.savings || (feature.price * 12 * 0.2)).ariary}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Bouton d'action */}
                                <div className="flex justify-center">
                                  {isAlreadyOwned ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Possédée
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          console.log('🛒 [Achat] Génération de facture pour feature:', feature.id, feature.name);
                                          
                                          // Générer la facture avec la nouvelle route
                                          const response = await api.post(`/features/invoices/generate-for-feature/${feature.id}`);
                                          
                                          console.log('📄 [Achat] Réponse API:', response.data);
                                          
                                          if (response.data.success) {
                                            console.log('✅ [Achat] Facture générée:', response.data.data.invoice);
                                            
                                            // Rediriger vers la page de facture
                                            window.location.href = `/features/invoice/${response.data.data.invoice.id}`;
                                          } else {
                                            console.error('❌ [Achat] Échec génération:', response.data.message);
                                            toast({
                                              title: "❌ Erreur",
                                              description: response.data.message || "Impossible de générer la facture",
                                              variant: "destructive"
                                            });
                                          }
                                        } catch (error) {
                                          console.error("❌ [Achat] Erreur lors de la génération de la facture", error);
                                          toast({
                                            title: "❌ Erreur",
                                            description: "Une erreur est survenue lors de la génération de la facture",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                                    >
                                      <ShoppingCart className="w-4 h-4" />
                                      Acheter maintenant
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <ShoppingCart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">
                      Aucune fonctionnalité disponible
                    </h3>
                    <p className="text-slate-500">
                      Les fonctionnalités seront bientôt disponibles
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ✅ NOUVEAU : Tab Historique d'achats regroupé par fonctionnalité */}
            <TabsContent value="history" className="space-y-6">
              {purchaseHistory.length > 0 ? (
                <div className="space-y-6">
                  {/* ✅ Grouper les achats par fonctionnalité */}
                  {Object.entries(
                    purchaseHistory.reduce((groups, purchase) => {
                      const key = purchase.feature_key;
                      if (!groups[key]) {
                        groups[key] = [];
                      }
                      groups[key].push(purchase);
                      return groups;
                    }, {} as Record<string, PurchaseHistory[]>)
                  ).map(([featureKey, purchases]) => {
                    const sortedPurchases = [...purchases].sort(
                      (a, b) =>
                        new Date(b.purchased_at).getTime() -
                        new Date(a.purchased_at).getTime()
                    );
                    const latestPurchase = sortedPurchases[0];
                    const totalSpent = purchases.reduce(
                      (sum, p) => sum + (Number(p.amount_paid) || 0),
                      0
                    );

                    return (
                      <Card key={featureKey}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {latestPurchase.feature_name}
                                <Badge
                                  variant={
                                    latestPurchase.is_active
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {purchases.length} achat{purchases.length > 1 ? "s" : ""}
                                </Badge>
                              </CardTitle>
                              <p className="text-sm text-slate-600 mt-1">
                                {latestPurchase.feature_description}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-slate-500">
                                Total dépensé
                              </div>
                              <div className="text-2xl font-bold text-green-600">
                                {totalSpent.toFixed(2)}€
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {sortedPurchases.map((purchase, index) => (
                              <div
                                key={purchase.id}
                                className={`border rounded-lg p-4 ${
                                  purchase.is_active
                                    ? "border-green-300 bg-green-50"
                                    : purchase.is_expired
                                    ? "border-red-200 bg-red-50/50"
                                    : "border-slate-200 bg-slate-50/50"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      #{purchases.length - index}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {purchase.purchase_id}
                                    </Badge>
                                    <Badge
                                      variant={
                                        purchase.is_active
                                          ? "default"
                                          : purchase.is_expired
                                          ? "destructive"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {purchase.status_label}
                                    </Badge>
                                    {purchase.is_active && (
                                      <Badge className="text-xs bg-green-600">
                                        ✓ Actuel
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <span className="text-slate-500 block">
                                      Acheté le
                                    </span>
                                    <div className="font-medium">
                                      {new Date(
                                        purchase.purchased_at
                                      ).toLocaleDateString("fr-FR", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-slate-500 block">
                                      Montant
                                    </span>
                                    <div className="font-medium text-green-600">
                                      {purchase.amount_paid}€
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-slate-500 block">
                                      Formule
                                    </span>
                                    <div className="font-medium">
                                      {purchase.billing_period_label}
                                    </div>
                                  </div>

                                  {purchase.expires_at && (
                                    <div>
                                      <span className="text-slate-500 block">
                                        {purchase.is_expired
                                          ? "Expiré le"
                                          : "Expire le"}
                                      </span>
                                      <div
                                        className={`font-medium ${
                                          purchase.is_expired
                                            ? "text-red-600"
                                            : purchase.days_remaining &&
                                              purchase.days_remaining <= 7
                                            ? "text-orange-600"
                                            : "text-slate-700"
                                        }`}
                                      >
                                        {new Date(
                                          purchase.expires_at
                                        ).toLocaleDateString("fr-FR", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                        {purchase.days_remaining !== null &&
                                          purchase.days_remaining !== undefined &&
                                          !purchase.is_expired && (
                                            <span className="text-xs ml-1">
                                              ({purchase.days_remaining}j)
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {purchase.admin_notes && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                    <strong>Note admin :</strong>{" "}
                                    {purchase.admin_notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Bouton "Acheter à nouveau" si le dernier achat est expiré */}
                          {latestPurchase.is_expired && (
                            <div className="mt-4 pt-4 border-t">
                              <Button
                                onClick={() => buyAgain(latestPurchase.feature_id)}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Racheter {latestPurchase.feature_name}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">
                      Aucun historique d'achat
                    </h3>
                    <p className="text-slate-500 mb-4">
                      Vous n'avez pas encore effectué d'achat
                    </p>
                    <Button
                      onClick={() => setActiveTab("explore")}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Explorer les fonctionnalités
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ✅ NOUVEAU : Modal de progression pour la génération */}
      {showProgressiveModal && currentGeneratingFeature && (
        <ProgressiveLoadingModal
          isOpen={showProgressiveModal}
          featureKey={currentGeneratingFeature}
          jobId={currentJobId}
          onComplete={(result) => {
            console.log("✅ [ProgressiveModal] Génération terminée", result);

            // ✅ Redirection selon le type de fonctionnalité
            if (currentGeneratingFeature === "sprint") {
              // Pour le sprint, on continue à attendre que le job soit vraiment terminé
              toast({
                title: "🎯 Finalisation en cours...",
                description: "Vérification que votre sprint est prêt...",
              });

              // Attendre que le sprint soit vraiment créé
              const checkSprintReady = async () => {
                let attempts = 0;
                const maxAttempts = 20; // 20 tentatives max (100 secondes)

                const checkInterval = setInterval(async () => {
                  attempts++;
                  console.log(`🔄 Tentative ${attempts}/${maxAttempts} - Vérification sprint...`);

                  try {
                    const response = await fetch('/api/sprints/current', {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                        'Accept': 'application/json',
                      },
                    });

                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.sprint) {
                        // Sprint trouvé ! Rediriger
                        clearInterval(checkInterval);
                        setShowProgressiveModal(false);

                        toast({
                          title: "🎉 Sprint créé avec succès !",
                          description: "Redirection vers votre planification hebdomadaire...",
                        });

                        setTimeout(() => {
                          window.location.href = "/sprint-view";
                        }, 1000);
                        return;
                      }
                    }

                    // Si on arrive au max, rediriger quand même
                    if (attempts >= maxAttempts) {
                      clearInterval(checkInterval);
                      setShowProgressiveModal(false);

                      toast({
                        title: "🎯 Sprint en cours de finalisation",
                        description: "Redirection vers la page... Le sprint apparaîtra bientôt !",
                      });

                      setTimeout(() => {
                        window.location.href = "/sprint-view";
                      }, 1000);
                    }
                  } catch (error) {
                    console.error('Erreur vérification sprint:', error);
                    if (attempts >= maxAttempts) {
                      clearInterval(checkInterval);
                      setShowProgressiveModal(false);
                      window.location.href = "/sprint-view";
                    }
                  }
                }, 5000); // Vérifier toutes les 5 secondes
              };

              checkSprintReady();

            } else {
              // Pour blog et social media, comportement normal
              setShowProgressiveModal(false);

              if (currentGeneratingFeature === "blog") {
                toast({
                  title: "🎉 Premier article généré !",
                  description: "Votre contenu est prêt à être publié",
                });
              } else if (currentGeneratingFeature === "social_media") {
                toast({
                  title: "🎉 Premier post généré !",
                  description: "Votre contenu social media est prêt",
                });
              }
            }

            setCurrentGeneratingFeature(null);
          }}
        />
      )}

      {/* ✅ NOUVEAU : Modal de sélection des plateformes sociales */}
      <SocialPlatformSelector
        open={showPlatformSelector}
        onClose={() => {
          setShowPlatformSelector(false);
          setPendingFeatureId(null);
        }}
        onConfirm={handlePlatformConfirm}
      />

    </DashboardLayout>
  );
};

export default UserFeatures;
