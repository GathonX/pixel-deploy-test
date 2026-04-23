import { useState, useEffect } from "react";
import { BlogNewsFeedHeader } from "./BlogNewsFeedHeader";
import { NewsFeedTabs } from "./NewsFeedTabs";
import { SidebarAuthors } from "./SidebarAuthors";
import { useIsMobile } from "@/hooks/use-mobile";
import { followService } from "@/services/followService";
import { blogService, BlogPost } from "@/services/blogService"; // ✅ MÊME SERVICE QUE BLOGHOME
import { interactionService } from "@/services/interactionService"; // ✅ POUR LES STATS RÉELLES
import { moderationService } from "@/services/moderationService"; // ✅ POUR FILTRER LES CONTENUS MASQUÉS
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, RefreshCw, Sparkles, TrendingUp, Users, BookOpen, Heart, Eye, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener";

export const MonActualiteContent = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [following, setFollowing] = useState<string[]>([]);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const isMobile = useIsMobile();
  const [defaultBlog, setDefaultBlog] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // ✅ MÊME LOGIQUE QUE BLOGHOME - États pour les posts
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ NOUVEAU : États pour les statistiques réelles (simple)
  const [statsLoading, setStatsLoading] = useState(false);
  const [realStats, setRealStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    activeAuthors: 0,
    lastUpdated: null as Date | null
  });

  // ✅ NOUVEAU : État pour les réactions utilisateur (batch loaded)
  const [userReactions, setUserReactions] = useState<Record<string, { has_liked: boolean }>>({});

  // ✅ NOUVEAU : État pour les IDs des contenus masqués par l'utilisateur
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<number>>(new Set());

  // CTA Blog IA — masquable via localStorage
  const [showAiCta, setShowAiCta] = useState(
    () => localStorage.getItem('hide_blog_ai_cta') !== 'true'
  );
  const dismissAiCta = () => {
    localStorage.setItem('hide_blog_ai_cta', 'true');
    setShowAiCta(false);
  };

  // ✅ NOUVEAU : Fonction pour gérer le clic sur l'auteur
  const handleAuthorClick = (authorId: number | string) => {
    navigate(`/blog/author/${authorId}`);
  };

  // ✅ UNIFORME : Utiliser la fonction centralisée pour l'avatar
  const getUserAvatar = (userAvatar?: string | null): string => {
    return getUniformAvatarUrl(userAvatar);
  };
  

  // ✅ NOUVEAU : Charger les contenus masqués par l'utilisateur
  useEffect(() => {
    const loadHiddenContent = async () => {
      if (!isAuthenticated || !user) {
        setHiddenPostIds(new Set());
        return;
      }

      try {
        console.log("👁️ [MonActualite] Chargement contenus masqués...");
        const hiddenContents = await moderationService.getHiddenContents('blog_post');

        if (Array.isArray(hiddenContents)) {
          const hiddenIds = new Set(hiddenContents.map((item: any) => item.hideable_id));
          setHiddenPostIds(hiddenIds);
          console.log(`✅ [MonActualite] ${hiddenIds.size} publications masquées chargées`);
        }
      } catch (error) {
        console.error("❌ [MonActualite] Erreur chargement contenus masqués:", error);
        setHiddenPostIds(new Set());
      }
    };

    loadHiddenContent();
  }, [isAuthenticated, user]);

  // ✅ MÊME LOGIQUE QUE BLOGHOME - Charger les posts depuis l'API
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // ✅ EXACTEMENT COMME BLOGHOME
        const blogPosts = await blogService.getPublicBlogPosts({
          per_page: 50 // Charger plus de posts pour les filtres
        });

        console.log("📚 [MonActualite] Posts chargés:", blogPosts.length);

        // ✅ FILTRER : 1) Posts publiés seulement, 2) Pas de dates futures, 3) Pas masqués par l'utilisateur
        const now = new Date();
        const visiblePosts = blogPosts.filter(post => {
          // 1. Seulement les posts avec status "published"
          if (post.status !== 'published') return false;

          // 2. Pas de posts avec dates futures
          const publishDate = new Date(post.published_at || post.created_at);
          if (publishDate > now) return false;

          // 3. Pas masqués par l'utilisateur
          if (hiddenPostIds.has(post.id)) return false;

          return true;
        });
        console.log(`📚 [MonActualite] Posts visibles (après filtrage): ${visiblePosts.length}/${blogPosts.length}`);

        setPosts(visiblePosts);
        setFilteredPosts(visiblePosts);
        
      } catch (err) {
        console.error("❌ [MonActualite] Erreur chargement posts:", err);
        setError("Erreur lors du chargement des articles");
        setPosts([]);
        setFilteredPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [hiddenPostIds]); // ✅ Recharger quand les contenus masqués changent

  // ✅ CHARGER LES RÉACTIONS UTILISATEUR AVEC BATCH LOADING
  useEffect(() => {
    const loadUserReactions = async () => {
      if (!isAuthenticated || !user || !posts.length) {
        setUserReactions({});
        return;
      }

      try {
        console.log("👤 [MonActualite] Chargement réactions utilisateur...");

        // ✅ BATCH LOADING: 5 requêtes à la fois avec délai de 200ms
        const BATCH_SIZE = 5;
        const DELAY_MS = 200;
        const reactionsMap: Record<string, { has_liked: boolean }> = {};

        for (let i = 0; i < posts.length; i += BATCH_SIZE) {
          const batch = posts.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.all(
            batch.map(async (post) => {
              try {
                const reactions = await interactionService.getUserReactions('blog_post', post.id);
                return { postId: post.id, reactions };
              } catch (error) {
                console.warn(`Erreur chargement réactions post ${post.id}:`, error);
                return { postId: post.id, reactions: { has_liked: false } };
              }
            })
          );

          // Ajouter les résultats du batch à la map
          batchResults.forEach(({ postId, reactions }) => {
            reactionsMap[postId.toString()] = reactions;
          });

          // Délai entre les batches
          if (i + BATCH_SIZE < posts.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }

        setUserReactions(reactionsMap);
        console.log("✅ [MonActualite] Réactions utilisateur chargées:", Object.keys(reactionsMap).length);

      } catch (error) {
        console.error("❌ [MonActualite] Erreur chargement réactions:", error);
        setUserReactions({});
      }
    };

    loadUserReactions();
  }, [posts, isAuthenticated, user]);

  // ✅ CHARGER LES STATISTIQUES RÉELLES APRÈS CHARGEMENT DES POSTS
  useEffect(() => {
    const loadRealStats = async () => {
      if (!posts.length) return;

      try {
        setStatsLoading(true);
        console.log("📊 [MonActualite] Chargement statistiques réelles...");

        // ✅ CORRECTION: Charger par batch de 5 avec délai de 200ms
        const BATCH_SIZE = 5;
        const DELAY_MS = 200;
        const postsWithStats = [];

        for (let i = 0; i < posts.length; i += BATCH_SIZE) {
          const batch = posts.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.all(
            batch.map(async (post) => {
              try {
                const stats = await interactionService.getPublicPostStatistics('blog_post', post.id);
                return {
                  ...post,
                  realLikes: stats.total_likes || 0,
                  realViews: stats.total_views || 0,
                  realComments: stats.total_comments || 0,
                  realShares: stats.total_shares || 0
                };
              } catch (error) {
                return {
                  ...post,
                  realLikes: post.likes || 0,
                  realViews: post.views || 0,
                  realComments: typeof post.comments === 'number' ? post.comments : (post.comments?.length || 0),
                  realShares: post.shares || 0
                };
              }
            })
          );

          postsWithStats.push(...batchResults);

          if (i + BATCH_SIZE < posts.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }

        // ✅ CALCULER LES TOTAUX
        const totals = postsWithStats.reduce((acc, post) => ({
          totalLikes: acc.totalLikes + post.realLikes,
          totalViews: acc.totalViews + post.realViews,
          totalComments: acc.totalComments + post.realComments,
          totalShares: acc.totalShares + post.realShares,
          uniqueAuthors: acc.uniqueAuthors.add(post.user?.id)
        }), {
          totalLikes: 0,
          totalViews: 0,
          totalComments: 0,
          totalShares: 0,
          uniqueAuthors: new Set()
        });

        setRealStats({
          totalPosts: posts.length,
          totalViews: totals.totalViews,
          totalLikes: totals.totalLikes,
          totalComments: totals.totalComments,
          totalShares: totals.totalShares,
          activeAuthors: totals.uniqueAuthors.size,
          lastUpdated: new Date()
        });

        console.log("✅ [MonActualite] Statistiques réelles chargées:", {
          totalLikes: totals.totalLikes,
          totalViews: totals.totalViews,
          totalComments: totals.totalComments,
          totalShares: totals.totalShares,
          activeAuthors: totals.uniqueAuthors.size
        });

      } catch (error) {
        console.error("❌ [MonActualite] Erreur statistiques réelles:", error);
        
        // ✅ FALLBACK : Utiliser les données des posts
        const fallbackStats = posts.reduce((acc, post) => ({
          totalLikes: acc.totalLikes + (post.likes || 0),
          totalViews: acc.totalViews + (post.views || 0),
          totalComments: acc.totalComments + (typeof post.comments === 'number' ? post.comments : (post.comments?.length || 0)),
          totalShares: acc.totalShares + (post.shares || 0),
          uniqueAuthors: acc.uniqueAuthors.add(post.user?.id)
        }), {
          totalLikes: 0,
          totalViews: 0,
          totalComments: 0,
          totalShares: 0,
          uniqueAuthors: new Set()
        });

        setRealStats({
          totalPosts: posts.length,
          totalViews: fallbackStats.totalViews,
          totalLikes: fallbackStats.totalLikes,
          totalComments: fallbackStats.totalComments,
          totalShares: fallbackStats.totalShares,
          activeAuthors: fallbackStats.uniqueAuthors.size,
          lastUpdated: new Date()
        });

        console.log("⚠️ [MonActualite] Utilisation des données fallback");
      } finally {
        setStatsLoading(false);
      }
    };

    if (!loading && posts.length > 0) {
      loadRealStats();
    }
  }, [posts, loading]);

  // ✅ CHARGER L'ÉTAT DE FOLLOW
  useEffect(() => {
    const loadFollowingState = async () => {
      if (!isAuthenticated) {
        setFollowing([]);
        return;
      }

      try {
        setLoadingFollow(true);
        const followingUsers = await followService.getFollowing();
        const followingIds = followingUsers.map(user => user.id.toString());
        setFollowing(followingIds);
      } catch (error) {
        console.error('Erreur lors du chargement des follows:', error);
        setFollowing([]);
      } finally {
        setLoadingFollow(false);
      }
    };

    loadFollowingState();
  }, [isAuthenticated]);

  // ✅ MÊME LOGIQUE QUE BLOGHOME - Filtrer et trier les posts
  useEffect(() => {
    let filteredResults = [...posts];
    
    // Filter by search query if present
    if (searchQuery) {
      filteredResults = filteredResults.filter(
        post => 
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          post.summary.toLowerCase().includes(searchQuery.toLowerCase()) || 
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
          post.user?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // ✅ APPLIQUER LE FILTRAGE PAR ONGLET
    switch (activeTab) {
      case "following":
        filteredResults = filteredResults.filter(post => 
          post.user?.id && following.includes(post.user.id.toString())
        );
        break;
      case "popular":
        filteredResults = filteredResults.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "ai":
        filteredResults = filteredResults.filter(post => post.is_ai_generated);
        break;
      case "default":
        filteredResults = defaultBlog?.title 
          ? filteredResults.filter(post => post.tags.includes(defaultBlog.title))
          : [];
        break;
      default: // "all"
        filteredResults = filteredResults.sort((a, b) => {
          // ✅ NOUVEAU TRI : Posts du jour en premier, triés par engagement
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const dateA = new Date(a.published_at || a.created_at);
          const dateB = new Date(b.published_at || b.created_at);

          // ✅ CORRECTION : Vérifier si le post a été publié EXACTEMENT aujourd'hui (pas dans le futur)
          const isAToday = dateA >= today && dateA < tomorrow;
          const isBToday = dateB >= today && dateB < tomorrow;

          // Calculer l'engagement total (vues + j'aimes + partages + commentaires)
          const commentsA = typeof a.comments === 'number' ? a.comments : (a.comments?.length || 0);
          const commentsB = typeof b.comments === 'number' ? b.comments : (b.comments?.length || 0);
          const engagementA = (a.views || 0) + (a.likes || 0) + (a.shares || 0) + commentsA;
          const engagementB = (b.views || 0) + (b.likes || 0) + (b.shares || 0) + commentsB;

          // 1. Posts d'aujourd'hui avant les posts anciens
          if (isAToday && !isBToday) return -1;
          if (!isAToday && isBToday) return 1;

          // 2. Au sein du même groupe (aujourd'hui OU ancien), trier par engagement
          if (isAToday === isBToday) {
            // Si même engagement, trier par date (plus récent en premier)
            if (engagementB === engagementA) {
              return dateB.getTime() - dateA.getTime();
            }
            return engagementB - engagementA;
          }

          return 0;
        });
        break;
    }
    
    setFilteredPosts(filteredResults);
  }, [activeTab, searchQuery, posts, following, defaultBlog?.title]);

  // ✅ CURRENT USER POUR LES COMPOSANTS
  const userForComponents = isAuthenticated && user ? {
    id: user.id.toString(),
    name: user.name,
    avatar: getUserAvatar(user.avatar),
    following: following,
    likes: [] as string[]
  } : null;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  
  // ✅ FUNCTION TOGGLE FOLLOW
  const toggleFollow = async (authorId: string) => {
    if (!isAuthenticated || !userForComponents) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour suivre des auteurs",
        variant: "destructive",
        action: (
          <Button size="sm" onClick={() => navigate('/login')}>
            Se connecter
          </Button>
        )
      });
      return;
    }

    try {
      const userId = parseInt(authorId);
      if (isNaN(userId)) {
        toast({
          description: "ID utilisateur invalide",
          variant: "destructive"
        });
        return;
      }

      const wasFollowing = following.includes(authorId);
      setFollowing(prev => 
        wasFollowing 
          ? prev.filter(id => id !== authorId)
          : [...prev, authorId]
      );

      const result = await followService.toggleFollow(userId);

      setFollowing(prev => {
        if (result.data.is_following) {
          return prev.includes(authorId) ? prev : [...prev, authorId];
        } else {
          return prev.filter(id => id !== authorId);
        }
      });

      toast({
        description: result.message,
        duration: 3000
      });

    } catch (error) {
      console.error('Erreur toggle follow:', error);
      
      setFollowing(prev => 
        prev.includes(authorId) 
          ? prev.filter(id => id !== authorId)
          : [...prev, authorId]
      );

      toast({
        description: "Erreur lors de l'action",
        variant: "destructive"
      });
    }
  };

  // ✅ FONCTION POUR RECHARGER LES DONNÉES
  const refetch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const blogPosts = await blogService.getPublicBlogPosts({ per_page: 50 });
      setPosts(blogPosts);
      setFilteredPosts(blogPosts);
      
      toast({
        description: "Articles rechargés avec succès",
        duration: 2000
      });
    } catch (err) {
      console.error("❌ [MonActualite] Erreur rechargement:", err);
      setError("Erreur lors du rechargement");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FONCTION POUR RECHARGER LES STATISTIQUES
  const refreshStats = async () => {
    if (posts.length === 0) return;

    setStatsLoading(true);

    try {
      // ✅ CORRECTION: Charger par batch de 5 avec délai de 200ms
      const BATCH_SIZE = 5;
      const DELAY_MS = 200;
      const postsWithStats = [];

      for (let i = 0; i < posts.length; i += BATCH_SIZE) {
        const batch = posts.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (post) => {
            try {
              const stats = await interactionService.getPublicPostStatistics('blog_post', post.id);
              return {
                realLikes: stats.total_likes || 0,
                realViews: stats.total_views || 0,
                realComments: stats.total_comments || 0,
                realShares: stats.total_shares || 0
              };
            } catch (error) {
              return {
                realLikes: post.likes || 0,
                realViews: post.views || 0,
                realComments: typeof post.comments === 'number' ? post.comments : (post.comments?.length || 0),
                realShares: post.shares || 0
              };
            }
          })
        );

        postsWithStats.push(...batchResults);

        if (i + BATCH_SIZE < posts.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }

      const totals = postsWithStats.reduce((acc, post) => ({
        totalLikes: acc.totalLikes + post.realLikes,
        totalViews: acc.totalViews + post.realViews,
        totalComments: acc.totalComments + post.realComments,
        totalShares: acc.totalShares + post.realShares,
        uniqueAuthors: acc.uniqueAuthors.add(posts[postsWithStats.indexOf(post)]?.user?.id)
      }), {
        totalLikes: 0,
        totalViews: 0,
        totalComments: 0,
        totalShares: 0,
        uniqueAuthors: new Set()
      });

      setRealStats({
        totalPosts: posts.length,
        totalViews: totals.totalViews,
        totalLikes: totals.totalLikes,
        totalComments: totals.totalComments,
        totalShares: totals.totalShares,
        activeAuthors: totals.uniqueAuthors.size,
        lastUpdated: new Date()
      });

      toast({
        description: "Statistiques mises à jour",
        duration: 2000
      });

    } catch (error) {
      console.error("❌ Erreur refresh stats:", error);
      toast({
        description: "Erreur lors de la mise à jour",
        variant: "destructive"
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // ✅ MÊME GESTION DE CHARGEMENT QUE BLOGHOME
  if (authLoading || loadingFollow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="sticky top-0 z-40 backdrop-blur-lg border-b border-slate-200/50">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
              <div className="h-8 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-brand-blue to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-brand-blue to-indigo-600 rounded-full animate-ping opacity-20 mx-auto"></div>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {authLoading ? "Vérification de la connexion..." : loadingFollow ? "Synchronisation de vos abonnements..." : "Chargement de l'actualité..."}
              </h3>
              <p className="text-slate-500">Découvrez les dernières publications</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* ✅ Header moderne avec effet glassmorphism */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-lg shadow-slate-200/20">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 via-brand-blue to-indigo-600 bg-clip-text text-transparent">
                  Mon Actualité
                </h1>
               
              </div>
              
              {/* Badge statut connexion */}
              {isAuthenticated ? (
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-md">
                  <Users className="h-3 w-3 mr-1" />
                  Connecté
                </Badge>
              ) : (
                <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Lecteur
                </Badge>
              )}
            </div>
            
            {/* Stats rapides */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-lg backdrop-blur-sm">
                <TrendingUp className="h-4 w-4 text-brand-blue" />
                <span className="text-slate-600">{realStats.totalPosts} articles</span>
              </div>
              
             
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Message d'accueil pour utilisateurs non connectés */}
      {!isAuthenticated && (
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-brand-blue to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 mb-2">Mode Lecture Activé</h3>
                <p className="text-slate-600 text-sm mb-4">
                  Vous pouvez lire et partager les articles. Connectez-vous pour aimer, commenter et suivre vos auteurs préférés.
                </p>
                <div className="flex gap-3">
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/login')}
                    className="bg-gradient-to-r from-brand-blue to-indigo-600 hover:shadow-lg transition-all duration-200"
                  >
                    Se connecter
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => navigate('/register')}
                    className="border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white"
                  >
                    S'inscrire
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* ✅ Header de recherche moderne */}
        <div className="mb-8">
          <BlogNewsFeedHeader onSearch={handleSearch} />
        </div>

        {/* CTA Blog IA — visible uniquement pour les utilisateurs connectes */}
        {isAuthenticated && showAiCta && (
          <div className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 p-5 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">Automatisez votre blog avec l'IA</p>
                <p className="text-white/80 text-xs mt-0.5">1 article généré automatiquement par jour — sans effort</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/dashboard/sprints")}
                className="bg-white text-indigo-700 hover:bg-white/90 font-semibold text-xs whitespace-nowrap shrink-0"
              >
                Activer l'IA
              </Button>
              <button
                onClick={dismissAiCta}
                className="text-white/60 hover:text-white ml-1 shrink-0"
                aria-label="Masquer"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* ✅ MÊME GESTION D'ERREUR QUE BLOGHOME */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-4">Oops ! Une erreur s'est produite</h1>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">{error}</p>
              <Button 
                onClick={refetch}
                className="bg-gradient-to-r from-brand-blue to-indigo-600 hover:shadow-lg transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </div>
        )}
        
        {/* ✅ MÊME GESTION DE CHARGEMENT QUE BLOGHOME */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            <span className="ml-3 text-slate-600">Chargement des articles...</span>
          </div>
        )}
        
        {/* ✅ Bouton Créer un article - Mobile uniquement (au-dessus des posts) */}
        <div className="lg:hidden mb-6">
          <Button
            onClick={() => navigate('/dashboard/blog/create')}
            className="w-full bg-gradient-to-r from-brand-blue to-indigo-600 hover:shadow-lg transition-all duration-200 h-12"
          >
            <span className="mr-2">✍️</span>
            Créer un article
          </Button>
        </div>

        {/* ✅ Layout principal avec design moderne */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-3">
            {!loading && !error && (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/20 border border-white/50 overflow-hidden">
                <NewsFeedTabs
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  filteredPosts={filteredPosts}
                  following={following}
                  toggleFollow={toggleFollow}
                  currentUser={userForComponents}
                  setSearchQuery={setSearchQuery}
                  defaultBlogTitle={defaultBlog?.title}
                  isAuthenticated={isAuthenticated}
                  onAuthorClick={handleAuthorClick}
                  userReactions={userReactions}
                />
              </div>
            )}
          </div>

          {/* Sidebar moderne */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Bouton Créer un article - Desktop uniquement */}
              <Button
                onClick={() => navigate('/dashboard/blog/create')}
                className="hidden lg:block w-full bg-gradient-to-r from-brand-blue to-indigo-600 hover:shadow-lg transition-all duration-200 h-12"
              >
                <span className="mr-2">✍️</span>
                Créer un article
              </Button>

              {/* Suggestions d'auteurs */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/20 border border-white/50 overflow-hidden">
                <SidebarAuthors
                  isMobile={isMobile}
                  following={following}
                  onFollowToggle={toggleFollow}
                  currentUserId={userForComponents?.id || ""}
                  isAuthenticated={isAuthenticated}
                  onAuthorClick={handleAuthorClick}
                />
              </div>

              {/* ✅ STATISTIQUES RÉELLES BASÉES SUR BLOGSIDEBAR */}
              <div className="bg-gradient-to-br from-white/60 to-slate-50/60 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/20 border border-white/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand-blue" />
                    Statistiques Réelles
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshStats}
                    disabled={statsLoading}
                    className="h-8 w-8 p-0 hover:bg-slate-100"
                  >
                    <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Articles</span>
                    <span className="font-semibold text-slate-800">
                      {statsLoading ? (
                        <div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        realStats.totalPosts
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Vues totales</span>
                    <span className="font-semibold text-slate-800">
                      {statsLoading ? (
                        <div className="h-4 w-12 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        realStats.totalViews.toLocaleString()
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Likes totaux</span>
                    <span className="font-semibold text-slate-800">
                      {statsLoading ? (
                        <div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {realStats.totalLikes}
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Commentaires</span>
                    <span className="font-semibold text-slate-800">
                      {statsLoading ? (
                        <div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {realStats.totalComments}
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Partages</span>
                    <span className="font-semibold text-slate-800">
                      {statsLoading ? (
                        <div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Share2 className="h-4 w-4" />
                          {realStats.totalShares}
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Auteurs actifs</span>
                    <span className="font-semibold text-slate-800">
                      {statsLoading ? (
                        <div className="h-4 w-8 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {realStats.activeAuthors}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                
                {/* ✅ Indicateur de mise à jour */}
                {realStats.lastUpdated && (
                  <div className="mt-4 pt-3 border-t border-slate-200/50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Mis à jour: {realStats.lastUpdated.toLocaleTimeString()}
                      </p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-slate-500">En direct</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ✅ INDICATEUR D'ENGAGEMENT GLOBAL */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/20 border border-indigo-200/50 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  Engagement Global
                </h3>
                
                <div className="space-y-3">
                  {/* Taux d'engagement calculé */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Taux d'engagement</span>
                    <span className="font-semibold text-indigo-600">
                      {statsLoading ? (
                        <div className="h-4 w-12 bg-indigo-200 rounded animate-pulse"></div>
                      ) : (
                        `${realStats.totalViews > 0 ? 
                          (((realStats.totalLikes + realStats.totalComments + realStats.totalShares) / realStats.totalViews) * 100).toFixed(1) 
                          : '0'}%`
                      )}
                    </span>
                  </div>
                  
                  {/* Interactions totales */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Interactions totales</span>
                    <span className="font-semibold text-indigo-600">
                      {statsLoading ? (
                        <div className="h-4 w-12 bg-indigo-200 rounded animate-pulse"></div>
                      ) : (
                        (realStats.totalLikes + realStats.totalComments + realStats.totalShares).toLocaleString()
                      )}
                    </span>
                  </div>
                  
                  {/* Moyenne par article */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Moy. par article</span>
                    <span className="font-semibold text-indigo-600">
                      {statsLoading ? (
                        <div className="h-4 w-12 bg-indigo-200 rounded animate-pulse"></div>
                      ) : (
                        realStats.totalPosts > 0 ? 
                          Math.round(realStats.totalViews / realStats.totalPosts).toLocaleString() + ' vues'
                          : '0 vues'
                      )}
                    </span>
                  </div>
                </div>
                
                {/* ✅ Barre de progression de l'engagement */}
                {!statsLoading && realStats.totalViews > 0 && (
                  <div className="mt-4 pt-3 border-t border-indigo-200/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600">Niveau d'engagement</span>
                      <span className="text-xs font-medium text-indigo-600">
                        {(() => {
                          const rate = ((realStats.totalLikes + realStats.totalComments + realStats.totalShares) / realStats.totalViews) * 100;
                          if (rate < 2) return 'Faible';
                          if (rate < 5) return 'Moyen';
                          if (rate < 10) return 'Élevé';
                          return 'Excellent';
                        })()}
                      </span>
                    </div>
                    <div className="w-full bg-indigo-100 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(
                            ((realStats.totalLikes + realStats.totalComments + realStats.totalShares) / realStats.totalViews) * 100 * 10, 
                            100
                          )}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* ✅ SECTION STATISTIQUES RAPIDES */}
              <div className="bg-gradient-to-br from-white/60 to-slate-50/60 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/20 border border-white/50 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 text-center">
                  Communauté Pixel Rise
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-brand-blue mb-1">
                      {statsLoading ? (
                        <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mx-auto"></div>
                      ) : (
                        realStats.totalViews.toLocaleString()
                      )}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center justify-center gap-1">
                      <Eye className="h-4 w-4" />
                      Vues
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {statsLoading ? (
                        <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mx-auto"></div>
                      ) : (
                        realStats.totalLikes.toLocaleString()
                      )}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center justify-center gap-1">
                      <Heart className="h-4 w-4" />
                      Likes
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {statsLoading ? (
                        <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mx-auto"></div>
                      ) : (
                        realStats.totalComments.toLocaleString()
                      )}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center justify-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Commentaires
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {statsLoading ? (
                        <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mx-auto"></div>
                      ) : (
                        realStats.activeAuthors
                      )}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center justify-center gap-1">
                      <Users className="h-4 w-4" />
                      Auteurs
                    </div>
                  </div>
                </div>
                
                {/* ✅ Message d'encouragement */}
                {!statsLoading && realStats.totalLikes > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/50 text-center">
                    <p className="text-sm text-slate-600">
                      🎉 {realStats.totalLikes} likes distribués par notre communauté !
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};