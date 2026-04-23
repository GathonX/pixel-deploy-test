

// src/pages/AdminUserDetail.tsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  Edit,
  Mail,
  Phone,
  CalendarDays,
  CreditCard,
  Shield,
  Activity,
  AlertTriangle,
  Globe,
  MapPin,
  Languages,
  User,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";

interface RawUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  website?: string;
  bio?: string;
  address?: string;
  language?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  email_verified_at?: string | null;
  is_admin: boolean;
  is_active?: boolean;
  plan?: string;
}

const AdminUserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const { getAvatarUrl } = useAuth();
  const [rawUser, setRawUser] = useState<RawUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [currentTab, setCurrentTab] = useState("profile");

  // Mock pour les sections qui n'existent pas encore côté backend
  const defaultUsage = {
    sitesCreated: 2,
    articlesPublished: 37,
    storageUsed: "156 Mo",
    apiCallsThisMonth: 1240,
  };
  const defaultHistory = [
    { date: "7 Avril 2025", time: "09:45", ip: "192.168.1.1", device: "Chrome / MacOS" },
    { date: "5 Avril 2025", time: "14:22", ip: "192.168.1.1", device: "Safari / iOS" },
    { date: "2 Avril 2025", time: "18:05", ip: "192.168.1.1", device: "Chrome / MacOS" },
  ];
  const defaultTickets = [
    { id: "TK-2305", subject: "Problème de publication", status: "Ouvert", date: "6 Avril 2025" },
    { id: "TK-2290", subject: "Question sur l'API", status: "Résolu", date: "28 Mars 2025" },
  ];

  // Chargement des données utilisateur
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const resp = await api.get<{ message: string; data: RawUser }>(`/admin/users/${userId}`);
        setRawUser(resp.data.data);
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails de l’utilisateur.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, toast]);

  // Fonction utilitaire pour formater les dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const ensureUrlProtocol = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // Fusion des données réelles et des mocks/fallbacks
  const user = rawUser
    ? {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        phone: rawUser.phone || "Non renseigné",
        website: rawUser.website || "",
        bio: rawUser.bio || "Aucune biographie",
        address: rawUser.address || "Non renseignée",
        language: rawUser.language || "french",
        avatarUrl: getAvatarUrl(rawUser.avatar),
        registeredDate: formatDate(rawUser.created_at),
        updatedDate: formatDate(rawUser.updated_at),
        lastLogin: formatDate(rawUser.last_login),
        emailVerified: !!rawUser.email_verified_at,
        emailVerifiedDate: formatDate(rawUser.email_verified_at || undefined),
        isAdmin: rawUser.is_admin,
        status: rawUser.is_active !== false ? "Actif" : "Inactif",
        plan: rawUser.plan || "Standard",
        // Mock data for features not yet implemented
        paymentMethod: "Visa **** 4242",
        nextBillingDate: "15 Mai 2025",
        usageStats: defaultUsage,
        loginHistory: defaultHistory,
        supportTickets: defaultTickets,
      }
    : null;

  const plans = [
    { id: "free", name: "Gratuit", description: "Plan de base" },
    { id: "standard", name: "Standard", description: "Plan intermédiaire" },
    { id: "premium", name: "Agence", description: "Plan complet" },
  ];

  const handleChangePlan = async () => {
    if (!selectedPlan || !rawUser) return;
    try {
      await api.put(`/admin/users/${rawUser.id}/plan`, { plan: selectedPlan });
      toast({
        title: "Plan modifié",
        description: `Le plan a été mis à jour vers ${selectedPlan}.`,
      });
      setRawUser({ ...rawUser, plan: selectedPlan });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le plan.",
        variant: "destructive",
      });
    }
  };

  if (loading || !user) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">Chargement…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-2">
            <Link to="/admin/users">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Détails de l’utilisateur</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profil */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle>Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-medium">{user.name}</h3>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex gap-2 flex-wrap justify-center">
                  <Badge variant={user.status === "Actif" ? "default" : "outline"}>
                    {user.status}
                  </Badge>
                  <Badge variant={user.isAdmin ? "default" : "secondary"} className={user.isAdmin ? "bg-blue-600" : ""}>
                    {user.isAdmin ? "Admin" : "Utilisateur"}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {user.emailVerified ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Email vérifié
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 text-red-500" />
                        Email non vérifié
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">{user.phone}</span>
                </div>
                {user.website && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                    <a 
                      href={ensureUrlProtocol(user.website)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {user.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {user.address && user.address !== "Non renseignée" && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">{user.address}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Languages className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm capitalize">{user.language}</span>
                </div>
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">Inscrit le {user.registeredDate}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">Mis à jour le {user.updatedDate}</span>
                </div>
                <div className="flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">Dernière connexion: {user.lastLogin}</span>
                </div>
                {user.emailVerified && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">Email vérifié le {user.emailVerifiedDate}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium mb-2">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/admin/users/${user.id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" /> Modifier
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4 mr-2" /> Envoyer un email
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
                    <AlertTriangle className="h-4 w-4 mr-2" /> Suspendre
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Abonnement + onglets */}
          <div className="md:col-span-2">
<Card className="mb-6">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle>Abonnement</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier le plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Modifier le plan d'abonnement</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <RadioGroup 
                        value={selectedPlan} 
                        onValueChange={setSelectedPlan}
                        className="space-y-4"
                      >
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`flex items-center space-x-2 rounded-md border p-4 
                              ${selectedPlan === plan.id ? "border-primary" : "border-input"}`}
                          >
                            <RadioGroupItem value={plan.id} id={plan.id} />
                            <Label htmlFor={plan.id} className="flex-1">
                              <div className="font-medium">{plan.name}</div>
                              <div className="text-sm text-muted-foreground">{plan.description}</div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleChangePlan} disabled={!selectedPlan}>
                        Enregistrer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan actuel</p>
                    <p className="text-lg font-medium">{user.plan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Méthode de paiement</p>
                    <p className="text-lg font-medium flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                      {user.paymentMethod}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prochaine facturation</p>
                    <p className="text-lg font-medium">{user.nextBillingDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

             {/* Tabs for additional information */}
             <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="profile">Profil</TabsTrigger>
                <TabsTrigger value="usage">Utilisation</TabsTrigger>
                <TabsTrigger value="activity">Activité</TabsTrigger>
                <TabsTrigger value="tickets">Support</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations détaillées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Informations personnelles
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Nom complet:</span>
                            <p className="font-medium">{user.name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <p className="font-medium">{user.email}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Téléphone:</span>
                            <p className="font-medium">{user.phone}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Langue:</span>
                            <p className="font-medium capitalize">{user.language}</p>
                          </div>
                          {user.address && user.address !== "Non renseignée" && (
                            <div className="md:col-span-2">
                              <span className="text-muted-foreground">Adresse:</span>
                              <p className="font-medium">{user.address}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {user.bio && user.bio !== "Aucune biographie" && (
                        <div>
                          <h4 className="font-medium mb-3">Biographie</h4>
                          <p className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
                            {user.bio}
                          </p>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Statut du compte
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            {user.emailVerified ? (
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                            )}
                            <span className="text-sm">
                              Email {user.emailVerified ? "vérifié" : "non vérifié"}
                              {user.emailVerified && ` le ${user.emailVerifiedDate}`}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            <span className="text-sm">Compte {user.status.toLowerCase()}</span>
                          </div>
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="text-sm">
                              Rôle: {user.isAdmin ? "Administrateur" : "Utilisateur standard"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Historique
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-muted-foreground">Compte créé:</span> {user.registeredDate}</p>
                          <p><span className="text-muted-foreground">Dernière modification:</span> {user.updatedDate}</p>
                          <p><span className="text-muted-foreground">Dernière connexion:</span> {user.lastLogin}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="usage">
                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques d'utilisation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Sites créés</p>
                        <p className="text-2xl font-medium">{user.usageStats.sitesCreated}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Articles publiés</p>
                        <p className="text-2xl font-medium">{user.usageStats.articlesPublished}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Stockage utilisé</p>
                        <p className="text-2xl font-medium">{user.usageStats.storageUsed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Appels API ce mois</p>
                        <p className="text-2xl font-medium">{user.usageStats.apiCallsThisMonth}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Historique de connexion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {user.loginHistory.map((login, index) => (
                        <div key={index} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium">{login.date} à {login.time}</p>
                            <p className="text-sm text-muted-foreground">{login.device}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{login.ip}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="tickets">
                <Card>
                  <CardHeader>
                    <CardTitle>Tickets de support</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {user.supportTickets.map((ticket) => (
                        <div key={ticket.id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">ID: {ticket.id} • {ticket.date}</p>
                          </div>
                          <Badge variant={ticket.status === "Ouvert" ? "default" : "outline"}>
                            {ticket.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUserDetail;

