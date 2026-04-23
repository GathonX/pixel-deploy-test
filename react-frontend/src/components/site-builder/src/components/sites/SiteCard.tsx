import { useState } from 'react';
import { Site, Domain } from '../../types/platform';
import { Edit, Eye, Globe, MoreHorizontal, Trash2, ExternalLink, LayoutDashboard, Zap, AlertCircle, CheckCircle2, Clock, Building2, CreditCard, ShoppingCart } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { usePlatform } from '../../contexts/PlatformContext';
import { useNavigate, Link } from 'react-router-dom';

interface SiteCardProps {
  site: Site;
  domains: Domain[];
  onDelete: (site: Site) => void;
  canPublishMore?: boolean;
}

// Extrait l'image hero du site (mise à jour automatique via React Query)
function extractHeroImage(pages?: any[]): string | null {
  if (!pages?.length) return null;
  const sorted = [...pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const page of sorted) {
    const sections: any[] = [...(page.sections || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    for (const section of sections) {
      const typeId = (section.sectionTypeId || section.section_type_id || '').toLowerCase();
      if (!typeId.includes('hero')) continue;
      const bg  = section.content?.backgroundImage as string | undefined;
      const img = section.content?.image as string | undefined;
      if (bg  && (bg.startsWith('http')  || bg.startsWith('/')))  return bg;
      if (img && (img.startsWith('http') || img.startsWith('/'))) return img;
    }
  }
  return null;
}

// Génère un slug URL-safe
const slugify = (text: string) =>
  text.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function SiteCard({ site, domains, onDelete, canPublishMore = false }: SiteCardProps) {
  const navigate = useNavigate();
  const { templates } = usePlatform();
  // Plan propre au site (OFFER-3) : draft / included / starter / pro
  // 'included' = inclus dans workspace Entreprise (≠ plan Starter payant dédié)
  const SITE_PLAN_LABELS: Record<string, string> = {
    draft:    'Brouillon',
    included: 'Inclus Entreprise',
    starter:  'Starter',
    pro:      'Pro',
  };
  const SITE_PLAN_COLORS: Record<string, string> = {
    draft:    'bg-slate-100 text-slate-500',
    included: 'bg-indigo-100 text-indigo-700',
    starter:  'bg-blue-100 text-blue-700',
    pro:      'bg-violet-100 text-violet-700',
  };
  const sitePlanKey = (site as any).effectivePlanKey ?? 'draft';
  const planLabel = SITE_PLAN_LABELS[sitePlanKey] ?? sitePlanKey;
  const planColor = SITE_PLAN_COLORS[sitePlanKey] ?? 'bg-slate-100 text-slate-500';
  const [iframeReady, setIframeReady] = useState(false);

  const template = templates.find(t => t.id === site.sourceTemplateId);
  const isPublished = site.status === 'published';

  // Image hero — fallback pendant le chargement de l'iframe
  const heroImage = extractHeroImage((site as any).pages);
  const thumbnailSrc = heroImage || template?.thumbnail || '/placeholder.svg';

  // Domaine personnalisé vérifié
  const verifiedCustomDomain = domains.find(d => ['verified', 'active'].includes(d.status) && d.type === 'custom');
  const isExternalDomain = !!verifiedCustomDomain;

  const getPreviewUrl = (): string => {
    if (verifiedCustomDomain) return `https://${verifiedCustomDomain.domain}`;
    const templateSlug = slugify(template?.name || 'template');
    const siteSlug = slugify(site.name);
    return `/site-builder/preview/${site.userId}/${templateSlug}/${siteSlug}/${site.previewToken}`;
  };

  const handleViewSite = () => window.open(getPreviewUrl(), '_blank');

  const displayDomain = verifiedCustomDomain
    ? verifiedCustomDomain.domain
    : `.../${site.previewToken.substring(0, 8)}`;

  // Iframe preview uniquement pour les URLs internes (pas domaine custom externe)
  const iframePreviewUrl = !isExternalDomain ? getPreviewUrl() : null;

  return (
    <div className="rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* ── Thumbnail zone ── */}
      <div className="relative aspect-video overflow-hidden bg-muted">

        {/* Fallback : image hero (visible pendant le chargement de l'iframe) */}
        <img
          src={thumbnailSrc}
          alt={site.name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${iframeReady ? 'opacity-0' : 'opacity-100'}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== window.location.origin + '/placeholder.svg') {
              target.src = template?.thumbnail || '/placeholder.svg';
            }
          }}
        />

        {/* Iframe : rendu réel du site (navbar + hero) mis à l'échelle */}
        {iframePreviewUrl && (
          <div
            className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-500 ${iframeReady ? 'opacity-100' : 'opacity-0'}`}
          >
            <div style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: 'top left' }}>
              <iframe
                src={iframePreviewUrl}
                title={site.name}
                scrolling="no"
                loading="lazy"
                onLoad={() => setIframeReady(true)}
                style={{ display: 'block', width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Gradient overlay bas */}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badge statut bas-gauche */}
        <div className="absolute bottom-2 left-2">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium backdrop-blur-sm ${
            isPublished ? 'bg-green-500/90 text-white' : 'bg-slate-700/80 text-white'
          }`}>
            {isPublished
              ? <><CheckCircle2 className="w-3 h-3" /> Publié</>
              : <><Clock className="w-3 h-3" /> Brouillon</>}
          </span>
        </div>
      </div>

      {/* ── Bandeau domaine — visible si publié sans domaine custom ── */}
      {isPublished && !isExternalDomain && (
        <button
          onClick={() => navigate(`/site-builder/domains/${site.id}`)}
          className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 border-b border-orange-100 hover:bg-orange-100 transition-colors group/domain"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingCart className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="text-xs text-orange-700 font-medium truncate">
              Connectez votre propre domaine
            </span>
          </div>
          <ExternalLink className="w-3 h-3 text-orange-400 shrink-0 group-hover/domain:text-orange-600" />
        </button>
      )}

      {/* ── Info zone ── */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Textes — côté gauche */}
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-card-foreground text-sm truncate">{site.name}</h4>
            <div className="flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span
                className="text-xs text-muted-foreground hover:text-primary hover:underline cursor-pointer truncate"
                onClick={handleViewSite}
                title={getPreviewUrl()}
              >
                {displayDomain}
              </span>
              {isExternalDomain && <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
              {template?.name || 'Template'}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {sitePlanKey === 'included' ? (
                <>
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                    Inclus Entreprise
                  </span>
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                    Starter
                  </span>
                </>
              ) : (
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${planColor}`}>
                  {planLabel}
                </span>
              )}
              {site.workspaceName && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                  <Building2 className="w-2.5 h-2.5" />
                  {site.workspaceName}
                </span>
              )}
            </div>
          </div>

          {/* Actions — côté droit : Eye + MoreHorizontal */}
          <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
            <button
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={handleViewSite}
              title="Voir le site"
            >
              <Eye className="w-4 h-4" />
            </button>

            <DropdownMenu>
              <TooltipProvider delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs max-w-[160px]">
                    Éditer · Domaines · Plan · Supprimer
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="bg-popover w-52">
                <DropdownMenuItem asChild>
                  <Link to={`/dashboard/site/${site.id}`} className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                    Dashboard du projet
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate(`/site-builder/editor/${site.id}`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Éditer
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate(`/site-builder/domains/${site.id}`)}>
                  <Globe className="w-4 h-4 mr-2" />
                  Domaines
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {isPublished ? (
                  <DropdownMenuItem onClick={handleViewSite}>
                    <Eye className="w-4 h-4 mr-2" />
                    Voir le site
                    {isExternalDomain && <ExternalLink className="w-3 h-3 ml-auto" />}
                  </DropdownMenuItem>
                ) : canPublishMore ? (
                  <DropdownMenuItem onClick={() => navigate(`/site-builder/editor/${site.id}`)}>
                    <Zap className="w-4 h-4 mr-2 text-green-500" />
                    Publier
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to="/billing" className="flex items-center gap-2 cursor-pointer">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Plan requis
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to={`/dashboard/site/${site.id}/billing`} className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    Plan du site
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(site)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
