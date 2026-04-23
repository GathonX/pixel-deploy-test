import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { workspaceService, type WorkspaceMember } from '@/services/workspaceService';
import { useWorkspace } from '@/hooks/useWorkspace';
import { createPurchase } from '@/components/payments/src/services/purchaseService';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import {
  Users, UserPlus, Shield, Crown, User,
  Trash2, ChevronDown, CheckCircle2, AlertCircle, RefreshCw,
  Mail, Clock, X, CreditCard, Lock, Unlock, Eye, EyeOff,
  Send,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingInvitation {
  id: number;
  name: string;
  email: string;
  role: string;
  site_name: string | null;
  expires_at: string;
}

interface WorkspaceSite {
  id: string;
  name: string;
}

// ─── Role helpers ────────────────────────────────────────────────────────────

const ROLE_INFO: Record<string, { label: string; icon: typeof Crown; cls: string }> = {
  owner:  { label: 'Propriétaire', icon: Crown,  cls: 'bg-amber-100 text-amber-700' },
  admin:  { label: 'Admin',        icon: Shield, cls: 'bg-blue-100 text-blue-700' },
  member: { label: 'Membre',       icon: User,   cls: 'bg-slate-100 text-slate-600' },
  client: { label: 'Client',       icon: User,   cls: 'bg-teal-100 text-teal-700' },
};

function RoleBadge({ role }: { role: string }) {
  const r = ROLE_INFO[role] ?? ROLE_INFO.member;
  const Icon = r.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${r.cls}`}>
      <Icon className="w-3 h-3" />
      {r.label}
    </span>
  );
}

// ─── PIN modal (client manage its own PIN) ────────────────────────────────────

function ClientPinModal({ hasPin, onClose, onSuccess }: {
  hasPin: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [currentPin, setCurrentPin]   = useState('');
  const [newPin, setNewPin]           = useState('');
  const [showNew, setShowNew]         = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [mode, setMode]               = useState<'set' | 'remove'>(hasPin ? 'set' : 'set');

  const handleSet = async () => {
    if (!newPin || newPin.length < 4) { setError('Le code PIN doit faire au moins 4 caractères.'); return; }
    setLoading(true); setError(null);
    try {
      await workspaceService.setClientPin(newPin, hasPin ? currentPin : undefined);
      onSuccess(hasPin ? 'Code PIN modifié.' : 'Code PIN défini. Vos données sont maintenant protégées.');
      onClose();
    } catch {
      setError('Code PIN actuel incorrect ou erreur serveur.');
    } finally { setLoading(false); }
  };

  const handleRemove = async () => {
    if (!currentPin) { setError('Entrez votre code PIN actuel.'); return; }
    setLoading(true); setError(null);
    try {
      await workspaceService.removeClientPin(currentPin);
      onSuccess('Protection supprimée.');
      onClose();
    } catch {
      setError('Code PIN incorrect.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Protéger mes données</h3>
            <p className="text-xs text-slate-500">Seul vous pouvez accéder à vos données avec ce code</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-300 hover:text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        {hasPin && (
          <div className="flex gap-2 mb-5">
            <button onClick={() => { setMode('set'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'set' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Changer le PIN
            </button>
            <button onClick={() => { setMode('remove'); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'remove' ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Supprimer la protection
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {(hasPin) && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Code PIN actuel</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} value={currentPin} onChange={e => setCurrentPin(e.target.value)}
                  placeholder="••••" autoFocus
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'set' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {hasPin ? 'Nouveau code PIN' : 'Code PIN'} <span className="text-slate-400">(min. 4 caractères)</span>
              </label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPin} onChange={e => setNewPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          {mode === 'set' ? (
            <button onClick={handleSet} disabled={loading || !newPin}
              className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {loading ? 'Enregistrement...' : hasPin ? 'Modifier le PIN' : 'Activer la protection'}
            </button>
          ) : (
            <button onClick={handleRemove} disabled={loading || !currentPin}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {loading ? 'Suppression...' : 'Supprimer la protection'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Member row ──────────────────────────────────────────────────────────────

function MemberRow({
  member, currentUserId, onRoleChange, onRemove, onManagePin,
}: {
  member: WorkspaceMember;
  currentUserId: number;
  onRoleChange: (userId: number, role: 'admin' | 'member' | 'client') => void;
  onRemove: (member: WorkspaceMember) => void;
  onManagePin: () => void;
}) {
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isMe = member.id === currentUserId;

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate flex items-center gap-1.5">
          {member.name}
          {isMe && <span className="text-xs text-slate-400 font-normal">(vous)</span>}
        </p>
        <p className="text-xs text-slate-400 truncate">{member.email}</p>
        {/* PIN indicator for client */}
        {member.is_client && member.has_data_pin && !isMe && (
          <p className="text-xs text-teal-600 flex items-center gap-1 mt-0.5">
            <Lock className="w-3 h-3" />
            Données protégées
          </p>
        )}
      </div>
      <p className="text-xs text-slate-400 hidden sm:block shrink-0">
        {member.joined_at ? new Date(member.joined_at).toLocaleDateString('fr-FR') : '—'}
      </p>

      {/* PIN button for the client themselves */}
      {isMe && member.is_client && (
        <button onClick={onManagePin}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors shrink-0 ${
            member.has_data_pin
              ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          title={member.has_data_pin ? 'Gérer ma protection PIN' : 'Protéger mes données'}>
          {member.has_data_pin ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {member.has_data_pin ? 'Protégé' : 'Protéger'}
        </button>
      )}

      {member.is_owner ? (
        <RoleBadge role="owner" />
      ) : (
        <div className="relative group">
          <button className="flex items-center gap-1">
            <RoleBadge role={member.role} />
            {!isMe && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          {!isMe && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-10 min-w-[140px] hidden group-focus-within:block hover:block">
              {(['admin', 'member', 'client'] as const).filter(r => r !== member.role).map(r => (
                <button key={r} onClick={() => onRoleChange(member.id, r)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors">
                  Passer {ROLE_INFO[r].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!member.is_owner && !isMe && (
        <button onClick={() => onRemove(member)}
          className="text-slate-300 hover:text-red-500 transition-colors shrink-0" title="Retirer du workspace">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Deliver workspace modal ──────────────────────────────────────────────────

function DeliverModal({ clientName, onClose, onDelivered }: {
  clientName: string;
  onClose: () => void;
  onDelivered: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleDeliver = async () => {
    setLoading(true);
    setError(null);
    try {
      await workspaceService.deliverWorkspace();
      onDelivered();
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Send className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Livrer le workspace ?</h3>
            <p className="text-xs text-slate-500">Cette action est irréversible</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-300 hover:text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mb-5">
          <p className="font-semibold mb-2">Ce qui va se passer :</p>
          <ul className="space-y-1 text-xs text-amber-700 list-disc list-inside">
            <li>Le workspace sera transféré à <strong>{clientName}</strong></li>
            <li>Vous n'aurez plus accès à ce workspace</li>
            <li>Le client aura le contrôle total (sites, données, membres)</li>
            <li>Si le client a besoin d'aide, il peut vous réinviter depuis son dashboard</li>
          </ul>
        </div>

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

// ─── Invite modal ─────────────────────────────────────────────────────────────

interface OwnerWorkspace { id: string; name: string; status: string; }

function InviteModal({ sites, onClose, onSuccess }: {
  sites: WorkspaceSite[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [role, setRole]                 = useState<'admin' | 'member' | 'client'>('member');
  const [siteId, setSiteId]             = useState('');
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  const [ownerWorkspaces, setOwnerWorkspaces]     = useState<OwnerWorkspace[]>([]);
  const [loadingWs, setLoadingWs]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const INVITE_ROLES: Array<{ value: 'admin' | 'member' | 'client'; label: string; desc: string }> = [
    { value: 'member', label: 'Membre',  desc: 'Accède aux fonctionnalités du site attribué.' },
    { value: 'admin',  label: 'Admin',   desc: 'Accès total identique au propriétaire.' },
    { value: 'client', label: 'Client',  desc: 'Accès complet à un workspace délégué.' },
  ];

  // Load owned workspaces when client role is selected
  useEffect(() => {
    if (role === 'client' && ownerWorkspaces.length === 0) {
      setLoadingWs(true);
      workspaceService.getOwnerWorkspaces()
        .then(ws => { setOwnerWorkspaces(ws); if (ws.length > 0) setTargetWorkspaceId(ws[0].id); })
        .catch(() => {})
        .finally(() => setLoadingWs(false));
    }
    if (role !== 'client') {
      setSiteId('');
    }
  }, [role]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    if (role === 'client' && !targetWorkspaceId) {
      setError('Veuillez sélectionner le workspace à déléguer au client.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await workspaceService.sendInvitation({
        name: name.trim(),
        email: email.trim(),
        role,
        site_id: role !== 'client' ? (siteId || null) : null,
        target_workspace_id: role === 'client' ? targetWorkspaceId : null,
      });
      onSuccess(`Invitation envoyée à ${email.trim()}.`);
      onClose();
    } catch (e: unknown) {
      type ErrData = { message?: string; reason_code?: string; extra_price?: number; extra_price_eur?: number; invitation_token?: string };
      const errData = (e as { response?: { data?: ErrData } })?.response?.data;
      const reasonCode = errData?.reason_code;
      const msg = errData?.message ?? 'Une erreur est survenue.';

      if (reasonCode === 'USER_QUOTA_EXCEEDED') {
        try {
          const extraPrice    = errData?.extra_price ?? 15000;
          const extraPriceEur = errData?.extra_price_eur ?? 3;
          const invToken      = errData?.invitation_token ?? '';
          const order = await createPurchase({
            source: 'workspace-user',
            sourceItemId: invToken,
            itemName: `Utilisateur supplémentaire — ${name.trim()}`,
            itemDescription: `Invitation de ${name.trim()} (${email.trim()}) en tant que ${ROLE_INFO[role]?.label ?? role} du workspace`,
            priceEur: extraPriceEur,
            priceAriary: extraPrice,
          });
          onClose();
          navigate(`/purchases/invoice/${order.id}`);
        } catch {
          setError(msg + ' (+15 000 Ar/utilisateur supplémentaire)');
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleInfo = INVITE_ROLES.find(r => r.value === role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-bold text-slate-800 text-lg mb-1">Inviter un collaborateur</h3>
        <p className="text-sm text-slate-500 mb-5">
          Un email sera envoyé avec un lien pour créer son mot de passe et accéder au workspace.
        </p>

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
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="collaborateur@example.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rôle</label>
            <div className="flex gap-2">
              {INVITE_ROLES.map(r => (
                <button key={r.value} onClick={() => setRole(r.value)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    role === r.value
                      ? r.value === 'client'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{selectedRoleInfo?.desc}</p>
          </div>

          {/* Site selector for member/admin */}
          {role !== 'client' && sites.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Site attribué</label>
              <select value={siteId} onChange={e => setSiteId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">— Accès global workspace —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">Si sélectionné, le membre n'aura accès qu'à ce site.</p>
            </div>
          )}

          {/* Workspace selector for client */}
          {role === 'client' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Workspace délégué <span className="text-red-400">*</span>
              </label>
              {loadingWs ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Chargement des workspaces…
                </div>
              ) : ownerWorkspaces.length === 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                  Aucun workspace disponible. Créez d'abord un workspace dédié pour ce client.
                </div>
              ) : (
                <>
                  <select value={targetWorkspaceId} onChange={e => setTargetWorkspaceId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    {ownerWorkspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Le client aura accès complet à ce workspace.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSubmit}
            disabled={loading || !name.trim() || !email.trim() || (role === 'client' && (!targetWorkspaceId || ownerWorkspaces.length === 0))}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Envoi...' : "Envoyer l'invitation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm remove modal ────────────────────────────────────────────────────

function ConfirmRemoveModal({ member, onClose, onConfirm }: {
  member: WorkspaceMember;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => { setLoading(true); await onConfirm(); setLoading(false); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg mb-1">Retirer ce membre ?</h3>
        <p className="text-sm text-slate-500 mb-6">
          <span className="font-semibold text-slate-700">{member.name}</span> perdra l'accès au workspace.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600">Annuler</button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            {loading ? 'Suppression...' : 'Retirer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function WorkspaceUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [members, setMembers]               = useState<WorkspaceMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [sites, setSites]                   = useState<WorkspaceSite[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showInvite, setShowInvite]         = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [removeTarget, setRemoveTarget]     = useState<WorkspaceMember | null>(null);
  const [showPinModal, setShowPinModal]     = useState(false);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [membersData, invitesData, sitesRes] = await Promise.all([
        workspaceService.getMembers(),
        workspaceService.getPendingInvitations(),
        api.get('/site-builder/sites'),
      ]);
      setMembers(membersData);
      setPendingInvites(invitesData);
      const rawSites = sitesRes.data?.data ?? sitesRes.data ?? [];
      setSites(rawSites.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleRoleChange = async (userId: number, role: 'admin' | 'member' | 'client') => {
    await workspaceService.updateMemberRole(userId, role);
    setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m));
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    await workspaceService.removeMember(removeTarget.id);
    setMembers(prev => prev.filter(m => m.id !== removeTarget.id));
  };

  const handleCancelInvite = async (inviteId: number) => {
    await workspaceService.cancelInvitation(inviteId);
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    showSuccess('Invitation annulée.');
  };

  const handlePinSuccess = (msg: string) => {
    showSuccess(msg);
    loadAll(); // reload to refresh has_data_pin
  };

  const owner  = members.find(m => m.is_owner);
  const others = members.filter(m => !m.is_owner);
  const currentUserId = user?.id ?? 0;

  // Check if current user is a client (for PIN button visibility)
  const myMembership = members.find(m => m.id === currentUserId);

  // Livraison : visible si l'owner courant et qu'il y a un client et que ce n'est pas livré
  const clientMember   = members.find(m => m.role === 'client' || m.is_client);
  const isOwner        = owner?.id === currentUserId;
  const canDeliver     = isOwner && !!clientMember && !workspace?.is_delivered;

  const handleDelivered = () => {
    setShowDeliverModal(false);
    // L'owner n'a plus accès → rediriger vers setup
    setTimeout(() => navigate('/workspace/setup', { replace: true }), 1500);
  };

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-slate-500" />
              Membres
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Gérez l'équipe de votre workspace</p>
          </div>
          <div className="flex items-center gap-2">
            {/* PIN button for client users */}
            {myMembership?.is_client && (
              <button onClick={() => setShowPinModal(true)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  myMembership.has_data_pin
                    ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {myMembership.has_data_pin ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {myMembership.has_data_pin ? 'PIN actif' : 'Protéger mes données'}
              </button>
            )}
            {/* Livrer le workspace — visible owner + client dans le workspace + non livré */}
            {canDeliver && (
              <button onClick={() => setShowDeliverModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-semibold rounded-lg transition-colors"
                title="Livrer ce workspace au client">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Livrer</span>
              </button>
            )}
            <button onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
              <UserPlus className="w-4 h-4" />
              Inviter
            </button>
          </div>
        </div>

        {/* Info plan */}
        <div className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-700 mb-1">Accès selon votre plan</p>
          <ul className="space-y-0.5 text-xs text-slate-500">
            <li>• <span className="font-medium text-slate-600">Starter</span> — 1 utilisateur inclus · <span className="inline-flex items-center gap-1"><CreditCard className="w-3 h-3" />+15 000 Ar/utilisateur supplémentaire</span></li>
            <li>• <span className="font-medium text-blue-600">Pro</span> — Jusqu'à 5 utilisateurs inclus (+15 000 Ar au-delà)</li>
            <li>• <span className="font-medium text-purple-600">Agence</span> — Utilisateurs illimités · Rôle Client avec PIN de protection</li>
          </ul>
        </div>

        {successMsg && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMsg}</p>
          </div>
        )}

        {/* Membres actifs */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden mb-6">
          {loading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-slate-400">Chargement…</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">Aucun membre trouvé</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div className="w-10 shrink-0" />
                <div className="flex-1">Membre</div>
                <div className="hidden sm:block shrink-0 w-24">Ajouté le</div>
                <div className="shrink-0 w-28">Rôle</div>
                <div className="shrink-0 w-8" />
              </div>
              {owner && (
                <MemberRow member={owner} currentUserId={currentUserId}
                  onRoleChange={handleRoleChange} onRemove={setRemoveTarget} onManagePin={() => setShowPinModal(true)} />
              )}
              {others.map(m => (
                <MemberRow key={m.id} member={m} currentUserId={currentUserId}
                  onRoleChange={handleRoleChange} onRemove={setRemoveTarget} onManagePin={() => setShowPinModal(true)} />
              ))}
            </>
          )}
        </div>

        {/* Invitations en attente */}
        {pendingInvites.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden mb-4">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Invitations en attente ({pendingInvites.length})
              </h2>
            </div>
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{inv.name}</p>
                  <p className="text-xs text-slate-400 truncate">{inv.email}</p>
                  {inv.site_name && <p className="text-xs text-blue-500 mt-0.5">Site : {inv.site_name}</p>}
                </div>
                <RoleBadge role={inv.role} />
                <p className="text-xs text-slate-400 hidden sm:block shrink-0">
                  Expire {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                </p>
                <button onClick={() => handleCancelInvite(inv.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors shrink-0" title="Annuler">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <p className="text-xs text-slate-400 mt-1 text-right">
            {members.length} membre{members.length > 1 ? 's' : ''} au total
          </p>
        )}
      </div>

      {showInvite && (
        <InviteModal sites={sites} onClose={() => setShowInvite(false)} onSuccess={showSuccess} />
      )}
      {removeTarget && (
        <ConfirmRemoveModal member={removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={handleRemove} />
      )}
      {showPinModal && myMembership?.is_client && (
        <ClientPinModal
          hasPin={myMembership.has_data_pin}
          onClose={() => setShowPinModal(false)}
          onSuccess={handlePinSuccess}
        />
      )}
      {showDeliverModal && clientMember && (
        <DeliverModal
          clientName={clientMember.name}
          onClose={() => setShowDeliverModal(false)}
          onDelivered={handleDelivered}
        />
      )}
    </WorkspaceLayout>
  );
}
