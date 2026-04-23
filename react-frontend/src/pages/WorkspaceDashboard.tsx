import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { workspaceService } from '@/services/workspaceService';
import { createPurchase } from '@/components/payments/src/services/purchaseService';
import api, { getActiveWorkspaceId, setActiveWorkspaceId } from '@/services/api';
import { PlatformProvider, usePlatform } from '@/components/site-builder/src/contexts/PlatformContext';
import { SiteCard } from '@/components/site-builder/src/components/sites/SiteCard';
import type { Site } from '@/components/site-builder/src/types/platform';
import {
  Globe, Plus, Clock, CheckCircle2,
  CreditCard, Users, CalendarCheck,
  TrendingUp, UserCheck, ArrowRight, Ban, Timer,
  CheckSquare, Languages, Briefcase, X, AlertCircle, LifeBuoy,
  Building2, Send as SendIcon, MoreHorizontal, UserPlus, ArrowUpRight, Lock,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkspaceOverview {
  reservations_this_month: number;
  pending_count: number;
  confirmed_count: number;
  today_arrivals: number;
  recent_reservations: {
    id: number;
    name: string;
    email: string;
    date: string;
    guests: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    created_at: string;
  }[];
  sites_total: number;
  sites_published: number;
}

// ─── Site Summary Type ───────────────────────────────────────────────────────

interface SiteSummary {
  id: string;
  name: string;
  published: boolean;
  reservations_month: number;
  tasks_pending: number;
  languages: number;
  updated_at: string | null;
}

// ─── Sites Stats Card (enterprise multi-sites) ────────────────────────────────

function SitesSummaryCard({ summaries }: { summaries: SiteSummary[] }) {
  if (summaries.length === 0) return null;
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400" />
          Résumé par site
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        {summaries.map(s => (
          <div key={s.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.published ? 'bg-green-400' : 'bg-slate-300'}`} />
              <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${s.published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {s.published ? 'Publié' : 'Brouillon'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CalendarCheck className="w-3 h-3" />
                {s.reservations_month} rés. ce mois
              </span>
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                {s.tasks_pending} tâche{s.tasks_pending !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Languages className="w-3 h-3" />
                {s.languages} langue{s.languages !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Create Client Workspace Modal ───────────────────────────────────────────

function CreateWorkspaceModal({ onClose }: { onClose: () => void }) {
  const navigate   = useNavigate();
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const order = await createPurchase({
        source: 'client-workspace',
        sourceItemId: name.trim(),
        itemName: `Workspace Client — ${name.trim()}`,
        itemDescription: `Création d'un workspace délégué pour un client : "${name.trim()}". Accès validé après confirmation du paiement.`,
        priceEur: 10,
        priceAriary: 50000,
      });
      onClose();
      navigate(`/purchases/invoice/${order.id}`);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-base">Créer un workspace client</h3>
            <p className="text-xs text-slate-500">Sera activé après validation du paiement</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Nom du workspace <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Hôtel Baobab, Restaurant Le Zébu…"
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs text-purple-700">
            <p className="font-semibold mb-1">Ce qui se passe ensuite :</p>
            <ol className="space-y-0.5 list-decimal list-inside text-purple-600">
              <li>Vous êtes redirigé vers la page de paiement (50 000 Ar)</li>
              <li>L'équipe PixelRise valide votre demande</li>
              <li>Le workspace est activé et vous pouvez inviter votre client</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading || !name.trim()}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Traitement...' : 'Continuer vers le paiement'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Client Modal (from workspace card) ────────────────────────────────

function InviteClientModal({ workspace, onClose, onSuccess }: {
  workspace: { id: string; name: string };
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await workspaceService.sendInvitation({
        name: name.trim(),
        email: email.trim(),
        role: 'client',
        target_workspace_id: String(workspace.id),
      });
      onSuccess(`Invitation envoyée à ${email.trim()} pour "${workspace.name}".`);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-base">Inviter le client</h3>
            <p className="text-xs text-slate-500">
              Workspace : <span className="font-semibold text-slate-700">{workspace.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Nom complet <span className="text-red-400">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Jean Dupont" autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="rounded-lg bg-teal-50 border border-teal-200 p-3 text-xs text-teal-700">
            <p className="font-semibold mb-1">Le client recevra un email pour :</p>
            <ol className="space-y-0.5 list-decimal list-inside text-teal-600">
              <li>Créer son compte (mot de passe)</li>
              <li>Accéder à son workspace « {workspace.name} »</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading || !name.trim() || !email.trim()}
            className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Envoi...' : "Envoyer l'invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rename Workspace Modal ───────────────────────────────────────────────────

function RenameWorkspaceModal({ workspace, onClose, onRenamed }: {
  workspace: { id: string; name: string };
  onClose: () => void;
  onRenamed: (newName: string) => void;
}) {
  const [name, setName]       = useState(workspace.name);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workspace.name) return;
    setLoading(true);
    setError(null);
    try {
      await workspaceService.renameWorkspace(workspace.id, trimmed);
      onRenamed(trimmed);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-base">Renommer le workspace</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-5"
        />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading || !name.trim() || name.trim() === workspace.name}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Enregistrement...' : 'Renommer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Deliver Workspace Card Modal ─────────────────────────────────────────────

function DeliverWorkspaceCardModal({ workspace, onClose, onDelivered }: {
  workspace: { id: string; name: string };
  onClose: () => void;
  onDelivered: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleDeliver = async () => {
    setLoading(true);
    setError(null);
    try {
      await workspaceService.deliverWorkspaceById(workspace.id);
      onDelivered();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Impossible de livrer. Assurez-vous qu'un client est membre du workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <SendIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-base">Livrer le workspace</h3>
            <p className="text-xs text-slate-500">{workspace.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 text-xs text-amber-700 space-y-1">
          <p className="font-semibold">Après la livraison :</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-600">
            <li>Le client prend le contrôle total du workspace</li>
            <li>Vous n'y aurez plus accès en tant que propriétaire</li>
            <li>Le client pourra vous ré-inviter via "Demander de l'aide"</li>
          </ul>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleDeliver} disabled={loading}
            className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Livraison...' : 'Confirmer la livraison'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Workspace Modal ───────────────────────────────────────────────────

function DeleteWorkspaceModal({ workspace, onClose, onDeleted }: {
  workspace: { id: string; name: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await workspaceService.deleteWorkspace(workspace.id);
      onDeleted();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-base">Supprimer le workspace</h3>
            <p className="text-xs text-slate-500">{workspace.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-xs text-red-700">
          <p className="font-semibold mb-1">⚠️ Suppression différée de 30 jours</p>
          <p className="text-red-600">Les sites et données associés seront définitivement supprimés. Contactez le support pour annuler.</p>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Tapez <span className="font-bold text-red-600">{workspace.name}</span> pour confirmer
          </label>
          <input type="text" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder={workspace.name}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleDelete} disabled={loading || confirm !== workspace.name}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Workspaces Section ───────────────────────────────────────────────────────

type OwnedWs = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  is_delivered: boolean;
  plan_key: string | null;
  sites_count: number;
  sites?: { id: string; name: string; status: string }[];
};

function WorkspacesSection({
  currentWorkspaceId,
  onCreateClick,
  isPremium,
}: {
  currentWorkspaceId: number | string;
  onCreateClick: () => void;
  isPremium: boolean;
}) {
  const navigate  = useNavigate();
  const [workspaces, setWorkspaces]           = useState<OwnedWs[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [menuOpenId, setMenuOpenId]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg]           = useState<string | null>(null);
  // Modals
  const [inviteClientWs, setInviteClientWs]   = useState<OwnedWs | null>(null);
  const [renameWs, setRenameWs]               = useState<OwnedWs | null>(null);
  const [deliverCardWs, setDeliverCardWs]     = useState<OwnedWs | null>(null);
  const [deleteWs, setDeleteWs]               = useState<OwnedWs | null>(null);

  useEffect(() => {
    workspaceService.getOwnerWorkspaces()
      .then(ws => setWorkspaces(ws))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Option A : workspaces livrés cachés du dashboard owner
  const activeWorkspaces = workspaces.filter(ws => !ws.is_delivered);

  const handleSwitch = (wsId: string, redirect?: string) => {
    const currentActive = getActiveWorkspaceId() ?? String(currentWorkspaceId);
    setActiveWorkspaceId(wsId);
    navigate(redirect ?? '/workspace');
    if (String(wsId) !== String(currentActive)) {
      window.location.reload();
    }
  };

  const showSuccessMsg = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Toujours afficher la section pour que le bouton "Nouveau workspace" soit visible
  if (!loading && activeWorkspaces.length === 0 && !isPremium) return null;

  return (
    <div className="mb-6">
      {/* Modals */}
      {inviteClientWs && (
        <InviteClientModal
          workspace={inviteClientWs}
          onClose={() => setInviteClientWs(null)}
          onSuccess={showSuccessMsg}
        />
      )}
      {renameWs && (
        <RenameWorkspaceModal
          workspace={renameWs}
          onClose={() => setRenameWs(null)}
          onRenamed={newName => {
            setWorkspaces(prev => prev.map(w => w.id === renameWs.id ? { ...w, name: newName } : w));
            showSuccessMsg(`Workspace renommé en "${newName}".`);
          }}
        />
      )}
      {deliverCardWs && (
        <DeliverWorkspaceCardModal
          workspace={deliverCardWs}
          onClose={() => setDeliverCardWs(null)}
          onDelivered={() => {
            setWorkspaces(prev => prev.filter(w => w.id !== deliverCardWs.id));
            showSuccessMsg(`Workspace "${deliverCardWs.name}" livré au client.`);
          }}
        />
      )}
      {deleteWs && (
        <DeleteWorkspaceModal
          workspace={deleteWs}
          onClose={() => setDeleteWs(null)}
          onDeleted={() => {
            setWorkspaces(prev => prev.filter(w => w.id !== deleteWs.id));
            showSuccessMsg(`Workspace "${deleteWs.name}" marqué pour suppression (30 jours).`);
          }}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4" />
          Mes workspaces
          {!loading && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {activeWorkspaces.length}
            </span>
          )}
        </h2>
        <button
          onClick={isPremium ? onCreateClick : () => navigate('/billing')}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            isPremium
              ? 'text-purple-700 bg-purple-100 hover:bg-purple-200'
              : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
          }`}
          title={isPremium ? undefined : 'Passer à Entreprise pour créer des workspaces clients'}
        >
          {isPremium ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          Nouveau workspace
        </button>
      </div>

      {successMsg && (
        <div className="mb-3 rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border bg-white p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeWorkspaces.map(ws => {
            const activeId   = getActiveWorkspaceId() ?? String(currentWorkspaceId);
            const isActive   = String(ws.id) === String(activeId);
            const planLabel  = workspaceService.getPlanLabel(ws.plan_key);
            const planColor  = workspaceService.getPlanColor(ws.plan_key);

            return (
              <div
                key={ws.id}
                className={`relative rounded-xl border p-4 transition-all cursor-default ${
                  isActive
                    ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-300'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header: nom + badge actif + menu ⋯ */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-800' : 'text-slate-800'}`}>
                      {ws.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isActive && (
                      <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
                        Actif
                      </span>
                    )}

                    {/* Menu ⋯ — stopPropagation pour ne pas déclencher handleSwitch */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === ws.id ? null : ws.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
                        title="Actions"
                      >
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>

                      {menuOpenId === ws.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 min-w-[210px]">
                            {/* Navigation */}
                            <button
                              onClick={() => { handleSwitch(String(ws.id), `/workspace/${ws.id}`); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                              Ouvrir le workspace
                            </button>
                            <button
                              onClick={() => { setMenuOpenId(null); navigate('/workspace/settings'); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <Building2 className="w-4 h-4 text-slate-400" />
                              Gérer le workspace
                            </button>
                            <button
                              onClick={() => { handleSwitch(String(ws.id), '/workspace/users'); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <Users className="w-4 h-4 text-blue-500" />
                              Voir les membres
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            {/* Actions client */}
                            <button
                              onClick={() => { setInviteClientWs(ws); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <UserPlus className="w-4 h-4 text-teal-500" />
                              Inviter le client
                            </button>
                            <button
                              onClick={() => { setDeliverCardWs(ws); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <SendIcon className="w-4 h-4 text-orange-500" />
                              Livrer au client
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            {/* Edition + destruction */}
                            <button
                              onClick={() => { setRenameWs(ws); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                            >
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              Renommer
                            </button>
                            <button
                              onClick={() => { setDeleteWs(ws); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                            >
                              <Ban className="w-4 h-4" />
                              Supprimer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges plan + sites */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planColor}`}>
                    {planLabel}
                  </span>
                  <span className="text-xs text-slate-400">
                    {ws.sites_count} site{ws.sites_count !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Liste des sites */}
                {ws.sites && ws.sites.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {ws.sites.map(s => (
                      <div key={s.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === 'published' ? 'bg-green-400' : 'bg-slate-300'}`} />
                        <span className="truncate">{s.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Help Request Banner (client delivered workspace) ─────────────────────────

function HelpRequestBanner({ ownerName }: { ownerName: string | null }) {
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      await workspaceService.requestHelp();
      setSent(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-6 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
        <p className="text-sm font-semibold text-green-800">
          Demande envoyée à {ownerName ?? 'votre créateur'}. Vous serez notifié dès qu'il rejoint le workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <LifeBuoy className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Besoin d'aide avec votre workspace ?</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Invitez {ownerName ?? 'votre créateur'} à collaborer sur votre workspace.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={handleRequest}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <LifeBuoy className="w-4 h-4" />
            {loading ? 'Envoi...' : 'Demander de l\'aide'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Trial Countdown Banner ───────────────────────────────────────────────────

function TrialCountdownBanner({ workspace }: { workspace: NonNullable<ReturnType<typeof useWorkspace>['workspace']> }) {
  if (workspace.workspace_status !== 'trial_active') return null;
  if (!workspace.trial_ends_at) return null;

  const endsAt  = new Date(workspace.trial_ends_at);
  const now     = new Date();
  const msLeft  = endsAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return null; // Le WorkspaceSuspendedBanner prend le relais

  const isUrgent  = daysLeft <= 3;
  const isWarning = daysLeft <= 7;

  const bgClass    = isUrgent  ? 'bg-red-50 border-red-200'
                   : isWarning ? 'bg-amber-50 border-amber-200'
                   : 'bg-blue-50 border-blue-200';
  const textClass  = isUrgent  ? 'text-red-800'
                   : isWarning ? 'text-amber-800'
                   : 'text-blue-800';
  const iconClass  = isUrgent  ? 'text-red-500'
                   : isWarning ? 'text-amber-500'
                   : 'text-blue-500';
  const btnClass   = isUrgent  ? 'bg-red-600 hover:bg-red-700'
                   : isWarning ? 'bg-amber-600 hover:bg-amber-700'
                   : 'bg-blue-600 hover:bg-blue-700';

  const progress = Math.max(0, Math.min(100, (daysLeft / 14) * 100));

  return (
    <div className={`rounded-xl border p-4 mb-6 ${bgClass}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Timer className={`w-5 h-5 shrink-0 ${iconClass}`} />
          <div>
            <p className={`text-sm font-semibold ${textClass}`}>
              {daysLeft === 1
                ? 'Dernier jour d\'essai gratuit !'
                : `Il vous reste ${daysLeft} jours d'essai gratuit`}
            </p>
            <div className="mt-1.5 w-48 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        <Link
          to="/billing"
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors ${btnClass}`}
        >
          <CreditCard className="w-4 h-4" />
          S'abonner maintenant
        </Link>
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Plan Card ───────────────────────────────────────────────────────────────

function PlanCard({ workspace }: { workspace: NonNullable<ReturnType<typeof useWorkspace>['workspace']> }) {
  const planColor = workspaceService.getPlanColor(workspace.plan_key);
  const planLabel = workspaceService.getPlanLabel(workspace.plan_key);

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Mon Plan</h3>
        <span className={`text-xs px-3 py-1 rounded-full font-bold ${planColor}`}>{planLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 text-xs">Sites créés</p>
          <p className="font-bold text-slate-800 text-lg">
            {workspace.total_sites_count ?? 0}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 text-xs">Sites publiés</p>
          <p className="font-bold text-slate-800 text-lg">
            {workspace.published_sites_count}
            <span className="text-slate-400 font-normal text-sm">/{workspace.max_published_sites}</span>
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 text-xs">IA activée</p>
          <p className="font-bold text-lg">
            {workspace.ai_enabled
              ? <span className="text-green-600">Oui</span>
              : <span className="text-slate-400">Non</span>}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-slate-500 text-xs">Langues / site</p>
          <p className="font-bold text-slate-800">{workspace.languages_per_site}</p>
        </div>
      </div>
      <Link
        to="/billing"
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <CreditCard className="w-4 h-4" />
        Gérer la facturation
      </Link>
    </div>
  );
}

// ─── Sites Section (uses PlatformContext) ─────────────────────────────────────

function SitesSectionInner({ canPublishMore }: { canPublishMore: boolean }) {
  const { sites, getSiteDomains, deleteSite, isLoading: sitesLoading } = usePlatform();
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  const confirmDelete = () => {
    if (!siteToDelete) return;
    deleteSite(siteToDelete.id);
    setSiteToDelete(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4" />
          Mes projets
          {!sitesLoading && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {sites.length}
            </span>
          )}
        </h2>
      </div>

      {sitesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border bg-white overflow-hidden animate-pulse">
              <div className="aspect-video bg-slate-200" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center">
          <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-500">Aucun projet créé</p>
          <Link
            to="/site-builder"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer un projet
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sites.slice(0, 4).map(site => (
              <SiteCard
                key={site.id}
                site={site}
                domains={getSiteDomains(site.id)}
                onDelete={setSiteToDelete}
                canPublishMore={canPublishMore}
              />
            ))}
          </div>
          {sites.length > 4 && (
            <Link
              to="/site-builder"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              Voir tous les projets ({sites.length})
            </Link>
          )}
        </>
      )}

      <AlertDialog open={!!siteToDelete} onOpenChange={() => setSiteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données du projet{' '}
              <strong>"{siteToDelete?.name}"</strong> seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Recent Reservations ─────────────────────────────────────────────────────

const STATUS_MAP = {
  pending:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmée',  cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',    cls: 'bg-red-100 text-red-700' },
};

function RecentReservations({ items }: { items: WorkspaceOverview['recent_reservations'] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
        <CalendarCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Aucune demande récente</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm">Activité récente</h3>
        <Link
          to="/dashboard/reservations"
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
        >
          Voir tout <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map(r => {
          const s = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
          return (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-slate-600">
                  {r.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(r.date).toLocaleDateString('fr-FR')} · {r.guests} voyageur{r.guests > 1 ? 's' : ''}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.cls}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { workspace, isLoading, hasNoWorkspace, isSuspended, isTrialExpired } = useWorkspace();
  const [overview, setOverview]           = useState<WorkspaceOverview | null>(null);
  const [sitesSummary, setSitesSummary]   = useState<SiteSummary[]>([]);
  const [showCreateWs, setShowCreateWs]   = useState(false);

  // Redirect /workspace → /workspace/:activeId so the URL always reflects the active workspace
  useEffect(() => {
    if (location.pathname === '/workspace') {
      const activeId = getActiveWorkspaceId();
      if (activeId) {
        navigate(`/workspace/${activeId}`, { replace: true });
        return;
      }
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (hasNoWorkspace) {
      navigate('/workspace/setup', { replace: true });
      return;
    }
    api.get('/workspace/overview')
      .then(r => setOverview(r.data.data))
      .catch(() => {});
    api.get('/workspace/sites-summary')
      .then(r => setSitesSummary(r.data.data ?? []))
      .catch(() => {});
  }, [hasNoWorkspace, navigate]);

  const canPublishMore = workspace
    ? workspace.published_sites_count < workspace.max_published_sites
    : false;

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isLoading ? 'Workspace' : workspace?.name ?? 'Mon Workspace'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSuspended || isTrialExpired ? (
              <Link
                to="/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                title="Réactivez votre abonnement pour créer un projet"
              >
                <Ban className="w-4 h-4" />
                Plan requis
              </Link>
            ) : (
              <button
                onClick={() => {
                  if (workspace?.id) setActiveWorkspaceId(String(workspace.id));
                  navigate('/site-builder');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nouveau projet
              </button>
            )}
          </div>
        </div>

        {/* Banner d'aide — client d'un workspace livré */}
        {workspace?.is_delivered && workspace.delivered_to_user_id === user?.id && (
          <HelpRequestBanner ownerName={workspace.owner_name} />
        )}

        {/* Trial countdown */}
        {workspace && <TrialCountdownBanner workspace={workspace} />}

        {/* Stats cards — visibles pour tous */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Demandes ce mois"
            value={overview?.reservations_this_month ?? '—'}
            sub="Total reçues"
            icon={TrendingUp}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="En attente"
            value={overview?.pending_count ?? '—'}
            sub="À traiter"
            icon={Clock}
            color="bg-amber-100 text-amber-600"
          />
          <StatCard
            label="Confirmées"
            value={overview?.confirmed_count ?? '—'}
            sub="Ce mois"
            icon={CheckCircle2}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            label="Arrivées aujourd'hui"
            value={overview?.today_arrivals ?? '—'}
            sub="Voyageurs confirmés"
            icon={UserCheck}
            color="bg-purple-100 text-purple-600"
          />
        </div>

        {/* Mes workspaces */}
        {workspace && (
          <WorkspacesSection
            currentWorkspaceId={workspace.id}
            onCreateClick={() => setShowCreateWs(true)}
            isPremium={workspace.plan_key === 'premium' && !isSuspended && !isTrialExpired}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Sites + Recent */}
          <div className="lg:col-span-2 space-y-6">
            <PlatformProvider>
              <SitesSectionInner canPublishMore={canPublishMore} />
            </PlatformProvider>

            {overview && (
              <RecentReservations items={overview.recent_reservations} />
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {workspace && <PlanCard workspace={workspace} />}

            {sitesSummary.length > 1 && (
              <SitesSummaryCard summaries={sitesSummary} />
            )}

            {/* Quick links */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3 text-sm">Accès rapide</h3>
              <div className="space-y-1">
                {[
                  { to: '/billing',                 icon: CreditCard,    label: 'Plan et facturation' },
                  { to: '/workspace/users',         icon: Users,         label: 'Membres' },
                  { to: '/dashboard/reservations',  icon: CalendarCheck, label: 'Réservations' },
                  { to: '/studio-domaine',          icon: Globe,         label: 'Domaines' },
                ].map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700"
                  >
                    <item.icon className="w-4 h-4 text-slate-400" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreateWs && <CreateWorkspaceModal onClose={() => setShowCreateWs(false)} />}
    </WorkspaceLayout>
  );
}
