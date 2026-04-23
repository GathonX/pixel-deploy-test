import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Filter, Search, Calendar, List } from "lucide-react";

export type ViewMode = "timeline" | "list";

interface Props {
  viewMode: ViewMode;
  onViewChange: (v: ViewMode) => void;
  dateRange: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  searchQuery: string;
  onSearch: (v: string) => void;
  showFilters?: boolean;
}

export default function PlanningHeader({
  viewMode, onViewChange, dateRange, onPrev, onNext, onToday,
  statusFilter, onStatusFilter, searchQuery, onSearch, showFilters = true,
}: Props) {
  return (
    <div className="space-y-3">
      {showFilters && (
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher client..." className="w-full sm:w-52 pl-9" value={searchQuery} onChange={e => onSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="confirmed">Confirmée</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="checked_in">Check-in</SelectItem>
              <SelectItem value="checked_out">Check-out</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs sm:text-sm font-medium text-foreground min-w-0 text-center truncate">{dateRange}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onToday}>Aujourd'hui</Button>
        </div>

        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 w-full sm:w-auto">
          <Button variant={viewMode === "timeline" ? "default" : "ghost"} size="sm" className="gap-1 h-7 text-xs flex-1 sm:flex-none" onClick={() => onViewChange("timeline")}>
            <Calendar className="h-3.5 w-3.5" /> Timeline
          </Button>
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="gap-1 h-7 text-xs flex-1 sm:flex-none" onClick={() => onViewChange("list")}>
            <List className="h-3.5 w-3.5" /> Liste
          </Button>
        </div>
      </div>
    </div>
  );
}
