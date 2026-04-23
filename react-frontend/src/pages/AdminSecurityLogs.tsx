
import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, Filter, MoreHorizontal, Search, Shield, ShieldAlert, Clock, User, Calendar, AlertTriangle, Check, X } from "lucide-react";

const AdminSecurityLogs = () => {
  // Mock data for security logs
  const [logs, setLogs] = useState([
    { id: 1, user: "John Doe", action: "Connexion", status: "Réussi", ip: "192.168.1.1", device: "Chrome / Windows", timestamp: "2025-04-08 14:32:45" },
    { id: 2, user: "Marie Dupont", action: "Connexion", status: "Réussi", ip: "192.168.1.2", device: "Safari / MacOS", timestamp: "2025-04-08 14:15:22" },
    { id: 3, user: "Alice Smith", action: "Connexion", status: "Échoué", ip: "192.168.1.3", device: "Firefox / Linux", timestamp: "2025-04-08 13:45:10" },
    { id: 4, user: "Admin", action: "Modification de permissions", status: "Réussi", ip: "192.168.1.4", device: "Chrome / Windows", timestamp: "2025-04-08 12:30:05" },
    { id: 5, user: "Robert Martin", action: "Connexion", status: "Réussi", ip: "192.168.1.5", device: "Edge / Windows", timestamp: "2025-04-08 12:15:40" },
    { id: 6, user: "Thomas Wilson", action: "Réinitialisation MDP", status: "Réussi", ip: "192.168.1.6", device: "Chrome / Android", timestamp: "2025-04-08 11:50:32" },
    { id: 7, user: "Emma Davis", action: "Connexion", status: "Échoué", ip: "192.168.1.7", device: "Safari / iOS", timestamp: "2025-04-08 11:22:18" },
    { id: 8, user: "Admin", action: "Suppression d'utilisateur", status: "Réussi", ip: "192.168.1.8", device: "Chrome / Windows", timestamp: "2025-04-08 10:45:03" },
    { id: 9, user: "Sophie Martin", action: "Connexion", status: "Réussi", ip: "192.168.1.9", device: "Firefox / MacOS", timestamp: "2025-04-08 10:10:27" },
    { id: 10, user: "Paul Dubois", action: "Connexion", status: "Échoué", ip: "192.168.1.10", device: "Chrome / Windows", timestamp: "2025-04-08 09:55:14" },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("all");

  // Filter logs based on search term and current tab
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (currentTab === "all") return matchesSearch;
    if (currentTab === "success") return matchesSearch && log.status === "Réussi";
    if (currentTab === "failed") return matchesSearch && log.status === "Échoué";
    if (currentTab === "login") return matchesSearch && log.action === "Connexion";
    return matchesSearch;
  });

  const logStats = {
    total: logs.length,
    success: logs.filter(log => log.status === "Réussi").length,
    failed: logs.filter(log => log.status === "Échoué").length,
    login: logs.filter(log => log.action === "Connexion").length,
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Logs de Sécurité</h1>
            <p className="text-muted-foreground">Suivez toutes les activités de sécurité de la plateforme</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Paramètres de sécurité
            </Button>
          </div>
        </div>

        {/* Security statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total des logs</p>
                <p className="text-2xl font-bold">{logStats.total}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-muted-foreground opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Connexions réussies</p>
                <p className="text-2xl font-bold">{logStats.success}</p>
              </div>
              <Check className="h-8 w-8 text-green-500 opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Connexions échouées</p>
                <p className="text-2xl font-bold">{logStats.failed}</p>
              </div>
              <X className="h-8 w-8 text-red-500 opacity-70" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Tentatives de connexion</p>
                <p className="text-2xl font-bold">{logStats.login}</p>
              </div>
              <User className="h-8 w-8 text-blue-500 opacity-70" />
            </CardContent>
          </Card>
        </div>

        {/* Main security logs table card */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Journal des activités de sécurité</CardTitle>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher..."
                    className="pl-8 w-full md:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtres
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Par date</DropdownMenuItem>
                    <DropdownMenuItem>Par utilisateur</DropdownMenuItem>
                    <DropdownMenuItem>Par action</DropdownMenuItem>
                    <DropdownMenuItem>Par statut</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={setCurrentTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="success">Réussis</TabsTrigger>
                <TabsTrigger value="failed">Échoués</TabsTrigger>
                <TabsTrigger value="login">Connexions</TabsTrigger>
              </TabsList>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Utilisateur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden md:table-cell">Adresse IP</TableHead>
                      <TableHead className="hidden md:table-cell">Appareil</TableHead>
                      <TableHead className="w-[180px]">Date & Heure</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.user}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'Réussi' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {log.status}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{log.ip}</TableCell>
                          <TableCell className="hidden md:table-cell">{log.device}</TableCell>
                          <TableCell>{log.timestamp}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <User className="h-4 w-4 mr-2" />
                                  Voir l'utilisateur
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Voir l'historique
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Signaler
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Aucun log trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredLogs.length > 0 && (
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

export default AdminSecurityLogs;
