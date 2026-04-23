import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Newspaper, BarChart3, Loader2, Eye, Heart, MessageSquare, ListCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { blogService, BlogStatistics } from "@/services/blogService";

interface BlogWebsite {
  id: string;
  title: string;
  description: string;
  domain: string;
  isDefault: boolean;
}

interface DefaultBlogHeaderProps {
  blog: BlogWebsite;
  showStats?: boolean;
  posts?: Array<{ 
    id: string | number; 
    title?: string; 
    status?: 'draft' | 'scheduled' | 'published';
    is_ai_generated?: boolean;
  }>; 
}

export function DefaultBlogHeader({ 
  blog, 
  showStats = true,
  posts = []
}: DefaultBlogHeaderProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BlogStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Charger les statistiques
  const loadStatistics = async () => {
    if (!showStats) return;
    
    try {
      setLoadingStats(true);
      const blogStats = await blogService.getStatistics();
      setStats(blogStats);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [showStats, posts?.length]);

  // Calculer les statistiques réelles depuis les posts
  const getRealStats = () => {
    if (!stats) return null;
    
    const realPostsCount = posts?.length || 0;
    let realPublished = 0;
    let realDrafts = 0;
    let realScheduled = 0;
    let aiGeneratedCount = 0;
    
    if (posts && posts.length > 0) {
      posts.forEach(post => {
        switch (post.status) {
          case 'published': realPublished++; break;
          case 'draft': realDrafts++; break;
          case 'scheduled': realScheduled++; break;
        }
        if (post.is_ai_generated) aiGeneratedCount++;
      });
    } else {
      realPublished = stats.published || 0;
      realDrafts = stats.drafts || 0;
      realScheduled = stats.scheduled || 0;
    }
    
    const aiPercentage = realPostsCount > 0 ? (aiGeneratedCount / realPostsCount) * 100 : 0;
    
    return {
      total_posts: realPostsCount,
      published: realPublished,
      drafts: realDrafts,
      scheduled: realScheduled,
      total_views: stats.total_views || 0,
      total_likes: stats.total_likes || 0,
      total_comments: stats.total_comments || 0,
      ai_generated_percentage: aiPercentage || 0
    };
  };

  const realStats = getRealStats();

  return (
    <div className="mb-8">
      {/* Header principal avec thème PixelRise */}
      <div className="bg-gradient-black-blue p-6 rounded-lg border border-gray-200 shadow-premium mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Blog par défaut: {blog.title}
        </h1>
        <p className="text-gray-200 mb-4">
          Vos articles sont générés automatiquement chaque semaine.
          <span className="text-brand-yellow font-medium">
            {" "}
            7 posts par semaine
          </span>{" "}
          basés sur vos tâches et projets.
        </p>

        {/* Boutons d'action avec thème */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/mon-actualite")}
            className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Newspaper className="h-4 w-4" />
            Voir l'Actualité
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/user-blogs")}
            className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ListCheck className="h-4 w-4" />Blogs des utilisateurs
          </Button>

          {/*  */}
          {showStats && realStats && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/analytics")}
              className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <BarChart3 className="h-4 w-4" />
              Statistiques détaillées
            </Button>
          )}
        </div>
      </div>

      {/* Statistiques avec thème PixelRise Premium */}
      {showStats && realStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-brand-blue mb-1">
              {realStats.total_posts}
            </div>
            <div className="text-sm text-slate-600">Articles</div>
          </div>

          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {realStats.published}
            </div>
            <div className="text-sm text-slate-600">Publiés</div>
          </div>

          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">
              {realStats.drafts}
            </div>
            <div className="text-sm text-slate-600">Brouillons</div>
          </div>

          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {realStats.scheduled}
            </div>
            <div className="text-sm text-slate-600">Programmés</div>
          </div>

          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-xl font-bold text-blue-600">
                {realStats.total_views.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-slate-600">Vues</div>
          </div>

          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-xl font-bold text-red-600">
                {realStats.total_likes.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-slate-600">Likes</div>
          </div>

          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-xl font-bold text-blue-600">
                {realStats.total_comments.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-slate-600">Commentaires</div>
          </div>
        </div>
      )}

      {/* Indicateur IA avec thème premium */}
      {realStats && realStats.ai_generated_percentage > 0 && (
        <div className="bg-gradient-cta p-4 rounded-lg border border-orange-200 text-center mb-6">
          <div className="text-white">
            <span className="text-lg font-bold">
              {realStats.ai_generated_percentage.toFixed(1)}%
            </span>
            <span className="ml-2">
              de vos articles sont générés automatiquement par l'IA
            </span>
          </div>
        </div>
      )}

      {/* Loading state avec thème */}
      {showStats && loadingStats && (
        <div className="flex items-center justify-center gap-2 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-brand-blue" />
          <span className="text-slate-600">Chargement des statistiques...</span>
        </div>
      )}
    </div>
  );
}