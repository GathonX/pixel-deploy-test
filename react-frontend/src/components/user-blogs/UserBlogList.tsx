// src/components/user-blogs/UserBlogList.tsx - BACKEND ONLY (SANS DONNÉES STATIQUES)
import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserBlogCard } from "./UserBlogCard";
import { BlogPost } from "@/services/blogService";
import { adaptBlogPostForFrontend } from "@/data/blogData";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { blogService } from "@/services/blogService";
import { interactionService } from "@/services/interactionService";

interface UserBlogListProps {
  searchQuery: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  refreshTrigger?: number;
  onPostUpdated?: (updatedPost: BlogPost) => void;
}

export function UserBlogList({ 
  searchQuery, 
  activeTab, 
  onTabChange,
  refreshTrigger = 0,
  onPostUpdated
}: UserBlogListProps) {
  // ✅ États pour les données backend uniquement
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const postsPerPage = 6;

  // ✅ BACKEND PRIORITY : Charger les posts depuis le backend uniquement
  const loadPosts = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      let posts: BlogPost[] = [];

      if (activeTab === "user") {
        // ✅ BACKEND PRIORITY : Posts de l'utilisateur connecté depuis la DB
        console.log('📊 [UserBlogList] Chargement posts utilisateur depuis DB...');
        
        const userPosts = await blogService.getBlogPosts({
          per_page: 100,
          status: 'all'
        });
        
        console.log('📊 [UserBlogList] Posts bruts backend:', userPosts.length);

        const adaptedPosts = userPosts.map(adaptBlogPostForFrontend);
        const batchStats = await interactionService.getBatchPostStatistics(
          userPosts.map(p => ({ type: 'blog_post' as const, id: Number(p.id) }))
        );
        posts = adaptedPosts.map(adaptedPost => {
          const stats = batchStats[`blog_post_${adaptedPost.id}`];
          return stats ? {
            ...adaptedPost,
            likes: stats.total_likes,
            views: stats.total_views,
            comments: stats.total_comments,
            shares: stats.total_shares || 0
          } : adaptedPost;
        });

      } else {
        // Posts publics
        console.log('📊 [UserBlogList] Chargement posts publics depuis DB...');
        const publicPosts = await blogService.getPublicBlogPosts({ per_page: 100 });

        if (!Array.isArray(publicPosts)) {
          console.warn('⚠️ [UserBlogList] publicPosts n\'est pas un array:', publicPosts);
          posts = [];
        } else {
          console.log('📊 [UserBlogList] Posts publics bruts backend:', publicPosts.length);
          const adaptedPublic = publicPosts.map(adaptBlogPostForFrontend);
          const batchStats = await interactionService.getBatchPostStatistics(
            publicPosts.map(p => ({ type: 'blog_post' as const, id: Number(p.id) }))
          );
          posts = adaptedPublic.map(adaptedPost => {
            const stats = batchStats[`blog_post_${adaptedPost.id}`];
            return stats ? {
              ...adaptedPost,
              likes: stats.total_likes,
              views: stats.total_views,
              comments: stats.total_comments,
              shares: stats.total_shares || 0
            } : adaptedPost;
          });
        }
      }

      setAllPosts(posts);
      console.log(`✅ [UserBlogList] ${posts.length} posts chargés depuis DB pour "${activeTab}"`);

    } catch (error) {
      console.error('❌ [UserBlogList] Erreur chargement depuis DB:', error);
      setError("Erreur lors du chargement des articles depuis la base de données");
      
      // ✅ BACKEND PRIORITY : Pas de fallback vers données statiques
      setAllPosts([]);
      toast.error("Impossible de charger les articles depuis la base de données");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts(false);
    toast.success("Articles mis à jour depuis la base de données");
  };

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 [UserBlogList] Refresh déclenché par parent:', refreshTrigger);
      loadPosts(false);
    }
  }, [refreshTrigger, loadPosts]);

  // ✅ BACKEND PRIORITY : Logique de filtrage et tri avec données backend
  useEffect(() => {
    let posts = [...allPosts];
    
    if (searchQuery) {
      posts = posts.filter(post => {
        const searchLower = searchQuery.toLowerCase();
        return (
          post.title.toLowerCase().includes(searchLower) || 
          post.summary.toLowerCase().includes(searchLower) || 
          post.content.toLowerCase().includes(searchLower) ||
          getAuthor(post).name.toLowerCase().includes(searchLower) ||
          getDisplayTags(post).some(tag => tag.toLowerCase().includes(searchLower))
        );
      });
    }
    
    // ✅ BACKEND PRIORITY : Tri avec vraies données DB
    if (activeTab === "recent") {
      posts.sort((a, b) => {
        const dateA = new Date(getPublishDate(a)).getTime();
        const dateB = new Date(getPublishDate(b)).getTime();
        return dateB - dateA;
      });
    } else if (activeTab === "popular") {
      posts.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (activeTab === "user") {
      posts.sort((a, b) => {
        const dateA = new Date(a.created_at || getPublishDate(a)).getTime();
        const dateB = new Date(b.created_at || getPublishDate(b)).getTime();
        return dateB - dateA;
      });
    }
    
    setFilteredPosts(posts);
    setPage(1);
  }, [allPosts, activeTab, searchQuery]);

  // ✅ BACKEND PRIORITY : Fonctions utilitaires backend
  const getAuthor = (post: BlogPost) => {
    return post.user || post.author || { name: 'Utilisateur Pixel Rise', id: 'anonymous' };
  };

  const getPublishDate = (post: BlogPost): string => {
    return post.published_at || post.publishDate || post.created_at || new Date().toISOString();
  };

  const getDisplayTags = (post: BlogPost): string[] => {
    if (post.categories && post.categories.length > 0) {
      return post.categories.map(cat => cat.name);
    }
    return post.tags || [];
  };

  const handlePostUpdated = useCallback((updatedPost: BlogPost) => {
    console.log('🔄 [UserBlogList] Post mis à jour depuis DB:', updatedPost.id);
    
    setAllPosts(prev => prev.map(post => 
      post.id === updatedPost.id ? { ...post, ...updatedPost } : post
    ));
    
    if (onPostUpdated) {
      onPostUpdated(updatedPost);
    }
  }, [onPostUpdated]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const currentPosts = filteredPosts.slice((page - 1) * postsPerPage, page * postsPerPage);

  // ✅ BACKEND PRIORITY : Compteurs avec vraies données DB
  const getStatusCounts = () => {
    if (activeTab !== "user") return null;
    
    const published = filteredPosts.filter(p => p.status === 'published').length;
    const drafts = filteredPosts.filter(p => p.status === 'draft').length;
    const scheduled = filteredPosts.filter(p => p.status === 'scheduled').length;
    
    return { published, drafts, scheduled, total: filteredPosts.length };
  };

  const statusCounts = getStatusCounts();

  return (
    <div>
      <Tabs value={activeTab} onValueChange={onTabChange} className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Blogs</h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 p-0"
              title="Actualiser depuis la base de données"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement depuis DB...
              </div>
            )}

            {statusCounts && !loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{statusCounts.total} total</span>
                {statusCounts.published > 0 && <span>• {statusCounts.published} publiés</span>}
                {statusCounts.drafts > 0 && <span>• {statusCounts.drafts} brouillons</span>}
                {statusCounts.scheduled > 0 && <span>• {statusCounts.scheduled} programmés</span>}
              </div>
            )}
          </div>

          <TabsList>
            <TabsTrigger value="recent">Récents</TabsTrigger>
            <TabsTrigger value="popular">Populaires</TabsTrigger>
            <TabsTrigger value="user">Mes publications</TabsTrigger>
          </TabsList>
        </div>

        {/* ✅ BACKEND PRIORITY : Affichage d'erreur DB */}
        {error && !loading && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="mt-2"
            >
              Recharger depuis DB
            </Button>
          </div>
        )}
        
        <TabsContent value="recent">
          {renderBlogGrid(currentPosts, loading, handlePostUpdated)}
        </TabsContent>
        
        <TabsContent value="popular">
          {renderBlogGrid(currentPosts, loading, handlePostUpdated)}
        </TabsContent>
        
        <TabsContent value="user">
          {renderBlogGrid(currentPosts, loading, handlePostUpdated)}
        </TabsContent>
      </Tabs>
      
      {totalPages > 1 && !loading && (
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPage(page > 1 ? page - 1 : 1)}
              disabled={page <= 1}
            >
              Précédent
            </Button>
            <div className="flex items-center px-4">
              Page {page} sur {totalPages}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setPage(page < totalPages ? page + 1 : totalPages)}
              disabled={page >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ BACKEND PRIORITY : Fonction renderBlogGrid backend only
function renderBlogGrid(
  posts: BlogPost[], 
  loading: boolean, 
  onPostUpdated: (post: BlogPost) => void
) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-96 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return posts.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map(post => (
        <UserBlogCard 
          key={`post-${post.id}-${post.likes}-${post.views}-db`}
          post={post} 
          onPostUpdated={onPostUpdated}
          showInteractionButtons={true}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-12 bg-muted/30 rounded-lg">
      <p className="text-muted-foreground">
        {loading ? "Chargement depuis la base de données..." : "Aucun article trouvé dans la base de données."}
      </p>
    </div>
  );
}