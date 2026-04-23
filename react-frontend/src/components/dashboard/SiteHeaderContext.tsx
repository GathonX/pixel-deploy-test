import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Globe2 } from 'lucide-react';
import api from '@/services/api';

interface SiteInfo {
  id: string;
  name: string;
  status: string;
  effective_plan_key: string | null;
}

function HeaderPlanBadges({ planKey }: { planKey: string }) {
  if (planKey === 'included') {
    return (
      <>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">
          Inclus Entreprise
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
          Starter
        </span>
      </>
    );
  }
  if (planKey === 'draft') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-500">
        Gratuit
      </span>
    );
  }
  if (planKey === 'starter') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
        Starter
      </span>
    );
  }
  if (planKey === 'pro') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700">
        Pro
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-500">
      {planKey}
    </span>
  );
}

export function SiteHeaderContext() {
  const { siteId: paramSiteId } = useParams<{ siteId: string }>();
  const location = useLocation();
  const madaSiteIdMatch = location.pathname.match(/\/mada-booking\/vue-site\/([^/]+)/);
  const siteId = paramSiteId || madaSiteIdMatch?.[1];

  const [site, setSite] = useState<SiteInfo | null>(null);

  useEffect(() => {
    if (!siteId) return;
    setSite(null);
    api.get(`/site-builder/sites/${siteId}`)
      .then(res => {
        const data = res.data?.data ?? res.data;
        if (data?.id) setSite(data);
      })
      .catch(() => {});
  }, [siteId]);

  if (!siteId || !site) return null;

  const planKey = site.effective_plan_key ?? 'draft';
  const isPublished = site.status === 'published';

  return (
    <div className="hidden sm:flex items-center gap-2">
      <div className="h-5 w-px bg-slate-200" />
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className={`w-2 h-2 rounded-full shrink-0 ${isPublished ? 'bg-green-400' : 'bg-amber-400'}`} />
        <Globe2 className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700 max-w-[160px] truncate">
          {site.name}
        </span>
        <HeaderPlanBadges planKey={planKey} />
      </div>
    </div>
  );
}
