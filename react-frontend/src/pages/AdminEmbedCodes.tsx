// src/pages/AdminEmbedCodes.tsx - PAGE ADMIN POUR VOIR TOUS LES CODES EMBED
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  CheckCircle,
  Code2,
  Globe,
  ExternalLink,
  Info,
  Users,
  Search,
  Edit,
  Trash2,
  Plus,
  Eye,
  Link,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import embedService from "@/services/embedService";
import api from "@/services/api";

// Typage de la réponse brute de l'API (même format que UsersList.tsx)
interface ApiUser {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
  plan?: string;
  website?: string;
}

// Interface pour notre usage local
interface User {
  id: string;
  name: string;
  email: string;
  website: string;
  created_at: string;
  plan: string;
  role: string;
}

interface CopiedState {
  [key: string]: boolean;
}

const AdminEmbedCodes: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [copiedStates, setCopiedStates] = useState<CopiedState>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // États pour les actions CRUD
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editWebsite, setEditWebsite] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // États pour le modal de suppression
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // URL de base dynamique
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ message: string; data: { data: ApiUser[] } }>("/admin/users");
      const apiUsers = response.data.data.data; // Structure paginée : .data.data
      
      // Mapper vers notre format local
      const mappedUsers: User[] = apiUsers.map(u => ({
        id: u.id.toString(),
        name: u.name,
        email: u.email,
        website: u.website || "",
        created_at: u.created_at,
        plan: u.plan || "Standard",
        role: u.is_admin ? "Admin" : "Utilisateur",
      }));
      
      setUsers(mappedUsers);
      if (mappedUsers.length > 0) {
        setSelectedUser(mappedUsers[0]);
      }
    } catch (error) {
      console.error("Erreur récupération utilisateurs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des utilisateurs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.website.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleCopy = async (text: string, type: string, userId: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      const key = `${userId}_${type}`;
      setCopiedStates((prev) => ({ ...prev, [key]: true }));

      toast({
        title: "Code copié !",
        description: `Le code ${type} a été copié dans votre presse-papiers.`,
      });

      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error("Erreur copie:", error);
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier le code.",
        variant: "destructive",
      });
    }
  };

  const generateUserEmbedCodes = (user: User) => {
    const clientId = user.id;
    // ✅ GÉNÉRATION CENTRALISÉE - Source unique de vérité automatiquement synchronisée
    return embedService.generateAllEmbedCodes(clientId);
  };

  // ✅ FONCTIONS CRUD POUR LE SITE WEB
  const ensureUrlProtocol = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const handleEditWebsite = (user: User) => {
    setEditingUser(user);
    setEditWebsite(user.website || '');
  };

  const handleUpdateWebsite = async () => {
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      const normalizedWebsite = editWebsite.trim() ? ensureUrlProtocol(editWebsite.trim()) : '';
      
      const payload = {
        name: editingUser.name,
        email: editingUser.email,
        website: normalizedWebsite,
        is_admin: editingUser.role === 'Admin',
        plan: editingUser.plan
      };

      await api.put(`/admin/users/${editingUser.id}`, payload);
      
      // Mettre à jour la liste locale
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, website: normalizedWebsite }
          : u
      ));
      
      toast({
        title: "Site web mis à jour",
        description: `Le site web de ${editingUser.name} a été modifié.`,
      });
      
      // ✅ SYNCHRONISATION : Émettre un événement pour notifier les autres pages
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: {
          id: editingUser.id,
          name: editingUser.name,
          email: editingUser.email,
          website: normalizedWebsite,
          is_admin: editingUser.role === 'Admin',
          plan: editingUser.plan
        }
      }));
      
      console.log('🔄 [AdminEmbedCodes] Synchronisation: Site web mis à jour pour utilisateur', editingUser.id, '→', normalizedWebsite);
      
      setEditingUser(null);
      setEditWebsite('');
      
    } catch (error) {
      console.error('Erreur mise à jour site web:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le site web.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteWebsite = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDeleteWebsite = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    console.log('🚀 [AdminEmbedCodes] Début suppression:', {
      userId: deletingUser.id,
      userName: deletingUser.name,
      websiteAvant: deletingUser.website
    });

    try {
      const payload = {
        name: deletingUser.name,
        email: deletingUser.email,
        website: '',
        is_admin: deletingUser.role === 'Admin',
        plan: deletingUser.plan
      };

      console.log('📤 [AdminEmbedCodes] Payload envoyé:', payload);

      const response = await api.put(`/admin/users/${deletingUser.id}`, payload);
      
      console.log('📥 [AdminEmbedCodes] Réponse serveur:', {
        status: response.status,
        data: response.data
      });
      
      // Mettre à jour la liste locale
      setUsers(prev => prev.map(u => 
        u.id === deletingUser.id 
          ? { ...u, website: '' }
          : u
      ));
      
      toast({
        title: "Site web supprimé",
        description: `Le site web de ${deletingUser.name} a été supprimé.`,
      });
      
      // ✅ SYNCHRONISATION : Émettre l'événement pour notifier les autres pages (même logique que la modification)
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: {
          id: deletingUser.id,
          name: deletingUser.name,
          email: deletingUser.email,
          website: '', // Site web supprimé (string vide comme dans la modification)
          is_admin: deletingUser.role === 'Admin',
          plan: deletingUser.plan
        }
      }));
      
      console.log('🔄 [AdminEmbedCodes] Synchronisation: Site web supprimé pour utilisateur', {
        userId: deletingUser.id,
        userName: deletingUser.name,
        websiteData: '' // String vide
      });
      
      setDeletingUser(null);
      
    } catch (error) {
      console.error('Erreur suppression site web:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le site web.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewWebsite = (website: string) => {
    const url = ensureUrlProtocol(website);
    window.open(url, '_blank');
  };

  const handleViewUserDetails = (userId: string) => {
    window.location.href = `/admin/users/${userId}`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-screen w-full items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        className="p-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Code2 className="h-8 w-8 text-blue-600" />
              Codes d'Intégration - Admin
            </h1>
            <p className="text-slate-600 mt-1">
              Gérez tous les codes embed et iframes des utilisateurs
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {users.length} utilisateur{users.length > 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Section de recherche et sélection d'utilisateur */}
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Sélection d'utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher par nom, email ou site web..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedUser?.id === user.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">{user.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {user.website || "Aucun site web"}
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {user.plan}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ID: {user.id}
                        </Badge>
                      </div>
                      
                      {/* Boutons d'actions CRUD */}
                      <div className="flex gap-1 pt-2 border-t border-slate-100">
                        {/* Voir les détails utilisateur */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewUserDetails(user.id);
                          }}
                          title="Voir les détails"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        
                        {/* Modifier/Ajouter site web */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditWebsite(user);
                          }}
                          title={user.website ? "Modifier le site web" : "Ajouter un site web"}
                        >
                          {user.website ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        </Button>
                        
                        {/* Voir le site web */}
                        {user.website && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewWebsite(user.website);
                            }}
                            title="Voir le site web"
                          >
                            <Link className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {/* Supprimer site web */}
                        {user.website && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWebsite(user);
                            }}
                            title="Supprimer le site web"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                Aucun utilisateur trouvé
              </div>
            )}
          </CardContent>
        </Card>

        {/* Codes d'intégration pour l'utilisateur sélectionné */}
        {selectedUser && (
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-blue-600" />
                Codes d'intégration pour {selectedUser.name}
              </CardTitle>
              <div className="flex gap-2 text-sm text-slate-600 flex-wrap">
                <span>Email: {selectedUser.email}</span>
                <span>•</span>
                <span>Rôle: {selectedUser.role}</span>
                <span>•</span>
                <span>Plan: {selectedUser.plan}</span>
                {selectedUser.website && (
                  <>
                    <span>•</span>
                    <span>Site: {selectedUser.website}</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="blog-feed" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 bg-slate-100">
                  <TabsTrigger value="blog-feed" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Flux Blog
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Contact
                  </TabsTrigger>
                  <TabsTrigger value="reservation-quick" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Réservation Rapide
                  </TabsTrigger>
                  <TabsTrigger value="reservation-full" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Réservation Complète
                  </TabsTrigger>
                </TabsList>

                {(() => {
                  const codes = generateUserEmbedCodes(selectedUser);
                  return (
                    <>
                      {/* Flux de Blog */}
                      <TabsContent value="blog-feed">
                        <Card>
                          <CardHeader>
                            <CardTitle>Code Embed - Flux de Blog</CardTitle>
                            <p className="text-sm text-slate-600">
                              Code JavaScript pour afficher les articles de blog de cet utilisateur
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="relative">
                              <Textarea
                                value={codes.blogEmbedCode}
                                readOnly
                                className="font-mono text-xs bg-slate-50 border-slate-200 min-h-[200px] w-full resize-none overflow-auto"
                                style={{ wordBreak: "break-all" }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() =>
                                  handleCopy(codes.blogEmbedCode, "blog-embed", selectedUser.id)
                                }
                              >
                                {copiedStates[`${selectedUser.id}_blog-embed`] ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Contact */}
                      <TabsContent value="contact">
                        <Card>
                          <CardHeader>
                            <CardTitle>Code iFrame - Formulaire de Contact</CardTitle>
                            <p className="text-sm text-slate-600">
                              iFrame pour intégrer le formulaire de contact (100% × 550px)
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="relative">
                              <Textarea
                                value={codes.contactIframeCode}
                                readOnly
                                className="font-mono text-xs bg-slate-50 border-slate-200 min-h-[120px] w-full resize-none overflow-auto"
                                style={{
                                  wordBreak: "break-all",
                                  whiteSpace: "pre-wrap",
                                }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() =>
                                  handleCopy(codes.contactIframeCode, "contact-iframe", selectedUser.id)
                                }
                              >
                                {copiedStates[`${selectedUser.id}_contact-iframe`] ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-800 mb-2">
                                💡 URL de test direct :
                              </h4>
                              <code className="text-xs text-blue-700 break-all">
                                {baseUrl}/iframe/contact?client_id={selectedUser.id}
                              </code>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Réservation Rapide */}
                      <TabsContent value="reservation-quick">
                        <Card>
                          <CardHeader>
                            <CardTitle>Code iFrame - Réservation Rapide</CardTitle>
                            <p className="text-sm text-slate-600">
                              Formulaire compact pour la page d'accueil (100% × 450px)
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="relative">
                              <Textarea
                                value={codes.reservationQuickIframeCode}
                                readOnly
                                className="font-mono text-xs bg-slate-50 border-slate-200 min-h-[120px] w-full resize-none overflow-auto"
                                style={{
                                  wordBreak: "break-all",
                                  whiteSpace: "pre-wrap",
                                }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() =>
                                  handleCopy(
                                    codes.reservationQuickIframeCode,
                                    "reservation-quick-iframe",
                                    selectedUser.id
                                  )
                                }
                              >
                                {copiedStates[`${selectedUser.id}_reservation-quick-iframe`] ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-800 mb-2">
                                💡 URL de test direct :
                              </h4>
                              <code className="text-xs text-blue-700 break-all">
                                {baseUrl}/iframe/reservation-quick?client_id={selectedUser.id}
                              </code>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Réservation Complète */}
                      <TabsContent value="reservation-full">
                        <Card>
                          <CardHeader>
                            <CardTitle>Code iFrame - Réservation Complète</CardTitle>
                            <p className="text-sm text-slate-600">
                              Formulaire détaillé pour les pages contact (100% × 750px)
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="relative">
                              <Textarea
                                value={codes.reservationFullIframeCode}
                                readOnly
                                className="font-mono text-xs bg-slate-50 border-slate-200 min-h-[120px] w-full resize-none overflow-auto"
                                style={{
                                  wordBreak: "break-all",
                                  whiteSpace: "pre-wrap",
                                }}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() =>
                                  handleCopy(
                                    codes.reservationFullIframeCode,
                                    "reservation-full-iframe",
                                    selectedUser.id
                                  )
                                }
                              >
                                {copiedStates[`${selectedUser.id}_reservation-full-iframe`] ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-800 mb-2">
                                💡 URL de test direct :
                              </h4>
                              <code className="text-xs text-blue-700 break-all">
                                {baseUrl}/iframe/reservation-full?client_id={selectedUser.id}
                              </code>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </>
                  );
                })()}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Modal d'édition du site web */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-blue-600" />
                  {editingUser.website ? "Modifier" : "Ajouter"} le site web
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Utilisateur: {editingUser.name}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">URL du site web</Label>
                  <Input
                    placeholder="exemple.com ou https://exemple.com"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Le protocole https:// sera ajouté automatiquement si nécessaire
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditingUser(null);
                      setEditWebsite('');
                    }}
                    disabled={isUpdating}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleUpdateWebsite}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Mise à jour...
                      </>
                    ) : (
                      'Enregistrer'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {deletingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmer la suppression
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">
                    Êtes-vous sûr de vouloir supprimer le site web de :
                  </p>
                  <p className="font-semibold text-slate-800">{deletingUser.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    URL actuelle: {deletingUser.website}
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                    <p className="text-xs text-red-600">
                      ⚠️ Cette action supprimera définitivement l'URL du site web. 
                      L'utilisateur devra la ressaisir.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDeletingUser(null)}
                    disabled={isDeleting}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={confirmDeleteWebsite}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default AdminEmbedCodes;