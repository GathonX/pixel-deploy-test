import {
  SidebarContent as UiSidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLocation, useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Home,
  CalendarCheck,
  Calendar,
  BookmarkCheck,
  MessageSquare,
  BarChart3,
  Settings,
  Globe,
  Search,
  TicketCheck,
  ChevronDown,
  ArrowLeft,
  FileText,
  PlusCircle,
  Package,
  Languages,
  Lock,
  CreditCard,
  LayoutList,
  Truck,
  Mail,
  ScrollText,
  Flag,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WorkspacePlanBadge } from "@/components/workspace/WorkspacePlanBadge";
import { SiteContextBadge } from "@/components/dashboard/SiteContextBadge";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useState, useEffect } from "react";
import api from "@/services/api";


export function SidebarContent() {
  const location = useLocation();
  const { siteId: paramSiteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Extract siteId from mada-booking vue-site routes (/mada-booking/vue-site/:siteId/...)
  // because the outer route "/mada-booking/*" doesn't capture :siteId via useParams
  const madaSiteIdMatch = location.pathname.match(/\/mada-booking\/vue-site\/([^/]+)/);
  // Also support ?siteId= query param (e.g. /sprint-view?siteId=xxx)
  const siteId = paramSiteId || madaSiteIdMatch?.[1] || searchParams.get('siteId') || undefined;
  useWorkspace();

  // Fetch site's own effective_plan_key — Pro features gated by SITE plan, not workspace plan
  const [sitePlanKey, setSitePlanKey] = useState<string | null>(null);
  useEffect(() => {
    if (!siteId) { setSitePlanKey(null); return; }
    api.get(`/site-builder/sites/${siteId}`)
      .then(res => {
        const data = res.data?.data ?? res.data;
        setSitePlanKey(data?.effective_plan_key ?? null);
      })
      .catch(() => setSitePlanKey(null));
  }, [siteId]);

  // isPro = site has a dedicated Pro plan (120k Ar/mois) — OFFER.md: 'included' = Starter only
  const isPro = sitePlanKey === 'pro';

  // isStarter = site has at least Starter features (included / starter / pro)
  // draft sites only get: editor, pages, products, planning, réservations, form test, preview
  const isStarterOrAbove = ['included', 'starter', 'pro'].includes(sitePlanKey ?? '');

  // Navigate to site billing page to upgrade
  const upgradeSiteBillingUrl = siteId ? `/dashboard/site/${siteId}/billing` : '/billing';

  // Base des liens : site-specific si siteId disponible, sinon legacy
  const base = siteId ? `/dashboard/site/${siteId}` : '/workspace';
  const link = (sub: string) => `${base}${sub}`;

  const isActive = (path: string) => location.pathname === path;
  const isActiveBase = (sub: string) => location.pathname === link(sub);

  return (
    <>
      <UiSidebarContent className="p-2">
        {/* Badge Workspace + Plan */}
        <WorkspacePlanBadge />

        {/* Badge Site actif */}
        <SiteContextBadge />

        {/* Retour au Workspace */}
        <div className="mb-2">
          <Link
            to="/workspace"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-medium">Retour au Workspace</span>
          </Link>
        </div>

        {/* === Navigation Site === */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-blue-400 uppercase tracking-wider px-2 mb-1">
            Mon projet
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {/* Dashboard du site */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveBase('')}>
                  <Link to={link('')}>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Dashboard du projet</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Planning */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith('/mada-booking/vue-site') && !location.pathname.includes('/produits') && !location.pathname.includes('/stats') && !location.pathname.includes('/fournisseurs') && !location.pathname.includes('/emails') && !location.pathname.includes('/cgv')}
                >
                  <Link to={siteId ? `/mada-booking/vue-site/${siteId}` : '/mada-booking/dashboard'}>
                    <div className="flex items-center gap-2">
                      <LayoutList className="w-4 h-4 text-cyan-500" />
                      <span className="font-medium">Planning</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Réservations */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveBase('/reservations')}>
                  <Link to={link('/reservations')}>
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Réservations</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Produits & offres */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.includes('/produits')}>
                  <Link to={siteId ? `/mada-booking/vue-site/${siteId}/produits` : '/mada-booking/dashboard/produits'}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">Produits & offres</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Fournisseurs — Pro+ */}
              <SidebarMenuItem>
                {isPro ? (
                  <SidebarMenuButton asChild isActive={location.pathname.includes('/fournisseurs')}>
                    <Link to={siteId ? `/mada-booking/vue-site/${siteId}/fournisseurs` : '/mada-booking/dashboard/fournisseurs'}>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium">Fournisseurs</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    onClick={() => navigate(upgradeSiteBillingUrl)}
                    className="w-full cursor-pointer opacity-60"
                    title="Fonctionnalité Pro — Passer à Pro pour débloquer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Truck className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">Fournisseurs</span>
                      <Lock className="ml-auto w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Blog — Starter+ uniquement */}
              <SidebarMenuItem>
                {isStarterOrAbove ? (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={location.pathname.startsWith(`${base}/blog`)}
                        className="w-full"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <BookmarkCheck className="w-4 h-4 text-amber-500" />
                          <span className="font-medium">Blog</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu className="ml-4 mt-1 space-y-0.5">
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild size="sm" isActive={isActiveBase('/blog')} className="text-sm">
                            <Link to={link('/blog')}>
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Articles</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild size="sm" isActive={isActiveBase('/blog/create')} className="text-sm">
                            <Link to={link('/blog/create')}>
                              <div className="flex items-center gap-2">
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Nouvel article</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton
                    onClick={() => navigate(upgradeSiteBillingUrl)}
                    className="w-full cursor-pointer opacity-60"
                    title="Disponible à partir du plan Starter"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <BookmarkCheck className="w-4 h-4 text-amber-400" />
                      <span className="font-medium">Blog</span>
                      <Lock className="ml-auto w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Réseaux sociaux — Starter+ uniquement */}
              <SidebarMenuItem>
                {isStarterOrAbove ? (
                  <SidebarMenuButton asChild isActive={isActiveBase('/social')}>
                    <Link to={link('/social')}>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-pink-500" />
                        <span className="font-medium">Réseaux sociaux</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    onClick={() => navigate(upgradeSiteBillingUrl)}
                    className="w-full cursor-pointer opacity-60"
                    title="Disponible à partir du plan Starter"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <MessageSquare className="w-4 h-4 text-pink-400" />
                      <span className="font-medium">Réseaux sociaux</span>
                      <Lock className="ml-auto w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Calendrier */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveBase('/calendar')}>
                  <Link to={link('/calendar')}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-500" />
                      <span className="font-medium">Calendrier</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Mon Actualité */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/mon-actualite' || isActiveBase('/mon-actualite')}>
                  <Link to={siteId ? link('/mon-actualite') : '/mon-actualite'}>
                    <div className="flex items-center gap-2">
                      <ScrollText className="w-4 h-4 text-violet-500" />
                      <span className="font-medium">Mon Actualité</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Tâches (Sprint) */}
              <SidebarMenuItem>
                {isPro ? (
                  <SidebarMenuButton asChild isActive={location.pathname === '/sprint-view'}>
                    <Link to={siteId ? `/sprint-view?siteId=${siteId}` : '/sprint-view'}>
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Tâches</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    onClick={() => navigate(upgradeSiteBillingUrl)}
                    className="w-full cursor-pointer opacity-60"
                    title="Fonctionnalité Pro — Passer à Pro pour débloquer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Flag className="w-4 h-4 text-orange-400" />
                      <span className="font-medium">Tâches</span>
                      <Lock className="ml-auto w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Emails */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.includes('/emails')}>
                  <Link to={siteId ? `/mada-booking/vue-site/${siteId}/emails` : '/mada-booking/dashboard/emails'}>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <span className="font-medium">Emails</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* CGV */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.includes('/cgv')}>
                  <Link to={siteId ? `/mada-booking/vue-site/${siteId}/cgv` : '/mada-booking/dashboard/cgv'}>
                    <div className="flex items-center gap-2">
                      <ScrollText className="w-4 h-4 text-slate-500" />
                      <span className="font-medium">CGV</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Stats Réservations */}
              <SidebarMenuItem>
                {isPro ? (
                  <SidebarMenuButton asChild isActive={location.pathname.includes('/stats')}>
                    <Link to={siteId ? `/mada-booking/vue-site/${siteId}/stats` : '/mada-booking/dashboard/stats'}>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-violet-400" />
                        <span className="font-medium">Stats Réservations</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    onClick={() => navigate(upgradeSiteBillingUrl)}
                    className="w-full cursor-pointer opacity-60"
                    title="Fonctionnalité Pro — Passer à Pro pour débloquer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <BarChart3 className="w-4 h-4 text-violet-400" />
                      <span className="font-medium">Stats Réservations</span>
                      <Lock className="ml-auto w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Statistiques */}
              <SidebarMenuItem>
                {isPro ? (
                  <SidebarMenuButton asChild isActive={isActiveBase('/analytics')}>
                    <Link to={link('/analytics')}>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-violet-500" />
                        <span className="font-medium">Statistiques</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    onClick={() => navigate(upgradeSiteBillingUrl)}
                    className="w-full cursor-pointer opacity-60"
                    title="Fonctionnalité Pro — Passer à Pro pour débloquer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <BarChart3 className="w-4 h-4 text-violet-400" />
                      <span className="font-medium">Statistiques</span>
                      <Lock className="ml-auto w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* === Configuration + Support === */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-blue-400 uppercase tracking-wider px-2 mb-1">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {/* Plan du site */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveBase('/billing')}>
                  <Link to={link('/billing')}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium">Plan</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Langues — Starter+ uniquement */}
              <SidebarMenuItem>
                {isStarterOrAbove ? (
                  <SidebarMenuButton asChild isActive={isActiveBase('/languages')}>
                    <Link to={link('/languages')}>
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4 text-sky-500" />
                        <span className="font-medium">Langues</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    onClick={() => navigate(upgradeSiteBillingUrl)}
                    className="w-full cursor-pointer opacity-60"
                    title="Disponible à partir du plan Starter"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Languages className="w-4 h-4 text-sky-400" />
                      <span className="font-medium">Langues</span>
                      <Lock className="ml-auto w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>

              {/* Paramètres */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActiveBase('/settings')}>
                  <Link to={link('/settings')}>
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Paramètres</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Domaine — dropdown */}
              <SidebarMenuItem>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={location.pathname.startsWith("/studio-domaine")}
                      className="w-full"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="font-medium">Domaine</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-4 mt-1 space-y-0.5">
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" isActive={isActive("/studio-domaine")} className="text-sm">
                          <Link to="/studio-domaine">
                            <div className="flex items-center gap-2">
                              <Home className="w-3.5 h-3.5" />
                              <span>Dashboard</span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" isActive={isActive("/studio-domaine/search")} className="text-sm">
                          <Link to="/studio-domaine/search">
                            <div className="flex items-center gap-2">
                              <Search className="w-3.5 h-3.5" />
                              <span>Recherche domaine</span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>

              {/* Support */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/tickets")}>
                  <Link to="/dashboard/tickets">
                    <div className="flex items-center gap-2">
                      <TicketCheck className="w-4 h-4 text-rose-500" />
                      <span className="font-medium">Support</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </UiSidebarContent>

      <SidebarFooter className="p-3 border-t border-blue-100">
        <p className="text-xs text-slate-400 text-center">Dashboard projet</p>
      </SidebarFooter>
    </>
  );
}
