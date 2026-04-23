import { Lock, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SitePlanBlockedBannerProps {
  reasonCode: string;
  message: string;
}

const REASON_LABELS: Record<string, string> = {
  TRIAL_EXPIRED:        'Période d\'essai terminée',
  PLAN_REQUIRED:        'Plan dédié requis',
  PLAN_QUOTA_EXCEEDED:  'Quota de sites atteint',
  NO_ACTIVE_PLAN:       'Aucun plan actif',
};

export function SitePlanBlockedBanner({ reasonCode, message }: SitePlanBlockedBannerProps) {
  const label = REASON_LABELS[reasonCode] ?? 'Publication bloquée';

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
      <Lock className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-700">{label}</p>
        <p className="text-sm text-red-600 mt-0.5">{message}</p>
      </div>
      <Link
        to="/billing"
        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Voir les plans
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
