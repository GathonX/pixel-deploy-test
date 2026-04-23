

// src/pages/AdminDashboard.tsx
import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Boxes,
  Building,
  BellRing,
  Users,
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";

import RecentActivitySection from "@/components/admin/RecentActivitySection";
import StatsSection from "@/components/admin/StatsSection";
import ChartSection from "@/components/admin/ChartSection";


interface Project {
  id: number;
  project_name: string;
  client_name: string;
  created_at: string;
  status: string;
}

interface Ticket {
  id: number;
  subject: string;
  user_name: string;
  created_at: string;
  priority: string;
  status: string;
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get("/admin/dashboard/recent-projects");
        setProjects(response.data);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les projets récents",
          variant: "destructive",
        });
      } finally {
        setLoadingProjects(false);
      }
    };

    const fetchTickets = async () => {
      try {
        const response = await api.get("/admin/dashboard/recent-tickets");
        setTickets(response.data);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les tickets récents",
          variant: "destructive",
        });
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchProjects();
    fetchTickets();
  }, [toast]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: "Actif", className: "bg-green-100 text-green-800 hover:bg-green-100" },
      published: { label: "Publié", className: "bg-green-100 text-green-800 hover:bg-green-100" },
      in_progress: { label: "En cours", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
      pending: { label: "En attente", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
      completed: { label: "Terminé", className: "bg-slate-100 text-slate-800 hover:bg-slate-100" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800 hover:bg-gray-100" };
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; className: string }> = {
      urgent: { label: "Urgent", className: "bg-red-100 text-red-800 hover:bg-red-100" },
      high: { label: "Élevée", className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
      normal: { label: "Normal", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
      low: { label: "Faible", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    };
    const priorityInfo = priorityMap[priority] || { label: priority, className: "bg-gray-100 text-gray-800 hover:bg-gray-100" };
    return <Badge className={priorityInfo.className}>{priorityInfo.label}</Badge>;
  };

  const getTicketStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      open: { label: "Ouvert", className: "border-blue-500 text-blue-700" },
      pending: { label: "En attente", className: "border-amber-500 text-amber-700" },
      resolved: { label: "Résolu", className: "bg-green-50 text-green-700 border-green-500" },
      closed: { label: "Fermé", className: "bg-slate-50 text-slate-700 border-slate-500" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "" };
    return <Badge variant="outline" className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-1">Tableau de bord administrateur</h1>
        <p className="text-muted-foreground mb-6">Une vue d'ensemble de votre plateforme</p>
        
        {/* Stats Cards */}
       
        <StatsSection />
        
        {/* Charts Section */}
        <ChartSection />

        {/* Recent Activity & Security Section */}
        <RecentActivitySection />
        
        {/* Tabs for Projects & Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Activités sur la plateforme</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="projects">
              <TabsList className="mb-4">
                <TabsTrigger value="projects">Projets récents</TabsTrigger>
                <TabsTrigger value="tickets">Tickets support</TabsTrigger>
              </TabsList>
              <TabsContent value="projects">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du projet</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProjects ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Chargement des projets...
                        </TableCell>
                      </TableRow>
                    ) : projects.length > 0 ? (
                      projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.project_name}</TableCell>
                          <TableCell>{project.client_name}</TableCell>
                          <TableCell>{project.created_at}</TableCell>
                          <TableCell>{getStatusBadge(project.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Aucun projet trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="tickets">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTickets ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Chargement des tickets...
                        </TableCell>
                      </TableRow>
                    ) : tickets.length > 0 ? (
                      tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.subject}</TableCell>
                          <TableCell>{ticket.user_name}</TableCell>
                          <TableCell>{ticket.created_at}</TableCell>
                          <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                          <TableCell>{getTicketStatusBadge(ticket.status)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Aucun ticket trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
