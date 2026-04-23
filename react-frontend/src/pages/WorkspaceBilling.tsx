import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { useWorkspace } from '@/hooks/useWorkspace';
import { workspaceService, type BillingInvoice } from '@/services/workspaceService';
import { createPurchase } from '@/components/payments/src/services/purchaseService';
import {
  CreditCard, CheckCircle2, Clock, AlertCircle, Zap,
  FileText, RefreshCw, Star, Sparkles, Hourglass, Monitor, ArrowRight, Globe, XCircle,
} from 'lucide-react';

// ─── Plan Brouillon (informatif — aucun achat) ───────────────────────────────

const DRAFT_PLAN = {
  features: [
    'Éditeur du site',
    'Création de pages',
    'Configuration des produits',
    'Planning réservation',
    'Gestion des réservations',
    'Test du formulaire de réservation',
    'Prévisualisation du site',
  ],
  noFeatures: [
    'Blog & articles',
    'Réseaux sociaux',
    'Calendrier des réservations',
    'Saisons tarifaires',
    'Langues du site',
    'Fournisseurs & dépenses',
    'Tâches internes',
    'Blog IA / Social IA',
    'Export avancé & Analytics',
  ],
};

// ─── Plans par site (informatifs ici — achat via /dashboard/site/{id}/billing) ──

const SITE_PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 35000,
    priceEur: 8,
    color: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
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

// ─── Plan Workspace (achetable directement ici) ──────────────────────────────

const WORKSPACE_PLAN = {
  key: 'premium',
  name: 'Agence',
  price: 200000,
  priceEur: 40,
  features: [
    'Jusqu\'à 5 sites Starter inclus',
    'Multi-sites',
    'Création workspace client',
    'Livraison site client',
    'Analytics multi-sites',
    'Support prioritaire',
  ],
  extras: [
    '6ᵉ site Starter : +35 000 Ar/mois',
    'Site Pro : +120 000 Ar/mois',
    'Langue supplémentaire : +15 000 Ar/mois',
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: BillingInvoice['status']) {
  const map: Record<string, { label: string; cls: string }> = {
    paid:    { label: 'Payée',     cls: 'bg-green-100 text-green-700' },
    issued:  { label: 'Émise',     cls: 'bg-blue-100 text-blue-700' },
    draft:   { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600' },
    overdue: { label: 'En retard', cls: 'bg-red-100 text-red-700' },
    void:    { label: 'Annulée',   cls: 'bg-slate-100 text-slate-400' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SitePlanInfoCard({ plan }: { plan: typeof SITE_PLANS[0] }) {
  const Icon = plan.icon;
  return (
    <div className={`relative rounded-xl border-2 bg-white p-5 flex flex-col shadow-sm ${plan.color}`}>
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
      </div>
      <p className="text-2xl font-extrabold text-slate-900">
        {workspaceService.formatAmountAriary(plan.price)}
        <span className="text-sm font-normal text-slate-400">/mois</span>
      </p>
      <p className="text-sm text-slate-400 mb-4">{workspaceService.formatAmountEur(plan.priceEur)}/mois</p>
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
    </div>
  );
}

function DraftSitePlanCard() {
  return (
    <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-5 flex flex-col shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Brouillon</span>
      </div>
      <p className="text-2xl font-extrabold text-slate-400">
        Gratuit
      </p>
      <p className="text-sm text-slate-300 mb-4">Sans abonnement</p>
      <ul className="space-y-1.5 text-xs flex-1">
        {DRAFT_PLAN.features.map(f => (
          <li key={f} className="flex items-start gap-1.5 text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
        {DRAFT_PLAN.noFeatures.map(f => (
          <li key={f} className="flex items-start gap-1.5 text-slate-300">
            <span className="w-3.5 h-3.5 shrink-0 text-center leading-none font-bold">—</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: BillingInvoice }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 text-sm font-mono text-slate-600">{invoice.invoice_number}</td>
      <td className="py-3 px-4 text-sm text-slate-700">
        {workspaceService.getPlanLabel(invoice.plan_key)}
        {invoice.site_name && (
          <span className="text-xs text-slate-400 ml-1">— {invoice.site_name}</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm font-semibold text-slate-800">
        {workspaceService.formatAmountAriary(invoice.amount_ariary)}
        {invoice.amount_eur != null && (
          <span className="text-xs font-normal text-slate-400 ml-1">
            / {workspaceService.formatAmountEur(invoice.amount_eur)}
          </span>
        )}
      </td>
      <td className="py-3 px-4">{statusBadge(invoice.status)}</td>
      <td className="py-3 px-4 text-xs text-slate-400">
        {invoice.due_at ? new Date(invoice.due_at).toLocaleDateString('fr-FR') : '—'}
      </td>
      <td className="py-3 px-4">
        {invoice.status === 'paid' && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Payée
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function WorkspaceBilling() {
  const { workspace, isLoading } = useWorkspace();
  const navigate  = useNavigate();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadInvoices = () => {
    setInvoicesLoading(true);
    workspaceService.getInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  };

  useEffect(() => { loadInvoices(); }, []);

  const handleSelectEntreprise = async () => {
    setPlanLoading(true);
    setErrorMsg(null);
    try {
      const order = await createPurchase({
        source: 'workspace-subscription',
        sourceItemId: 'premium',
        itemName: 'Plan Workspace Entreprise — Mensuel',
        itemDescription: 'Activation du plan Entreprise pour votre workspace Pixel Rise',
        priceEur: WORKSPACE_PLAN.priceEur,
        priceAriary: WORKSPACE_PLAN.price,
      });
      navigate(`/purchases/invoice/${order.id}`);
    } catch {
      setErrorMsg('Une erreur est survenue. Veuillez réessayer.');
      setPlanLoading(false);
    }
  };

  const currentPlan = workspace?.plan_key ?? null;
  const isEntreprise = currentPlan === 'premium';
  const isSuspendedOrExpired =
    workspace?.workspace_status === 'suspended' ||
    workspace?.workspace_status === 'pending_deletion';

  const pendingProofInvoices = invoices.filter(
    inv => (inv.status === 'issued' || inv.status === 'overdue') && inv.payment_method
  );

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-slate-500" />
            Plan et facturation
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Gérez votre abonnement et vos paiements</p>
        </div>

        {/* Erreur */}
        {errorMsg && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Paiement en attente de validation */}
        {pendingProofInvoices.length > 0 && (
          <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-5">
            <div className="flex items-start gap-3">
              <Hourglass className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800">Paiement en cours de vérification</p>
                <p className="text-sm text-blue-700 mt-1">
                  Votre preuve de paiement a été reçue. Notre équipe valide sous 24h et active votre plan automatiquement.
                </p>
                {pendingProofInvoices.map(inv => (
                  <p key={inv.id} className="text-xs text-blue-500 mt-1 font-mono">
                    {inv.invoice_number} — {workspaceService.formatAmountAriary(inv.amount_ariary)}
                    {inv.amount_eur != null && ` / ${workspaceService.formatAmountEur(inv.amount_eur)}`}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Compte suspendu */}
        {isSuspendedOrExpired && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-5">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Réactivez votre compte</p>
                <p className="text-sm text-amber-700 mt-1">
                  Choisissez un plan ci-dessous pour réactiver votre workspace.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statut workspace actuel */}
        {!isLoading && workspace && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">Plan workspace actuel</p>
              <p className="font-bold text-slate-800 text-lg">
                {workspaceService.getPlanLabel(currentPlan)}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${workspaceService.getPlanColor(currentPlan)}`}>
                {workspace.subscription_status ?? workspace.workspace_status}
              </span>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">Sites publiés</p>
              <p className="font-bold text-slate-800 text-lg">
                {workspace.published_sites_count}
                <span className="text-slate-400 font-normal text-sm"> / {workspace.max_published_sites}</span>
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">Prochaine échéance</p>
              <p className="font-bold text-slate-800 text-sm">
                {workspace.subscription_ends_at
                  ? new Date(workspace.subscription_ends_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                  : workspace.trial_ends_at
                    ? `Essai → ${new Date(workspace.trial_ends_at).toLocaleDateString('fr-FR')}`
                    : '—'}
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            SECTION 1 — Plan Workspace (Gratuit vs Entreprise)
            ════════════════════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-slate-100">
              <Globe className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Plan Workspace</h2>
              <p className="text-xs text-slate-500">
                S'applique à votre workspace entier, indépendamment des plans par site
              </p>
            </div>
          </div>

          {/* Explication */}
          <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600">
            Le plan workspace détermine les fonctionnalités globales (création de workspaces clients, multi-sites, livraison…).
            Chaque site garde son propre plan (Starter / Pro) <strong>indépendamment</strong>.
          </div>

          {/* Grille FREE + ENTREPRISE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">

            {/* ── Carte FREE ── */}
            <div className={`rounded-xl border-2 bg-white p-5 flex flex-col shadow-sm ${!isEntreprise ? 'border-slate-300' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Gratuit</span>
                {!isEntreprise && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Actuel</span>
                )}
              </div>
              <p className="text-2xl font-extrabold text-slate-900">
                Gratuit
                <span className="text-sm font-normal text-slate-400"> · toujours</span>
              </p>
              <p className="text-sm text-slate-400 mb-3">&nbsp;</p>

              {/* Avertissement essai 14 jours */}
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 mb-4">
                <p className="text-xs text-amber-700">
                  <strong>Essai 14 jours</strong> — disparaît dès qu'un site est publié (Starter ou Pro), pour tout le workspace.
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
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {[
                  'Pas de workspace client',
                  'Pas de livraison de site',
                  "Pas d'analytics multi-sites",
                  'Pas de support prioritaire',
                ].map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-slate-300">
                    <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5 w-full py-2.5 rounded-lg text-sm font-semibold text-center bg-slate-100 text-slate-400 cursor-default">
                {!isEntreprise ? 'Plan actuel' : 'Version gratuite'}
              </div>
            </div>

            {/* ── Carte ENTREPRISE ── */}
            <div className="relative rounded-xl border-2 border-purple-300 ring-1 ring-purple-200 bg-white p-5 flex flex-col shadow-sm">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Recommandé
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Entreprise</span>
                {isEntreprise && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Actuel</span>
                )}
              </div>
              <p className="text-2xl font-extrabold text-slate-900">
                {workspaceService.formatAmountAriary(WORKSPACE_PLAN.price)}
                <span className="text-sm font-normal text-slate-400">/mois</span>
              </p>
              <p className="text-sm text-slate-400 mb-3">{workspaceService.formatAmountEur(WORKSPACE_PLAN.priceEur)}/mois</p>

              <ul className="space-y-1.5 text-xs text-slate-600 flex-1">
                {WORKSPACE_PLAN.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {/* Extras facturables */}
              <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2">
                <p className="text-xs font-semibold text-purple-700 mb-1">Options supplémentaires</p>
                <ul className="space-y-0.5 text-xs text-purple-600">
                  {WORKSPACE_PLAN.extras.map(e => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleSelectEntreprise}
                disabled={isEntreprise || planLoading}
                className={`mt-5 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                  isEntreprise
                    ? 'bg-slate-300 cursor-default'
                    : 'bg-purple-600 hover:bg-purple-700 cursor-pointer disabled:opacity-60'
                }`}
              >
                {isEntreprise ? 'Plan actuel' : planLoading ? 'Traitement…' : 'Choisir Entreprise'}
              </button>
            </div>
          </div>

          {/* Note Entreprise */}
          <div className="rounded-lg bg-purple-50 border border-purple-100 p-3">
            <p className="text-xs font-semibold text-purple-800 mb-1">À propos du plan Entreprise</p>
            <ul className="space-y-0.5 text-xs text-purple-700">
              <li>• 5 sites Starter inclus — à partir du 6ᵉ : +35 000 Ar (Starter) ou +120 000 Ar (Pro) par site.</li>
              <li>• Langue supplémentaire sur un site : +15 000 Ar/mois.</li>
              <li>• Chaque site reste <strong>indépendant</strong> avec ses propres contenus et fonctionnalités.</li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 mt-3 text-center">
            Paiement MVola ou Orange Money · Activation sous 24h après validation par notre équipe
          </p>
        </section>

        {/* Séparateur */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plans par site</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* ════════════════════════════════════════════════════
            SECTION 2 — Plans par site (Starter / Pro)
            ════════════════════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-blue-100">
              <Monitor className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Plans par site — Starter & Pro</h2>
              <p className="text-xs text-slate-500">
                Chaque site a son propre plan, indépendant de votre workspace
              </p>
            </div>
          </div>

          {/* Explication + comment faire */}
          <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
            <p className="font-semibold mb-2">Comment activer ou changer le plan d'un projet ?</p>
            <ol className="space-y-1 list-none">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-500 shrink-0">①</span>
                Cliquez sur <strong>Gérer mes projets</strong> ci-dessous pour voir tous vos projets.
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DraftSitePlanCard />
            {SITE_PLANS.map(plan => (
              <SitePlanInfoCard key={plan.key} plan={plan} />
            ))}
          </div>

          <button
            onClick={() => navigate('/workspace')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-blue-200 hover:bg-blue-50 rounded-xl text-sm font-medium text-blue-600 transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Gérer mes projets
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>

        {/* ── Factures ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Mes factures
            </h2>
            <button
              onClick={loadInvoices}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {invoicesLoading ? (
              <div className="p-8 text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-slate-400">Chargement des factures…</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400">Aucune facture pour l'instant</p>
                <p className="text-xs text-slate-300 mt-1">Choisissez un plan pour générer votre première facture</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="text-left py-3 px-4">N° Facture</th>
                      <th className="text-left py-3 px-4">Plan</th>
                      <th className="text-left py-3 px-4">Montant</th>
                      <th className="text-left py-3 px-4">Statut</th>
                      <th className="text-left py-3 px-4">Échéance</th>
                      <th className="text-left py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <InvoiceRow key={inv.id} invoice={inv} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </div>
    </WorkspaceLayout>
  );
}
