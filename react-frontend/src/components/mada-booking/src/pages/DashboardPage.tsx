import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PlanningTimeline from "@/components/PlanningTimeline";
import NewReservationModal from "@/components/NewReservationModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarCheck, CalendarX, TrendingUp, Clock } from "lucide-react";
import ExportMenu from "@/components/ExportMenu";
import { cn } from "@/lib/utils";
import { useSites, getOccupancyRate, getRevenueEstimate } from "@/hooks/use-sites";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: sites, isLoading } = useSites();
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newResOpen, setNewResOpen] = useState(false);

  const filteredSites = (sites || [])
    .filter(s => siteFilter === "all" || s.id === siteFilter)
    .map(s => ({
      ...s,
      products: s.products.filter(p => typeFilter === "all" || p.type === typeFilter),
    }));

  const allProducts = filteredSites.flatMap(s => s.products);
  const allRes = allProducts.flatMap(p => p.reservations);
  const occupancy = getOccupancyRate(allProducts, new Date());
  const revenue = getRevenueEstimate(allProducts);
  const todayStr = new Date().toISOString().split("T")[0];
  const arrivalsToday = allRes.filter(r => r.start_date === todayStr && r.status !== "cancelled").length;
  const departuresToday = allRes.filter(r => r.end_date === todayStr && r.status !== "cancelled").length;
  const pendingCount = allRes.filter(r => r.status === "pending").length;

  const stats = [
    { icon: TrendingUp, label: "Taux d'occupation", value: `${occupancy}%`, color: "text-primary" },
    { icon: CalendarCheck, label: "Arrivées aujourd'hui", value: `${arrivalsToday}`, color: "text-secondary" },
    { icon: CalendarX, label: "Départs aujourd'hui", value: `${departuresToday}`, color: "text-foreground" },
    { icon: Clock, label: "En attente", value: `${pendingCount}`, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Planning</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Vue globale — Tous les sites</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Tous les sites" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sites</SelectItem>
                {(sites || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Tous types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="chambre">Chambres</SelectItem>
                <SelectItem value="excursion">Excursions</SelectItem>
                <SelectItem value="service">Services</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <ExportMenu
              data={allRes.map(r => {
                const prod = allProducts.find(p => p.reservations.some(pr => pr.id === r.id));
                const days = Math.max(1, Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000));
                return {
                  client: r.client_name,
                  produit: prod?.name || "",
                  debut: r.start_date,
                  fin: r.end_date,
                  statut: r.status,
                  personnes: r.persons,
                  prix: Number(prod?.price || 0) * r.persons * days,
                };
              })}
            />
            <Button size="sm" className="gap-2" onClick={() => setNewResOpen(true)}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle résa</span><span className="sm:hidden">Résa</span>
            </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <p className={cn("mt-1 font-heading text-2xl font-bold", stat.color)}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : (
          <PlanningTimeline sites={filteredSites} dayCount={14} />
        )}
      </div>

      {sites && (
        <NewReservationModal
          open={newResOpen}
          onClose={() => setNewResOpen(false)}
          sites={sites}
        />
      )}
    </DashboardLayout>
  );
}
