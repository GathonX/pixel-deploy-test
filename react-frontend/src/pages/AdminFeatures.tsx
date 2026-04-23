import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import {
  Settings,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
  Search,
  Eye,
  MoreHorizontal,
  Shield,
  DollarSign,
  Activity,
  Loader2,
} from "lucide-react";

interface Feature {
  id: number;
  key: string;
  name: string;
  price: number;
  category: string;
  is_active: boolean;
  users_with_access: number;
  pending_requests: number;
}

interface UserAccess {
  id: number;
  user_name: string;
  user_email: string;
  admin_enabled: boolean;
  user_activated: boolean;
  amount_paid: number;
  payment_method: string;
  admin_enabled_at: string;
  admin_enabled_by: string;
  status: string;
}

interface PendingRequest {
  id: number;
  user_name: string;
  user_email: string;
  feature_name: string;
  amount_claimed: number;
  payment_method: string;
  payment_proofs: string[];
  user_message: string;
  created_at: string;
}

// Fonction utilitaire pour obtenir l'URL du backend
const getBackendUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

const AdminFeatures: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [userAccesses, setUserAccesses] = useState<UserAccess[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("features");
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserAccessModal, setShowUserAccessModal] = useState(false);
  const [showAddAccessModal, setShowAddAccessModal] = useState(false);
  const [approvingRequests, setApprovingRequests] = useState<Set<number>>(new Set());
  const [rejectingRequests, setRejectingRequests] = useState<Set<number>>(new Set());
  const [addingAccess, setAddingAccess] = useState(false);
  const { toast } = useToast();

  // ✅ LOG DIAGNOSTIC SIMPLE - Pas de redirection (ProtectedRoute s'en charge)
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      console.log('🛡️ [AdminFeatures] Admin vérifié:', {
        user: user.name,
        role: user.role,
        isAdmin: user.role === 'admin',
        currentUrl: window.location.href
      });
    }
  }, [user, isAuthenticated, authLoading]);

  // Form data for adding user access
  const [newAccessForm, setNewAccessForm] = useState({
    user_email: "",
    amount_paid: "",
    payment_method: "",
    admin_notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [featuresRes, requestsRes] = await Promise.all([
        api.get("/admin/features"),
        api.get("/admin/features/pending-requests"),
      ]);

      setFeatures(featuresRes.data.data);
      setPendingRequests(requestsRes.data.data);
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserAccesses = async (featureId: number) => {
    try {
      const response = await api.get(`/admin/features/${featureId}/users`);
      setUserAccesses(response.data.data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les accès utilisateur",
        variant: "destructive",
      });
    }
  };

  const approveRequest = async (requestId: number) => {
    try {
      setApprovingRequests(prev => new Set(prev).add(requestId));

      await api.post(`/admin/features/requests/${requestId}/approve`, {
        admin_response: "Demande approuvée et accès activé",
      });

      toast({
        title: "Succès",
        description: "Demande approuvée avec succès",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'approuver la demande",
        variant: "destructive",
      });
    } finally {
      setApprovingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const rejectRequest = async (requestId: number) => {
    try {
      setRejectingRequests(prev => new Set(prev).add(requestId));

      await api.post(`/admin/features/requests/${requestId}/reject`, {
        admin_response: "Preuves de paiement insuffisantes",
      });

      toast({
        title: "Succès",
        description: "Demande rejetée",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la demande",
        variant: "destructive",
      });
    } finally {
      setRejectingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const toggleUserAccess = async (accessId: number, enable: boolean) => {
    try {
      if (enable) {
        // Pour réactiver un accès, on peut modifier le status
        await api.put(`/admin/features/access/${accessId}`, {
          admin_enabled: true,
          status: "active",
        });
        toast({
          title: "Succès",
          description: "Accès réactivé",
        });
      } else {
        await api.delete(`/admin/features/access/${accessId}`);
        toast({
          title: "Succès",
          description: "Accès révoqué",
        });
      }

      if (selectedFeature) {
        loadUserAccesses(selectedFeature.id);
        loadData(); // Recharger les stats
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description:
          error.response?.data?.message || "Impossible de modifier l'accès",
        variant: "destructive",
      });
    }
  };

  const openManualActivationFromRequest = (request: PendingRequest) => {
    // Trouver la fonctionnalité correspondante
    const feature = features.find(f => f.name === request.feature_name);
    if (!feature) {
      toast({
        title: "Erreur",
        description: "Fonctionnalité non trouvée",
        variant: "destructive",
      });
      return;
    }

    // Pré-remplir le formulaire avec les données de la demande
    setSelectedFeature(feature);
    setNewAccessForm({
      user_email: request.user_email,
      amount_paid: request.amount_claimed.toString(),
      payment_method: request.payment_method,
      admin_notes: `Activation depuis demande #${request.id} - ${request.user_message || 'Aucun message'}`,
    });

    // Ouvrir la modal
    setShowAddAccessModal(true);

    console.log('✅ [AdminFeatures] Modal pré-remplie avec la demande:', {
      user: request.user_name,
      email: request.user_email,
      feature: request.feature_name,
      amount: request.amount_claimed,
      method: request.payment_method
    });
  };

  const addUserAccess = async () => {
    if (
      !selectedFeature ||
      !newAccessForm.user_email ||
      !newAccessForm.amount_paid ||
      !newAccessForm.payment_method
    ) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingAccess(true);
      console.log('🔄 [AdminFeatures] Début activation manuelle:', {
        email: newAccessForm.user_email,
        feature: selectedFeature.name,
        amount: newAccessForm.amount_paid,
        method: newAccessForm.payment_method
      });

      // Trouver l'ID utilisateur par email
      console.log('🔍 [AdminFeatures] Recherche utilisateur:', newAccessForm.user_email);
      const userResponse = await api.get(
        `/admin/users?email=${newAccessForm.user_email}`
      );

      console.log('📋 [AdminFeatures] Réponse recherche utilisateur:', userResponse.data);
      console.log('📋 [AdminFeatures] Structure de data:', {
        isArray: Array.isArray(userResponse.data.data),
        type: typeof userResponse.data.data,
        keys: userResponse.data.data ? Object.keys(userResponse.data.data) : 'null',
        value: userResponse.data.data
      });

      // Log détaillé pour voir exactement ce qu'il y a dans l'objet
      if (userResponse.data.data && typeof userResponse.data.data === 'object') {
        console.log('🔍 [AdminFeatures] Contenu complet de data:', JSON.stringify(userResponse.data.data, null, 2));
        console.log('🔍 [AdminFeatures] Propriétés de data:', Object.keys(userResponse.data.data));

        // Vérifier si l'objet contient directement les propriétés d'un utilisateur
        const dataObj = userResponse.data.data;
        console.log('🔍 [AdminFeatures] A une propriété id?', 'id' in dataObj);
        console.log('🔍 [AdminFeatures] A une propriété email?', 'email' in dataObj);
        console.log('🔍 [AdminFeatures] A une propriété name?', 'name' in dataObj);
      }

      // Gérer différentes structures de réponse possible
      let userData = null;

      if (userResponse.data.data) {
        const dataObj = userResponse.data.data;

        // Cas 1: data est un tableau d'utilisateurs
        if (Array.isArray(dataObj)) {
          userData = dataObj.length > 0 ? dataObj[0] : null;
          console.log('✅ [AdminFeatures] Structure: Tableau d\'utilisateurs');
        }
        // Cas 2: data est un objet utilisateur direct (a les propriétés id, email, name)
        else if (typeof dataObj === 'object' && ('id' in dataObj && 'email' in dataObj)) {
          userData = dataObj;
          console.log('✅ [AdminFeatures] Structure: Utilisateur direct');
        }
        // Cas 3: data est un objet wrapper avec des propriétés users, user, etc.
        else if (typeof dataObj === 'object') {
          console.log('🔍 [AdminFeatures] Structure: Objet wrapper, recherche...');

          // Chercher dans les propriétés connues
          if (dataObj.users && Array.isArray(dataObj.users)) {
            userData = dataObj.users.length > 0 ? dataObj.users[0] : null;
            console.log('✅ [AdminFeatures] Trouvé dans propriété "users"');
          } else if (dataObj.user && typeof dataObj.user === 'object') {
            userData = dataObj.user;
            console.log('✅ [AdminFeatures] Trouvé dans propriété "user"');
          } else if (dataObj.data && Array.isArray(dataObj.data)) {
            // Cas de pagination Laravel : data contient un tableau d'utilisateurs
            // Chercher l'utilisateur avec l'email correspondant
            const foundUser = dataObj.data.find((user: any) =>
              user.email === newAccessForm.user_email
            );
            userData = foundUser || null;
            console.log('✅ [AdminFeatures] Pagination Laravel - utilisateur trouvé:', !!foundUser);
          } else if (dataObj.items && Array.isArray(dataObj.items)) {
            userData = dataObj.items.length > 0 ? dataObj.items[0] : null;
            console.log('✅ [AdminFeatures] Trouvé dans propriété "items"');
          } else {
            // Chercher le premier objet qui ressemble à un utilisateur
            for (const [key, value] of Object.entries(dataObj)) {
              if (typeof value === 'object' && value !== null && 'id' in value && 'email' in value) {
                userData = value;
                console.log(`✅ [AdminFeatures] Trouvé utilisateur dans propriété "${key}"`);
                break;
              }
            }
          }
        }
      }

      console.log('🔍 [AdminFeatures] Données utilisateur extraites:', userData);

      if (!userData || !userData.id) {
        toast({
          title: "Erreur",
          description: "Utilisateur introuvable avec cet email",
          variant: "destructive",
        });
        return;
      }

      const userId = userData.id;
      console.log('✅ [AdminFeatures] Utilisateur trouvé, ID:', userId);

      const requestData = {
        user_id: userId,
        feature_id: selectedFeature.id,
        amount_paid: parseFloat(newAccessForm.amount_paid),
        payment_method: newAccessForm.payment_method,
        admin_notes: newAccessForm.admin_notes,
        send_notifications: true, // ✅ Envoyer tickets et emails comme pour "Approuver"
      };

      console.log('📤 [AdminFeatures] Envoi requête activation:', requestData);

      await api.post("/admin/features/enable-access", requestData);

      console.log('✅ [AdminFeatures] Activation réussie');

      toast({
        title: "Succès",
        description: "Accès activé avec succès",
      });

      setNewAccessForm({
        user_email: "",
        amount_paid: "",
        payment_method: "",
        admin_notes: "",
      });
      setShowAddAccessModal(false);
      loadUserAccesses(selectedFeature.id);
      loadData(); // Recharger les stats
    } catch (error: any) {
      console.error('❌ [AdminFeatures] Erreur activation:', error);
      console.error('📋 [AdminFeatures] Détails erreur:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      toast({
        title: "Erreur",
        description:
          error.response?.data?.message ||
          `Impossible d'activer l'accès: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setAddingAccess(false);
    }
  };

  const getCategoryBadge = (
    category: string
  ): "default" | "destructive" | "secondary" | "outline" => {
    const variants: Record<
      string,
      "default" | "destructive" | "secondary" | "outline"
    > = {
      free: "secondary",
      premium: "default",
      enterprise: "destructive",
    };
    return variants[category] || "secondary";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
        );
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">Suspendu</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const filteredRequests = pendingRequests.filter(
    (request) =>
      request.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.feature_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse text-lg">Chargement des données...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Gestion des Fonctionnalités
            </h1>
            <p className="text-slate-600 mt-1">
              Gérez l'accès aux fonctionnalités premium et validez les paiements
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {features.length}
              </div>
              <div className="text-sm text-blue-600">Fonctionnalités</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {pendingRequests.length}
              </div>
              <div className="text-sm text-yellow-600">En attente</div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Fonctionnalités
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Demandes ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab Fonctionnalités */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Liste des Fonctionnalités</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Rechercher une fonctionnalité..."
                        className="pl-9 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fonctionnalité</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Accès Actifs</TableHead>
                      <TableHead>Demandes</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map((feature) => (
                      <TableRow key={feature.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Shield className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {feature.name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {feature.key}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-medium">
                              {feature.price}€
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getCategoryBadge(feature.category)}>
                            {feature.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">
                              {feature.users_with_access}
                            </span>
                            <span className="text-slate-500">utilisateurs</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <span className="font-medium">
                              {feature.pending_requests}
                            </span>
                            <span className="text-slate-500">en attente</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              feature.is_active ? "default" : "secondary"
                            }
                          >
                            {feature.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedFeature(feature);
                                loadUserAccesses(feature.id);
                                setShowUserAccessModal(true);
                              }}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Voir accès
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFeature(feature);
                                setShowAddAccessModal(true);
                              }}
                              className="flex items-center gap-1"
                            >
                              <UserPlus className="w-4 h-4" />
                              Activer manuellement
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Demandes */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Demandes d'Activation en Attente</CardTitle>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Rechercher dans les demandes..."
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">
                      Aucune demande en attente
                    </h3>
                    <p className="text-slate-500">
                      Les nouvelles demandes d'activation apparaîtront ici
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border rounded-lg p-6 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-slate-900">
                                {request.user_name}
                              </h3>
                              <p className="text-sm text-slate-600">
                                {request.user_email}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700"
                          >
                            {request.feature_name}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-sm text-green-600 font-medium">
                              Montant Payé
                            </div>
                            <div className="text-lg font-bold text-green-700">
                              {request.amount_claimed}€
                            </div>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-sm text-blue-600 font-medium">
                              Méthode de Paiement
                            </div>
                            <div className="text-blue-700 font-medium">
                              {request.payment_method}
                            </div>
                          </div>
                        </div>

                        {request.user_message && (
                          <div className="bg-slate-50 p-3 rounded-lg mb-4">
                            <div className="text-sm font-medium text-slate-700 mb-1">
                              Message utilisateur :
                            </div>
                            <p className="text-sm text-slate-600">
                              {request.user_message}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                              Preuves : {request.payment_proofs.length}{" "}
                              fichier(s)
                            </span>
                            <div className="flex gap-1">
                              {request.payment_proofs.map((proof, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(`${getBackendUrl()}/storage/${proof}`, "_blank")
                                  }
                                  className="text-xs"
                                >
                                  Preuve {index + 1}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveRequest(request.id)}
                              disabled={approvingRequests.has(request.id)}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white flex items-center gap-1"
                            >
                              {approvingRequests.has(request.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              {approvingRequests.has(request.id) ? "Approbation..." : "Approuver"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openManualActivationFromRequest(request)}
                              className="flex items-center gap-1"
                            >
                              <UserPlus className="w-4 h-4" />
                              Activer
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectRequest(request.id)}
                              disabled={rejectingRequests.has(request.id)}
                              className="flex items-center gap-1"
                            >
                              {rejectingRequests.has(request.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              {rejectingRequests.has(request.id) ? "Rejet..." : "Rejeter"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal Accès Utilisateurs */}
        <Dialog
          open={showUserAccessModal}
          onOpenChange={setShowUserAccessModal}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Accès utilisateurs - {selectedFeature?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Admin Validé</TableHead>
                    <TableHead>User Activé</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userAccesses.map((access) => (
                    <TableRow key={access.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{access.user_name}</div>
                          <div className="text-sm text-slate-500">
                            {access.user_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={access.admin_enabled}
                            onCheckedChange={(checked) =>
                              toggleUserAccess(access.id, checked)
                            }
                          />
                          <span className="text-sm">
                            {access.admin_enabled ? "Oui" : "Non"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            access.user_activated ? "default" : "secondary"
                          }
                        >
                          {access.user_activated ? "Oui" : "Non"}
                        </Badge>
                      </TableCell>
                      <TableCell>{access.amount_paid}€</TableCell>
                      <TableCell>{getStatusBadge(access.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => toggleUserAccess(access.id, false)}
                          disabled={!access.admin_enabled}
                        >
                          Révoquer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Ajouter Accès */}
        <Dialog open={showAddAccessModal} onOpenChange={setShowAddAccessModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Activer manuellement - {selectedFeature?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user_email">Email utilisateur</Label>
                <Input
                  id="user_email"
                  value={newAccessForm.user_email}
                  onChange={(e) =>
                    setNewAccessForm((prev) => ({
                      ...prev,
                      user_email: e.target.value,
                    }))
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="amount_paid">Montant payé (€)</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  value={newAccessForm.amount_paid}
                  onChange={(e) =>
                    setNewAccessForm((prev) => ({
                      ...prev,
                      amount_paid: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="payment_method">Méthode de paiement</Label>
                <Select
                  value={newAccessForm.payment_method}
                  onValueChange={(value) =>
                    setNewAccessForm((prev) => ({
                      ...prev,
                      payment_method: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Virement</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin_notes">Notes admin (optionnel)</Label>
                <Input
                  id="admin_notes"
                  value={newAccessForm.admin_notes}
                  onChange={(e) =>
                    setNewAccessForm((prev) => ({
                      ...prev,
                      admin_notes: e.target.value,
                    }))
                  }
                  placeholder="Notes sur cette activation..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={addUserAccess}
                  disabled={addingAccess}
                  className="flex-1 flex items-center gap-2"
                >
                  {addingAccess && <Loader2 className="w-4 h-4 animate-spin" />}
                  {addingAccess ? "Activation..." : "Activer l'accès"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddAccessModal(false)}
                  disabled={addingAccess}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminFeatures;
