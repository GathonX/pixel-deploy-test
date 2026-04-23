import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useCurrency } from "@/hooks/use-devis-config";
import DashboardLayout from "@/components/DashboardLayout";
import PlanningTimeline from "@/components/PlanningTimeline";
import NewReservationModal from "@/components/NewReservationModal";
import ExportMenu from "@/components/ExportMenu";
import { useSites, getOccupancyRate, getRevenueEstimate } from "@/hooks/use-sites";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, CalendarCheck, CalendarX, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SiteViewPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { data: sites, isLoading } = useSites();
  const site = sites?.find(s => s.id === siteId);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [newResOpen, setNewResOpen] = useState(false);
  const currency = useCurrency();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!site) return <Navigate to="/dashboard" replace />;

  const todayStr = new Date().toISOString().split("T")[0];
  const filteredProducts = site.products.filter(p => typeFilter === "all" || p.type === typeFilter);
  const filteredSite = { ...site, products: filteredProducts };

  const allRes = filteredProducts.flatMap(p => p.reservations);
  const occupancy = getOccupancyRate(filteredProducts, new Date());
  const revenue = getRevenueEstimate(filteredProducts);
  const arrivalsToday = allRes.filter(r => r.start_date === todayStr && r.status !== "cancelled").length;
  const departuresToday = allRes.filter(r => r.end_date === todayStr && r.status !== "cancelled").length;

  const stats = [
    { icon: TrendingUp, label: "Taux d'occupation", value: `${occupancy}%`, color: "text-primary" },
    { icon: DollarSign, label: "Revenus", value: `${revenue.toLocaleString("fr-FR")}${currency}`, color: "text-foreground" },
    { icon: CalendarCheck, label: "Arrivées aujourd'hui", value: `${arrivalsToday}`, color: "text-secondary" },
    { icon: CalendarX, label: "Départs aujourd'hui", value: `${departuresToday}`, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">{site.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{site.location}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
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
                  const prod = filteredProducts.find(p => p.reservations.some(pr => pr.id === r.id));
                  const days = Math.max(1, Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000));
                  const prix = r.price_override != null
                    ? r.price_override
                    : Number(prod?.price || 0) * r.persons * days;
                  return {
                    client: r.client_name,
                    produit: prod?.name || "",
                    debut: r.start_date,
                    fin: r.end_date,
                    statut: r.status,
                    personnes: r.persons,
                    prix,
                  };
                })}
                title={`Export ${site.name}`}
              />
              <Button size="sm" className="gap-2" onClick={() => setNewResOpen(true)}>
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle résa</span><span className="sm:hidden">Résa</span>
              </Button>
            </div>
          </div>
        </div>

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

        <PlanningTimeline sites={[filteredSite]} dayCount={14} />
      </div>

      {site && (
        <NewReservationModal
          open={newResOpen}
          onClose={() => setNewResOpen(false)}
          sites={[{ ...site, products: site.products }]}
          preselectedSiteId={siteId}
          lockSite
        />
      )}
    </DashboardLayout>
  );
}
