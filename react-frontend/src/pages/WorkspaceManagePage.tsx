import { useState, useEffect } from 'react';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { useNavigate, useParams } from 'react-router-dom';
import { workspaceService } from '@/services/workspaceService';
import { setActiveWorkspaceId } from '@/services/api';
import {
  Building2, RefreshCw, Save, CheckCircle2, AlertTriangle,
  Users, UserPlus, Send as SendIcon, Ban, X, AlertCircle,
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
      onSuccess(`Invitation envoyée à ${email.trim()}.`);
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
            <p className="text-xs text-slate-500">Workspace : <span className="font-semibold text-slate-700">{workspace.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nom complet <span className="text-red-400">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Jean Dupont" autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email <span className="text-red-400">*</span></label>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspaceManagePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [workspace, setWorkspace]           = useState<OwnedWs | null>(null);
  const [loading, setLoading]               = useState(true);
  const [notFound, setNotFound]             = useState(false);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);

  // Rename form
  const [newName, setNewName]               = useState('');
  const [renaming, setRenaming]             = useState(false);
  const [renameError, setRenameError]       = useState('');
  const [renameSuccess, setRenameSuccess]   = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]       = useState('');
  const [deleting, setDeleting]             = useState(false);
  const [deleteError, setDeleteError]       = useState('');

  // Modals
  const [showInviteModal, setShowInviteModal]   = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setActiveWorkspaceId(workspaceId);
    workspaceService.getOwnerWorkspaces()
      .then(wsList => {
        const found = wsList.find(w => String(w.id) === String(workspaceId));
        if (!found) {
          setNotFound(true);
        } else {
          setWorkspace(found);
          setNewName(found.name);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !newName.trim() || newName.trim() === workspace.name) return;
    setRenaming(true);
    setRenameError('');
    setRenameSuccess(false);
    try {
      await workspaceService.renameWorkspace(workspace.id, newName.trim());
      setWorkspace(prev => prev ? { ...prev, name: newName.trim() } : prev);
      setRenameSuccess(true);
      setTimeout(() => setRenameSuccess(false), 3000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setRenameError(err?.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace || deleteInput !== workspace.name) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await workspaceService.deleteWorkspace(workspace.id);
      navigate('/workspace/settings');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setDeleteError(err?.response?.data?.message ?? 'Erreur lors de la suppression.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      </WorkspaceLayout>
    );
  }

  if (notFound || !workspace) {
    return (
      <WorkspaceLayout>
        <div className="p-6 text-center text-slate-400">Workspace introuvable.</div>
      </WorkspaceLayout>
    );
  }

  const statusCfg = STATUS_LABELS[workspace.status] ?? { label: workspace.status, cls: 'bg-slate-100 text-slate-500' };
  const planLabel = workspaceService.getPlanLabel(workspace.plan_key);
  const planColor = workspaceService.getPlanColor(workspace.plan_key);

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-500" />
            Gérer le workspace
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">{workspace.name}</p>
        </div>

        {successMsg && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
            {successMsg}
          </div>
        )}

        {/* Workspace info card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{workspace.name}</p>
                <p className="text-xs text-slate-400">Workspace #{workspace.id}</p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planColor}`}>{planLabel}</span>
            <span className="text-xs text-slate-400">{workspace.sites_count} site{workspace.sites_count !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Actions rapides</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/workspace/users')}
              className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Users className="w-4 h-4 text-blue-500" />
              Voir les membres
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4 text-teal-500" />
              Inviter le client
            </button>
            <button
              onClick={() => setShowDeliverModal(true)}
              className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <SendIcon className="w-4 h-4 text-orange-500" />
              Livrer au client
            </button>
          </div>
        </div>

        {/* Rename form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            Nom du workspace
          </h2>
          <p className="text-xs text-slate-400 mb-4">Ce nom est visible par tous les membres du workspace.</p>

          <form onSubmit={handleRename} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              maxLength={100}
              minLength={2}
              placeholder="Nom du workspace"
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
            <button
              type="submit"
              disabled={renaming || !newName.trim() || newName.trim() === workspace.name}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {renaming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </form>

          {renameSuccess && (
            <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Nom mis à jour.
            </p>
          )}
          {renameError && <p className="mt-2 text-sm text-red-500">{renameError}</p>}
        </div>

        {/* Danger zone */}
        {workspace.status !== 'pending_deletion' && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
            <h2 className="font-semibold text-red-600 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Zone danger
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              La suppression du workspace désactivera tous les sites publiés et supprimera toutes les données après 30 jours.
              Cette action est irréversible passé ce délai.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <Ban className="w-4 h-4" />
                Supprimer le workspace
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Tapez <span className="font-mono font-bold text-red-600">{workspace.name}</span> pour confirmer :
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder={workspace.name}
                  className="w-full border border-red-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeleteError(''); }}
                    className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleteInput !== workspace.name}
                    className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Confirmer la suppression
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {workspace.status === 'pending_deletion' && (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Suppression planifiée</p>
              <p className="text-xs text-red-500 mt-0.5">
                Ce workspace sera supprimé définitivement dans 30 jours. Contactez le support pour annuler.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteClientModal
          workspace={workspace}
          onClose={() => setShowInviteModal(false)}
          onSuccess={showSuccess}
        />
      )}

      {showDeliverModal && (
        <DeliverWorkspaceModal
          workspace={workspace}
          onClose={() => setShowDeliverModal(false)}
          onDelivered={() => {
            navigate('/workspace/settings');
          }}
        />
      )}
    </WorkspaceLayout>
  );
}
