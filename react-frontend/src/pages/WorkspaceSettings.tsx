import { useState, useEffect } from 'react';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { useNavigate } from 'react-router-dom';
import { workspaceService } from '@/services/workspaceService';
import { getActiveWorkspaceId, setActiveWorkspaceId } from '@/services/api';
import { createPurchase } from '@/components/payments/src/services/purchaseService';
import {
  Building2, RefreshCw, Plus, MoreHorizontal, ArrowUpRight, Users,
  UserPlus, Send as SendIcon, ArrowRight, Ban, X, AlertCircle, Briefcase,
} from 'lucide-react';

type OwnedWs = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  is_delivered: boolean;
  plan_key: string | null;
  sites_count: number;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  trial_active:     { label: "Période d'essai", cls: 'bg-blue-100 text-blue-700' },
  active:           { label: 'Actif',            cls: 'bg-green-100 text-green-700' },
  grace:            { label: 'Période de grâce', cls: 'bg-amber-100 text-amber-700' },
  suspended:        { label: 'Suspendu',          cls: 'bg-red-100 text-red-600' },
  pending_deletion: { label: 'Suppression en cours', cls: 'bg-red-100 text-red-700' },
};

// ─── Create Workspace Modal ───────────────────────────────────────────────────

function CreateWorkspaceModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
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

// ─── Invite Client Modal ──────────────────────────────────────────────────────

function InviteClientModal({ workspace, onClose, onSuccess }: {
  workspace: { id: string; name: string };
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

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

// ─── Deliver Workspace Modal ──────────────────────────────────────────────────

function DeliverWorkspaceModal({ workspace, onClose, onDelivered }: {
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
          <p className="font-semibold mb-1">Suppression différée de 30 jours</p>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspaceSettings() {
  const navigate = useNavigate();

  const [workspaces, setWorkspaces]         = useState<OwnedWs[]>([]);
  const [loading, setLoading]               = useState(true);
  const [menuOpenId, setMenuOpenId]         = useState<string | null>(null);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Modals
  const [inviteClientWs, setInviteClientWs] = useState<OwnedWs | null>(null);
  const [renameWs, setRenameWs]             = useState<OwnedWs | null>(null);
  const [deliverWs, setDeliverWs]           = useState<OwnedWs | null>(null);
  const [deleteWs, setDeleteWs]             = useState<OwnedWs | null>(null);

  useEffect(() => {
    workspaceService.getOwnerWorkspaces()
      .then(ws => setWorkspaces(ws))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeWorkspaces = workspaces.filter(ws => !ws.is_delivered);

  const handleSwitch = (wsId: string, redirect?: string) => {
    setActiveWorkspaceId(wsId);
    navigate(redirect ?? '/workspace');
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-500" />
              Gestion des workplaces
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Gérez tous vos workspaces clients.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau workspace
          </button>
        </div>

        {successMsg && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : activeWorkspaces.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="font-medium">Aucun workspace actif</p>
            <p className="text-sm mt-1">Créez votre premier workspace client pour commencer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeWorkspaces.map(ws => {
              const planLabel = workspaceService.getPlanLabel(ws.plan_key);
              const planColor = workspaceService.getPlanColor(ws.plan_key);
              const statusCfg = STATUS_LABELS[ws.status] ?? { label: ws.status, cls: 'bg-slate-100 text-slate-500' };
              const isActiveWs = String(ws.id) === String(getActiveWorkspaceId());

              return (
                <div
                  key={ws.id}
                  onClick={() => { handleSwitch(ws.id, `/workspace/${ws.id}`); }}
                  className={`relative rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
                    isActiveWs
                      ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-300'
                      : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  {/* Header: name + menu */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className={`w-4 h-4 shrink-0 ${isActiveWs ? 'text-indigo-500' : 'text-slate-400'}`} />
                      <p className={`text-sm font-semibold truncate ${isActiveWs ? 'text-indigo-800' : 'text-slate-800'}`}>
                        {ws.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isActiveWs && (
                        <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
                          Actif
                        </span>
                      )}

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
                              <button
                                onClick={() => { handleSwitch(ws.id, `/workspace/${ws.id}`); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                              >
                                <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                                Ouvrir le workspace
                              </button>
                              <button
                                onClick={() => { handleSwitch(ws.id, '/workspace/users'); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                              >
                                <Users className="w-4 h-4 text-blue-500" />
                                Voir les membres
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                onClick={() => { setInviteClientWs(ws); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                              >
                                <UserPlus className="w-4 h-4 text-teal-500" />
                                Inviter le client
                              </button>
                              <button
                                onClick={() => { setDeliverWs(ws); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                              >
                                <SendIcon className="w-4 h-4 text-orange-500" />
                                Livrer au client
                              </button>

                              <div className="my-1 border-t border-slate-100" />

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

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planColor}`}>
                      {planLabel}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {ws.sites_count} site{ws.sites_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateWorkspaceModal onClose={() => setShowCreateModal(false)} />}

      {inviteClientWs && (
        <InviteClientModal
          workspace={inviteClientWs}
          onClose={() => setInviteClientWs(null)}
          onSuccess={showSuccess}
        />
      )}

      {renameWs && (
        <RenameWorkspaceModal
          workspace={renameWs}
          onClose={() => setRenameWs(null)}
          onRenamed={newName => {
            setWorkspaces(prev => prev.map(w => w.id === renameWs.id ? { ...w, name: newName } : w));
            showSuccess(`Workspace renommé en "${newName}".`);
          }}
        />
      )}

      {deliverWs && (
        <DeliverWorkspaceModal
          workspace={deliverWs}
          onClose={() => setDeliverWs(null)}
          onDelivered={() => {
            setWorkspaces(prev => prev.map(w => w.id === deliverWs.id ? { ...w, is_delivered: true } : w));
            showSuccess(`Workspace "${deliverWs.name}" livré au client.`);
          }}
        />
      )}

      {deleteWs && (
        <DeleteWorkspaceModal
          workspace={deleteWs}
          onClose={() => setDeleteWs(null)}
          onDeleted={() => {
            setWorkspaces(prev => prev.filter(w => w.id !== deleteWs.id));
            showSuccess(`Workspace "${deleteWs.name}" supprimé.`);
          }}
        />
      )}
    </WorkspaceLayout>
  );
}
