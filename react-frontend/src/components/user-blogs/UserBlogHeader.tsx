// src/components/user-blogs/UserBlogHeader.tsx - HEADER SYNCHRONISÉ AVEC BACKEND
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Wand2, Loader2, BarChart3, RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { blogService, BlogStatistics } from "@/services/blogService";
import { adaptBlogPostForFrontend } from "@/data/blogData";

interface UserBlogHeaderProps {
  onSearch?: (query: string) => void;
  onBlogGenerated?: (newPost: any) => void;
  onRefreshNeeded?: () => void;
  showStats?: boolean;
  showActions?: boolean;
}

export function UserBlogHeader({ 
  onSearch, 
  onBlogGenerated,
  onRefreshNeeded,
  showStats = true,
  showActions = true
}: UserBlogHeaderProps) {
  const navigate = useNavigate();
  
  // ✅ États pour les nouvelles fonctionnalités synchronisées
  const [stats, setStats] = useState<BlogStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // ✅ PRÉSERVÉ : Votre fonction de recherche existante avec état local
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("search") as string;
    
    setSearchQuery(query);
    
    if (onSearch) {
      onSearch(query);
    }
  };

  // ✅ NOUVEAU : Charger les statistiques depuis le backend
  const loadStats = useCallback(async () => {
    if (!showStats) return;
    
    try {
      setLoadingStats(true);
      const blogStats = await blogService.getStatistics();
      setStats(blogStats);
      setLastRefresh(new Date());
      
      console.log('📊 [UserBlogHeader] Stats chargées:', {
        total: blogStats.total_posts,
        published: blogStats.published,
        drafts: blogStats.drafts,
        ai_percentage: blogStats.ai_generated_percentage
      });
      
    } catch (error) {
      console.error('❌ [UserBlogHeader] Erreur chargement statistiques:', error);
      // ✅ Ne pas afficher d'erreur - continuer sans stats
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [showStats]);

  // ✅ NOUVEAU : Charger les stats au montage
  useEffect(() => {
    loadStats();
  }, [loadStats]);


  // ✅ NOUVEAU : Refresh manuel avec feedback détaillé
  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    
    try {
      // Refresh des stats
      await loadStats();
      
      // Demander refresh global des listes
      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
      
      toast.success("Données mises à jour avec succès");
      
      console.log('🔄 [UserBlogHeader] Refresh global effectué');
      
    } catch (error) {
      console.error('❌ [UserBlogHeader] Erreur refresh:', error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ NOUVEAU : Navigations rapides
  const goToStatistics = () => {
    navigate("/dashboard/blog/statistics");
  };

  const goToDrafts = () => {
    navigate("/dashboard/blog?status=draft");
  };

  const goToPublished = () => {
    navigate("/dashboard/blog?status=published");
  };

  // ✅ NOUVEAU : Vider la recherche
  const clearSearch = () => {
    setSearchQuery("");
    if (onSearch) {
      onSearch("");
    }
  };

  return (
    <div className="w-full bg-white border-b mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
        {/* ✅ PRÉSERVÉ + AMÉLIORÉ : Section de recherche avec état */}
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative">
            <Input
              name="search"
              placeholder="Rechercher un blog..."
              className="pl-8 w-full md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            
            {/* ✅ NOUVEAU : Bouton pour vider la recherche */}
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={clearSearch}
              >
                ×
              </Button>
            )}
          </form>
          
          {/* ✅ PRÉSERVÉ : Votre bouton Filter */}
          <Button variant="outline" size="icon" title="Filtres">
            <Filter className="h-4 w-4" />
          </Button>

          {/* ✅ NOUVEAU : Bouton refresh avec état */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="hidden md:flex"
            title="Actualiser les données"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* ✅ NOUVEAU : Section actions et statistiques synchronisées */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          {/* ✅ NOUVEAU : Statistiques en temps réel */}
        </div>
      </div>

      {/* ✅ NOUVEAU : Indicateur de recherche active */}
      {searchQuery && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              🔍 Recherche active: "<strong>{searchQuery}</strong>"
            </span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={clearSearch}
              className="text-gray-600 p-0 h-auto hover:text-gray-800"
            >
              Effacer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}