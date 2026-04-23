import { useState, useMemo, useRef, useEffect } from "react";
import { SiteWithProducts, DbReservation } from "@/hooks/use-sites";
import PlanningHeader, { ViewMode } from "./planning/PlanningHeader";
import TimelineGrid from "./planning/TimelineGrid";
import ListView from "./planning/ListView";
import ReservationPopup from "./ReservationPopup";

interface Props {
  sites: SiteWithProducts[];
  dayCount?: number;
  showFilters?: boolean;
}

const TOTAL_DAYS = 365;

export default function PlanningTimeline({ sites, showFilters = true }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedRes, setSelectedRes] = useState<(DbReservation & { productName?: string; productType?: string; productPrice?: number }) | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const days = useMemo(() =>
    Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i + dateOffset);
      return d;
    }), [dateOffset]
  );

  const dateRange = `${days[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${days[days.length - 1].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;

  const filteredSites = useMemo(() => sites.map(site => ({
    ...site,
    products: site.products.map(product => ({
      ...product,
      reservations: product.reservations.filter(r => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (searchQuery && !r.client_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      }),
    })),
  })), [sites, statusFilter, searchQuery]);

  // Scroll to today on mount
  useEffect(() => {
    if (viewMode === "timeline" && scrollRef.current && dateOffset === 0) {
      // Today is at index 0 when offset=0, no scroll needed
      scrollRef.current.scrollLeft = 0;
    }
  }, [viewMode]);

  const openReservation = (res: DbReservation, productName: string, productType: string, productPrice: number) => {
    setSelectedRes({ ...res, productName, productType, productPrice });
    setPopupOpen(true);
  };

  return (
    <div className="space-y-4">
      <PlanningHeader
        viewMode={viewMode}
        onViewChange={setViewMode}
        dateRange={dateRange}
        onPrev={() => setDateOffset(o => o - 7)}
        onNext={() => setDateOffset(o => o + 7)}
        onToday={() => setDateOffset(0)}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        showFilters={showFilters}
      />

      {viewMode === "list" ? (
        <ListView sites={filteredSites} onReservationClick={openReservation} />
      ) : (
        <TimelineGrid
          ref={scrollRef}
          sites={filteredSites}
          days={days}
          dayCount={TOTAL_DAYS}
          onReservationClick={openReservation}
        />
      )}

      <ReservationPopup reservation={selectedRes} open={popupOpen} onClose={() => setPopupOpen(false)} />
    </div>
  );
}
