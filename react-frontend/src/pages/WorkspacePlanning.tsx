import { useState, useEffect, useCallback } from 'react';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import api from '@/services/api';
import {
  CalendarCheck, RefreshCw, Users, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, MapPin,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  pending:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmée',  cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  cancelled: { label: 'Annulée',    cls: 'bg-red-100 text-red-500',      dot: 'bg-red-400'   },
};

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Group reservations by date string
function groupByDate(reservations: Reservation[]): Map<string, Reservation[]> {
  const map = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const key = r.date.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

// ─── Period selector ─────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'custom';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week',  label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'custom', label: 'Personnalisé' },
];

function computeDateRange(period: Period, customFrom: string, customTo: string): [string, string] {
  const today = startOfDay(new Date());
  switch (period) {
    case 'today':
      return [toISO(today), toISO(today)];
    case 'week': {
      const day = today.getDay(); // 0 = Sun
      const mon = addDays(today, day === 0 ? -6 : 1 - day);
      const sun = addDays(mon, 6);
      return [toISO(mon), toISO(sun)];
    }
    case 'month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return [toISO(from), toISO(to)];
    }
    case 'custom':
      return [customFrom, customTo];
  }
}

// ─── Day column ──────────────────────────────────────────────────────────────

function DayGroup({ dateKey, reservations }: { dateKey: string; reservations: Reservation[] }) {
  const confirmed = reservations.filter(r => r.status === 'confirmed').length;
  const pending   = reservations.filter(r => r.status === 'pending').length;

  const isToday = dateKey === toISO(new Date());

  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden ${isToday ? 'ring-2 ring-blue-400' : ''}`}>
      {/* Day header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isToday ? 'bg-blue-50' : 'bg-slate-50'}`}>
        <div>
          <p className={`font-semibold text-sm capitalize ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
            {isToday ? "Aujourd'hui — " : ''}{formatDateLabel(dateKey)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {reservations.length} arrivée{reservations.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {confirmed > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              <CheckCircle2 className="w-3 h-3" /> {confirmed}
            </span>
          )}
          {pending > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              <Clock className="w-3 h-3" /> {pending}
            </span>
          )}
        </div>
      </div>

      {/* Reservations list */}
      <div className="divide-y divide-slate-100">
        {reservations.map(r => {
          const s = STATUS_MAP[r.status] ?? STATUS_MAP.pending;
          const initials = r.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

          return (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
              {/* Status dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                <p className="text-xs text-slate-400 truncate">{r.email}</p>
                {r.interest_description && (
                  <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {r.interest_description}
                  </p>
                )}
              </div>

              {/* Guests + time */}
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs text-slate-500 justify-end">
                  <Users className="w-3 h-3" />
                  {r.guests}
                </div>
                {r.time && (
                  <p className="text-xs text-slate-400 mt-0.5">{r.time.slice(0, 5)}</p>
                )}
              </div>

              {/* Status badge */}
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

export default function WorkspacePlanning() {
  const [period, setPeriod]       = useState<Period>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [lastPage, setLastPage]   = useState(1);
  const [total, setTotal]         = useState(0);

  const [dateFrom, dateTo] = computeDateRange(period, customFrom, customTo);

  const fetchData = useCallback(async () => {
    if (period === 'custom' && (!customFrom || !customTo)) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        per_page: 50,
        page,
        date_from: dateFrom,
        date_to: dateTo,
      };
      const res = await api.get('/reservations/dashboard', { params });
      const d = res.data.data;
      setReservations(d.data ?? []);
      setLastPage(d.last_page ?? 1);
      setTotal(d.total ?? 0);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, page, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [period, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const grouped = groupByDate(reservations);
  const sortedDates = [...grouped.keys()].sort();

  const confirmedTotal = reservations.filter(r => r.status === 'confirmed').length;
  const pendingTotal   = reservations.filter(r => r.status === 'pending').length;

  return (
    <WorkspaceLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-slate-500" />
              Planning des arrivées
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Visualisez les arrivées groupées par date</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                period === p.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex gap-3 mb-4">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="self-center text-slate-400 text-sm">→</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Summary strip */}
        {!loading && reservations.length > 0 && (
          <div className="flex gap-4 mb-5 text-sm">
            <span className="text-slate-500">
              <span className="font-bold text-slate-800">{total}</span> arrivée{total > 1 ? 's' : ''} au total
            </span>
            {confirmedTotal > 0 && (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {confirmedTotal} confirmée{confirmedTotal > 1 ? 's' : ''}
              </span>
            )}
            {pendingTotal > 0 && (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" /> {pendingTotal} en attente
              </span>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-slate-400">Chargement du planning…</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
            <CalendarCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium text-slate-400">Aucune arrivée sur cette période</p>
            <p className="text-xs text-slate-300 mt-1">Changez la période ou attendez de nouvelles demandes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(dateKey => (
              <DayGroup
                key={dateKey}
                dateKey={dateKey}
                reservations={grouped.get(dateKey)!}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600 font-medium">{page} / {lastPage}</span>
            <button
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              disabled={page === lastPage}
              className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
