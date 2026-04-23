// src/pages/EmbedDashboard.tsx - TABLEAU DE BORD CODES EMBED (DÉBORDEMENT CORRIGÉ)

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  Copy,
  CheckCircle,
  Code2,
  Globe,
  Info,
  AlertCircle,
} from "lucide-react";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import embedService from "@/services/embedService";
import userService from "@/services/userService";

interface CopiedState {
  [key: string]: boolean;
}

const EmbedDashboardContent: React.FC = () => {
  const { setOpenMobile } = useSidebar();
  const { user, loading, updateUserProfile, refreshUser } = useAuth();
  const { toast } = useToast();

  const [copiedStates, setCopiedStates] = useState<CopiedState>({});
  const [clientWebsite, setClientWebsite] = useState<string>("");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [embedAvailable, setEmbedAvailable] = useState<boolean | null>(null);
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);


  useEffect(() => {
    // Synchroniser avec user.website seulement si user existe et website a changé
    if (user) {
      const newWebsite = user.website || '';
      if (clientWebsite !== newWebsite) {
        console.log('🔄 [EmbedDashboard] Synchronisation user.website:', {
          userWebsite: user.website,
          clientWebsiteActuel: clientWebsite,
          clientWebsiteNouveau: newWebsite
        });
        setClientWebsite(newWebsite);
      }
      checkEmbedAvailability();
    }
  }, [user?.website]); // Dépendance sur user.website uniquement, pas sur tout l'objet user

  // ✅ SYNCHRONISATION : Écouter les mises à jour du profil depuis d'autres pages (admin)
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail;
      console.log('🔄 EmbedDashboard: Événement reçu:', {
        type: event.type,
        userId: updatedUser?.id,
        currentUserId: user?.id,
        websiteData: updatedUser?.website
      });
      
      if (updatedUser && user?.id && updatedUser.id === user.id) {
        // Mettre à jour le site web directement
        const newWebsite = updatedUser.website || '';
        
        console.log('🔄 Synchronisation admin → client:', {
          typeEvenement: event.type,
          websiteNouveau: newWebsite,
          action: newWebsite === '' ? 'SUPPRESSION' : 'MISE À JOUR'
        });
        
        setClientWebsite(newWebsite);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, [user?.id]); // Dépendance minimale : seulement sur l'ID user

  const checkEmbedAvailability = async (): Promise<void> => {
    setIsCheckingAvailability(true);
    try {
      const available = await embedService.checkEmbedAvailability();
      setEmbedAvailable(available);
    } catch (error) {
      console.error('Erreur lors de la vérification de la disponibilité des embed:', error);
      setEmbedAvailable(false);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleCopy = async (text: string, type: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [type]: true }));

      toast({
        title: "Code copié !",
        description: "Le code a été copié dans votre presse-papiers.",
      });

      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [type]: false }));
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

  // Fonction pour s'assurer que l'URL a un protocole
  const ensureUrlProtocol = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const handleSaveWebsite = async (): Promise<void> => {
    if (!clientWebsite) {
      toast({
        title: "URL requise",
        description: "Veuillez saisir une URL valide.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erreur",
        description: "Utilisateur non connecté.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingWebsite(true);
    try {
      // S'assurer que l'URL a un protocole
      const normalizedWebsite = ensureUrlProtocol(clientWebsite.trim());
      
      // Envoyer tous les champs obligatoires avec les valeurs actuelles
      const profileData = {
        name: user.name,
        email: user.email,
        website: normalizedWebsite,
        // Inclure les autres champs existants s'ils existent
        phone: user.phone || null,
        address: user.address || null,
        bio: user.bio || null,
        language: user.language || 'french'
      };

      await userService.updateProfile(profileData);
      
      // Mettre à jour le contexte d'authentification pour synchroniser avec le dashboard
      updateUserProfile({ website: normalizedWebsite });
      
      // Mettre à jour l'état local avec l'URL normalisée
      setClientWebsite(normalizedWebsite);
      
      toast({
        title: "Site web sauvegardé !",
        description: "L'URL de votre site web a été mise à jour avec succès.",
      });
    } catch (error) {
      console.error("Erreur sauvegarde site web:", error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder l'URL du site web. Vérifiez que l'URL est valide.",
        variant: "destructive",
      });
    } finally {
      setIsSavingWebsite(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/20">
        <p className="text-gray-600">Utilisateur non trouvé</p>
      </div>
    );
  }

  const clientId = user.id;
  // Récupérer les codes embed avec les nouvelles méthodes sécurisées
  const { blogEmbedCode } = useMemo(() => {
    if (!clientId) {
      return { blogEmbedCode: "" };
    }

    return {
      blogEmbedCode: embedService.generateBlogEmbedCode(clientId)
    };
  }, [clientId, embedService]);

  return (
    <motion.div
      className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <SidebarInset className="bg-white/80 backdrop-blur-sm border-r border-slate-100">
        <div className="p-6 overflow-y-auto max-h-screen">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden mr-2 hover:bg-slate-100/50"
                onClick={() => setOpenMobile(true)}
              >
                <Menu className="h-5 w-5 text-slate-600" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Code2 className="h-6 w-6 text-brand-blue" />
                  Codes d'Intégration
                </h1>
                <p className="text-sm text-slate-500">
                  Intégrez vos contenus sur votre site web
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={embedAvailable ? "default" : "destructive"}>
                {isCheckingAvailability
                  ? "Vérification..."
                  : embedAvailable
                  ? "Disponible"
                  : "Indisponible"}
              </Badge>
            </div>
          </div>

          {/* Status Alert */}
          {embedAvailable === false && (
            <Alert className="mb-6 border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Les endpoints embed ne sont pas encore disponibles. Contactez
                l'administrateur.
              </AlertDescription>
            </Alert>
          )}

          {/* Codes d'intégration */}
          <Tabs defaultValue="blog-feed" className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 bg-slate-100/50">
              <TabsTrigger
                value="blog-feed"
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Flux de Blog
              </TabsTrigger>
            </TabsList>

            {/* Flux de Blog */}
            <TabsContent value="blog-feed">
              <Card className="border border-slate-100 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-800">
                    Widget Flux de Blog
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    Affichez vos derniers articles de blog sur votre site avec
                    des liens vers les articles complets.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-2 block">
                      Code JavaScript à intégrer
                    </Label>
                    <div className="relative">
                      <Textarea
                        value={blogEmbedCode}
                        readOnly
                        className="font-mono text-xs bg-slate-50 border-slate-200 min-h-[200px] w-full resize-none overflow-auto"
                        style={{ wordBreak: "break-all" }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => handleCopy(blogEmbedCode, "blog-embed")}
                      >
                        {copiedStates["blog-embed"] ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      <strong>Instructions SEO :</strong> Ajoutez du contenu
                      natif autour du widget pour améliorer votre référencement
                      :
                      <br />
                      <code className="bg-blue-100 px-2 py-1 rounded text-xs mt-1 block break-all">
                        &lt;h2&gt;Nos derniers articles&lt;/h2&gt;
                        <br />
                        &lt;p&gt;Découvrez nos conseils et actualités.&lt;/p&gt;
                      </code>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </SidebarInset>
    </motion.div>
  );
};

const EmbedDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <EmbedDashboardContent />
    </DashboardLayout>
  );
};

export default EmbedDashboard;
