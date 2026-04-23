

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, X, Calendar, AlertTriangle, User, Clock, Play, HelpCircle, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import TicketItem from "./TicketItem";
import type { Ticket } from "@/models/Ticket";

export type TabValue = Ticket["status"] | "all";

interface TicketListProps {
  tickets: Ticket[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  activeTab: TabValue;
  setActiveTab: (v: TabValue) => void;
  selectedTicket: Ticket | null;
  setSelectedTicket: (t: Ticket | null) => void;
  getStatusColor: (s: Ticket["status"]) => string;
  getStatusIcon: (s: Ticket["status"]) => JSX.Element | null;
}

const TicketList: React.FC<TicketListProps> = ({
  tickets,
  searchTerm,
  setSearchTerm,
  activeTab,
  setActiveTab,
  selectedTicket,
  setSelectedTicket,
  getStatusColor,
  getStatusIcon,
}) => {
  // ✅ États pour filtres avancés
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all'); // all, assigned, unassigned
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('all'); // all, today, week, month
  
  // ✅ Fonction pour appliquer tous les filtres
  const applyFilters = (ticketList: Ticket[]) => {
    return ticketList.filter((ticket) => {
      // Filtre recherche
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        ticket.title.toLowerCase().includes(q) ||
        ticket.user.name.toLowerCase().includes(q) ||
        ticket.user.email.toLowerCase().includes(q) ||
        String(ticket.id).includes(q);
      
      // Filtre statut (onglets)
      const matchTab = activeTab === "all" || ticket.status === activeTab;
      
      // Filtre priorité
      const matchPriority = priorityFilters.length === 0 || priorityFilters.includes(ticket.priority);
      
      // Filtre catégorie
      const matchCategory = categoryFilters.length === 0 || categoryFilters.includes(ticket.category);
      
      // Filtre assignation
      const matchAssignment = 
        assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && ticket.assigned_to) ||
        (assignmentFilter === 'unassigned' && !ticket.assigned_to);
      
      // Filtre en retard
      const matchOverdue = !overdueOnly || (ticket.is_overdue && ticket.status !== 'resolved');
      
      // Filtre par date
      const matchDate = (() => {
        if (dateFilter === 'all') return true;
        const ticketDate = new Date(ticket.created_at);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch(dateFilter) {
          case 'today':
            return ticketDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return ticketDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return ticketDate >= monthAgo;
          default:
            return true;
        }
      })();
      
      return matchSearch && matchTab && matchPriority && matchCategory && matchAssignment && matchOverdue && matchDate;
    });
  };

  const filtered = applyFilters(tickets);
  const hasActiveFilters = priorityFilters.length > 0 || categoryFilters.length > 0 || assignmentFilter !== 'all' || overdueOnly || dateFilter !== 'all';
  
  // ✅ Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setPriorityFilters([]);
    setCategoryFilters([]);
    setAssignmentFilter('all');
    setOverdueOnly(false);
    setDateFilter('all');
  };

  // ✅ Options de filtres
  const categories = Array.from(new Set(tickets.map(t => t.category)));
  const priorities = ['high', 'medium', 'low'];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Tickets</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{filtered.length} / {tickets.length}</Badge>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </div>
        <CardDescription>Gestion des demandes d'assistance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre de recherche et filtres */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par titre, utilisateur, email, ID..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* ✅ Dropdown filtres avancés */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className={hasActiveFilters ? "bg-blue-50 text-blue-600 border-blue-300" : ""}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1 text-xs font-medium text-gray-500">
                Filtres avancés
              </div>
              <DropdownMenuSeparator />
              
              {/* Filtre priorité */}
              <div className="px-2 py-1 text-xs font-medium text-gray-700">Priorité</div>
              {priorities.map((priority) => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={priorityFilters.includes(priority)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPriorityFilters([...priorityFilters, priority]);
                    } else {
                      setPriorityFilters(priorityFilters.filter(p => p !== priority));
                    }
                  }}
                  className="capitalize"
                >
                  {priority === 'high' ? '🔴 Haute' : priority === 'medium' ? '🟡 Moyenne' : '🟢 Basse'}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              
              {/* Filtre catégorie */}
              <div className="px-2 py-1 text-xs font-medium text-gray-700">Catégorie</div>
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={categoryFilters.includes(category)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setCategoryFilters([...categoryFilters, category]);
                    } else {
                      setCategoryFilters(categoryFilters.filter(c => c !== category));
                    }
                  }}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              
              {/* Filtre assignation */}
              <div className="px-2 py-1 text-xs font-medium text-gray-700">Assignation</div>
              <DropdownMenuItem onClick={() => setAssignmentFilter('all')} className="flex items-center justify-between">
                <span>Tous</span>
                {assignmentFilter === 'all' && <span className="text-blue-600">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssignmentFilter('assigned')} className="flex items-center justify-between">
                <span>Assignés</span>
                {assignmentFilter === 'assigned' && <span className="text-blue-600">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssignmentFilter('unassigned')} className="flex items-center justify-between">
                <span>Non assignés</span>
                {assignmentFilter === 'unassigned' && <span className="text-blue-600">✓</span>}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Filtre par date */}
              <div className="px-2 py-1 text-xs font-medium text-gray-700">Période de création</div>
              <DropdownMenuItem onClick={() => setDateFilter('all')} className="flex items-center justify-between">
                <span>Toutes les dates</span>
                {dateFilter === 'all' && <span className="text-blue-600">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('today')} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Aujourd'hui
                </span>
                {dateFilter === 'today' && <span className="text-blue-600">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('week')} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  7 derniers jours
                </span>
                {dateFilter === 'week' && <span className="text-blue-600">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter('month')} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  30 derniers jours
                </span>
                {dateFilter === 'month' && <span className="text-blue-600">✓</span>}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Filtre en retard */}
              <DropdownMenuCheckboxItem
                checked={overdueOnly}
                onCheckedChange={setOverdueOnly}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 text-red-500" />
                En retard uniquement
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filtres actifs */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1">
            {priorityFilters.map((priority) => (
              <Badge
                key={priority}
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => setPriorityFilters(priorityFilters.filter(p => p !== priority))}
              >
                Priorité: {priority} <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {categoryFilters.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => setCategoryFilters(categoryFilters.filter(c => c !== category))}
              >
                {category} <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {assignmentFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => setAssignmentFilter('all')}
              >
                {assignmentFilter === 'assigned' ? 'Assignés' : 'Non assignés'} <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {overdueOnly && (
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer text-red-700"
                onClick={() => setOverdueOnly(false)}
              >
                En retard <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {dateFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => setDateFilter('all')}
              >
                <Calendar className="h-3 w-3 mr-1" />
                {dateFilter === 'today' ? 'Aujourd\'hui' : 
                 dateFilter === 'week' ? '7 derniers jours' : 
                 '30 derniers jours'} <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full mb-2">
            <TabsTrigger value="all">
              Tous ({tickets.filter(t => activeTab === "all" || true).length})
            </TabsTrigger>
            <TabsTrigger value="open">
              Ouverts ({tickets.filter(t => t.status === "open").length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              En attente ({tickets.filter(t => t.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Résolus ({tickets.filter(t => t.status === "resolved").length})
            </TabsTrigger>
          </TabsList>
          
          {/* ✅ Onglets granulaires supplémentaires */}
          <div className="flex gap-1 mb-2">
            <Button
              variant={activeTab === "in_progress" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("in_progress")}
              className="text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              En cours ({tickets.filter(t => t.status === "in_progress").length})
            </Button>
            <Button
              variant={activeTab === "waiting_info" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("waiting_info")}
              className="text-xs"
            >
              <HelpCircle className="h-3 w-3 mr-1" />
              Info requise ({tickets.filter(t => t.status === "waiting_info").length})
            </Button>
            <Button
              variant={activeTab === "escalated" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("escalated")}
              className="text-xs"
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              Escaladés ({tickets.filter(t => t.status === "escalated").length})
            </Button>
          </div>
        </Tabs>

        <div className="border rounded-md max-h-[500px] overflow-y-auto">
          {filtered.length > 0 ? (
            <div className="divide-y">
              {filtered.map((t) => (
                <TicketItem
                  key={t.id}
                  ticket={t}
                  selectedTicket={selectedTicket}
                  setSelectedTicket={setSelectedTicket}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {hasActiveFilters ? (
                <div>
                  <p>Aucun ticket ne correspond aux filtres appliqués.</p>
                  <Button
                    variant="link"
                    onClick={resetFilters}
                    className="text-xs mt-2"
                  >
                    Réinitialiser les filtres
                  </Button>
                </div>
              ) : (
                "Aucun ticket trouvé"
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketList;
