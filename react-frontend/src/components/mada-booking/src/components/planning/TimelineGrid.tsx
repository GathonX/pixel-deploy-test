import { useState, useRef, useMemo, forwardRef } from "react";
import { useCurrency } from "@/hooks/use-devis-config";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Wrench, Users as UsersIcon, Bed, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SiteWithProducts, DbReservation, DbProduct } from "@/hooks/use-sites";
import { updateReservation } from "@/hooks/use-reservations";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const DAY_WIDTH = 56;
const SIDEBAR_WIDTH = 200;

const statusColors: Record<string, string> = {
  confirmed: "bg-status-confirmed",
  pending: "bg-status-pending",
  cancelled: "bg-status-cancelled",
  maintenance: "bg-status-maintenance",
  checked_in: "bg-blue-500",
  checked_out: "bg-purple-500",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmée",
  pending: "En attente",
  cancelled: "Annulée",
  maintenance: "Maintenance",
  checked_in: "Check-in",
  checked_out: "Check-out",
};

const typeIcons: Record<string, typeof Bed> = {
  chambre: Bed,
  excursion: MapPin,
  service: Package,
};

interface Props {
  sites: SiteWithProducts[];
  days: Date[];
  dayCount: number;
  onReservationClick: (res: DbReservation, productName: string, productType: string, productPrice: number) => void;
}

// Group days by month for the header
function groupDaysByMonth(days: Date[]) {
  const months: { label: string; dayCount: number }[] = [];
  let current = "";
  let count = 0;
  for (const d of days) {
    const key = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    if (key === current) {
      count++;
    } else {
      if (current) months.push({ label: current, dayCount: count });
      current = key;
      count = 1;
    }
  }
  if (current) months.push({ label: current, dayCount: count });
  return months;
}

const TimelineGrid = forwardRef<HTMLDivElement, Props>(({ sites, days, dayCount, onReservationClick }, ref) => {
  const [expandedSites, setExpandedSites] = useState<string[]>(sites.map(s => s.id));
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const today = new Date();
  const todayStr = today.toDateString();

  const months = useMemo(() => groupDaysByMonth(days), [days]);

  const toggleSite = (id: string) => {
    setExpandedSites(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const gridStart = new Date(days[0]);
  gridStart.setHours(0, 0, 0, 0);

  const totalGridWidth = dayCount * DAY_WIDTH;

  const getBarStyle = (res: DbReservation) => {
    const resStart = new Date(res.start_date);
    const resEnd = new Date(res.end_date);
    const startDayOffset = Math.floor((resStart.getTime() - gridStart.getTime()) / 86400000);
    const duration = Math.max(1, Math.ceil((resEnd.getTime() - resStart.getTime()) / 86400000));
    if (startDayOffset + duration < 0 || startDayOffset >= dayCount) return null;
    const clampedStart = Math.max(0, startDayOffset);
    const clampedDuration = Math.min(duration - (clampedStart - startDayOffset), dayCount - clampedStart);
    return {
      left: clampedStart * DAY_WIDTH,
      width: clampedDuration * DAY_WIDTH,
    };
  };

  // Today indicator
  const todayOffset = Math.floor((today.getTime() - gridStart.getTime()) / 86400000);
  const showTodayLine = todayOffset >= 0 && todayOffset < dayCount;
  const todayLeft = todayOffset * DAY_WIDTH + (today.getHours() / 24) * DAY_WIDTH;

  // Drag state
  const dragRef = useRef<{
    resId: string;
    siteId: string;
    startDate: string;
    endDate: string;
    startX: number;
    mode: "move" | "resize";
    productId: string;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e: React.MouseEvent, res: DbReservation, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      resId: res.id,
      siteId: res.site_id,
      startDate: res.start_date,
      endDate: res.end_date,
      startX: e.clientX,
      mode,
      productId: res.product_id,
    };
    setDragging(true);

    const handleUp = async (ev: MouseEvent) => {
      window.removeEventListener("mousemove", () => {});
      window.removeEventListener("mouseup", handleUp);
      setDragging(false);
      if (!dragRef.current) return;

      const dx = ev.clientX - dragRef.current.startX;
      const daysDelta = Math.round(dx / DAY_WIDTH);
      if (daysDelta === 0) { dragRef.current = null; return; }

      const origStart = new Date(dragRef.current.startDate);
      const origEnd = new Date(dragRef.current.endDate);
      let newStart: Date, newEnd: Date;

      if (dragRef.current.mode === "move") {
        newStart = new Date(origStart); newStart.setDate(newStart.getDate() + daysDelta);
        newEnd = new Date(origEnd); newEnd.setDate(newEnd.getDate() + daysDelta);
      } else {
        newStart = origStart;
        newEnd = new Date(origEnd); newEnd.setDate(newEnd.getDate() + daysDelta);
        if (newEnd <= newStart) { dragRef.current = null; return; }
      }

      try {
        await updateReservation(dragRef.current.resId, {
          start_date: newStart.toISOString().split("T")[0],
          end_date: newEnd.toISOString().split("T")[0],
          site_id: dragRef.current.siteId,
        });
        queryClient.invalidateQueries({ queryKey: ["sites-with-products"] });
        toast.success("Réservation mise à jour");
      } catch (err: any) {
        toast.error(err.message || "Erreur lors du déplacement");
      }
      dragRef.current = null;
    };

    window.addEventListener("mouseup", handleUp);
  };

  const getProductIndicator = (product: DbProduct & { reservations: DbReservation[] }) => {
    const active = product.reservations.filter(r => r.status !== "cancelled");
    if (product.type === "excursion" && product.max_capacity) {
      const total = active.reduce((s, r) => s + r.persons, 0);
      const pct = total / product.max_capacity;
      return (
        <span className={cn("text-[10px]", pct >= 1 ? "text-destructive" : pct > 0.8 ? "text-accent" : "text-muted-foreground")}>
          <UsersIcon className="inline h-3 w-3" /> {total}/{product.max_capacity}
        </span>
      );
    }
    if (product.type === "service" && product.stock) {
      const total = active.reduce((s, r) => s + r.persons, 0);
      const pct = total / product.stock;
      return (
        <span className={cn("text-[10px]", pct >= 1 ? "text-destructive" : pct > 0.9 ? "text-accent" : "text-muted-foreground")}>
          {total}/{product.stock} utilisés
        </span>
      );
    }
    return null;
  };

  const getBarColor = (res: DbReservation, product: DbProduct & { reservations: DbReservation[] }) => {
    if (res.status === "cancelled") return "bg-status-cancelled";
    if (res.status === "maintenance") return "bg-status-maintenance";
    const isPast = new Date(res.end_date) < today;
    if (product.type === "excursion" && product.max_capacity) {
      const active = product.reservations.filter(r => r.status !== "cancelled" && r.id !== res.id);
      const total = active.reduce((s, r) => s + r.persons, 0) + res.persons;
      const pct = total / product.max_capacity;
      if (pct >= 1) return "bg-status-cancelled";
      if (pct > 0.8) return "bg-status-pending";
      return "bg-primary";
    }
    return isPast ? "bg-muted-foreground/50" : statusColors[res.status];
  };

  const renderBar = (res: DbReservation, product: DbProduct & { reservations: DbReservation[] }) => {
    const style = getBarStyle(res);
    if (!style) return null;

    const barColor = getBarColor(res, product);
    const price = Number(product.price);
    const nights = Math.max(1, Math.ceil((new Date(res.end_date).getTime() - new Date(res.start_date).getTime()) / 86400000));
    const autoPrice = price * res.persons * nights;
    const totalPrice = res.price_override != null ? res.price_override : autoPrice;

    return (
      <Tooltip key={res.id}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute top-1.5 h-8 rounded-md px-1 sm:px-2 py-1 text-[9px] sm:text-[10px] font-medium text-primary-foreground shadow-sm cursor-grab hover:opacity-90 hover:scale-[1.02] transition-all flex items-center gap-0.5 sm:gap-1 overflow-hidden select-none",
              barColor,
              dragging && "cursor-grabbing",
            )}
            style={{ left: `${style.left}px`, width: `${style.width}px` }}
            onMouseDown={e => handleDragStart(e, res, "move")}
            onClick={e => { e.stopPropagation(); onReservationClick(res, product.name, product.type, Number(product.price)); }}
          >
            {res.status === "maintenance" && <Wrench className="h-3 w-3 shrink-0" />}
            <span className="truncate">{res.client_name}</span>
            {res.persons > 1 && <span className="shrink-0 opacity-75">({res.persons}p)</span>}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-primary-foreground/20"
              onMouseDown={e => { e.stopPropagation(); handleDragStart(e, res, "resize"); }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{res.client_name}</p>
            <p className="text-xs">{res.start_date} → {res.end_date}</p>
            <p className="text-xs">{res.persons} pers. · {statusLabels[res.status]}</p>
            {totalPrice > 0 && (
              <p className="text-xs font-medium">
                {totalPrice.toLocaleString("fr-FR")} {currency}
                {res.price_override != null && <span className="ml-1 opacity-60 font-normal">(personnalisé)</span>}
              </p>
            )}
            {res.notes && <p className="text-xs text-muted-foreground italic">{res.notes}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div ref={ref} className="overflow-x-auto rounded-xl border border-border bg-card">
      {/* Sticky table layout */}
      <div style={{ width: SIDEBAR_WIDTH + totalGridWidth }}>
        {/* HEADER: Month row */}
        <div className="flex border-b border-border">
          <div
            className="shrink-0 border-r border-border bg-muted/30 p-2 sticky left-0 z-20"
            style={{ width: SIDEBAR_WIDTH }}
          />
          {months.map((m, i) => (
            <div
              key={i}
              className="border-r border-border last:border-r-0 text-center py-1 bg-muted/20"
              style={{ width: m.dayCount * DAY_WIDTH }}
            >
              <p className="text-[10px] sm:text-xs font-semibold text-foreground uppercase">{m.label}</p>
            </div>
          ))}
        </div>

        {/* HEADER: Day row */}
        <div className="flex border-b border-border">
          <div
            className="shrink-0 border-r border-border bg-muted/30 p-2 sticky left-0 z-20"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Sites / Produits</span>
          </div>
          {days.map((d, i) => {
            const isToday = d.toDateString() === todayStr;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={i}
                className={cn(
                  "border-r border-border text-center py-1 last:border-r-0",
                  isToday && "bg-primary/10",
                  isWeekend && !isToday && "bg-muted/40",
                )}
                style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
              >
                <p className="text-[8px] sm:text-[10px] uppercase text-muted-foreground">{d.toLocaleDateString("fr-FR", { weekday: "narrow" })}</p>
                <p className={cn("text-xs font-semibold", isToday ? "text-primary" : "text-foreground")}>{d.getDate()}</p>
              </div>
            );
          })}
        </div>

        {/* BODY: Sites & Products */}
        {sites.map(site => (
          <div key={site.id}>
            {/* Site row */}
            <div className="flex cursor-pointer border-b border-border bg-muted/20 hover:bg-muted/40 transition-colors" onClick={() => toggleSite(site.id)}>
              <div
                className="flex items-center gap-1 sm:gap-2 border-r border-border p-2 sm:p-3 sticky left-0 z-20 bg-muted/20"
                style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
              >
                <ChevronDown className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground transition-transform", !expandedSites.includes(site.id) && "-rotate-90")} />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{site.name}</p>
                  <Badge variant="secondary" className="mt-0.5 text-[9px] sm:text-[10px] hidden sm:inline-flex">{site.location}</Badge>
                </div>
              </div>
              <div style={{ width: totalGridWidth }} />
            </div>

            {/* Product rows */}
            {expandedSites.includes(site.id) && site.products.map(product => {
              const TypeIcon = typeIcons[product.type] || Package;
              return (
                <div key={product.id} className="flex border-b border-border last:border-b-0">
                  {/* Sticky product name */}
                  <div
                    className="shrink-0 border-r border-border p-2 sm:p-3 pl-6 sm:pl-10 sticky left-0 z-20 bg-card"
                    style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <TypeIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs sm:text-sm text-foreground truncate">{product.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground capitalize hidden sm:block">{product.type}</p>
                      {getProductIndicator(product)}
                    </div>
                  </div>

                  {/* Grid cells + bars */}
                  <div className="relative" style={{ width: totalGridWidth, minHeight: 44 }}>
                    {/* Background day columns */}
                    <div className="flex absolute inset-0">
                      {days.map((d, i) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                          <div
                            key={i}
                            className={cn("border-r border-border last:border-r-0", isWeekend && "bg-muted/20")}
                            style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                          />
                        );
                      })}
                    </div>
                    {/* Today line */}
                    {showTodayLine && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-destructive/60 z-10 pointer-events-none" style={{ left: `${todayLeft}px` }} />
                    )}
                    {/* Reservation bars */}
                    {product.reservations.map(res => renderBar(res, product))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

TimelineGrid.displayName = "TimelineGrid";

export default TimelineGrid;
