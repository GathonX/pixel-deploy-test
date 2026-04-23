import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import api from '@/services/api';
import {
  CreditCard, Search, RefreshCw, CheckCircle2, Clock, XCircle,
  AlertTriangle, ChevronLeft, ChevronRight, FileText, ExternalLink,
  Sparkles,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Invoice {
  id: number;
  invoice_number: string;
  scope: 'workspace' | 'site';
  site_name: string | null;
  plan_key: string;
  billing_period: string;
  amount_ariary: number;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void';
  payment_method: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  workspace: { id: number; name: string } | null;
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

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  draft:   { label: 'Brouillon', cls: 'bg-slate-100 text-slate-600',   icon: FileText },
  issued:  { label: 'Émise',     cls: 'bg-blue-100 text-blue-700',     icon: Clock },
  paid:    { label: 'Payée',     cls: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  overdue: { label: 'En retard', cls: 'bg-red-100 text-red-600',       icon: AlertTriangle },
  void:    { label: 'Annulée',   cls: 'bg-slate-100 text-slate-400',   icon: XCircle },
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter', pro: 'Pro', premium: 'Agence',
};

const METHOD_LABELS: Record<string, string> = {
  orange_money: 'Orange Money', mvola: 'Mvola', airtel_money: 'Airtel Money',
  bank_transfer: 'Virement', taptap_send: 'TapTap Send',
};

function fmt(n: number) {
  return n.toLocaleString('fr-FR') + ' Ar';
}

function StatusBadge({ status }: { status: Invoice['status'] }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${c.cls}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

const METHODS = [
  { key: 'orange_money', label: 'Orange Money' },
  { key: 'mvola', label: 'Mvola' },
  { key: 'airtel_money', label: 'Airtel Money' },
  { key: 'bank_transfer', label: 'Virement bancaire' },
  { key: 'taptap_send', label: 'TapTap Send' },
];

function ConfirmModal({
  invoice,
  onClose,
  onConfirmed,
}: {
  invoice: Invoice;
  onClose: () => void;
  onConfirmed: (id: number) => void;
}) {
  const [method, setMethod] = useState(invoice.payment_method ?? 'mvola');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/admin/billing/invoices/${invoice.id}/confirm`, { payment_method: method });
      onConfirmed(invoice.id);
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? 'Erreur lors de la confirmation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Confirmer le paiement</h2>
        <p className="text-sm text-slate-500 mb-4">
          Facture <span className="font-mono font-medium">{invoice.invoice_number}</span> — {fmt(invoice.amount_ariary)}
        </p>

        {/* Proof link */}
        {invoice.payment_proof_url && (
          <a
            href={invoice.payment_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            <ExternalLink className="w-4 h-4" />
            Voir la preuve de paiement
          </a>
        )}

        {/* Method */}
        <label className="block text-sm font-medium text-slate-700 mb-1">Méthode de paiement</label>
        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        >
          {METHODS.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminBillingInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await api.get('/admin/billing/invoices', { params });
      const d = res.data.data;
      setInvoices(d.data ?? []);
      setMeta(d);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const t = setTimeout(fetchInvoices, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchInvoices]);

  const handleConfirmed = (id: number) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'paid' } : inv));
  };

  const pendingCount = invoices.filter(
    i => i.payment_proof_url && (i.status === 'issued' || i.status === 'overdue')
  ).length;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-slate-500" />
              Factures Workspace
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Confirmer les paiements reçus</p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-3 py-1.5 rounded-full">
                {pendingCount} preuve{pendingCount > 1 ? 's' : ''} à vérifier
              </span>
            )}
            <button
              onClick={() => fetchInvoices()}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="N° facture, référence, workspace…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="issued">Émise</option>
            <option value="paid">Payée</option>
            <option value="overdue">En retard</option>
            <option value="void">Annulée</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-slate-400">Chargement…</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-400">Aucune facture trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="text-left py-3 px-4">Facture</th>
                    <th className="text-left py-3 px-4">Workspace</th>
                    <th className="text-left py-3 px-4">Plan</th>
                    <th className="text-left py-3 px-4">Montant</th>
                    <th className="text-left py-3 px-4">Méthode</th>
                    <th className="text-left py-3 px-4">Statut</th>
                    <th className="text-left py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr
                      key={inv.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                        inv.payment_proof_url && (inv.status === 'issued' || inv.status === 'overdue')
                          ? 'bg-amber-50/40 border-l-2 border-l-amber-400'
                          : ''
                      }`}
                    >
                      {/* Facture */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono font-medium text-slate-800">{inv.invoice_number}</p>
                          {inv.payment_proof_url && (inv.status === 'issued' || inv.status === 'overdue') && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold border border-amber-200">
                              <Sparkles className="w-2.5 h-2.5" />
                              Preuve reçue
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(inv.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      {/* Workspace */}
                      <td className="py-3.5 px-4">
                        <p className="text-sm text-slate-700">{inv.workspace?.name ?? '—'}</p>
                        {inv.site_name && (
                          <p className="text-xs text-slate-400">{inv.site_name}</p>
                        )}
                      </td>
                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <p className="text-sm text-slate-700">{PLAN_LABELS[inv.plan_key] ?? inv.plan_key}</p>
                        <p className="text-xs text-slate-400 capitalize">{inv.billing_period === 'monthly' ? 'Mensuel' : 'Annuel'}</p>
                      </td>
                      {/* Montant */}
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-semibold text-slate-800">{fmt(inv.amount_ariary)}</p>
                        {inv.payment_reference && (
                          <p className="text-xs font-mono text-slate-400">{inv.payment_reference}</p>
                        )}
                      </td>
                      {/* Méthode */}
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-slate-500">
                          {inv.payment_method ? METHOD_LABELS[inv.payment_method] ?? inv.payment_method : '—'}
                        </p>
                        {inv.payment_proof_url && (
                          <a
                            href={inv.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Preuve
                          </a>
                        )}
                      </td>
                      {/* Statut */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={inv.status} />
                        {inv.paid_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(inv.paid_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </td>
                      {/* Action */}
                      <td className="py-3.5 px-4">
                        {(inv.status === 'issued' || inv.status === 'overdue') && (
                          <button
                            onClick={() => setConfirming(inv)}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium transition-colors"
                          >
                            Confirmer
                          </button>
                        )}
                      </td>
                    </tr>
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
              {meta.from}–{meta.to} sur {meta.total} factures
            </p>
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

      {/* Confirm modal */}
      {confirming && (
        <ConfirmModal
          invoice={confirming}
          onClose={() => setConfirming(null)}
          onConfirmed={handleConfirmed}
        />
      )}
    </AdminLayout>
  );
}
