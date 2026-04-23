
import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Activity, Calendar, ChevronDown, Clock, Download, Eye, Filter, FileText, List, ListChecks, MoreHorizontal, Search, Timer } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const AdminUserActivity = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  // Mock data for user activities
  const [activities, setActivities] = useState([
    { id: 1, userId: 1, userName: "John Doe", action: "Connexion", timestamp: "2025-04-08 09:45", ip: "192.168.1.1", device: "Chrome / MacOS", status: "Succès" },
    { id: 2, userId: 2, userName: "Marie Dupont", action: "Création d'article", timestamp: "2025-04-08 08:22", ip: "192.168.1.2", device: "Firefox / Windows", status: "Succès" },
    { id: 3, userId: 3, userName: "Alice Smith", action: "Modification de profil", timestamp: "2025-04-07 17:35", ip: "192.168.1.3", device: "Safari / iOS", status: "Succès" },
    { id: 4, userId: 1, userName: "John Doe", action: "Tentative de connexion", timestamp: "2025-04-07 14:10", ip: "192.168.1.4", device: "Chrome / Windows", status: "Échec" },
    { id: 5, userId: 4, userName: "Robert Martin", action: "Génération API", timestamp: "2025-04-07 11:55", ip: "192.168.1.5", device: "Edge / Windows", status: "Succès" },
    { id: 6, userId: 2, userName: "Marie Dupont", action: "Paiement", timestamp: "2025-04-06 19:20", ip: "192.168.1.2", device: "Firefox / Windows", status: "Succès" },
    { id: 7, userId: 5, userName: "Claire Johnson", action: "Création de site", timestamp: "2025-04-06 16:45", ip: "192.168.1.6", device: "Chrome / MacOS", status: "Succès" },
    { id: 8, userId: 3, userName: "Alice Smith", action: "Connexion", timestamp: "2025-04-06 14:15", ip: "192.168.1.3", device: "Safari / iOS", status: "Succès" },
    { id: 9, userId: 6, userName: "Thomas Wilson", action: "Tentative de connexion", timestamp: "2025-04-06 10:30", ip: "192.168.1.7", device: "Chrome / Android", status: "Échec" },
    { id: 10, userId: 7, userName: "Emma Davis", action: "Suppression d'article", timestamp: "2025-04-05 22:05", ip: "192.168.1.8", device: "Firefox / MacOS", status: "Succès" },
  ]);

  // Filter activities based on search term, date range and current tab
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.device.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = 
      !date?.from || !date?.to || 
      (new Date(activity.timestamp) >= date.from && 
       new Date(activity.timestamp) <= date.to);
    
    if (currentTab === "all") return matchesSearch && matchesDate;
    if (currentTab === "logins") return matchesSearch && matchesDate && activity.action.includes("Connexion");
    if (currentTab === "content") return matchesSearch && matchesDate && (activity.action.includes("article") || activity.action.includes("site"));
    if (currentTab === "failures") return matchesSearch && matchesDate && activity.status === "Échec";
    
    return matchesSearch && matchesDate;
  });

  // Activity statistics
  const activityStats = {
    total: activities.length,
    logins: activities.filter(activity => activity.action.includes("Connexion") && activity.status === "Succès").length,
    failures: activities.filter(activity => activity.status === "Échec").length,
    content: activities.filter(activity => activity.action.includes("article") || activity.action.includes("site")).length,
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Activités des Utilisateurs</h1>
            <p className="text-muted-foreground">Suivez toutes les activités des utilisateurs sur la plateforme</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button size="sm">
              <ListChecks className="h-4 w-4 mr-2" />
              Configurer les alertes
            </Button>
          </div>
        </div>

        {/* Activity statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Activités Totales</p>
                <p className="text-2xl font-bold">{activityStats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Connexions</p>
                <p className="text-2xl font-bold">{activityStats.logins}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Activités de Contenu</p>
                <p className="text-2xl font-bold">{activityStats.content}</p>
              </div>
              <List className="h-8 w-8 text-amber-500 opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Échecs</p>
                <p className="text-2xl font-bold">{activityStats.failures}</p>
              </div>
              <Timer className="h-8 w-8 text-red-500 opacity-70" />
            </CardContent>
          </Card>
        </div>

        {/* Main activity table card */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Journal des activités</CardTitle>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher une activité..."
                    className="pl-8 w-full md:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`justify-start text-left font-normal w-[240px] ${
                        date?.from ? "text-foreground" : "text-muted-foreground"
                      }`}
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
                        "Sélectionner une période"
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
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtres
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Par type d'activité</DropdownMenuItem>
                    <DropdownMenuItem>Par utilisateur</DropdownMenuItem>
                    <DropdownMenuItem>Par appareil</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={setCurrentTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="logins">Connexions</TabsTrigger>
                <TabsTrigger value="content">Contenu</TabsTrigger>
                <TabsTrigger value="failures">Échecs</TabsTrigger>
              </TabsList>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {filteredActivities.length > 0 ? (
                      filteredActivities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-medium">{activity.userName}</TableCell>
                          <TableCell>{activity.action}</TableCell>
                          <TableCell className="hidden md:table-cell">{activity.timestamp}</TableCell>
                          <TableCell className="hidden md:table-cell">{activity.ip}</TableCell>
                          <TableCell className="hidden md:table-cell">{activity.device}</TableCell>
                          <TableCell>
                            <Badge variant={activity.status === 'Succès' ? "default" : "destructive"}>
                              {activity.status}
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
                                <DropdownMenuItem className="flex items-center">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Détails
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center">
                                  <Download className="h-4 w-4 mr-2" />
                                  Exporter
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Aucune activité trouvée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredActivities.length > 0 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button variant="outline" size="sm" disabled>
                    Précédent
                  </Button>
                  <Button variant="outline" size="sm" className="px-3 font-medium">
                    1
                  </Button>
                  <Button variant="outline" size="sm" className="px-3">
                    2
                  </Button>
                  <Button variant="outline" size="sm" className="px-3">
                    3
                  </Button>
                  <Button variant="outline" size="sm">
                    Suivant
                  </Button>
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUserActivity;
