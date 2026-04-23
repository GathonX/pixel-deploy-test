
import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { FileText, Download, FileSpreadsheet, FileCode, FileJson, Calendar, Filter, Users, Database, ChevronDown, Loader2 } from "lucide-react";
import { format } from "date-fns";

const AdminReportsExport: React.FC = () => {
  const [exportFormat, setExportFormat] = useState("csv");
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [isExporting, setIsExporting] = useState(false);
  const [exportCategory, setExportCategory] = useState("users");
  
  // Mock data for export history
  const exportHistory = [
    { id: '152', name: 'Export utilisateurs', type: 'Utilisateurs', format: 'CSV', records: '1243', date: '08/04/2025', status: 'completed' },
    { id: '151', name: 'Export transactions Avril', type: 'Transactions', format: 'Excel', records: '847', date: '07/04/2025', status: 'completed' },
    { id: '150', name: 'Export analytiques Q1', type: 'Analytiques', format: 'PDF', records: '56', date: '05/04/2025', status: 'completed' },
    { id: '149', name: 'Export blog articles', type: 'Contenu', format: 'JSON', records: '127', date: '01/04/2025', status: 'completed' },
    { id: '148', name: 'Export logs sécurité', type: 'Sécurité', format: 'CSV', records: '2651', date: '28/03/2025', status: 'completed' },
    { id: '147', name: 'Export utilisateurs inactifs', type: 'Utilisateurs', format: 'Excel', records: '342', date: '22/03/2025', status: 'completed' },
  ];
  
  // Available export data categories
  const exportCategories = [
    { value: 'users', label: 'Utilisateurs', icon: Users, description: "Données des comptes utilisateurs" },
    { value: 'transactions', label: 'Transactions', icon: FileText, description: "Historique des paiements" },
    { value: 'analytics', label: 'Analytiques', icon: ChevronDown, description: "Données d'analyse des performances" },
    { value: 'content', label: 'Contenu', icon: FileText, description: "Articles et ressources générés" },
    { value: 'security', label: 'Sécurité', icon: Database, description: "Logs de connexion et actions" },
  ];
  
  // Mock fields available for export based on category
  const getAvailableFields = () => {
    switch(exportCategory) {
      case 'users':
        return [
          { id: 'id', label: 'ID', checked: true },
          { id: 'name', label: 'Nom', checked: true },
          { id: 'email', label: 'Email', checked: true },
          { id: 'created_at', label: 'Date de création', checked: true },
          { id: 'last_login', label: 'Dernière connexion', checked: true },
          { id: 'subscription', label: 'Type d\'abonnement', checked: true },
          { id: 'status', label: 'Statut', checked: true },
        ];
      case 'transactions':
        return [
          { id: 'id', label: 'ID', checked: true },
          { id: 'user_id', label: 'ID Utilisateur', checked: true },
          { id: 'amount', label: 'Montant', checked: true },
          { id: 'date', label: 'Date', checked: true },
          { id: 'payment_method', label: 'Méthode de paiement', checked: true },
          { id: 'status', label: 'Statut', checked: true },
          { id: 'plan', label: 'Plan', checked: true },
        ];
      default:
        return [
          { id: 'id', label: 'ID', checked: true },
          { id: 'name', label: 'Nom', checked: true },
          { id: 'date', label: 'Date', checked: true },
          { id: 'value', label: 'Valeur', checked: true },
        ];
    }
  };
  
  const [availableFields, setAvailableFields] = useState(getAvailableFields());
  
  // Update fields when export category changes
  React.useEffect(() => {
    setAvailableFields(getAvailableFields());
  }, [exportCategory]);
  
  // Handle field selection toggle
  const toggleField = (fieldId: string) => {
    setAvailableFields(availableFields.map(field => 
      field.id === fieldId ? { ...field, checked: !field.checked } : field
    ));
  };
  
  // Handle start export
  const handleExport = () => {
    setIsExporting(true);
    
    // Simulating export process
    setTimeout(() => {
      setIsExporting(false);
      // Here you would initiate the actual export process
      console.log("Exporting data:", {
        format: exportFormat,
        dateRange,
        category: exportCategory,
        fields: availableFields.filter(f => f.checked).map(f => f.id)
      });
      
      // Show toast notification
      // toast({ title: "Export terminé", description: "Votre export est prêt à être téléchargé" });
    }, 2000);
  };
  
  // Get icon based on export format
  const getFormatIcon = (format: string) => {
    switch(format.toLowerCase()) {
      case 'csv':
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf':
        return <FileCode className="h-4 w-4" />; // Changed from FilePdf to FileCode
      case 'json':
        return <FileJson className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Export des données</h1>
            <p className="text-muted-foreground">
              Générez et téléchargez des rapports personnalisés
            </p>
          </div>
        </div>

        <Tabs defaultValue="create" className="space-y-4">
          <TabsList>
            <TabsTrigger value="create">Créer un export</TabsTrigger>
            <TabsTrigger value="history">Historique des exports</TabsTrigger>
            <TabsTrigger value="scheduled">Exports programmés</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration de l'export</CardTitle>
                  <CardDescription>
                    Sélectionnez les données à exporter et le format souhaité
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Catégorie de données</label>
                    <Select 
                      value={exportCategory} 
                      onValueChange={setExportCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {exportCategories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center">
                              <category.icon className="h-4 w-4 mr-2" />
                              <span>{category.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exportCategories.find(c => c.value === exportCategory)?.description || "Sélectionnez une catégorie de données à exporter"}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Période</label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        Du {format(dateRange.from, 'dd/MM/yyyy')} au {format(dateRange.to, 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Format d'export</label>
                    <Select 
                      value={exportFormat} 
                      onValueChange={setExportFormat}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleExport} 
                    disabled={isExporting} 
                    className="w-full mt-4"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exportation en cours...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Générer l'export
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Champs à inclure</CardTitle>
                  <CardDescription>
                    Sélectionnez les champs à inclure dans votre export
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAvailableFields(availableFields.map(f => ({ ...f, checked: true })))}
                    >
                      Tout sélectionner
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAvailableFields(availableFields.map(f => ({ ...f, checked: false })))}
                    >
                      Tout désélectionner
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {availableFields.map((field) => (
                      <div key={field.id} className="flex items-center space-x-2 rounded-md border p-2">
                        <Checkbox 
                          id={field.id} 
                          checked={field.checked}
                          onCheckedChange={() => toggleField(field.id)}
                        />
                        <label
                          htmlFor={field.id}
                          className="flex-grow text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des exports</CardTitle>
                <CardDescription>
                  Retrouvez et téléchargez vos exports précédents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Enregistrements</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getFormatIcon(item.format)}
                            <span className="ml-2">{item.format}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.records}</TableCell>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : item.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.status === 'completed' ? 'Terminé' : 
                             item.status === 'processing' ? 'En cours' : 'Erreur'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="scheduled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Exports programmés</CardTitle>
                <CardDescription>
                  Gérez vos exports automatisés récurrents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Aucun export programmé</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vous n'avez pas encore configuré d'exports automatisés.
                  </p>
                  <Button className="mt-4">
                    Créer un export programmé
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminReportsExport;
