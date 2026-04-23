import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Spinner from "@/components/ui/spinner";
import TicketList from "@/components/admin/tickets/TicketList";
import TicketDetails from "@/components/admin/tickets/TicketDetails";
import { useAdminTickets } from "@/hooks/useAdminTickets";
import type { Ticket } from "@/models/Ticket";
import { AlertCircle, Clock, CheckCircle2, BarChart3, TrendingUp, Users, Timer, Play, HelpCircle, ArrowUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const AdminTickets: React.FC = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId?: string }>();
  const openTicketId = ticketId ? Number(ticketId) : undefined;

  const { data: tickets = [], isLoading, error } = useAdminTickets();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | Ticket["status"]>("all");
  
  // ✅ Hook pour récupérer les statistiques
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch des statistiques au chargement
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/tickets/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // pré-ouverture
  useEffect(() => {
    if (openTicketId != null && tickets.length > 0) {
      const t = tickets.find(t => t.id === openTicketId);
      if (t) {
        setSelectedTicket(t);
      } else {
        navigate("/admin/tickets", { replace: true });
      }
    }
  }, [openTicketId, tickets, navigate]);

  const getStatusColor = (status: Ticket["status"]) =>
    ({
      open:         "bg-blue-100 text-blue-800",
      pending:      "bg-yellow-100 text-yellow-800",
      resolved:     "bg-green-100 text-green-800",
      in_progress:  "bg-purple-100 text-purple-800",
      waiting_info: "bg-orange-100 text-orange-800",
      escalated:    "bg-red-100 text-red-800",
    }[status]);

  const getStatusIcon = (status: Ticket["status"]) =>
    ({
      open:         <AlertCircle  className="h-4 w-4 mr-1" />,
      pending:      <Clock        className="h-4 w-4 mr-1" />,
      resolved:     <CheckCircle2 className="h-4 w-4 mr-1" />,
      in_progress:  <Play         className="h-4 w-4 mr-1" />,
      waiting_info: <HelpCircle   className="h-4 w-4 mr-1" />,
      escalated:    <ArrowUp      className="h-4 w-4 mr-1" />,
    }[status]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <Spinner className="h-12 w-12" />
        </div>
      </AdminLayout>
    );
  }
  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-red-600">
          Erreur lors du chargement des tickets.
        </div>
      </AdminLayout>
    );
  }

  const filtered = tickets.filter(t => {
    const q = searchTerm.toLowerCase();
    const matches =
      t.title.toLowerCase().includes(q) ||
      t.user.name.toLowerCase().includes(q) ||
      t.user.email.toLowerCase().includes(q) ||
      String(t.id).includes(q);
    return (activeTab === "all" || t.status === activeTab) && matches;
  });

  // ✅ Composant Dashboard Statistics
  const DashboardStats = () => {
    if (statsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!stats) return null;

    const statCards = [
      {
        title: "Total Tickets",
        value: stats.total_tickets,
        icon: <BarChart3 className="h-5 w-5 text-blue-600" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        title: "En retard",
        value: stats.overdue_tickets,
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
      {
        title: "Temps réponse moyen",
        value: `${stats.avg_response_time}h`,
        icon: <Timer className="h-5 w-5 text-orange-600" />,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      {
        title: "Satisfaction moyenne",
        value: stats.avg_satisfaction ? `${stats.avg_satisfaction.toFixed(1)}/5 ⭐` : "N/A",
        icon: <TrendingUp className="h-5 w-5 text-green-600" />,
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
    ];

    return (
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {statCards.map((stat, index) => (
            <Card key={index} className={`${stat.bgColor} border-0`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats détaillées en accordéon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activité récente (7 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.recent_activity.new_tickets}</p>
                <p className="text-sm text-gray-600">Nouveaux tickets</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.recent_activity.resolved_tickets}</p>
                <p className="text-sm text-gray-600">Tickets résolus</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.recent_activity.feedbacks_received}</p>
                <p className="text-sm text-gray-600">Feedbacks reçus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Gestion des tickets</h1>
        
        {/* ✅ Dashboard statistiques */}
        <DashboardStats />
        
        <div className="space-y-6">
          {/* ✅ TicketList prend toute la ligne en haut */}
          <div className="w-full">
            <TicketList
              tickets={filtered}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedTicket={selectedTicket}
              setSelectedTicket={setSelectedTicket}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
            />
          </div>
          
          {/* ✅ TicketDetails prend toute la ligne en dessous */}
          <div className="w-full">
            <TicketDetails
              selectedTicket={selectedTicket}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTickets;
