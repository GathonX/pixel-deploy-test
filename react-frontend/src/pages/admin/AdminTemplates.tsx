import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import api from '@/services/api';
import {
  FileCode, Search, Archive, RotateCcw, Copy,
  CheckCircle2, Clock, EyeOff, Sparkles, Globe,
  ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: 'active' | 'draft' | 'archived';
  is_premium: boolean;
  version: string;
  price: string | null;
  price_ariary: number | null;
  sites_count: number;
  pages_count: number;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  active:   { label: 'Actif',    cls: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  draft:    { label: 'Brouillon',cls: 'bg-slate-100 text-slate-600',  icon: Clock },
  archived: { label: 'Archivé', cls: 'bg-red-100 text-red-600',      icon: EyeOff },
};

const CATEGORIES = ['Tous', 'Business', 'Voyage', 'Tour Opérateur', 'Santé', 'Restaurant',
  'Sport', 'Portfolio', 'E-commerce', 'SaaS', 'Éducation', 'Tech'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<string>('all');
  const [catFilter, setCat]       = useState<string>('Tous');
  const [actionLoading, setAL]    = useState<string | null>(null);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const load = () => {
    setLoading(true);
    api.get('/site-builder/admin/templates')
      .then(r => setTemplates(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleArchive = async (id: string, currentStatus: string) => {
    setAL(id);
    try {
      if (currentStatus === 'archived') {
        await api.put(`/site-builder/admin/templates/${id}`, { status: 'active' });
        showToast('Template réactivé.');
      } else {
        await api.post(`/site-builder/admin/templates/${id}/archive`);
        showToast('Template archivé.');
      }
      load();
    } catch { showToast('Erreur.', false); }
    finally { setAL(null); }
  };

  const handleDuplicate = async (id: string) => {
    setAL(id + '-dup');
    try {
      await api.post(`/site-builder/admin/templates/${id}/duplicate`);
      showToast('Template dupliqué (brouillon).');
      load();
    } catch { showToast('Erreur.', false); }
    finally { setAL(null); }
  };

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchSearch  = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
      const matchStatus  = statusFilter === 'all' || t.status === statusFilter;
      const matchCat     = catFilter === 'Tous' || t.category === catFilter;
      return matchSearch && matchStatus && matchCat;
    });
  }, [templates, search, statusFilter, catFilter]);

  const stats = useMemo(() => ({
    total:    templates.length,
    active:   templates.filter(t => t.status === 'active').length,
    premium:  templates.filter(t => t.is_premium).length,
    archived: templates.filter(t => t.status === 'archived').length,
  }), [templates]);

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-500'}`}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <FileCode className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Gestion des Templates</h1>
            <p className="text-sm text-slate-500">Administrez les templates du site builder</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total',    value: stats.total,    color: 'text-slate-800' },
            { label: 'Actifs',   value: stats.active,   color: 'text-green-600' },
            { label: 'Premium',  value: stats.premium,  color: 'text-purple-600' },
            { label: 'Archivés', value: stats.archived, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-xl p-4 shadow-sm mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un template…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatus(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="draft">Brouillon</option>
                <option value="archived">Archivé</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Category filter */}
            <div className="relative">
              <select
                value={catFilter}
                onChange={e => setCat(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <span className="text-xs text-slate-400 ml-auto">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileCode className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Aucun template trouvé</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Template</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Catégorie</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pages</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sites</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(t => (
                  <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${t.status === 'archived' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{t.name}</span>
                            {t.is_premium && (
                              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                                <Sparkles className="w-3 h-3" />
                                Premium
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-xs">{t.id} · v{t.version}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">{t.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{t.pages_count}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${t.sites_count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {t.sites_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Duplicate */}
                        <button
                          onClick={() => handleDuplicate(t.id)}
                          disabled={actionLoading === t.id + '-dup'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors"
                          title="Dupliquer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Dupliquer
                        </button>

                        {/* Archive / Restore */}
                        {t.sites_count === 0 ? (
                          <button
                            onClick={() => handleArchive(t.id, t.status)}
                            disabled={actionLoading === t.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors ${
                              t.status === 'archived'
                                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            }`}
                            title={t.status === 'archived' ? 'Réactiver' : 'Archiver'}
                          >
                            {t.status === 'archived'
                              ? <><RotateCcw className="w-3.5 h-3.5" />Réactiver</>
                              : <><Archive className="w-3.5 h-3.5" />Archiver</>
                            }
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic px-3 py-1.5">Utilisé ({t.sites_count} site{t.sites_count > 1 ? 's' : ''})</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
