import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wand2, BarChart3, Calendar, Loader2, Globe, Settings, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
interface BlogWebsite { id?: string; name?: string; url?: string; [key: string]: unknown; }
import { blogService, BlogStatistics } from "@/services/blogService";
import { adaptBlogPostForFrontend } from "@/data/blogData";

interface UserBlogPostsHeaderProps {
  currentSite: {
    id: string;
    title: string;
    description: string;
  };
  onBlogGenerated?: (newPost: any) => void; // ✅ Callback pour nouveau post
  onRefreshNeeded?: () => void; // ✅ Callback pour refresh
  showQuickActions?: boolean; // ✅ Optionnel - actions rapides
  showSiteStats?: boolean; // ✅ Optionnel - statistiques du site
}

export function UserBlogPostsHeader({ 
  currentSite, 
  onBlogGenerated,
  onRefreshNeeded,
  showQuickActions = true,
  showSiteStats = true
}: UserBlogPostsHeaderProps) {
  const navigate = useNavigate();
  
  // ✅ États pour les nouvelles fonctionnalités
  const [stats, setStats] = useState<BlogStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // ✅ PRÉSERVÉ : Vos fonctions de navigation existantes
  const handleGoBack = () => {
    navigate("/dashboard/blogs");
  };

  const goToNewsFeed = () => {
    navigate("/mon-actualite");
  };

  // ✅ NOUVEAU : Charger les statistiques du site
  useEffect(() => {
    const loadSiteStats = async () => {
      if (!showSiteStats) return;
      
      try {
        setLoadingStats(true);
        const siteStats = await blogService.getStatistics();
        setStats(siteStats);
      } catch (error) {
        console.error('Erreur chargement stats site:', error);
        // ✅ Ne pas afficher d'erreur - continuer sans stats
        setStats(null);
      } finally {
        setLoadingStats(false);
      }
    };

    loadSiteStats();
  }, [showSiteStats]);


  // ✅ NOUVEAU : Navigations supplémentaires
  const goToCalendar = () => {
    navigate("/blog-calendar");
  };

  const goToStatistics = () => {
    navigate("/dashboard/blog/statistics");
  };

  const goToSiteSettings = () => {
    navigate(`/dashboard/blogs/${currentSite.id}/settings`);
  };

  const goToPublicSite = () => {
    // Ouvrir le site public dans un nouvel onglet
    window.open(`/blog-public/${currentSite.id}`, '_blank');
  };

  const goToCreateBlog = () => {
    navigate('/dashboard/blog/create');
  };

  return (
    <div className="mb-6">
      {/* ✅ PRÉSERVÉ : Votre header principal */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
        <div className="flex items-center">
          {/* ✅ PRÉSERVÉ : Votre bouton retour */}
          <Button 
            variant="ghost"
            className="mr-4"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          
          {/* ✅ PRÉSERVÉ : Votre titre et description */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{currentSite.title}</h1>
              
              {/* ✅ NOUVEAU : Badge d'état */}
              <Badge variant="outline" className="text-xs">
                Site actif
              </Badge>
            </div>
            
            <p className="text-muted-foreground">{currentSite.description}</p>
          </div>
        </div>

        {/* ✅ PRÉSERVÉ + AMÉLIORÉ : Section boutons */}
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          {/* ✅ NOUVEAU : Bouton création manuelle */}
          <Button 
            onClick={goToCreateBlog}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PenTool className="h-4 w-4 mr-2" />
            Créer un article
          </Button>

          {/* ✅ PRÉSERVÉ : Votre bouton Actualité */}
          <Button 
            variant="outline"
            onClick={goToNewsFeed}
          >
            Voir l'Actualité
          </Button>
        </div>
      </div>

      {/* ✅ NOUVEAU : Barre d'actions rapides */}
      {showQuickActions && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {/* ✅ Navigation rapide */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={goToCalendar}
              className="text-xs"
            >
              <Calendar className="mr-1 h-3 w-3" />
              Calendrier
            </Button>

            {stats && stats.total_posts > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={goToStatistics}
                className="text-xs"
              >
                <BarChart3 className="mr-1 h-3 w-3" />
                Statistiques
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="sm"
              onClick={goToPublicSite}
              className="text-xs"
            >
              <Globe className="mr-1 h-3 w-3" />
              Voir le site public
            </Button>
          </div>

          {/* ✅ Paramètres du site */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={goToSiteSettings}
            className="text-xs"
          >
            <Settings className="mr-1 h-3 w-3" />
            Paramètres
          </Button>
        </div>
      )}
    </div>
  );
}