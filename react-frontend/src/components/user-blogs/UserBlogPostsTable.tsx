
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MoreHorizontal, Eye, Edit, FileText, Trash2, ExternalLink, Copy, BarChart3, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { BlogPost } from "@/services/blogService";
import { adaptBlogPostForFrontend } from "@/data/blogData";
import { blogService } from "@/services/blogService";
import { interactionService, InteractionStatistics } from "@/services/interactionService";
// import SafeImage from "@/components/ui/SafeImage"; // ❌ Causait des problèmes de fallback

interface UserBlogPostsTableProps {
  filteredPosts: BlogPost[];
  handleDeletePost?: (id: string | number) => void;
  onPostUpdated?: (updatedPost: BlogPost) => void;
  onPostDeleted?: (postId: string | number) => void;
}

interface SyncedPostStatistics {
  total_likes: number;
  total_comments: number;
  total_views: number;
  loading?: boolean;
  lastSync?: Date;
}

export function UserBlogPostsTable({ 
  filteredPosts, 
  handleDeletePost, 
  onPostUpdated,
  onPostDeleted 
}: UserBlogPostsTableProps) {
  const navigate = useNavigate();
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [postsStatistics, setPostsStatistics] = useState<Record<string, SyncedPostStatistics>>({});
  const [syncingAll, setSyncingAll] = useState(false);
  const [lastGlobalSync, setLastGlobalSync] = useState<Date | null>(null);

  // ✅ NOUVEAU : Fonction pour gérer le clic sur la ligne
  const handleRowClick = (post: BlogPost, event: React.MouseEvent) => {
    // ✅ CORRECTION : Ignorer les clics sur les boutons, dropdown menus et leurs éléments
    const target = event.target as HTMLElement;
    if (target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-radix-menu-content]') ||
        target.closest('[data-radix-dropdown-menu]')) {
      return;
    }
    handleViewPost(post);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
  };

  const syncPostStatistics = async (postId: string | number, showToast = false): Promise<SyncedPostStatistics | null> => {
    const postIdStr = postId.toString();
    
    try {
      setPostsStatistics(prev => ({
        ...prev,
        [postIdStr]: {
          ...prev[postIdStr],
          loading: true
        }
      }));

      if (showToast) {
        toast.loading(`Synchronisation post ${postIdStr}...`, { id: `sync-${postIdStr}` });
      }

      const stats = await interactionService.getPostStatistics('blog_post', Number(postId));
      
      const syncedStats: SyncedPostStatistics = {
        total_likes: stats.total_likes || 0,
        total_comments: stats.total_comments || 0,
        total_views: stats.total_views || 0,
        loading: false,
        lastSync: new Date()
      };

      setPostsStatistics(prev => ({
        ...prev,
        [postIdStr]: syncedStats
      }));

      if (showToast) {
        toast.success(`Post ${postIdStr} synchronisé`, { id: `sync-${postIdStr}` });
      }

      return syncedStats;

    } catch (error) {
      console.error(`❌ [TABLE] Erreur sync post ${postIdStr}:`, error);
      
      setPostsStatistics(prev => ({
        ...prev,
        [postIdStr]: {
          ...prev[postIdStr],
          loading: false
        }
      }));

      if (showToast) {
        toast.error(`Erreur sync post ${postIdStr}`, { id: `sync-${postIdStr}` });
      }

      return null;
    }
  };

  const syncAllPostsStatistics = async (showToast = true) => {
    if (syncingAll || filteredPosts.length === 0) return;

    try {
      setSyncingAll(true);
      
      if (showToast) {
        toast.loading(`Synchronisation de ${filteredPosts.length} posts...`, { id: 'sync-all' });
      }

      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < filteredPosts.length; i += batchSize) {
        const batch = filteredPosts.slice(i, i + batchSize);
        batches.push(batch);
      }

      let syncedCount = 0;
      for (const batch of batches) {
        const promises = batch.map(post => syncPostStatistics(post.id, false));
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            syncedCount++;
          } else {
            console.warn(`⚠️ [TABLE] Échec sync ${batch[index].id}`);
          }
        });
      }

      setLastGlobalSync(new Date());

      if (showToast) {
        toast.success(`${syncedCount}/${filteredPosts.length} posts synchronisés`, { id: 'sync-all' });
      }

    } catch (error) {
      console.error('❌ [TABLE] Erreur synchronisation globale:', error);
      
      if (showToast) {
        toast.error("Erreur lors de la synchronisation", { id: 'sync-all' });
      }
    } finally {
      setSyncingAll(false);
    }
  };

  useEffect(() => {
    const autoSync = async () => {
      if (filteredPosts.length > 0) {
        await syncAllPostsStatistics(false);
      }
    };

    const timeoutId = setTimeout(autoSync, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [filteredPosts.length]);

  const getPostStatistics = (post: BlogPost): SyncedPostStatistics => {
    const postIdStr = post.id.toString();
    const syncedStats = postsStatistics[postIdStr];
    
    if (syncedStats) {
      return syncedStats;
    }
    
    return {
      total_likes: post.likes || 0,
      total_comments: 0, // ✅ CORRECTION : Pas d'accès direct à comments, on utilise les stats synchronisées
      total_views: post.views || 0,
      loading: false
    };
  };

  const areStatsFresh = (stats: SyncedPostStatistics): boolean => {
    if (!stats.lastSync) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return stats.lastSync > fiveMinutesAgo;
  };

  const handleViewPost = async (post: BlogPost) => {
    try {
      setLoadingActions(prev => ({ ...prev, [`view_${post.id}`]: true }));
      
      await syncPostStatistics(post.id, false);
      
      await interactionService.viewBlogPost(Number(post.id));
      
      navigate(`/user-blogs/${post.slug}`);
      
    } catch (error) {
      console.error('Erreur vue blog post:', error);
      toast.error("Erreur lors de l'ouverture du post");
    } finally {
      setLoadingActions(prev => ({ ...prev, [`view_${post.id}`]: false }));
    }
  };

  const handleEditPost = (post: BlogPost) => {
    navigate(`/dashboard/blog/edit/${post.id}`);
  };

  const handleViewComments = async (post: BlogPost) => {
    await syncPostStatistics(post.id, false);
    navigate(`/user-blogs/${post.slug}#comments`);
  };

  const handleDuplicatePost = async (post: BlogPost) => {
    try {
      setLoadingActions(prev => ({ ...prev, [`duplicate_${post.id}`]: true }));
      
      const duplicatedPost = await blogService.duplicateBlogPost(Number(post.id));
      const adaptedPost = adaptBlogPostForFrontend(duplicatedPost);
      
      toast.success(`Post "${post.title}" dupliqué avec succès`);
      
      if (onPostUpdated) {
        onPostUpdated(adaptedPost);
      }
      
    } catch (error) {
      console.error('Erreur duplication:', error);
      toast.error("Erreur lors de la duplication du post");
    } finally {
      setLoadingActions(prev => ({ ...prev, [`duplicate_${post.id}`]: false }));
    }
  };

  const handleViewStatistics = async (post: BlogPost) => {
    await syncPostStatistics(post.id, true);
    toast.info("Statistiques mises à jour !");
  };

  const handleCopyLink = async (post: BlogPost) => {
    try {
      const baseUrl = window.location.origin;
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      
      await navigator.clipboard.writeText(postUrl);
      toast.success("Lien copié dans le presse-papiers");
      
    } catch (error) {
      console.error('Erreur copie lien:', error);
      toast.error("Erreur lors de la copie du lien");
    }
  };

  const handleDeleteAction = async (post: BlogPost) => {
    if (handleDeletePost) {
      handleDeletePost(post.id);
    } else {
      toast.error("La suppression des posts n'est pas autorisée");
    }
  };

  const getHeaderImage = (post: BlogPost): string => {
    const image = post.header_image || post.headerImage;
    // Si pas d'image, utiliser une image de fallback Unsplash valide selon le domaine
    if (!image || image === '/placeholder.svg') {
      return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=400&fit=crop&auto=format';
    }
    return image;
  };

  const getPublishDate = (post: BlogPost): string => {
    // ✅ CORRECTION : Afficher scheduled_at pour les posts programmés, sinon published_at ou created_at
    if (post.status === 'scheduled' && post.scheduled_at) {
      return post.scheduled_at;
    }
    return post.published_at || post.publishDate || post.created_at || new Date().toISOString();
  };

  const getIsAIGenerated = (post: BlogPost): boolean => {
    return post.is_ai_generated ?? post.isAIGenerated ?? false;
  };

  const getAuthor = (post: BlogPost): { name: string } => {
    return post.user || post.author || { name: 'Anonyme' };
  };

  const getDisplayCategories = (post: BlogPost): string[] => {
    if (post.categories && post.categories.length > 0) {
      return post.categories.map(cat => cat.name);
    }
    return post.tags || [];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">
            {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''} trouvé{filteredPosts.length !== 1 ? 's' : ''}
          </span>
          
          <div className="flex gap-4 text-xs">
            <span>
              Total vues: <Badge variant="secondary">
                {Object.values(postsStatistics).reduce((sum, stats) => sum + (stats.total_views || 0), 0).toLocaleString()}
              </Badge>
            </span>
            <span>
              Total likes: <Badge variant="secondary">
                {Object.values(postsStatistics).reduce((sum, stats) => sum + (stats.total_likes || 0), 0).toLocaleString()}
              </Badge>
            </span>
            <span>
              Total commentaires: <Badge variant="secondary">
                {Object.values(postsStatistics).reduce((sum, stats) => sum + (stats.total_comments || 0), 0).toLocaleString()}
              </Badge>
            </span>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncAllPostsStatistics(true)}
          disabled={syncingAll}
          className="flex items-center gap-2"
        >
          {syncingAll ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {syncingAll ? "Synchronisation..." : "Synchroniser"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">
              <div className="flex items-center space-x-1">
                <span>Titre</span>
              </div>
            </TableHead>
            <TableHead>Auteur</TableHead>
            <TableHead>Catégories</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-center">Statut</TableHead>
            <TableHead className="text-center">Vues</TableHead>
            <TableHead className="text-center">Commentaires</TableHead>
            <TableHead className="text-center">Likes</TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              const stats = getPostStatistics(post);
              const isStatsLoading = stats.loading;
              const isStatsFresh = areStatsFresh(stats);

              return (
                <TableRow 
                  key={post.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleRowClick(post, e)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={getHeaderImage(post)} 
                          alt={post.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=400&fit=crop&auto=format';
                          }}
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="truncate max-w-[200px] font-medium">{post.title}</span>
                        {post.summary && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {post.summary}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getAuthor(post).name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getDisplayCategories(post).slice(0, 2).map((category, i) => (
                        <Badge key={i} variant="secondary" className="max-w-[100px] truncate">
                          {category}
                        </Badge>
                      ))}
                      {getDisplayCategories(post).length > 2 && (
                        <Badge variant="outline">+{getDisplayCategories(post).length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(getPublishDate(post))}</TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={
                        post.status === 'published' ? 'default' : 
                        post.status === 'scheduled' ? 'secondary' : 
                        'outline'
                      }
                    >
                      {post.status === 'published' ? 'Publié' : 
                       post.status === 'scheduled' ? 'Programmé' : 
                       'Brouillon'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isStatsLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span className={isStatsFresh ? "text-green-600" : ""}>
                          {(stats.total_views || 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isStatsLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span className={isStatsFresh ? "text-green-600" : ""}>
                          {(stats.total_comments || 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isStatsLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <span className={isStatsFresh ? "text-green-600" : ""}>
                          {(stats.total_likes || 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getIsAIGenerated(post) ? "outline" : "default"}>
                      {getIsAIGenerated(post) ? "IA" : "Manuel"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleViewPost(post)}
                          disabled={loadingActions[`view_${post.id}`]}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditPost(post)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewComments(post)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Commentaires ({stats.total_comments})
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => syncPostStatistics(post.id, true)}
                          disabled={isStatsLoading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isStatsLoading ? "animate-spin" : ""}`} />
                          Actualiser stats
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDuplicatePost(post)}
                          disabled={loadingActions[`duplicate_${post.id}`]}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyLink(post)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Copier le lien
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewStatistics(post)}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Statistiques
                        </DropdownMenuItem>
                        {handleDeletePost && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteAction(post)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center">
                Aucun article trouvé.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
