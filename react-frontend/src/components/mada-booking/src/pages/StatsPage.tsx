import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-devis-config";
import DashboardLayout from "@/components/DashboardLayout";
import api from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Table, TableBody, TableCell, TableFooter,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import PlanUpgradeGate from "../components/PlanUpgradeGate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductMargin {
  id: string; name: string; type: string;
  sell_price: number; sell_price_child: number; cost_price: number;
  res_count: number; revenue: number; supplier_cost: number;
  product_expenses: number; total_cost: number; margin: number; margin_pct: number;
}

interface MonthData {
  month: string; revenue: number; supplier_cost: number; expenses: number; margin: number;
}

interface OccupancyDay { date: string; occupied: number; total: number; rate: number; }

interface ExpenseDetail {
  id: number; label: string; amount: number; expense_date: string;
  product_name: string | null; supplier_name: string | null; notes: string | null;
}

interface StatsData {
  period: { from: string; to: string };
  total_reservations: number; confirmed: number; pending: number; cancelled: number;
  revenue: number; supplier_costs: number; expenses: number; general_expenses: number;
  margin: number; margin_pct: number; occupancy_rate: number | null;
  product_margins: ProductMargin[];
  revenue_by_month: MonthData[];
  occupancy_timeline: OccupancyDay[];
  expenses_detail: ExpenseDetail[];
  status_distribution: { name: string; value: number; color: string }[];
  tasks?: { total: number; completed: number; in_progress: number; pending: number };
}

const typeLabels: Record<string, string> = { chambre: "Chambre", excursion: "Excursion", service: "Service" };

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const currency = useCurrency(siteId);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const from = `${year}-01-01`;
  const to   = `${year}-12-31`;

  const { data, isLoading, isError, error } = useQuery<StatsData>({
    queryKey: ["booking-stats", siteId, from, to],
    enabled: !!siteId,
    queryFn: async () => {
      const { data } = await api.get(`/booking/${siteId}/stats`, { params: { from, to } });
      return data;
    },
    staleTime: 30_000,
  });

  if (isError && (error as any)?.response?.status === 403) {
    return <PlanUpgradeGate error={error} />;
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header + Year selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Statistiques & Marges</h1>
            <p className="text-sm text-muted-foreground">Revenus, coûts fournisseurs, dépenses et bénéfice réel</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setYear(y => y - 1)}>← {year - 1}</Button>
            <span className="text-sm font-semibold px-3 py-1 rounded-lg bg-muted">{year}</span>
            <Button variant="outline" size="sm" onClick={() => setYear(y => y + 1)} disabled={year >= currentYear}>{year + 1} →</Button>
          </div>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
            </div>
          </>
        ) : data ? (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <KpiCard label="Revenus totaux"    value={`${fmt(data.revenue)}${currency}`}        color="text-primary" />
              <KpiCard label="Coûts fournisseur" value={`${fmt(data.supplier_costs)}${currency}`} color="text-destructive" />
              <KpiCard label="Dépenses"          value={`${fmt(data.expenses)}${currency}`}       color="text-amber-600" />
              <KpiCard
                label="Bénéfice net"
                value={`${fmt(data.margin)}${currency}`}
                color={data.margin >= 0 ? "text-emerald-600" : "text-destructive"}
                sub={`Marge ${data.margin_pct}%`}
              />
              <KpiCard
                label="Taux d'occupation"
                value={data.occupancy_rate !== null ? `${data.occupancy_rate}%` : "—"}
                color="text-foreground"
                sub={`${data.confirmed} réservations confirmées`}
              />
            </div>

            {/* ── KPI Tâches ── */}
            {data.tasks && (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="Tâches totales"     value={String(data.tasks.total)}       color="text-foreground" />
                <KpiCard label="Tâches terminées"   value={String(data.tasks.completed)}   color="text-emerald-600" sub={data.tasks.total > 0 ? `${Math.round(data.tasks.completed / data.tasks.total * 100)}%` : undefined} />
                <KpiCard label="En cours"            value={String(data.tasks.in_progress)} color="text-blue-600" />
                <KpiCard label="En attente"          value={String(data.tasks.pending)}     color="text-amber-600" />
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">

              {/* ── Graphique mensuel ── */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-heading text-sm font-semibold text-foreground mb-4">
                  Revenus / Coûts / Dépenses / Bénéfice par mois
                </h3>
                {data.revenue_by_month.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.revenue_by_month}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number, name: string) => {
                        const labels: Record<string,string> = { revenue: "Revenus", supplier_cost: "Coût fourn.", expenses: "Dépenses", margin: "Bénéfice" };
                        return [`${fmt(v)}${currency}`, labels[name] || name];
                      }} />
                      <Legend formatter={v => ({ revenue:"Revenus", supplier_cost:"Coût fourn.", expenses:"Dépenses", margin:"Bénéfice" }[v] || v)} />
                      <Bar dataKey="revenue"       fill="#0891b2" radius={[4,4,0,0]} />
                      <Bar dataKey="supplier_cost" fill="#ef4444" radius={[4,4,0,0]} />
                      <Bar dataKey="expenses"      fill="#f59e0b" radius={[4,4,0,0]} />
                      <Bar dataKey="margin"        fill="#22c55e" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">Aucune réservation confirmée sur cette période</p>
                )}
              </div>

              {/* ── Occupation 14 jours ── */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Taux d'occupation (14 prochains jours)</h3>
                {data.occupancy_timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.occupancy_timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => [`${v}%`, "Occupation"]} />
                      <Bar dataKey="rate" fill="#22c55e" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">Aucune chambre active</p>
                )}
              </div>

              {/* ── Répartition statuts ── */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Répartition des statuts</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.status_distribution.filter(s => s.value > 0)}
                      cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.status_distribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* ── Résumé des coûts ── */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <h3 className="font-heading text-sm font-semibold text-foreground">Synthèse financière {year}</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Revenus bruts",         value: data.revenue,         color: "text-primary",     sign: "" },
                    { label: "− Coûts fournisseurs",  value: data.supplier_costs,  color: "text-destructive", sign: "−" },
                    { label: "− Dépenses liées produits", value: data.expenses - data.general_expenses, color: "text-amber-600", sign: "−" },
                    { label: "− Dépenses générales",  value: data.general_expenses, color: "text-amber-500",  sign: "−" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center border-b border-border pb-1.5">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`font-semibold ${row.color}`}>{row.sign}{fmt(row.value)}{currency}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold text-foreground">= Bénéfice net</span>
                    <span className={`font-bold text-lg ${data.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {fmt(data.margin)}{currency} <span className="text-sm">({data.margin_pct}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tableau marges par produit ── */}
            {data.product_margins.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-heading text-sm font-semibold text-foreground">Marges réelles par produit</h3>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Prix vente</TableHead>
                        <TableHead className="text-right">Coût fourn.</TableHead>
                        <TableHead className="text-right">Réservations</TableHead>
                        <TableHead className="text-right">Revenus</TableHead>
                        <TableHead className="text-right">Coût fourn. total</TableHead>
                        <TableHead className="text-right">Dépenses</TableHead>
                        <TableHead className="text-right">Total coûts</TableHead>
                        <TableHead className="text-right">Marge réelle</TableHead>
                        <TableHead className="text-right">Marge %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.product_margins.map(pm => (
                        <TableRow key={pm.id}>
                          <TableCell className="font-medium">{pm.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{typeLabels[pm.type] ?? pm.type}</TableCell>
                          <TableCell className="text-right">{fmt(pm.sell_price)}{currency}</TableCell>
                          <TableCell className="text-right text-destructive">{pm.cost_price > 0 ? `${fmt(pm.cost_price)}${currency}` : "—"}</TableCell>
                          <TableCell className="text-right">{pm.res_count}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(pm.revenue)}{currency}</TableCell>
                          <TableCell className="text-right text-destructive">{fmt(pm.supplier_cost)}{currency}</TableCell>
                          <TableCell className="text-right text-amber-600">{fmt(pm.product_expenses)}{currency}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(pm.total_cost)}{currency}</TableCell>
                          <TableCell className={`text-right font-bold ${pm.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {fmt(pm.margin)}{currency}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${pm.margin_pct >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {pm.margin_pct}%
                          </TableCell>
                        </TableRow>
                      ))}
                      {data.general_expenses > 0 && (
                        <TableRow className="border-t-2 italic text-muted-foreground">
                          <TableCell colSpan={2}>Dépenses générales (sans produit)</TableCell>
                          <TableCell colSpan={5} />
                          <TableCell className="text-right text-amber-600">{fmt(data.general_expenses)}{currency}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(data.general_expenses)}{currency}</TableCell>
                          <TableCell className="text-right font-bold text-destructive">−{fmt(data.general_expenses)}{currency}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooter>
                      {(() => {
                        const totRev  = data.product_margins.reduce((s, p) => s + p.revenue, 0);
                        const totSupp = data.product_margins.reduce((s, p) => s + p.supplier_cost, 0);
                        const totExp  = data.product_margins.reduce((s, p) => s + p.product_expenses, 0) + data.general_expenses;
                        const totCost = totSupp + totExp;
                        const totMar  = totRev - totCost;
                        const totPct  = totRev > 0 ? Math.round(totMar / totRev * 100) : 0;
                        return (
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={2}>TOTAL</TableCell>
                            <TableCell colSpan={2} />
                            <TableCell className="text-right">{data.confirmed}</TableCell>
                            <TableCell className="text-right">{fmt(totRev)}{currency}</TableCell>
                            <TableCell className="text-right text-destructive">{fmt(totSupp)}{currency}</TableCell>
                            <TableCell className="text-right text-amber-600">{fmt(totExp)}{currency}</TableCell>
                            <TableCell className="text-right">{fmt(totCost)}{currency}</TableCell>
                            <TableCell className={`text-right ${totMar >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(totMar)}{currency}</TableCell>
                            <TableCell className={`text-right ${totPct >= 0 ? "text-emerald-600" : "text-destructive"}`}>{totPct}%</TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableFooter>
                  </Table>
                </div>
              </div>
            )}

            {/* ── Détail dépenses ── */}
            {data.expenses_detail.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-heading text-sm font-semibold text-foreground">Détail des dépenses — {year}</h3>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.expenses_detail.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs">{new Date(e.expense_date).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell className="font-medium">{e.label}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.supplier_name || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.product_name || "—"}</TableCell>
                          <TableCell className="text-right font-semibold">{fmt(e.amount)}{currency}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{e.notes || ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
