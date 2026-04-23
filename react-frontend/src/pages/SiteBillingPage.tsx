import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CreditCard, CheckCircle2, Star, Zap, AlertCircle, ArrowLeft,
  Monitor, Sparkles, Globe, XCircle, Lock, Clock, ArrowRight,
} from 'lucide-react';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PlatformProvider, usePlatform } from '@/components/site-builder/src/contexts/PlatformContext';
import { createPurchase } from '@/components/payments/src/services/purchaseService';
import { workspaceService } from '@/services/workspaceService';
import { useWorkspace } from '@/hooks/useWorkspace';

// ─── Plan Brouillon (gratuit, aucun achat) ────────────────────────────────────

const DRAFT_PLAN_FEATURES = [
  'Éditeur du site',
  'Création de pages',
  'Configuration des produits',
  'Planning réservation',
  'Gestion des réservations',
  'Test du formulaire de réservation',
  'Prévisualisation du site',
];
const DRAFT_PLAN_NO_FEATURES = [
  'Blog & articles',
  'Réseaux sociaux',
  'Calendrier des réservations',
  'Saisons tarifaires',
  'Langues du site',
  'Fournisseurs & dépenses',
  'Tâches internes',
  'Blog IA / Social IA',
  'Export avancé & Analytics',
];

// ─── Plans par site ───────────────────────────────────────────────────────────

const SITE_PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 35000,
    priceEur: 8,
    color: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
    cta: 'bg-slate-800 hover:bg-slate-900',
    icon: Star,
    features: [
      'Calendrier des réservations',
      'Gestion des réservations',
      'Gestion des produits touristiques',
      'Gestion des saisons tarifaires',
      'Formulaire de réservation intégré',
      'Blog manuel',
      '1 langue incluse (+ 15 000 Ar/langue sup.)',
      '1 utilisateur inclus (+ 15 000 Ar/utilisateur)',
    ],
    noFeatures: [
      'Gestion fournisseurs & dépenses',
      'Gestion des tâches internes',
      'Blog automatique IA',
      'Publications réseaux sociaux IA',
      'Export avancé',
      'Automatisation des tâches',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 120000,
    priceEur: 25,
    color: 'border-blue-300 ring-1 ring-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    cta: 'bg-blue-600 hover:bg-blue-700',
    icon: Zap,
    popular: true,
    features: [
      'Tout Starter +',
      'Gestion des fournisseurs et dépenses',
      'Gestion des tâches internes',
      'Blog automatique IA',
      'Publications réseaux sociaux IA',
      'Analytics avancé',
      'Export avancé',
      'Automatisation des tâches',
      '2 langues incluses (+ 15 000 Ar/langue sup.)',
      'Multi-utilisateurs (+ 15 000 Ar/utilisateur)',
    ],
    noFeatures: [],
  },
];

const PLAN_LABELS: Record<string, string> = {
  draft: 'Gratuit (Draft)',
  starter: 'Starter',
  pro: 'Pro',
};

// ─── Contenu interne ─────────────────────────────────────────────────────────

function SiteBillingContent({ siteId }: { siteId: string }) {
  const { sites } = usePlatform();
  const { workspace, hasNoWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const [sitePlanLoading, setSitePlanLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const site = sites.find(s => String(s.id) === siteId);
  const currentSitePlan = (site as any)?.effectivePlanKey ?? 'draft';
  const isEntreprise = workspace?.plan_key === 'premium';
  const isOwner = workspace?.current_user_role === 'owner';

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur',
    member: 'Membre',
    client: 'Client',
  };

  // ── Achat plan site (Starter / Pro) ──
  const handleSelectSitePlan = async (planKey: string) => {
    if (!site) return;
    const plan = SITE_PLANS.find(p => p.key === planKey);
    if (!plan) return;

    setSitePlanLoading(true);
    setErrorMsg(null);
    try {
      const order = await createPurchase({
        source: 'site-subscription',
        sourceItemId: `${siteId}|${planKey}`,
        siteName: site.name,
        itemName: `Plan ${plan.name} — Site mensuel`,
        itemDescription: `Activation du plan ${plan.name} pour votre site "${site.name}"`,
        priceEur: plan.priceEur,
        priceAriary: plan.price,
      });
      navigate(`/purchases/invoice/${order.id}`);
    } catch {
      setErrorMsg('Une erreur est survenue. Veuillez réessayer.');
      setSitePlanLoading(false);
    }
  };

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 items-center gap-4 px-6 border-b bg-background shrink-0">
        <button className="md:hidden p-2 rounded-md hover:bg-accent" onClick={() => setOpenMobile(true)}>
          <CreditCard className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Monitor className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-semibold">Plan & facturation</h1>
          {site && <span className="text-sm text-slate-400 font-normal">— {site.name}</span>}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      </header>

      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">

        {/* Erreur */}
        {errorMsg && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* ── Résumé : plan actuel site + workspace ── */}
        <div className="mb-5 grid grid-cols-2 gap-3">

          {/* Plan de ce site */}
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
              <Monitor className="w-3 h-3 text-blue-500" />
              Plan de ce site
            </p>
            <p className="font-bold text-slate-800">{PLAN_LABELS[currentSitePlan] ?? currentSitePlan}</p>
            <div className="mt-1">
              {currentSitePlan === 'draft' && (
                <span className="bg-slate-100 text-slate-500 text-xs font-semibold px-2 py-0.5 rounded-full">Non publié</span>
              )}
              {currentSitePlan === 'starter' && (
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">Actif</span>
              )}
              {currentSitePlan === 'pro' && (
                <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-full">Actif</span>
              )}
            </div>
          </div>

          {/* Plan workspace */}
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-slate-400" />
              Plan workspace
            </p>
            {isWorkspaceLoading ? (
              <Clock className="w-4 h-4 text-slate-300 animate-spin mt-1" />
            ) : hasNoWorkspace ? (
              <p className="font-bold text-slate-400">—</p>
            ) : (
              <>
                <p className="font-bold text-slate-800">{isEntreprise ? 'Agence' : 'Gratuit'}</p>
                <div className="mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isEntreprise ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isEntreprise ? 'Actif' : workspace?.workspace_status === 'trial_active' ? 'Essai en cours' : 'Actif'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bannière si Draft */}
        {currentSitePlan === 'draft' && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Votre site est en mode Brouillon (Gratuit)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1.5">✅ Disponible en Brouillon</p>
                <ul className="space-y-0.5">
                  {[
                    "Éditeur du site",
                    "Création de pages",
                    "Configuration des produits",
                    "Planning réservation",
                    "Gestion des réservations",
                    "Test du formulaire de réservation",
                    "Prévisualisation du site",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-green-700">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5">🔒 Nécessite Starter ou Pro</p>
                <ul className="space-y-0.5">
                  {[
                    "Blog & articles",
                    "Réseaux sociaux",
                    "Calendrier des réservations",
                    "Saisons tarifaires",
                    "Langues du site",
                    "Fournisseurs & dépenses",
                    "Tâches internes",
                    "Blog IA / Social IA",
                    "Export avancé & Analytics",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <XCircle className="w-3 h-3 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-xs text-amber-600 border-t border-amber-200 pt-2">
              Passez au plan <strong>Starter</strong> (35 000 Ar/mois) ou <strong>Pro</strong> (120 000 Ar/mois) pour débloquer toutes les fonctionnalités.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            SECTION 1 — Plans par site (Brouillon / Starter / Pro)
            ══════════════════════════════════════════ */}
        <div className="flex items-center gap-3 mb-1">
          <div className="p-1.5 rounded-lg bg-blue-100">
            <Monitor className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Plans par site — Starter &amp; Pro</h2>
            <p className="text-xs text-slate-500">
              Chaque site a son propre plan, indépendant de votre workspace
            </p>
          </div>
        </div>

        {/* Guide activation */}
        <div className="mb-5 mt-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
          <p className="font-semibold mb-2">Comment activer ou changer le plan d'un projet ?</p>
          <ol className="space-y-1 list-none">
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500 shrink-0">①</span>
              Cliquez sur <strong>Gérer mes projets</strong> pour voir tous vos projets.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500 shrink-0">②</span>
              Ouvrez le dashboard du projet concerné.
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-blue-500 shrink-0">③</span>
              Dans le menu latéral gauche, cliquez sur <strong>Plan</strong> pour activer Starter ou Pro sur ce projet uniquement.
            </li>
          </ol>
          <p className="mt-2 text-blue-500">Chaque projet a son plan indépendant — modifier l'un n'affecte pas les autres.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">

          {/* Card Brouillon */}
          <div className={`rounded-xl border-2 bg-slate-50 p-5 flex flex-col shadow-sm ${currentSitePlan === 'draft' ? 'border-slate-400 shadow-md' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Brouillon</span>
              {currentSitePlan === 'draft' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Actif</span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-slate-400">Gratuit</p>
            <p className="text-sm text-slate-300 mb-4">Sans abonnement</p>
            <ul className="space-y-1.5 text-xs flex-1">
              {DRAFT_PLAN_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5 text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
              {DRAFT_PLAN_NO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-1.5 text-slate-300">
                  <span className="w-3.5 h-3.5 shrink-0 text-center leading-none font-bold">—</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5 w-full py-2.5 rounded-lg text-sm font-semibold text-center bg-slate-200 text-slate-400 cursor-default">
              Plan actuel
            </div>
          </div>
          {SITE_PLANS.map(plan => {
            // 'included' = site inclus dans workspace Entreprise → équivalent Starter
            const isCurrent =
              plan.key === currentSitePlan ||
              (plan.key === 'starter' && currentSitePlan === 'included');
            const isIncludedInWorkspace = plan.key === 'starter' && currentSitePlan === 'included';
            const Icon = plan.icon;
            return (
              <div
                key={plan.key}
                className={`relative rounded-xl border-2 bg-white p-5 flex flex-col shadow-sm ${plan.color} ${isCurrent ? 'shadow-md' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      Recommandé
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-slate-600" />
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.badge}`}>{plan.name}</span>
                  {isCurrent && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Actif</span>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-slate-900">
                  {workspaceService.formatAmountAriary(plan.price)}
                  <span className="text-sm font-normal text-slate-400">/mois</span>
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  {workspaceService.formatAmountEur(plan.priceEur)}/mois
                </p>
                <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.noFeatures.map((f: string) => (
                    <li key={f} className="flex items-start gap-1.5 text-slate-300">
                      <span className="w-3.5 h-3.5 shrink-0 text-center leading-none font-bold">—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectSitePlan(plan.key)}
                  disabled={isCurrent || sitePlanLoading}
                  className={`mt-5 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                    isCurrent
                      ? 'bg-slate-300 cursor-default'
                      : `${plan.cta} cursor-pointer disabled:opacity-60`
                  }`}
                >
                  {isIncludedInWorkspace ? 'Inclus dans votre workspace' : isCurrent ? 'Plan actuel' : sitePlanLoading ? 'Traitement…' : 'Choisir ce plan'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 text-center mb-10">
          Paiement par MVola ou Orange Money · Activation sous 24h après validation par notre équipe
        </p>

        {/* Séparateur */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan Workspace</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* ══════════════════════════════════════════
            SECTION 2 — Plan Workspace (avec UX intelligente)
            ══════════════════════════════════════════ */}
        <h2 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-500" />
          Plan Workspace
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Ce plan s'applique à <strong>votre workspace entier</strong> — il détermine vos droits globaux (multi-sites, création de clients, livraison…),
          indépendamment du plan de chaque site.
        </p>

        {/* ── État 1 : chargement ── */}
        {isWorkspaceLoading && (
          <div className="h-24 flex items-center justify-center">
            <Clock className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        )}

        {/* ── État 2 : aucun workspace ── */}
        {!isWorkspaceLoading && hasNoWorkspace && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
            <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 mb-1">Vous n'avez pas encore de workspace</p>
            <p className="text-xs text-slate-400 mb-4">
              Un workspace vous permet de gérer vos sites, d'inviter des collaborateurs et d'accéder aux fonctionnalités avancées.
            </p>
            <button
              onClick={() => navigate('/workspace')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Créer mon workspace <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── État 3 : pas propriétaire ── */}
        {!isWorkspaceLoading && !hasNoWorkspace && !isOwner && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
            <div className="flex items-start gap-3 mb-3">
              <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  Gestion du plan workspace — réservée au propriétaire
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  Vous êtes <strong>{ROLE_LABELS[workspace?.current_user_role ?? ''] ?? workspace?.current_user_role}</strong> sur ce workspace.
                  Le propriétaire est le seul à pouvoir changer le plan workspace (Gratuit / Agence).
                </p>
                {workspace?.owner_name && (
                  <p className="text-xs text-amber-600">
                    Propriétaire : <strong>{workspace.owner_name}</strong>
                    {workspace.owner_email && <> — <span className="font-mono">{workspace.owner_email}</span></>}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/workspace')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-200"
              >
                <Globe className="w-3.5 h-3.5" />
                Voir le workspace
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-3 rounded-lg bg-white border border-amber-200 px-3 py-2">
              <p className="text-xs text-amber-700 font-medium">
                Vous pouvez toujours activer un plan <strong>Starter ou Pro pour ce site</strong> via la section ci-dessus — ce droit est indépendant du plan workspace.
              </p>
            </div>
          </div>
        )}

        {/* ── État 4 : propriétaire — FREE vs ENTREPRISE ── */}
        {!isWorkspaceLoading && !hasNoWorkspace && isOwner && (
          <>
            {/* Contexte : où gérer le plan workspace */}
            <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-start gap-2">
              <Monitor className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Le plan workspace se gère sur la <strong>page de facturation de votre workspace</strong>.
                Ci-dessous, comparez les deux niveaux, puis cliquez sur le bouton pour y accéder.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

              {/* Carte FREE */}
              <div className={`rounded-xl border-2 bg-white p-5 flex flex-col shadow-sm ${!isEntreprise ? 'border-slate-300' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Gratuit</span>
                  {!isEntreprise && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Actuel</span>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-slate-900">
                  Gratuit<span className="text-sm font-normal text-slate-400"> · toujours</span>
                </p>
                <p className="text-sm text-slate-400 mb-3">&nbsp;</p>
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 mb-4">
                  <p className="text-xs text-amber-700">
                    <strong>Essai 14 jours</strong> — disparaît dès qu'un site est publié (Starter ou Pro).
                  </p>
                </div>
                <ul className="space-y-1.5 text-xs flex-1">
                  {[
                    '1 site publié minimum',
                    '2 sites en brouillon',
                    'Gestion des réservations',
                    'Produits touristiques',
                    'Blog manuel',
                    'Réseaux sociaux manuels',
                    '1 utilisateur inclus',
                    'Support standard',
                  ].map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                  {["Pas de workspace client", "Pas de livraison de site", "Pas d'analytics multi-sites", "Pas de support prioritaire"].map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-slate-300">
                      <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 w-full py-2 rounded-lg text-sm font-semibold text-center bg-slate-100 text-slate-400 cursor-default">
                  {!isEntreprise ? 'Plan actuel' : 'Version gratuite'}
                </div>
              </div>

              {/* Carte ENTREPRISE */}
              <div className="relative rounded-xl border-2 border-purple-300 ring-1 ring-purple-200 bg-white p-5 flex flex-col shadow-sm">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">Recommandé</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Entreprise</span>
                  {isEntreprise && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Actuel</span>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-slate-900">
                  {workspaceService.formatAmountAriary(200000)}
                  <span className="text-sm font-normal text-slate-400">/mois</span>
                </p>
                <p className="text-sm text-slate-400 mb-3">{workspaceService.formatAmountEur(40)}/mois</p>
                <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                  {([
                    'Jusqu\'à 5 sites Starter inclus',
                    'Multi-sites',
                    'Création workspace client',
                    'Livraison site client',
                    'Analytics multi-sites',
                    'Support prioritaire',
                  ] as string[]).map(f => (
                    <li key={f} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Options supplémentaires</p>
                  <ul className="space-y-0.5 text-xs text-purple-600">
                    <li>• 6ᵉ site Starter : +35 000 Ar/mois</li>
                    <li>• Site Pro : +120 000 Ar/mois</li>
                    <li>• Langue supplémentaire : +15 000 Ar/mois</li>
                  </ul>
                </div>
                <div className="mt-5 w-full py-2 rounded-lg text-sm font-semibold text-center bg-purple-50 text-purple-400 border border-purple-100 cursor-default">
                  Gérable depuis la facturation workspace →
                </div>
              </div>
            </div>

            {/* CTA principal → /workspace/billing */}
            <button
              onClick={() => navigate('/billing')}
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm ${
                isEntreprise
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isEntreprise ? (
                <><CheckCircle2 className="w-4 h-4" /> Voir ma facturation workspace</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Passer au plan Agence<ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 p-3 mb-1">
              <p className="text-xs font-semibold text-purple-800 mb-0.5">À propos du plan Agence</p>
              <ul className="space-y-0.5 text-xs text-purple-700">
                <li>• S'applique à <strong>votre workspace entier</strong> — jusqu'à 5 sites Starter inclus.</li>
                <li>• À partir du 6ᵉ site : +35 000 Ar (Starter) ou +120 000 Ar (Pro) par site.</li>
                <li>• Langue supplémentaire sur un site : +15 000 Ar/mois.</li>
                <li>• Chaque site reste <strong>indépendant</strong> — ses contenus et son plan propre ne changent pas.</li>
              </ul>
            </div>

            <p className="text-xs text-slate-400 text-center mt-2">
              Paiement par MVola ou Orange Money · Activation sous 24h après validation par notre équipe
            </p>
          </>
        )}

      </div>
    </SidebarInset>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function SiteBillingPage() {
  const { siteId } = useParams<{ siteId: string }>();
  return (
    <DashboardLayout>
      <PlatformProvider>
        <SiteBillingContent siteId={siteId!} />
      </PlatformProvider>
    </DashboardLayout>
  );
}
