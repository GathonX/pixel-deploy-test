import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Wand2, BarChart3, Clock, CheckCircle, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
interface BlogWebsite { id?: string; name?: string; url?: string; [key: string]: unknown; }
import { blogService, BlogStatistics } from "@/services/blogService";

interface UserBlogPostsDefaultAlertProps {
  defaultBlog: BlogWebsite | null;
  siteId: string | null;
  showQuickStats?: boolean; // ✅ Optionnel - afficher les stats rapides
  showQuickActions?: boolean; // ✅ Optionnel - afficher les actions rapides
}

export function UserBlogPostsDefaultAlert({ 
  defaultBlog, 
  siteId, 
  showQuickStats = true,
  showQuickActions = true 
}: UserBlogPostsDefaultAlertProps) {
  const navigate = useNavigate();
  
  // ✅ États pour les nouvelles fonctionnalités
  const [stats, setStats] = useState<BlogStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // ✅ PRÉSERVÉ : Vos fonctions de navigation existantes
  const handleViewCalendar = () => {
    navigate("/blog-calendar");
  };

  const handleViewNewsFeed = () => {
    navigate("/mon-actualite");
  };

  // ✅ NOUVEAU : Charger les statistiques rapides
  useEffect(() => {
    const loadQuickStats = async () => {
      if (!defaultBlog || !showQuickStats) return;
      
      try {
        setLoadingStats(true);
        const blogStats = await blogService.getStatistics();
        setStats(blogStats);
      } catch (error) {
        console.error('Erreur chargement statistiques rapides:', error);
        // ✅ Ne pas afficher d'erreur - continuer sans stats
        setStats(null);
      } finally {
        setLoadingStats(false);
      }
    };

    loadQuickStats();
  }, [defaultBlog, showQuickStats]);

  // ✅ NOUVEAU : Navigations supplémentaires
  const handleViewAllPosts = () => {
    navigate("/dashboard/blog");
  };

  const handleViewDrafts = () => {
    navigate("/dashboard/blog?status=draft");
  };

  const handleViewStatistics = () => {
    navigate("/dashboard/blog/statistics");
  };

  // ✅ PRÉSERVÉ : Votre condition d'affichage
  if (!siteId && defaultBlog) {
    return (
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Calendar className="h-4 w-4 text-blue-500" />
        
        {/* ✅ PRÉSERVÉ : Votre titre */}
        <AlertTitle className="text-blue-700">
          Blog par défaut: {defaultBlog.title}
        </AlertTitle>
        
        <AlertDescription className="text-blue-600">
          {/* ✅ PRÉSERVÉ : Votre description */}
          Ce blog est lié à l'assistant IA du business plan. Les articles générés apparaîtront automatiquement dans le calendrier de publication et la page d'Actualité.
          
          {/* ✅ NOUVEAU : Statistiques rapides (si activées et disponibles) */}
          {showQuickStats && stats && !loadingStats && (
            <div className="flex flex-wrap gap-3 mt-3 mb-3">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <Badge variant="secondary" className="text-xs">
                  {stats.total_posts} articles
                </Badge>
              </div>
              
              {stats.published > 0 && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <Badge variant="default" className="text-xs bg-green-600">
                    {stats.published} publiés
                  </Badge>
                </div>
              )}
              
              {stats.drafts > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600" />
                  <Badge variant="outline" className="text-xs border-amber-600 text-amber-700">
                    {stats.drafts} brouillons
                  </Badge>
                </div>
              )}
              
              {stats.scheduled > 0 && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-purple-600" />
                  <Badge variant="outline" className="text-xs border-purple-600 text-purple-700">
                    {stats.scheduled} programmés
                  </Badge>
                </div>
              )}
              
              {stats.ai_generated_percentage > 0 && (
                <div className="flex items-center gap-1">
                  <Wand2 className="h-3 w-3 text-blue-600" />
                  <Badge variant="outline" className="text-xs border-blue-600 text-blue-700">
                    {stats.ai_generated_percentage.toFixed(0)}% IA
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* ✅ PRÉSERVÉ + AMÉLIORÉ : Vos boutons existants + nouveaux */}
          <div className="flex flex-wrap gap-2 mt-2">
            {/* ✅ PRÉSERVÉ : Vos boutons existants */}
            <Button 
              variant="link" 
              className="text-blue-700 p-0 h-auto"
              onClick={handleViewCalendar}
            >
              Voir le calendrier
            </Button>
            
            <Button 
              variant="link" 
              className="text-blue-700 p-0 h-auto"
              onClick={handleViewNewsFeed}
            >
              Voir l'Actualité
            </Button>

            {/* ✅ NOUVEAU : Actions rapides supplémentaires (si activées) */}
            {showQuickActions && (
              <>
                <span className="text-blue-500">•</span>
                
                <Button 
                  variant="link" 
                  className="text-blue-700 p-0 h-auto"
                  onClick={handleViewAllPosts}
                >
                  Tous les articles
                </Button>

                {stats && stats.drafts > 0 && (
                  <>
                    <span className="text-blue-500">•</span>
                    <Button 
                      variant="link" 
                      className="text-blue-700 p-0 h-auto"
                      onClick={handleViewDrafts}
                    >
                      Brouillons ({stats.drafts})
                    </Button>
                  </>
                )}

                {stats && stats.total_posts > 0 && (
                  <>
                    <span className="text-blue-500">•</span>
                    <Button 
                      variant="link" 
                      className="text-blue-700 p-0 h-auto flex items-center gap-1"
                      onClick={handleViewStatistics}
                    >
                      <BarChart3 className="h-3 w-3" />
                      Statistiques
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* ✅ NOUVEAU : Section informative IA */}
          <div className="mt-3 p-2 bg-blue-100 rounded-md border border-blue-300">
            <div className="flex items-center gap-2">
              <Wand2 className="h-3 w-3 text-blue-700" />
              <span className="text-xs font-medium text-blue-800">
                Assistant IA activé
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              L'IA génère automatiquement du contenu basé sur vos projets et tâches. 
              Tous les articles sont d'abord sauvegardés en brouillon pour relecture.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // ✅ NOUVEAU : Affichage si aucun blog par défaut (optionnel)
  if (!defaultBlog && !siteId) {
    return (
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <Calendar className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-700">
          Aucun blog par défaut configuré
        </AlertTitle>
        <AlertDescription className="text-amber-600">
          Configurez un blog par défaut pour activer la génération automatique d'articles via l'assistant IA.
          <div className="flex flex-wrap gap-2 mt-2">
            <Button 
              variant="link" 
              className="text-amber-700 p-0 h-auto"
              onClick={() => navigate("/dashboard")}
            >
              Configurer un blog
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // ✅ PRÉSERVÉ : Return null par défaut
  return null;
}