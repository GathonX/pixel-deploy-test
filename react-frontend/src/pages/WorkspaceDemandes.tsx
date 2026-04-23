import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import api from '@/services/api';
import {
  ClipboardList, Search, Filter, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, XCircle, Users, Calendar, RefreshCw,
  ExternalLink, Download,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reservation {
  id: number;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time?: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  interest_description?: string;
  created_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  pending:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700',  icon: Clock },
  confirmed: { label: 'Confirmée',  cls: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  cancelled: { label: 'Annulée',    cls: 'bg-red-100 text-red-600',      icon: XCircle },
};

function StatusBadge({ status }: { status: Reservation['status'] }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

// ─── Status changer ──────────────────────────────────────────────────────────

function StatusChanger({
  reservation,
  onChange,
}: {
  reservation: Reservation;
  onChange: (id: number, status: Reservation['status']) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const next = (['pending', 'confirmed', 'cancelled'] as const)
    .filter(s => s !== reservation.status);

  const handleChange = async (status: Reservation['status']) => {
    setOpen(false);
    setLoading(true);
    await onChange(reservation.id, status);
    setLoading(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium transition-colors disabled:opacity-40"
      >
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
        Changer
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 min-w-[140px]">
          {next.map(s => {
            const info = STATUS_MAP[s];
            const Icon = info.icon;
            return (
              <button
                key={s}
                onClick={() => handleChange(s)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
                {info.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Reservation row ─────────────────────────────────────────────────────────

function ReservationRow({
  reservation,
  onStatusChange,
}: {
  reservation: Reservation;
  onStatusChange: (id: number, status: Reservation['status']) => Promise<void>;
}) {
  const initials = reservation.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
      {/* Client */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">{reservation.name}</p>
            <p className="text-xs text-slate-400 truncate max-w-[140px]">{reservation.email}</p>
          </div>
        </div>
      </td>
      {/* Date arrivée */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-700">
            {new Date(reservation.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
        {reservation.time && (
          <p className="text-xs text-slate-400 mt-0.5 ml-5">{reservation.time.slice(0, 5)}</p>
        )}
      </td>
      {/* Voyageurs */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm text-slate-700">{reservation.guests}</span>
        </div>
      </td>
      {/* Demande */}
      <td className="py-3.5 px-4 hidden lg:table-cell max-w-[200px]">
        <p className="text-xs text-slate-500 truncate">
          {reservation.interest_description ?? '—'}
        </p>
      </td>
      {/* Reçue le */}
      <td className="py-3.5 px-4 hidden sm:table-cell">
        <p className="text-xs text-slate-400">
          {new Date(reservation.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </p>
      </td>
      {/* Statut */}
      <td className="py-3.5 px-4">
        <StatusBadge status={reservation.status} />
      </td>
      {/* Actions */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <StatusChanger reservation={reservation} onChange={onStatusChange} />
          <Link
            to={`/dashboard/reservations`}
            className="text-xs text-blue-600 hover:text-blue-800"
            title="Voir détails"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function WorkspaceDemandes() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [meta, setMeta]   = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [page,     setPage]     = useState(1);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { per_page: 20, page };
      if (search)   params.search    = search;
      if (status)   params.status    = status;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;

      const res = await api.get('/reservations/dashboard', { params });
      setReservations(res.data.data.data ?? []);
      setMeta(res.data.data);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [search, status, dateFrom, dateTo, page]);

  useEffect(() => {
    const t = setTimeout(fetchReservations, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchReservations]);

  const handleStatusChange = async (id: number, newStatus: Reservation['status']) => {
    await api.put(`/reservations/dashboard/${id}/status`, { status: newStatus });
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const handleFilterChange = () => { setPage(1); };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search)   params.set('search',    search);
      if (status)   params.set('status',    status);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to',   dateTo);

      const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token') ?? '';
      const baseUrl = (api.defaults.baseURL ?? '/api').replace(/\/$/, '');
      const url = `${baseUrl}/reservations/dashboard/export?${params.toString()}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' } });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `demandes_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // silently ignore
    }
  };

  // Stats
  const totalCount     = meta?.total ?? 0;
  const pendingCount   = reservations.filter(r => r.status === 'pending').length;
  const confirmedCount = reservations.filter(r => r.status === 'confirmed').length;

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-slate-500" />
              Demandes
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Toutes les demandes reçues sur vos sites</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center gap-1.5 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
            <button
              onClick={() => fetchReservations()}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total',      value: totalCount,     cls: 'text-slate-800' },
            { label: 'En attente', value: pendingCount,   cls: 'text-amber-600' },
            { label: 'Confirmées', value: confirmedCount, cls: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-3 shadow-sm text-center">
              <p className={`text-xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); handleFilterChange(); }}
              placeholder="Rechercher un client…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); handleFilterChange(); }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmées</option>
            <option value="cancelled">Annulées</option>
          </select>

          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); handleFilterChange(); }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); handleFilterChange(); }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          />

          {/* Reset */}
          {(search || status || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-xs text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-lg"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-slate-400">Chargement des demandes…</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-400">Aucune demande trouvée</p>
              <p className="text-xs text-slate-300 mt-1">
                {search || status || dateFrom || dateTo
                  ? 'Modifiez vos filtres pour voir plus de résultats'
                  : 'Les demandes de vos sites apparaîtront ici'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Date d'arrivée</th>
                    <th className="text-left py-3 px-4">Voyageurs</th>
                    <th className="text-left py-3 px-4 hidden lg:table-cell">Demande</th>
                    <th className="text-left py-3 px-4 hidden sm:table-cell">Reçue le</th>
                    <th className="text-left py-3 px-4">Statut</th>
                    <th className="text-left py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <ReservationRow
                      key={r.id}
                      reservation={r}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-slate-400">
              {meta.from}–{meta.to} sur {meta.total} demandes
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600 font-medium">
                {page} / {meta.last_page}
              </span>
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
    </WorkspaceLayout>
  );
}
