// src/components/ui/expiration-dropdown.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Crown,
  RefreshCw,
  Settings,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import userFeatureService, {
  UserFeatureExpiration,
  ExpirationSummary,
} from "@/services/userFeatureService";
import RenewalConfirmationModal from "@/components/ui/renewal-confirmation-modal";
import { toast } from "sonner";

// Configuration des icônes par fonctionnalité
const FEATURE_ICONS: Record<string, React.ElementType> = {
  blog: Calendar,
  social_media: Crown,
  business_plan: Settings,
  analytics: CheckCircle,
  default: Calendar,
};

interface ExpirationDropdownProps {
  className?: string;
}

const ExpirationDropdown: React.FC<ExpirationDropdownProps> = ({
  className,
}) => {
  const [summary, setSummary] = useState<ExpirationSummary>({
    total: 0,
    active: 0,
    expired: 0,
    expiring_soon: 0,
    urgent: 0,
    features: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  // ✅ NOUVEAU : États pour le modal de confirmation
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalFeature, setRenewalFeature] = useState<UserFeatureExpiration | null>(null);

  useEffect(() => {
    loadSummary();
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(loadSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadSummary = async () => {
    try {
      setIsLoading(true);
      const data = await userFeatureService.getExpirationSummary();
      setSummary(data);
    } catch (error) {
      console.error("Erreur chargement résumé:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenew = (featureId: number) => {
    const feature = summary.features.find(f => f.id === featureId);

    if (!feature) return;

    if (feature.is_expired) {
      // Fonctionnalité expirée - achat simple (pas de modal)
      toast.success(`📦 Redirection vers l'achat de ${feature.name}...`);

      setTimeout(() => {
        window.location.href = `/features/purchase/${featureId}`;
      }, 500);
    } else {
      // Fonctionnalité encore active (expire dans ≤3 jours) - afficher modal
      setRenewalFeature(feature);
      setShowRenewalModal(true);
    }
  };

  // ✅ NOUVEAU : Confirmer le renouvellement depuis le modal
  const handleConfirmRenewal = () => {
    if (!renewalFeature) return;

    setShowRenewalModal(false);

    toast.success(`📦 Redirection vers l'achat de ${renewalFeature.name}...`);

    setTimeout(() => {
      window.location.href = `/features/purchase/${renewalFeature.id}`;
    }, 500);
  };

  const getFeatureIcon = (key: string) => {
    return FEATURE_ICONS[key] || FEATURE_ICONS.default;
  };

  const getStatusColor = (feature: UserFeatureExpiration) => {
    if (feature.is_expired) return "text-red-600";
    if (feature.days_remaining && feature.days_remaining <= 1) return "text-red-600";
    if (feature.days_remaining && feature.days_remaining <= 3) return "text-orange-600";
    if (feature.days_remaining && feature.days_remaining <= 7) return "text-blue-600";
    return "text-green-600";
  };

  const getStatusIcon = (feature: UserFeatureExpiration) => {
    if (feature.is_expired) return AlertTriangle;
    if (feature.days_remaining && feature.days_remaining <= 3) return AlertTriangle;
    if (feature.days_remaining && feature.days_remaining <= 7) return Clock;
    return CheckCircle;
  };

  const getStatusText = (feature: UserFeatureExpiration) => {
    if (feature.is_expired) {
      // Afficher la date d'expiration pour les fonctionnalités expirées
      if (feature.expires_at) {
        const expiryDate = new Date(feature.expires_at);
        return `Expirée le ${expiryDate.toLocaleDateString('fr-FR')}`;
      }
      return "Expirée";
    }

    if (!feature.days_remaining) return "Active";

    // Afficher la date et heure d'expiration précise pour les expirations imminentes
    if (feature.expires_at && feature.days_remaining <= 7) {
      const expiryDate = new Date(feature.expires_at);
      const dateStr = expiryDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      if (feature.days_remaining <= 0) {
        return `Expire aujourd'hui à ${expiryDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      if (feature.days_remaining === 1) {
        return `Expire demain à ${expiryDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      }

      return `Expire le ${dateStr}`;
    }

    // Pour les expirations lointaines, afficher simplement le nombre de jours
    const periodInfo = feature.billing_period === 'yearly' ? ' (annuel)' : '';
    return `${feature.days_remaining} jours restants${periodInfo}`;
  };

  const getBadgeVariant = (feature: UserFeatureExpiration) => {
    if (feature.is_expired) return "destructive";
    if (feature.days_remaining && feature.days_remaining <= 1) return "destructive";
    if (feature.days_remaining && feature.days_remaining <= 3) return "outline";
    return "secondary";
  };

  // Badge principal avec nombre d'urgences
  const urgentCount = summary.urgent + summary.expired;
  const showBadge = urgentCount > 0;
  
  // Icône dynamique selon le statut
  const getMainIcon = () => {
    if (summary.expired > 0) return AlertTriangle;
    if (summary.urgent > 0) return Clock;
    return Calendar;
  };
  
  const MainIcon = getMainIcon();
  
  // Couleur dynamique selon le statut
  const getIconColor = () => {
    if (summary.expired > 0) return "text-red-600";
    if (summary.urgent > 0) return "text-orange-600";
    return "text-blue-600";
  };

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "relative h-11 w-11 hover:bg-blue-50",
                  className
                )}
              >
                <MainIcon className={cn("h-5 w-5", getIconColor())} />
                {showBadge && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                  >
                    {urgentCount > 9 ? "9+" : urgentCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 text-white">
            <p className="text-sm font-medium">Expirations des fonctionnalités</p>
            {summary.total > 0 && (
              <p className="text-xs text-slate-300">
                {summary.active} actives • {summary.expired} expirées
                {summary.urgent > 0 && ` • ${summary.urgent} urgentes`}
              </p>
            )}
          </TooltipContent>
        </Tooltip>

      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[70vh] p-0"
        sideOffset={5}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Mes Fonctionnalités</h3>
            <Badge variant="secondary" className="text-xs">
              {summary.active} actives
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={loadSummary}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Statistiques */}
        {(summary.expiring_soon > 0 || summary.expired > 0) && (
          <div className="p-3 border-b bg-red-50/50">
            <div className="flex items-center gap-4 text-sm">
              {summary.expiring_soon > 0 && (
                <span className="text-orange-600">
                  ⚠️ {summary.expiring_soon} expirent bientôt
                </span>
              )}
              {summary.expired > 0 && (
                <span className="text-red-600">
                  ❌ {summary.expired} expirées
                </span>
              )}
            </div>
          </div>
        )}

        {/* Liste des fonctionnalités */}
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p>Chargement...</p>
            </div>
          ) : summary.features.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">Aucune fonctionnalité</p>
              <p className="text-sm">Activez des fonctionnalités pour les voir ici</p>
            </div>
          ) : (
            <div className="divide-y">
              {summary.features.map((feature) => {
                const FeatureIcon = getFeatureIcon(feature.key);
                const StatusIcon = getStatusIcon(feature);
                const statusColor = getStatusColor(feature);

                return (
                  <div
                    key={feature.id}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icône de la fonctionnalité */}
                      <div className="flex-shrink-0">
                        <FeatureIcon className="w-5 h-5 text-blue-600" />
                      </div>

                      {/* Informations */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {feature.name}
                          </h4>
                          <StatusIcon className={cn("w-4 h-4", statusColor)} />

                          {/* Badge pour abonnement annuel */}
                          {feature.billing_period === 'yearly' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-500 text-green-600 bg-green-50">
                              📅 An
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className={cn("text-xs", statusColor)}>
                            {getStatusText(feature)}
                          </span>

                          <Badge
                            variant={getBadgeVariant(feature)}
                            className="text-xs"
                          >
                            {feature.is_expired ? "Expirée" : "Active"}
                          </Badge>
                        </div>
                      </div>

                      {/* Bouton Acheter/Renouveler */}
                      {feature.can_renew && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2"
                          onClick={() => handleRenew(feature.id)}
                        >
                          {feature.is_expired ? "Acheter" : "Renouveler"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50">
          <Link to="/features">
            <Button
              variant="outline"
              className="w-full justify-center text-sm h-9"
            >
              <Crown className="w-4 h-4 mr-2" />
              Gérer mes fonctionnalités
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

      {/* ✅ NOUVEAU : Modal de confirmation de renouvellement */}
      {renewalFeature && (
        <RenewalConfirmationModal
          isOpen={showRenewalModal}
          onClose={() => setShowRenewalModal(false)}
          onConfirm={handleConfirmRenewal}
          featureName={renewalFeature.name}
          expiresAt={renewalFeature.expires_at || ''}
          daysRemaining={renewalFeature.days_remaining || 0}
        />
      )}
   </TooltipProvider>
  );
};

export default ExpirationDropdown;