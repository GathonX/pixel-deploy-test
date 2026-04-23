
import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, Filter, MoreHorizontal, Search, Shield, ShieldAlert, User, Check, X } from "lucide-react";

const AdminSecurityPermissions = () => {
  // Mock data for permission roles
  const [roles, setRoles] = useState([
    { id: 1, name: "Super Admin", users: 2, permissions: 14, status: "Actif" },
    { id: 2, name: "Admin", users: 5, permissions: 12, status: "Actif" },
    { id: 3, name: "Modérateur", users: 8, permissions: 8, status: "Actif" },
    { id: 4, name: "Éditeur", users: 12, permissions: 6, status: "Actif" },
    { id: 5, name: "Visualiseur", users: 25, permissions: 3, status: "Actif" },
  ]);

  // Mock data for permissions
  const [permissions, setPermissions] = useState([
    { id: 1, name: "Accès dashboard", description: "Accès au tableau de bord principal", roles: ["Super Admin", "Admin", "Modérateur", "Éditeur", "Visualiseur"] },
    { id: 2, name: "Gestion utilisateurs", description: "Création et modification d'utilisateurs", roles: ["Super Admin", "Admin"] },
    { id: 3, name: "Suppression utilisateurs", description: "Suppression définitive d'un utilisateur", roles: ["Super Admin"] },
    { id: 4, name: "Gestion contenu", description: "Création et modification de contenu", roles: ["Super Admin", "Admin", "Modérateur", "Éditeur"] },
    { id: 5, name: "Validation contenu", description: "Approuver ou rejeter du contenu", roles: ["Super Admin", "Admin", "Modérateur"] },
    { id: 6, name: "Gestion finances", description: "Accès aux informations financières", roles: ["Super Admin", "Admin"] },
    { id: 7, name: "Accès logs", description: "Visualisation des logs de sécurité", roles: ["Super Admin", "Admin", "Modérateur"] },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("roles");

  // Filter permissions based on search term
  const filteredPermissions = permissions.filter(permission => 
    permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter roles based on search term
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Permissions de Sécurité</h1>
            <p className="text-muted-foreground">Gérez les rôles et les permissions d'accès</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Nouvelle permission
            </Button>
          </div>
        </div>

        {/* Main permissions management card */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Gestion des rôles et permissions</CardTitle>
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
                    <DropdownMenuItem>Tous les rôles</DropdownMenuItem>
                    <DropdownMenuItem>Rôles actifs</DropdownMenuItem>
                    <DropdownMenuItem>Rôles inactifs</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="roles" onValueChange={setCurrentTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="roles">Rôles</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="mapping">Cartographie</TabsTrigger>
              </TabsList>
              
              {/* Roles Tab */}
              <TabsContent value="roles">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Nom du rôle</TableHead>
                        <TableHead>Utilisateurs</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoles.length > 0 ? (
                        filteredRoles.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <Shield className="h-4 w-4 mr-2 text-blue-500" />
                                {role.name}
                              </div>
                            </TableCell>
                            <TableCell>{role.users}</TableCell>
                            <TableCell>{role.permissions}</TableCell>
                            <TableCell>
                              {/* Here's the fix: changing "success" to "secondary" */}
                              <Badge variant={role.status === "Actif" ? "secondary" : "outline"}>
                                {role.status}
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
                                  <DropdownMenuItem>
                                    <User className="h-4 w-4 mr-2" />
                                    Voir les utilisateurs
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Modifier les permissions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <X className="h-4 w-4 mr-2" />
                                    Désactiver le rôle
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            Aucun rôle trouvé
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              {/* Permissions Tab */}
              <TabsContent value="permissions">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[220px]">Permission</TableHead>
                        <TableHead className="w-[300px]">Description</TableHead>
                        <TableHead>Rôles concernés</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPermissions.length > 0 ? (
                        filteredPermissions.map((permission) => (
                          <TableRow key={permission.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <ShieldAlert className="h-4 w-4 mr-2 text-blue-500" />
                                {permission.name}
                              </div>
                            </TableCell>
                            <TableCell>{permission.description}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {permission.roles.map((role) => (
                                  <Badge key={role} variant="outline" className="bg-slate-100">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600">
                                    <X className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            Aucune permission trouvée
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              {/* Mapping Tab */}
              <TabsContent value="mapping">
                <div className="rounded-md border p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Matrice des permissions</h3>
                    <p className="text-sm text-muted-foreground">
                      Ce tableau montre quelles permissions sont attribuées à chaque rôle. Vous pouvez modifier les attributions directement.
                    </p>
                  </div>
                  
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">Permission</TableHead>
                          {roles.map(role => (
                            <TableHead key={role.id} className="text-center">{role.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissions.map(permission => (
                          <TableRow key={permission.id}>
                            <TableCell className="font-medium">{permission.name}</TableCell>
                            {roles.map(role => (
                              <TableCell key={role.id} className="text-center">
                                <Switch 
                                  checked={permission.roles.includes(role.name)}
                                  onCheckedChange={() => {
                                    // This would be an actual update function in a real implementation
                                    console.log(`Toggle ${permission.name} for ${role.name}`);
                                  }}
                                  aria-label={`${permission.name} pour ${role.name}`}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSecurityPermissions;
