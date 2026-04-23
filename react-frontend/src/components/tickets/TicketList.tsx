// src/components/tickets/TicketList.tsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Ticket } from "@/models/Ticket";
import TicketItem from "./TicketItem";

interface TicketListProps {
  tickets: Ticket[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setSelectedTicket: (ticket: Ticket | null) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element | null;
  statusLabels: Record<Ticket["status"], string>;
}

const TicketList: React.FC<TicketListProps> = ({
  tickets,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  setSelectedTicket,
  getStatusColor,
  getStatusIcon,
  statusLabels,
}) => {
  // ✅ Supprimer les doublons basés sur ticket.id
  const uniqueTickets = Array.from(
    new Map(tickets.map((ticket) => [ticket.id, ticket])).values()
  );

  const filtered = uniqueTickets.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q);
    const matchTab = activeTab === "all" || t.status === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Rechercher un ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="all">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="all">Tous ({uniqueTickets.length})</TabsTrigger>
          <TabsTrigger value="open">
            Ouverts ({uniqueTickets.filter((t) => t.status === "open").length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            En attente (
            {uniqueTickets.filter((t) => t.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Résolus (
            {uniqueTickets.filter((t) => t.status === "resolved").length})
          </TabsTrigger>
        </TabsList>

        {["all", "open", "pending", "resolved"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>
                  {tab === "all"
                    ? `Tous les tickets (${filtered.length})`
                    : tab === "open"
                    ? "Tickets ouverts"
                    : tab === "pending"
                    ? "Tickets en attente"
                    : "Tickets résolus"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filtered.length > 0 ? (
                  <div className="border rounded-md divide-y">
                    {filtered.map((ticket) => (
                      <TicketItem
                        key={ticket.id}
                        ticket={ticket}
                        setSelectedTicket={setSelectedTicket}
                        getStatusColor={getStatusColor}
                        getStatusIcon={getStatusIcon}
                        statusLabels={statusLabels}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {tab === "all"
                      ? "Aucun ticket trouvé"
                      : tab === "open"
                      ? "Aucun ticket ouvert"
                      : tab === "pending"
                      ? "Aucun ticket en attente"
                      : "Aucun ticket résolu"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TicketList;
