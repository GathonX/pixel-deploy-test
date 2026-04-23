// src/pages/BlogAuthor.tsx - IMPORTS CORRIGÉS
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { blogService, BlogPost } from "@/services/blogService";
import { userService, User as UserServiceUser, UserStats } from "@/services/userService";
import { User } from "@/contexts/AuthContext";
import { followService, FollowStatus } from "@/services/followService"; // ✅ IMPORT FollowStatus
import { interactionService } from "@/services/interactionService";
import { useAuth } from "@/hooks/useAuth";
import { useProfileListener, getUniformAvatarUrl } from "@/hooks/useProfileListener";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Award, BookOpen } from "lucide-react";
import { toast } from "sonner";

// ✅ IMPORT DES COMPOSANTS MODULAIRES
import {
  AuthorProfileHeader,
  AuthorArticlesList,
  AuthorAboutSection,
} from "@/components/blog-author";

const BlogAuthor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { user: currentUser, getAvatarUrl } = useAuth();
  const updatedProfile = useProfileListener();
  
  // ✅ ÉTATS POUR LES VRAIES DONNÉES (INCHANGÉS)
  const [author, setAuthor] = useState<UserServiceUser | null>(null);
  const [authorPosts, setAuthorPosts] = useState<BlogPost[]>([]);
  const [authorStats, setAuthorStats] = useState<UserStats | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  
  // ✅ ÉTATS POUR LES STATISTIQUES RÉELLES (INCHANGÉS)
  const [realStats, setRealStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    avgLikesPerArticle: 0,
    lastPostDate: null as Date | null,
    isActive: false
  });

  // ✅ LOGIQUE DE CHARGEMENT DES DONNÉES (INCHANGÉE)
  useEffect(() => {
    if (id) {
      loadAuthorData(parseInt(id));
    }
  }, [id]);

  const loadAuthorData = async (authorId: number) => {
    try {
      setLoading(true);
      
      console.log(`📊 [BlogAuthor] Chargement des données pour l'auteur ${authorId}...`);
      
      // ✅ ÉTAPE 1 : Récupérer les données de l'auteur
      let authorData: UserServiceUser | null = null;
      
      try {
        if (currentUser && currentUser.id === authorId) {
          authorData = {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            avatar: currentUser.avatar,
            bio: currentUser.bio,
            phone: currentUser.phone,
            address: currentUser.address,
            language: currentUser.language,
            email_verified_at: currentUser.email_verified_at,
            created_at: currentUser.created_at,
            updated_at: currentUser.updated_at,
            articles_count: currentUser.articles_count,
            followers_count: currentUser.followers_count,
            following_count: currentUser.following_count,
            total_likes: currentUser.total_likes,
            total_views: currentUser.total_views,
            total_comments: currentUser.total_comments,
          };
        } else {
          authorData = await userService.getPublicUser(authorId);
        }
      } catch (userError) {
        console.error("❌ [BlogAuthor] Erreur récupération utilisateur:", userError);
        throw new Error("Utilisateur introuvable");
      }
      
      if (!authorData) {
        throw new Error(`Utilisateur avec ID ${authorId} introuvable`);
      }
      
      setAuthor(authorData);
      console.log(`✅ [BlogAuthor] Données auteur chargées:`, authorData.name);
      
      // ✅ ÉTAPE 2 : Récupérer les vraies statistiques de followers
      let realFollowersCount = authorData.followers_count || 0;
      let realFollowingCount = authorData.following_count || 0;
      
      try {
        if (currentUser && currentUser.id === authorId) {
          const userStats = await userService.getUserStats(authorId);
          realFollowersCount = userStats.social.followers_count;
          realFollowingCount = userStats.social.following_count;
        } else {
          const publicStats = await userService.getPublicUserStats(authorId);
          realFollowersCount = publicStats.social.followers_count;
          realFollowingCount = publicStats.social.following_count;
        }
        
        console.log(`📊 [BlogAuthor] Vraies stats sociales récupérées:`, {
          followers: realFollowersCount,
          following: realFollowingCount
        });
        
      } catch (statsError) {
        console.warn("⚠️ [BlogAuthor] Erreur récupération stats sociales:", statsError);
      }
      
      // ✅ ÉTAPE 3 : Récupérer et traiter les posts
      const allPosts = await blogService.getPublicBlogPosts({ per_page: 100 });
      const userPosts = allPosts.filter(post => post.user_id === authorId);
      
      console.log(`📚 [BlogAuthor] Posts trouvés pour l'auteur:`, userPosts.length);
      
      // ✅ ÉTAPE 4 : Charger par batch de 5 avec délai de 200ms
      const BATCH_SIZE = 5;
      const DELAY_MS = 200;
      const postsWithRealStats = [];

      for (let i = 0; i < userPosts.length; i += BATCH_SIZE) {
        const batch = userPosts.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (post) => {
            try {
              const stats = await interactionService.getPublicPostStatistics('blog_post', post.id);
              return {
                ...post,
                likes: stats.total_likes || 0,
                views: stats.total_views || 0,
                comments: stats.total_comments || 0,
                shares: stats.total_shares || 0
              };
            } catch (statsError) {
              return {
                ...post,
                likes: post.likes || 0,
                views: post.views || 0,
                comments: typeof post.comments === 'number' ? post.comments : (post.comments?.length || 0),
                shares: post.shares || 0
              };
            }
          })
        );

        postsWithRealStats.push(...batchResults);

        if (i + BATCH_SIZE < userPosts.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
      
      setAuthorPosts(postsWithRealStats);
      
      // ✅ ÉTAPE 5 : Calculer les statistiques réelles
      const totalLikes = postsWithRealStats.reduce((sum, post) => sum + post.likes, 0);
      const totalViews = postsWithRealStats.reduce((sum, post) => sum + post.views, 0);
      const totalComments = postsWithRealStats.reduce((sum, post) => sum + post.comments, 0);
      const totalShares = postsWithRealStats.reduce((sum, post) => sum + post.shares, 0);
      
      const lastPost = postsWithRealStats
        .filter(post => post.status === 'published')
        .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())[0];
      
      const lastPostDate = lastPost ? new Date(lastPost.published_at || lastPost.created_at) : null;
      const isActive = lastPostDate ? (new Date().getTime() - lastPostDate.getTime()) < (30 * 24 * 60 * 60 * 1000) : false;
      
      setRealStats({
        totalArticles: postsWithRealStats.length,
        totalViews: totalViews,
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalShares: totalShares,
        avgLikesPerArticle: postsWithRealStats.length > 0 ? totalLikes / postsWithRealStats.length : 0,
        lastPostDate: lastPostDate,
        isActive: isActive
      });
      
      // ✅ ÉTAPE 6 : Créer les stats formatées
      const formattedStats: UserStats = {
        articles: {
          total: postsWithRealStats.length,
          published: postsWithRealStats.filter(p => p.status === 'published').length,
          drafts: 0,
          scheduled: 0
        },
        engagement: {
          total_likes: totalLikes,
          total_views: totalViews,
          total_comments: totalComments,
          avg_likes_per_article: postsWithRealStats.length > 0 ? totalLikes / postsWithRealStats.length : 0
        },
        social: {
          followers_count: realFollowersCount,
          following_count: realFollowingCount
        }
      };
      
      setAuthorStats(formattedStats);
      
      // ✅ ÉTAPE 7 : Récupérer le statut de follow
      if (currentUser && currentUser.id !== authorId) {
        try {
          const followStatusData = await followService.checkFollowStatus(authorId);
          setFollowStatus(followStatusData);
          console.log(`✅ [BlogAuthor] Statut de follow récupéré:`, followStatusData);
        } catch (followError) {
          console.warn("❌ [BlogAuthor] Erreur follow status:", followError);
          setFollowStatus({
            is_following: false,
            is_followed_by: false,
            can_follow: true,
            relationship: 'none'
          });
        }
      } else if (!currentUser) {
        setFollowStatus({
          is_following: false,
          is_followed_by: false,
          can_follow: true,
          relationship: 'none'
        });
      }
      
    } catch (error) {
      console.error("❌ [BlogAuthor] Erreur chargement auteur:", error);
      toast.error("Erreur lors du chargement de l'auteur");
      navigate("/blog");
    } finally {
      setLoading(false);
    }
  };



  // Fonction handleFollowToggle corrigée pour BlogAuthor.tsx - TYPES CORRECTS
// ✅ FONCTION TOGGLE FOLLOW CORRIGÉE AVEC TYPES STRICTS
const handleFollowToggle = async () => {
  console.log('🔄 [BlogAuthor] handleFollowToggle démarré:', {
    authorId: author?.id,
    authorName: author?.name,
    currentUserId: currentUser?.id,
    followStatusBefore: followStatus,
    authorStatsBefore: authorStats?.social
  });

  if (!author || !followStatus || !authorStats) {
    console.log('❌ [BlogAuthor] Données manquantes:', {
      hasAuthor: !!author,
      hasFollowStatus: !!followStatus,
      hasAuthorStats: !!authorStats
    });
    return;
  }
  
  if (!currentUser) {
    console.log('❌ [BlogAuthor] Utilisateur non connecté');
    toast.error("Vous devez être connecté pour suivre un auteur");
    navigate("/login");
    return;
  }
  
  try {
    setFollowLoading(true);
    console.log('🔄 [BlogAuthor] Début toggle follow pour auteur:', {
      authorId: author.id,
      currentFollowStatus: followStatus.is_following,
      currentFollowersCount: authorStats.social.followers_count
    });
    
    // ✅ APPEL API AVEC LOGS
    const response = await followService.toggleFollow(author.id);
    console.log('📡 [BlogAuthor] Réponse API followService.toggleFollow:', response);
    
    if (response.success) {
      console.log('✅ [BlogAuthor] Toggle follow réussi:', {
        action: response.data.action,
        newFollowersCount: response.data.following.followers_count,
        isNowFollowing: response.data.action === 'followed'
      });
      
      // ✅ CORRECTION TYPESCRIPT : Types stricts pour relationship
      const isFollowing = response.data.action === 'followed';
      const relationship: 'mutual' | 'following' | 'follower' | 'none' = isFollowing ? 'following' : 'none';
      
      // ✅ MISE À JOUR FOLLOWSTATUS AVEC TYPES CORRECTS
      const newFollowStatus: FollowStatus = {
        ...followStatus,
        is_following: isFollowing,
        relationship: relationship  // ✅ Type strict respecté
      };
      
      console.log('🔄 [BlogAuthor] Mise à jour followStatus:', {
        before: followStatus,
        after: newFollowStatus
      });
      
      setFollowStatus(newFollowStatus);
      
      // ✅ MISE À JOUR AUTHORSTATS AVEC LOGS
      const newAuthorStats = {
        ...authorStats,
        social: {
          ...authorStats.social,
          followers_count: response.data.following.followers_count
        }
      };
      
      console.log('🔄 [BlogAuthor] Mise à jour authorStats:', {
        before: authorStats.social,
        after: newAuthorStats.social
      });
      
      setAuthorStats(newAuthorStats);
      
      // ✅ VÉRIFICATION POST-MISE À JOUR
      console.log('✅ [BlogAuthor] États mis à jour:', {
        followStatus: newFollowStatus.is_following,
        followersCount: newAuthorStats.social.followers_count,
        relationship: newFollowStatus.relationship
      });
      
      // ✅ RAFRAÎCHISSEMENT SUPPLÉMENTAIRE AVEC LOGS
      console.log('🔄 [BlogAuthor] Programmation rafraîchissement dans 1 seconde');
      setTimeout(() => {
        console.log('🔄 [BlogAuthor] Exécution rafraîchissement données followers');
        refreshFollowerData(author.id);
      }, 1000);
      
      toast.success(response.message);
    } else {
      console.log('❌ [BlogAuthor] Échec toggle follow:', response.message);
      toast.error(response.message || "Erreur lors de l'action");
    }
    
  } catch (error) {
    console.error("❌ [BlogAuthor] Erreur toggle follow:", error);
    
    // ✅ LOGS DÉTAILLÉS DE L'ERREUR
    if (error instanceof Error) {
      console.error("❌ [BlogAuthor] Détails erreur:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    toast.error("Erreur lors de l'action de suivi");
  } finally {
    console.log('🔄 [BlogAuthor] Fin toggle follow, désactivation loading');
    setFollowLoading(false);
  }
};

// ✅ FONCTION REFRESH CORRIGÉE AVEC LOGS
const refreshFollowerData = async (authorId: number) => {
  try {
    console.log(`🔄 [BlogAuthor] refreshFollowerData démarré pour ${authorId}`);
    
    let realFollowersCount = 0;
    let realFollowingCount = 0;
    
    try {
      if (currentUser && currentUser.id === authorId) {
        console.log('🔄 [BlogAuthor] Récupération stats utilisateur connecté');
        const userStats = await userService.getUserStats(authorId);
        realFollowersCount = userStats.social.followers_count;
        realFollowingCount = userStats.social.following_count;
        console.log('✅ [BlogAuthor] Stats utilisateur connecté:', userStats.social);
      } else {
        console.log('🔄 [BlogAuthor] Récupération stats publiques');
        const publicStats = await userService.getPublicUserStats(authorId);
        realFollowersCount = publicStats.social.followers_count;
        realFollowingCount = publicStats.social.following_count;
        console.log('✅ [BlogAuthor] Stats publiques:', publicStats.social);
      }
      
      // ✅ MISE À JOUR AVEC LOGS
      console.log('🔄 [BlogAuthor] Mise à jour authorStats avec nouvelles données:', {
        oldFollowersCount: authorStats?.social.followers_count,
        newFollowersCount: realFollowersCount,
        oldFollowingCount: authorStats?.social.following_count,
        newFollowingCount: realFollowingCount
      });
      
      setAuthorStats(prev => {
        const newStats = prev ? {
          ...prev,
          social: {
            followers_count: realFollowersCount,
            following_count: realFollowingCount
          }
        } : null;
        
        console.log('✅ [BlogAuthor] authorStats mis à jour:', newStats?.social);
        return newStats;
      });
      
    } catch (error) {
      console.warn("⚠️ [BlogAuthor] Erreur lors du rafraîchissement:", error);
    }
    
  } catch (error) {
    console.error("❌ [BlogAuthor] Erreur rafraîchissement followers:", error);
  }
};


  // ✅ USEEFFECTS (INCHANGÉS)
  useEffect(() => {
    if (author && !loading) {
      const interval = setInterval(() => {
        refreshFollowerData(author.id);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [author, loading]);

  useEffect(() => {
    if (updatedProfile && author && updatedProfile.id === author.id) {
      console.log(`🔄 [BlogAuthor] Profil mis à jour détecté pour ${author.id}`);
      
      setAuthor(prev => prev ? {
        ...prev,
        ...updatedProfile,
        followers_count: updatedProfile.followers_count,
        following_count: updatedProfile.following_count
      } : null);
      
      setAuthorStats(prev => prev ? {
        ...prev,
        social: {
          followers_count: updatedProfile.followers_count || 0,
          following_count: updatedProfile.following_count || 0
        }
      } : null);
    }
  }, [updatedProfile, author]);

  // ✅ FONCTION AVATAR (INCHANGÉE)
  const getAuthorAvatarUrl = (avatarPath?: string) => {
    if (currentUser && author && author.id === currentUser.id) {
      return getAvatarUrl(avatarPath || currentUser.avatar);
    }
    return getUniformAvatarUrl(avatarPath);
  };

  // ✅ ÉTAT DE CHARGEMENT (INCHANGÉ)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-landing">
        <LandingNavbar />
        <div className="pt-20 flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-brand-blue" />
              <div className="absolute inset-0 h-12 w-12 mx-auto rounded-full bg-brand-blue/20 animate-ping"></div>
            </div>
            <p className="text-text-secondary text-lg font-medium">Chargement du profil auteur...</p>
            <div className="mt-2 bg-gradient-card rounded-full h-2 w-32 mx-auto overflow-hidden">
              <div className="h-full bg-gradient-cta animate-shine relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine"></div>
              </div>
            </div>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  // ✅ ÉTAT D'ERREUR (INCHANGÉ)
  if (!author) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-landing">
        <LandingNavbar />
        <div className="pt-20 flex-grow flex items-center justify-center">
          <div className="text-center bg-white/80 backdrop-blur-glass rounded-2xl p-8 shadow-glass border border-white/20">
            <div className="h-16 w-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Award className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Auteur introuvable</h2>
            <p className="text-text-secondary mb-6">L'auteur demandé n'existe pas ou a été supprimé.</p>
            <Button
              onClick={() => navigate("/blog")}
              className="bg-gradient-business text-white hover:shadow-premium transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au blog
            </Button>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  // ✅ RENDU PRINCIPAL AVEC COMPOSANTS MODULAIRES
  return (
    <div className="min-h-screen flex flex-col bg-gradient-landing">
      <LandingNavbar />
      <div className="pt-20 flex-grow">
        <BlogHeader />
        
        <div className="container mx-auto px-4 py-8">
          {/* Bouton retour */}
          <Button 
            variant="ghost" 
            className="mb-6 text-text-secondary hover:text-brand-blue hover:bg-blue-50/50 transition-all duration-300"
            onClick={() => navigate("/blog")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au blog
          </Button>
          
          {/* ✅ HEADER AUTEUR MODULAIRE */}
          <AuthorProfileHeader
            author={author}
            currentUser={currentUser}
            followStatus={followStatus}
            followLoading={followLoading}
            realStats={realStats}
            authorStats={authorStats}
            onFollowToggle={handleFollowToggle}
            getAuthorAvatarUrl={getAuthorAvatarUrl}
          />
          
          {/* ✅ CONTENU AVEC TABS MODULAIRES */}
          <Tabs defaultValue="articles" className="space-y-6">
            <TabsList className="bg-white/80 backdrop-blur-glass rounded-xl p-1 shadow-glass border border-white/20">
              <TabsTrigger 
                value="articles" 
                className="data-[state=active]:bg-gradient-business data-[state=active]:text-white rounded-lg"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Articles ({realStats.totalArticles})
              </TabsTrigger>
              <TabsTrigger 
                value="about"
                className="data-[state=active]:bg-gradient-business data-[state=active]:text-white rounded-lg"
              >
                <Award className="h-4 w-4 mr-2" />
                À propos
              </TabsTrigger>
            </TabsList>
            
            {/* ✅ TAB ARTICLES MODULAIRE */}
            <TabsContent value="articles" className="space-y-6">
              <AuthorArticlesList
                authorPosts={authorPosts}
                realStats={realStats}
              />
            </TabsContent>
            
            {/* ✅ TAB À PROPOS MODULAIRE */}
            <TabsContent value="about" className="space-y-6">
              <AuthorAboutSection
                author={author}
                authorPosts={authorPosts}
                realStats={realStats}
                authorStats={authorStats}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
};

export default BlogAuthor;