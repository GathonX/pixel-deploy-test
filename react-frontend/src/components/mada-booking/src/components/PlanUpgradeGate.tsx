import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  premium: "Entreprise",
};

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    "Gestion des produits & offres",
    "Suivi des réservations",
    "Templates d'emails",
    "CGV personnalisables",
  ],
  pro: [
    "Gestion des fournisseurs",
    "Suivi des dépenses",
    "Statistiques avancées",
    "Tarifs par produit",
  ],
};

interface Props {
  error: unknown;
}

export default function PlanUpgradeGate({ error }: Props) {
  const navigate = useNavigate();
  const axiosError = error as any;
  const requiredPlan: string = axiosError?.response?.data?.required_plan || "pro";
  const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan;
  const features = PLAN_FEATURES[requiredPlan] || [];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-white border border-amber-200 rounded-2xl shadow-lg p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Fonctionnalité {planLabel}
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Cette page est réservée aux abonnés{" "}
              <span className="font-semibold text-amber-600">{planLabel}</span>.
              Passez à {planLabel} pour débloquer cette fonctionnalité.
            </p>
          </div>
          {features.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Inclus dans {planLabel}
              </p>
              <ul className="text-sm text-slate-600 space-y-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button
            onClick={() => navigate("/billing")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
          >
            Passer à {planLabel} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
