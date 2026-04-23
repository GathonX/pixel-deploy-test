// src/pages/AdminUserAgentsAdmin.tsx
import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, Calendar, ChevronDown, Clock, Download, Eye, Filter, FileText, List, ListChecks, MoreHorizontal, Search, Timer, Trash2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import api from "@/services/api";
import { saveAs } from "file-saver";
import UserAgentDetailsModal from "@/components/admin/UserAgentDetailsModal";
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal";

interface UserAgent {
  id: number;
  user: { name: string } | null;
  agent: string;
  device: string;
  action: string;
  status: string;
  page: string;
  language: string;
  timezone: string;
  ip_address: string;
  created_at: string;
}

interface PaginatedResponse {
  current_page: number;
  data: UserAgent[];
  last_page: number;
  per_page: number;
  total: number;
}

export default function AdminUserAgentsAdmin() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("all");
  const [date, setDate] = useState<DateRange | undefined>({ from: undefined, to: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserAgent, setSelectedUserAgent] = useState<UserAgent | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCount, setDeleteCount] = useState(0);
  const [deleteCallback, setDeleteCallback] = useState<(() => void) | null>(null);

  const fetchAgents = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/user-agents", {
        params: {
          user_type: "admin",
          page_filter: search,
          page,
        },
      });
      const response: PaginatedResponse = res.data.data;
      setAgents(response.data || []);
      setCurrentPage(response.current_page);
      setLastPage(response.last_page);
      setSelectedIds([]);
    } catch (err) {
      console.error("Erreur fetch user agents", err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors du chargement des user-agents.",
      });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const exportCSV = () => {
    const rows = [
      ["Utilisateur", "Action", "Date et heure", "IP", "Appareil", "Statut"],
      ...agents.map((ua) => [
        ua.user?.name || "Inconnu",
        ua.action || "N/A",
        new Date(ua.created_at).toLocaleString(),
        ua.ip_address,
        ua.device || "Inconnu",
        ua.status,
      ]),
    ];
    const csvContent = rows.map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "admin-user-agents.csv");
  };

  const openDetailsModal = (userAgent: UserAgent) => {
    setSelectedUserAgent(userAgent);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteCount(1);
    setDeleteCallback(() => async () => {
      try {
        await api.delete(`/admin/user-agents/${id}`);
        setAgents((prevAgents) => prevAgents.filter((agent) => agent.id !== id));
        setSelectedIds((prevIds) => prevIds.filter((selectedId) => selectedId !== id));
        toast({
          title: "Succès",
          description: "User-agent supprimé avec succès !",
        });
      } catch (err) {
        console.error("Erreur lors de la suppression du user-agent", err);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression.",
        });
      }
    });
    setIsDeleteModalOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteCount(selectedIds.length);
    setDeleteCallback(() => async () => {
      try {
        await Promise.all(selectedIds.map((id) => api.delete(`/admin/user-agents/${id}`)));
        setAgents((prevAgents) => prevAgents.filter((agent) => !selectedIds.includes(agent.id)));
        setSelectedIds([]);
        toast({
          title: "Succès",
          description: `${selectedIds.length} user-agent(s) supprimé(s) avec succès !`,
        });
      } catch (err) {
        console.error("Erreur lors de la suppression en masse des user-agents", err);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression en masse.",
        });
      }
    });
    setIsDeleteModalOpen(true);
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prevIds) =>
      prevIds.includes(id) ? prevIds.filter((selectedId) => selectedId !== id) : [...prevIds, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAgents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgents.map((ua) => ua.id));
    }
  };

  const agentStats = {
    total: agents.length,
    successes: agents.filter((agent) => agent.status === "Succès").length,
    failures: agents.filter((agent) => agent.status === "Échec").length,
    pages: new Set(agents.map((agent) => agent.page)).size,
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      (agent.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      agent.action?.toLowerCase().includes(search.toLowerCase()) ||
      agent.ip_address?.toLowerCase().includes(search.toLowerCase()) ||
      (agent.device || "").toLowerCase().includes(search.toLowerCase()));

    const matchesDate =
      !date?.from || !date?.to ||
      (new Date(agent.created_at) >= date.from && new Date(agent.created_at) <= date.to);

    if (currentTab === "all") return matchesSearch && matchesDate;
    if (currentTab === "successes") return matchesSearch && matchesDate && agent.status === "Succès";
    if (currentTab === "failures") return matchesSearch && matchesDate && agent.status === "Échec";
    if (currentTab === "pages") return matchesSearch && matchesDate && agent.page;

    return matchesSearch && matchesDate;
  });

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">User-Agents des Admins</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Suivez les user-agents des administrateurs sur la plateforme
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <FileText className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{agentStats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Succès</p>
                <p className="text-2xl font-bold">{agentStats.successes}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Pages visitées</p>
                <p className="text-2xl font-bold">{agentStats.pages}</p>
              </div>
              <List className="h-8 w-8 text-amber-500 opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Échecs</p>
                <p className="text-2xl font-bold">{agentStats.failures}</p>
              </div>
              <Timer className="h-8 w-8 text-red-500 opacity-70" />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">Journal des user-agents</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher un user-agent..."
                    className="pl-8 w-full sm:w-[200px] md:w-[250px]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`justify-start text-left font-normal w-full sm:w-[200px] md:w-[240px] ${date?.from ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "dd/MM/yyyy", { locale: fr })} -{" "}
                            {format(date.to, "dd/MM/yyyy", { locale: fr })}
                          </>
                        ) : (
                          format(date.from, "dd/MM/yyyy", { locale: fr })
                        )
                      ) : (
                        <span className="truncate">Sélectionner une période</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      <span className="truncate">Filtres</span>
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Par page</DropdownMenuItem>
                    <DropdownMenuItem>Par utilisateur</DropdownMenuItem>
                    <DropdownMenuItem>Par appareil</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <Tabs defaultValue="all" onValueChange={setCurrentTab}>
                <TabsList>
                  <TabsTrigger value="all">Toutes</TabsTrigger>
                  <TabsTrigger value="successes">Succès</TabsTrigger>
                  <TabsTrigger value="pages">Pages</TabsTrigger>
                  <TabsTrigger value="failures">Échecs</TabsTrigger>
                </TabsList>
              </Tabs>
              {selectedIds.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer ({selectedIds.length})
                </Button>
              )}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedIds.length === filteredAgents.length && filteredAgents.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden md:table-cell">Date et heure</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                    <TableHead className="hidden md:table-cell">Appareil</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Aucun user-agent trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAgents.map((ua) => (
                      <TableRow key={ua.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(ua.id)}
                            onCheckedChange={() => handleSelect(ua.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium truncate">{ua.user?.name || "Inconnu"}</TableCell>
                        <TableCell className="truncate">{ua.action || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell truncate">
                          {new Date(ua.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{ua.ip_address}</TableCell>
                        <TableCell className="hidden md:table-cell">{ua.device || "Inconnu"}</TableCell>
                        <TableCell>
                          <Badge variant={ua.status === "Succès" ? "default" : "destructive"}>
                            {ua.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="flex items-center" onClick={() => openDetailsModal(ua)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Détails
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center">
                                <Download className="h-4 w-4 mr-2" />
                                Exporter
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center text-destructive" onClick={() => handleDelete(ua.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredAgents.length > 0 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => fetchAgents(currentPage - 1)}
                >
                  Précédent
                </Button>
                {[...Array(lastPage)].map((_, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className={`px-3 ${currentPage === index + 1 ? "font-medium" : ""}`}
                    onClick={() => fetchAgents(index + 1)}
                  >
                    {index + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === lastPage}
                  onClick={() => fetchAgents(currentPage + 1)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <UserAgentDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userAgent={selectedUserAgent}
          onDelete={handleDelete}
        />

        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => {
            if (deleteCallback) {
              deleteCallback();
              setIsDeleteModalOpen(false);
            }
          }}
          count={deleteCount}
          resourceName="user-agent Admin"
        />
      </div>
    </AdminLayout>
  );
}