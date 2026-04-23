import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import api from '@/services/api';
import {
  Building2, Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, XCircle, Globe,
  Crown, Users, CreditCard, TrendingUp, FileText, Timer,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkspaceItem {
  id: number;
  name: string;
  status: 'trial_active' | 'active' | 'grace' | 'suspended' | 'pending_deletion' | 'deleted';
  plan_key: string | null;
  sub_status: string | null;
  sub_ends_at: string | null;
  trial_ends_at: string | null;
  published_count: number;
  sites_count: number;
  created_at: string;
  owner: { id: number; name: string; email: string } | null;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  from: number;
  to: number;
}

interface WorkspaceStats {
  total: number;
  trial_active: number;
  active: number;
  grace: number;
  suspended: number;
  pending_deletion: number;
  trial_expiring_soon: number;
  mrr_ariary: number;
  invoices_pending: number;
  plan_breakdown: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WS_STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  trial_active:     { label: 'Essai',       cls: 'bg-blue-100 text-blue-700',   icon: Clock },
  active:           { label: 'Actif',        cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  grace:            { label: 'Grâce',        cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  suspended:        { label: 'Suspendu',     cls: 'bg-red-100 text-red-600',     icon: XCircle },
  pending_deletion: { label: 'Suppression',  cls: 'bg-red-100 text-red-700',     icon: AlertTriangle },
  deleted:          { label: 'Supprimé',     cls: 'bg-slate-100 text-slate-400', icon: XCircle },
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter', pro: 'Pro', premium: 'Agence',
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-600',
  pro:     'bg-indigo-100 text-indigo-700',
  premium: 'bg-amber-100 text-amber-700',
};

const PLAN_TEXT_COLORS: Record<string, string> = {
  starter: 'text-slate-600',
  pro:     'text-indigo-700',
  premium: 'text-amber-700',
};

const NEXT_STATUSES: Record<string, string[]> = {
  trial_active:     ['active', 'suspended'],
  active:           ['suspended', 'grace'],
  grace:            ['active', 'suspended'],
  suspended:        ['active', 'pending_deletion'],
  pending_deletion: ['active', 'deleted'],
  deleted:          [],
};

const STATUS_LABELS: Record<string, string> = {
  trial_active: 'Essai actif', active: 'Actif', grace: 'Grâce',
  suspended: 'Suspendu', pending_deletion: 'Suppression en attente', deleted: 'Supprimé',
};

// ─── Status dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({
  workspace,
  onChanged,
}: {
  workspace: WorkspaceItem;
  onChanged: (id: number, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const next = NEXT_STATUSES[workspace.status] ?? [];

  if (next.length === 0) return null;

  const handleChange = async (status: string) => {
    setOpen(false);
    setLoading(true);
    try {
      await api.put(`/admin/workspaces/${workspace.id}/status`, { status });
      onChanged(workspace.id, status);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors disabled:opacity-40 border border-slate-200 rounded-lg px-2.5 py-1.5"
      >
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin inline" /> : 'Changer statut'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 min-w-[180px]">
          {next.map(s => (
            <button
              key={s}
              onClick={() => handleChange(s)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-slate-700"
            >
              → {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

interface WorkspaceDetail {
  id: number;
  name: string;
  status: string;
  owner: { name: string; email: string; created_at: string } | null;
  members: { user: { name: string; email: string } | null; role: string }[];
  subscriptions: { plan_key: string | null; status: string; starts_at: string; ends_at: string | null }[];
  sites: { id: string; name: string; status: string; subdomain: string | null; created_at: string }[];
  plan_key: string | null;
  published_count: number;
}

function DetailDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/workspaces/${id}`)
      .then(r => setDetail(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : !detail ? (
          <p className="text-sm text-slate-400">Erreur de chargement.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">{detail.name}</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            {/* Owner */}
            <section className="mb-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> Propriétaire
              </h3>
              <p className="text-sm font-medium text-slate-800">{detail.owner?.name ?? '—'}</p>
              <p className="text-xs text-slate-400">{detail.owner?.email ?? '—'}</p>
            </section>

            {/* Members */}
            {detail.members.length > 0 && (
              <section className="mb-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Membres ({detail.members.length})
                </h3>
                <div className="space-y-1.5">
                  {detail.members.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{m.user?.name ?? '—'}</span>
                      <span className="text-xs text-slate-400 capitalize">{m.role}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Subscriptions */}
            <section className="mb-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Souscriptions
              </h3>
              {detail.subscriptions.length === 0 ? (
                <p className="text-xs text-slate-400">Aucune souscription.</p>
              ) : (
                <div className="space-y-2">
                  {detail.subscriptions.map((s, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">{PLAN_LABELS[s.plan_key ?? ''] ?? s.plan_key ?? 'Aucun'}</span>
                        <span className="text-xs text-slate-400 capitalize">{s.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Depuis {new Date(s.starts_at).toLocaleDateString('fr-FR')}
                        {s.ends_at ? ` → ${new Date(s.ends_at).toLocaleDateString('fr-FR')}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Sites */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Sites ({detail.sites.length})
              </h3>
              {detail.sites.length === 0 ? (
                <p className="text-xs text-slate-400">Aucun site.</p>
              ) : (
                <div className="space-y-2">
                  {detail.sites.map(site => (
                    <div key={site.id} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{site.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          site.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>{site.status === 'published' ? 'Publié' : 'Brouillon'}</span>
                      </div>
                      {site.subdomain && (
                        <p className="text-xs text-slate-400 mt-0.5">{site.subdomain}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);

  useEffect(() => {
    api.get('/admin/workspaces/stats')
      .then(r => setStats(r.data.data))
      .catch(() => {});
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await api.get('/admin/workspaces', { params });
      const d = res.data.data;
      setWorkspaces(d.data ?? []);
      setMeta(d);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const t = setTimeout(fetchWorkspaces, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchWorkspaces]);

  const handleStatusChanged = (id: number, newStatus: string) => {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, status: newStatus as WorkspaceItem['status'] } : w));
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-slate-500" />
              Workspaces
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {meta ? `${meta.total} workspace${meta.total > 1 ? 's' : ''} au total` : 'Gestion des workspaces clients'}
            </p>
          </div>
          <button
            onClick={() => fetchWorkspaces()}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: 'Total',          value: stats.total,                color: 'text-slate-800',  icon: Building2,  bg: 'bg-slate-50' },
              { label: 'En essai',       value: stats.trial_active,         color: 'text-blue-700',   icon: Clock,      bg: 'bg-blue-50' },
              { label: 'Actifs',         value: stats.active,               color: 'text-green-700',  icon: CheckCircle2,bg: 'bg-green-50' },
              { label: 'Grâce',          value: stats.grace,                color: 'text-amber-700',  icon: AlertTriangle,bg:'bg-amber-50' },
              { label: 'Suspendus',      value: stats.suspended,            color: 'text-red-600',    icon: XCircle,    bg: 'bg-red-50' },
              { label: 'Essais J-7',     value: stats.trial_expiring_soon,  color: 'text-orange-600', icon: Timer,      bg: 'bg-orange-50' },
              { label: 'Factures',       value: stats.invoices_pending,     color: 'text-purple-700', icon: FileText,   bg: 'bg-purple-50' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`rounded-xl border p-3.5 shadow-sm ${s.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                    <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  </div>
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* MRR */}
        {stats && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium mb-0.5">MRR estimé</p>
              <p className="text-xl font-extrabold text-indigo-700">
                {stats.mrr_ariary.toLocaleString('fr-MG')} Ar
              </p>
            </div>
            <div className="flex gap-4 text-center">
              {Object.entries(stats.plan_breakdown).map(([plan, count]) => (
                <div key={plan}>
                  <p className="text-xs text-slate-400 capitalize">{plan}</p>
                  <p className={`text-lg font-bold ${PLAN_TEXT_COLORS[plan] ?? 'text-slate-700'}`}>{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom workspace, propriétaire, email…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="">Tous les statuts</option>
            <option value="trial_active">Essai</option>
            <option value="active">Actif</option>
            <option value="grace">Grâce</option>
            <option value="suspended">Suspendu</option>
            <option value="pending_deletion">Suppression</option>
            <option value="deleted">Supprimé</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-slate-400">Chargement…</p>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-400">Aucun workspace trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="text-left py-3 px-4">Workspace</th>
                    <th className="text-left py-3 px-4">Propriétaire</th>
                    <th className="text-left py-3 px-4">Plan</th>
                    <th className="text-left py-3 px-4">Sites</th>
                    <th className="text-left py-3 px-4">Statut</th>
                    <th className="text-left py-3 px-4">Créé le</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map(ws => {
                    const sc = WS_STATUS_CONFIG[ws.status] ?? WS_STATUS_CONFIG.active;
                    const Icon = sc.icon;
                    return (
                      <tr key={ws.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                        {/* Workspace */}
                        <td className="py-3.5 px-4">
                          <p className="text-sm font-semibold text-slate-800">{ws.name}</p>
                          <p className="text-xs text-slate-400">#{ws.id}</p>
                        </td>
                        {/* Propriétaire */}
                        <td className="py-3.5 px-4">
                          <p className="text-sm text-slate-700">{ws.owner?.name ?? '—'}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{ws.owner?.email ?? ''}</p>
                        </td>
                        {/* Plan */}
                        <td className="py-3.5 px-4">
                          {ws.plan_key ? (
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[ws.plan_key] ?? 'bg-slate-100 text-slate-600'}`}>
                              {PLAN_LABELS[ws.plan_key] ?? ws.plan_key}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Aucun</span>
                          )}
                        </td>
                        {/* Sites */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm text-slate-700">{ws.sites_count}</span>
                            {ws.published_count > 0 && (
                              <span className="text-xs text-green-600 font-medium">({ws.published_count} publié{ws.published_count > 1 ? 's' : ''})</span>
                            )}
                          </div>
                        </td>
                        {/* Statut */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.cls}`}>
                            <Icon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </td>
                        {/* Date */}
                        <td className="py-3.5 px-4">
                          <p className="text-xs text-slate-400">
                            {new Date(ws.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </td>
                        {/* Actions */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDetailId(ws.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-2.5 py-1.5 transition-colors"
                            >
                              Détails
                            </button>
                            <StatusDropdown workspace={ws} onChanged={handleStatusChanged} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-400">{meta.from}–{meta.to} sur {meta.total} workspaces</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 font-medium">{page} / {meta.last_page}</span>
              <button
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {detailId !== null && (
        <DetailDrawer id={detailId} onClose={() => setDetailId(null)} />
      )}
    </AdminLayout>
  );
}
