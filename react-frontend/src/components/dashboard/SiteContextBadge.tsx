import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Globe2, ExternalLink } from 'lucide-react';
import api from '@/services/api';

interface SiteInfo {
  id: string;
  name: string;
  status: string;
  effective_plan_key: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-400',
  draft:     'bg-amber-400',
  inactive:  'bg-slate-300',
};

function PlanBadges({ planKey }: { planKey: string }) {
  if (planKey === 'included') {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">
          Inclus Entreprise
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
          Starter
        </span>
      </div>
    );
  }
  if (planKey === 'draft') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-500 shrink-0">
        Gratuit
      </span>
    );
  }
  if (planKey === 'starter') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 shrink-0">
        Starter
      </span>
    );
  }
  if (planKey === 'pro') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700 shrink-0">
        Pro
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-500 shrink-0">
      {planKey}
    </span>
  );
}

export function SiteContextBadge() {
  const { siteId: paramSiteId } = useParams<{ siteId: string }>();
  const location = useLocation();
  const madaSiteIdMatch = location.pathname.match(/\/mada-booking\/vue-site\/([^/]+)/);
  const siteId = paramSiteId || madaSiteIdMatch?.[1];

  const [site, setSite] = useState<SiteInfo | null>(null);

  useEffect(() => {
    if (!siteId) return;
    api.get(`/site-builder/sites/${siteId}`)
      .then(res => {
        const data = res.data?.data ?? res.data;
        if (data?.id) setSite(data);
      })
      .catch(() => {});
  }, [siteId]);

  if (!siteId || !site) return null;

  const planKey = site.effective_plan_key ?? 'draft';
  const statusDot = STATUS_COLORS[site.status] ?? 'bg-slate-300';
  const statusLabel = site.status === 'published' ? 'Publié' : site.status === 'draft' ? 'Brouillon' : site.status;

  return (
    <div className="mx-2 mb-2 p-2 rounded-lg border bg-blue-50/60 border-blue-100">
      {/* Nom du site */}
      <div className="flex items-center gap-1.5 min-w-0 mb-1.5">
        <Globe2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold text-blue-700 truncate">
          {site.name}
        </span>
      </div>

      {/* Badges plan */}
      <div className="flex items-center justify-between gap-1">
        <PlanBadges planKey={planKey} />
      </div>

      {/* Statut + lien éditeur */}
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span>{statusLabel}</span>
        </div>
        <Link
          to={`/site-builder/editor/${siteId}`}
          className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 font-medium"
          title="Ouvrir l'éditeur"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          Éditeur
        </Link>
      </div>
    </div>
  );
}
