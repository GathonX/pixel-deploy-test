import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Calendar, BarChart3, Settings, MapPin, ChevronDown, ChevronRight, Menu, Home, Eye,
  Package, Mail, FileText, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSites } from "@/hooks/use-sites";
import { Skeleton } from "@/components/ui/skeleton";

const navItems = [
  { icon: Home, label: "Vue Globale", path: "/dashboard" },
  { icon: Package, label: "Produits", path: "/dashboard/produits" },
  { icon: BarChart3, label: "Statistiques", path: "/dashboard/stats" },
  { icon: Mail, label: "Emails", path: "/dashboard/emails" },
  { icon: FileText, label: "CGV", path: "/dashboard/cgv" },
  { icon: Truck, label: "Fournisseurs", path: "/dashboard/fournisseurs" },
  { icon: Settings, label: "Paramètres", path: "/dashboard/settings" },
];

const siteSubLinks = [
  { icon: Eye, label: "Planning", path: "" },
  { icon: Package, label: "Produits", path: "/produits" },
  { icon: BarChart3, label: "Stats", path: "/stats" },
  { icon: Truck, label: "Fournisseurs", path: "/fournisseurs" },
  { icon: Mail, label: "Emails", path: "/emails" },
  { icon: FileText, label: "CGV", path: "/cgv" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sitesOpen, setSitesOpen] = useState(true);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const location = useLocation();
  const { data: sites, isLoading } = useSites();

  return (
    <div className="flex h-screen bg-background">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <MapPin className="h-5 w-5 text-sidebar-primary" />
          <span className="font-heading text-lg font-bold">
            Madagas<span className="text-sidebar-primary">Booking</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4">
            <button onClick={() => setSitesOpen(!sitesOpen)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase text-sidebar-foreground/50">
              <ChevronDown className={cn("h-3 w-3 transition-transform", !sitesOpen && "-rotate-90")} />
              Vue par Site
            </button>
            {sitesOpen && isLoading && (
              <div className="space-y-2 pl-8">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}
            {sitesOpen && sites?.map(site => {
              const isExpanded = expandedSiteId === site.id;
              const siteActive = location.pathname.startsWith(`/vue-site/${site.id}`);
              return (
                <div key={site.id}>
                  <div className="flex items-center">
                    <button
                      onClick={() => setExpandedSiteId(isExpanded ? null : site.id)}
                      className="p-1 text-sidebar-foreground/40 hover:text-sidebar-foreground"
                    >
                      <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
                    </button>
                    <Link to={`/vue-site/${site.id}`} onClick={() => setSidebarOpen(false)}
                      className={cn("flex-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                        siteActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}>
                      <Eye className="h-3.5 w-3.5" />
                      <span className="truncate">{site.name}</span>
                    </Link>
                  </div>
                  {isExpanded && (
                    <div className="ml-6 space-y-0.5 mb-1">
                      {siteSubLinks.map(sub => {
                        const subPath = `/vue-site/${site.id}${sub.path}`;
                        const subActive = location.pathname === subPath;
                        return (
                          <Link key={sub.path} to={subPath} onClick={() => setSidebarOpen(false)}
                            className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                              subActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/80"
                            )}>
                            <sub.icon className="h-3 w-3" />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">JR</div>
            <div className="text-sm">
              <p className="font-medium">Jean Rakoto</p>
              <p className="text-xs text-sidebar-foreground/50">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Planning</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              Tous les sites <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
