import React, { useState, useEffect } from 'react';
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProjectInfoForm } from "@/components/admin/AdminProjectInfoForm";
import { AdminWeeklyObjectiveCard } from "@/components/admin/AdminWeeklyObjectiveCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertCircle, CheckCircle2, FileText, Calendar } from 'lucide-react';
import { adminBlogService, AdminProjectInfo, AdminWeeklyObjective } from '@/services/adminBlogService';
import { toast } from 'react-toastify';

const AdminContentGeneration: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [projectInfo, setProjectInfo] = useState<AdminProjectInfo | null>(null);
  const [currentObjective, setCurrentObjective] = useState<AdminWeeklyObjective | null>(null);
  const [generationStatus, setGenerationStatus] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [info, objective, status] = await Promise.all([
        adminBlogService.getAdminProjectInfo().catch(() => null),
        adminBlogService.getCurrentWeekObjective().catch(() => null),
        adminBlogService.getGenerationStatus().catch(() => null)
      ]);

      setProjectInfo(info);
      setCurrentObjective(objective);
      setGenerationStatus(status);
    } catch (error: any) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectInfoSaved = (info: AdminProjectInfo) => {
    setProjectInfo(info);
    toast.success('Vous pouvez maintenant générer votre objectif hebdomadaire !');
  };

  const handleObjectiveGenerated = (objective: AdminWeeklyObjective) => {
    setCurrentObjective(objective);
    loadInitialData(); // Refresh status
  };

  const handleGenerateWeeklyPosts = async () => {
    if (!currentObjective) {
      toast.error('Vous devez d\'abord générer l\'objectif hebdomadaire');
      return;
    }

    try {
      setGenerating(true);
      const result = await adminBlogService.generateWeeklyPosts();

      // ✅ FIX: Gérer le mode asynchrone et la situation de conflit 409
      if (result.status === 'processing') {
        toast.info(result.message || 'Génération lancée en arrière-plan. Les posts seront disponibles dans quelques minutes.');
      } else if (result.status === 'already_processing') {
        toast.warning(result.message || 'Une génération est déjà en cours. Veuillez patienter...');
      } else if (result.posts_count !== undefined) {
        toast.success(`${result.posts_count} post(s) généré(s) avec succès !`);
      } else {
        toast.info('Génération en cours...');
      }

      // Refresh data
      await loadInitialData();
    } catch (error: any) {
      console.error('Erreur génération posts:', error);
      toast.error(error.message || 'Erreur lors de la génération des posts');
    } finally {
      setGenerating(false);
    }
  };

  const renderStatusAlert = () => {
    if (!generationStatus) return null;

    if (!generationStatus.has_project_info) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration requise</AlertTitle>
          <AlertDescription>
            Veuillez d'abord configurer vos informations projet dans l'onglet "Configuration" pour commencer la génération automatique.
          </AlertDescription>
        </Alert>
      );
    }

    if (!generationStatus.has_objective_this_week) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Objectif manquant</AlertTitle>
          <AlertDescription>
            Générez l'objectif de la semaine pour pouvoir créer vos posts automatiquement.
          </AlertDescription>
        </Alert>
      );
    }

    if (generationStatus.posts_generated_this_week >= 7) {
      return (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Semaine complétée</AlertTitle>
          <AlertDescription>
            Vous avez généré {generationStatus.posts_generated_this_week} posts cette semaine. Excellent travail !
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-blue-500 bg-blue-50">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-600">Prêt à générer</AlertTitle>
        <AlertDescription>
          {generationStatus.posts_generated_this_week > 0 ? (
            `Vous avez généré ${generationStatus.posts_generated_this_week} post(s) cette semaine. Vous pouvez continuer !`
          ) : (
            "Tout est configuré ! Vous pouvez maintenant générer vos posts hebdomadaires."
          )}
        </AlertDescription>
      </Alert>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Génération de Contenu Admin</h1>
          <p className="text-muted-foreground">
            Configurez vos informations projet et générez automatiquement vos posts hebdomadaires
          </p>
        </div>

        {/* Status Alert */}
        <div className="mb-6">
          {renderStatusAlert()}
        </div>

        {/* Quick Stats */}
        {generationStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Configuration
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {generationStatus.has_project_info ? (
                    <Badge variant="default">✓ Configuré</Badge>
                  ) : (
                    <Badge variant="secondary">À configurer</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Objectif Semaine
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {generationStatus.has_objective_this_week ? (
                    <Badge variant="default">✓ Généré</Badge>
                  ) : (
                    <Badge variant="secondary">Non généré</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Posts Générés
                </CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {generationStatus.posts_generated_this_week} / 7
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cette semaine
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="generation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="generation">Génération</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
          </TabsList>

          {/* Generation Tab */}
          <TabsContent value="generation" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Objective Card */}
              <div>
                <AdminWeeklyObjectiveCard
                  onObjectiveGenerated={handleObjectiveGenerated}
                  onGeneratePosts={handleGenerateWeeklyPosts}
                />
              </div>

              {/* Right Column: Generation Actions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Actions de Génération</CardTitle>
                    <CardDescription>
                      Générez automatiquement vos contenus pour la semaine
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!projectInfo && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Configuration manquante</AlertTitle>
                        <AlertDescription>
                          Configurez vos informations projet dans l'onglet "Configuration" avant de générer du contenu.
                        </AlertDescription>
                      </Alert>
                    )}

                    {projectInfo && !currentObjective && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Objectif requis</AlertTitle>
                        <AlertDescription>
                          Générez l'objectif hebdomadaire à gauche pour continuer.
                        </AlertDescription>
                      </Alert>
                    )}

                    {projectInfo && currentObjective && (
                      <>
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">Génération Automatique</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Cliquez sur le bouton ci-dessous pour générer automatiquement {projectInfo.posts_per_week} posts basés sur votre objectif hebdomadaire.
                          </p>
                          <Button
                            className="w-full"
                            onClick={handleGenerateWeeklyPosts}
                            disabled={generating || (generationStatus?.posts_generated_this_week >= 7)}
                          >
                            {generating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Génération en cours...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Générer les Posts Automatiquement
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2 text-sm">Comment ça marche ?</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">1.</span>
                              <span>L'IA génère un objectif hebdomadaire basé sur vos informations projet</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">2.</span>
                              <span>7 sujets quotidiens sont créés pour couvrir toute la semaine</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">3.</span>
                              <span>Chaque post est généré avec titre, contenu, image et tags</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">4.</span>
                              <span>Les posts sont automatiquement publiés sur votre blog</span>
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-4">
            <AdminProjectInfoForm onSave={handleProjectInfoSaved} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminContentGeneration;
