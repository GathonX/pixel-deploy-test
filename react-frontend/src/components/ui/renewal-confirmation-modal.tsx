// src/components/ui/renewal-confirmation-modal.tsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, ShoppingCart, Info } from "lucide-react";

interface RenewalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  featureName: string;
  expiresAt: string;
  daysRemaining: number;
}

const RenewalConfirmationModal: React.FC<RenewalConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  featureName,
  expiresAt,
  daysRemaining,
}) => {
  const expiryDate = new Date(expiresAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const daysText =
    daysRemaining === 0
      ? "aujourd'hui"
      : daysRemaining === 1
      ? "demain"
      : `dans ${daysRemaining} jours`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="w-6 h-6 text-orange-600" />
            Renouvellement de {featureName}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Votre accès à <strong>{featureName}</strong> expire{" "}
            <strong className="text-orange-600">{daysText}</strong>
            <br />
            <span className="text-sm text-slate-500">({expiryDate})</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Section : Nouvel achat */}
          <Alert className="border-blue-200 bg-blue-50">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong className="block mb-2">📦 Nouvel achat indépendant</strong>
              <ul className="space-y-1 text-sm">
                <li>• Créera un <strong>ACCÈS DISTINCT</strong> avec son propre ID</li>
                <li>• Votre accès actuel restera actif jusqu'à son expiration</li>
                <li>• Le nouvel accès sera activé <strong>APRÈS validation admin</strong> (24-48h)</li>
                <li>• Les deux accès <strong>ne se cumulent PAS</strong></li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Section : Note importante */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong className="block mb-2">⚠️ Note importante</strong>
              <p className="text-sm">
                Si vous achetez maintenant, vous aurez <strong>2 accès distincts</strong> pendant quelques jours
                (le temps de la validation admin).
              </p>
            </AlertDescription>
          </Alert>

          {/* Section : Info */}
          <Alert className="border-slate-200 bg-slate-50">
            <Info className="h-4 w-4 text-slate-600" />
            <AlertDescription className="text-slate-700 text-sm">
              <strong>💡 Conseil :</strong> Vous pouvez attendre l'expiration si vous préférez éviter
              les périodes de chevauchement.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Continuer vers l'achat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenewalConfirmationModal;
