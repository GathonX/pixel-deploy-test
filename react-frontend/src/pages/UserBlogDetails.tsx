// ✅ CORRECTION COMPLÈTE : UserBlogDetails.tsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare, Share2, Bookmark, ArrowLeft, Eye, Edit, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

// ✅ NOUVEAU : Imports des services backend
import { useAuth } from "@/hooks/useAuth"; // Ajouter cet import en haut
import { blogService } from "@/services/blogService";
import { interactionService } from "@/services/interactionService";
import { BlogPost } from "@/services/blogService";
import { adaptBlogPostForFrontend } from "@/data/blogData";
import { CommentSection } from "@/components/blog/CommentSection";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener"; // ✅ IMPORT UNIFORME

const UserBlogDetailsContent = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  // ✅ NOUVEAU : États pour les données backend
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // ✅ CORRECTION : États d'interaction avec initialisation sécurisée
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [interactionsLoaded, setInteractionsLoaded] = useState(false);
  const { user: authUser } = useAuth(); // Ajouter cette ligne


  // ✅ UNIFORME : Utilisateur actuel avec avatar uniforme
  const currentUser = authUser ? {
  id: authUser.id.toString(),
  name: authUser.name,
  avatar: getUniformAvatarUrl(authUser.avatar), // ✅ VRAI AVATAR
  bio: authUser.bio || "",
  articles: 5,
  followers: 120,
  likes: 350,
  comments: 28
} : null;

  // ✅ NOUVELLE FONCTION : Charger les vraies statistiques d'interaction
  const loadInteractionStatistics = async (postId: number) => {
    try {
      console.log('🔍 [DEBUG] Chargement statistiques interactions pour post:', postId);
      
      // ✅ CORRECTION : Récupérer les vraies statistiques depuis le backend
      const stats = await interactionService.getPostStatistics('blog_post', postId);
      
      console.log('🔍 [DEBUG] Statistiques reçues:', {
        total_likes: stats.total_likes,
        total_comments: stats.total_comments,
        total_views: stats.total_views
      });
      
      // ✅ CORRECTION : Mettre à jour avec les vraies données backend
      setLikesCount(stats.total_likes || 0);
      setCommentsCount(stats.total_comments || 0);
      setViewsCount(stats.total_views || 0);
      
      console.log('✅ Statistiques d\'interaction mises à jour');
      
    } catch (error) {
      console.error('❌ Erreur chargement statistiques interaction:', error);
      
      // ✅ FALLBACK : Garder les données initiales du blog si les stats échouent
      console.log('📋 Utilisation des données blog par défaut');
    }
  };

  // ✅ NOUVELLE FONCTION : Charger l'état des réactions utilisateur
  const loadUserReactionState = async (postId: number) => {
    try {
      console.log('🔍 [DEBUG] Chargement état réaction utilisateur pour post:', postId);
      
      const userReactions = await interactionService.getUserReactions('blog_post', postId);
      
      console.log('🔍 [DEBUG] Réactions utilisateur reçues:', {
        has_liked: userReactions.has_liked,
        user_reactions: userReactions.user_reactions,
        total_reactions: userReactions.total_reactions
      });
      
      // ✅ CORRECTION : Mettre à jour l'état du like
      setLiked(userReactions.has_liked);
      
      console.log('✅ État réaction utilisateur mis à jour');
      
    } catch (error) {
      console.error('❌ Erreur chargement réactions utilisateur:', error);
      setLiked(false);
    }
  };

  // ✅ CORRECTION MAJEURE : Charger le post depuis le backend
useEffect(() => {
  const loadBlogPost = async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // ✅ CORRECTION : Essayer d'abord les posts de l'utilisateur, puis les posts publics
      let foundPost = null;
      
      try {
        // Étape 1 : Chercher dans les posts de l'utilisateur
        const userPosts = await blogService.getBlogPosts({ per_page: 100 });
        foundPost = userPosts.find(p => p.slug === slug);
        
        if (foundPost) {
          console.log(`✅ Post trouvé dans les posts utilisateur: ${foundPost.title}`);
        }
      } catch (userPostsError) {
        console.warn('Erreur récupération posts utilisateur:', userPostsError);
      }
      
      if (!foundPost) {
        try {
          // Étape 2 : Chercher dans les posts publics si pas trouvé
          const publicPosts = await blogService.getPublicBlogPosts({ per_page: 100 });
          foundPost = publicPosts.find(p => p.slug === slug);
          
          if (foundPost) {
            console.log(`✅ Post trouvé dans les posts publics: ${foundPost.title}`);
          }
        } catch (publicPostsError) {
          console.warn('Erreur récupération posts publics:', publicPostsError);
        }
      }
      
      if (!foundPost) {
        // Étape 3 : Essayer la méthode directe par slug
        try {
          foundPost = await blogService.getBlogPostBySlug(slug);
          console.log(`✅ Post trouvé via slug direct: ${foundPost.title}`);
        } catch (slugError) {
          console.warn('Erreur récupération par slug:', slugError);
        }
      }
      
      if (!foundPost) {
        console.error(`❌ Post non trouvé pour slug: ${slug}`);
        setNotFound(true);
        return;
      }

      const adaptedPost = adaptBlogPostForFrontend(foundPost);
      setPost(adaptedPost);
      
      console.log(`✅ Blog post "${foundPost.title}" chargé avec succès`);

      // ✅ ÉTAPE 1 : Initialiser avec les données du blog (comme fallback)
      const blogLikes = adaptedPost.likes || 0;
      const blogComments = typeof adaptedPost.comments === 'number' ? adaptedPost.comments : adaptedPost.comments?.length || 0;
      const blogViews = adaptedPost.views || 0;
      
      setLikesCount(blogLikes);
      setCommentsCount(blogComments);
      setViewsCount(blogViews);
      
      console.log('📋 Données initiales du blog:', {
        likes: blogLikes,
        comments: blogComments,
        views: blogViews,
        postId: foundPost.id,
        slug: foundPost.slug
      });

      // ✅ ÉTAPE 2 : Incrémenter automatiquement les vues
      try {
        const viewResult = await interactionService.viewBlogPost(Number(foundPost.id));
        if (viewResult && typeof viewResult.views === 'number') {
          setViewsCount(viewResult.views);
          console.log('👁️ Vues mises à jour:', viewResult.views);
        }
      } catch (viewError) {
        console.error('Erreur incrémentation vue:', viewError);
      }

      // ✅ ÉTAPE 3 : Charger les vraies statistiques d'interaction (async)
      await loadInteractionStatistics(Number(foundPost.id));

      // ✅ ÉTAPE 4 : Charger l'état des réactions utilisateur (async)
      await loadUserReactionState(Number(foundPost.id));

      // ✅ Marquer les interactions comme chargées
      setInteractionsLoaded(true);

    } catch (error) {
      console.error('Erreur chargement blog post:', error);
      toast.error("Erreur lors du chargement de l'article");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  loadBlogPost();
}, [slug]);

  // Intercepter les clics sur les liens dans le contenu du blog
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Si c'est un lien externe (commence par http:// ou https://)
      if (href.startsWith('http://') || href.startsWith('https://')) {
        // Laisser le comportement par défaut (ouvrir dans un nouvel onglet)
        return;
      }

      // Si c'est un lien interne (commence par /)
      if (href.startsWith('/')) {
        e.preventDefault();
        // Utiliser React Router pour la navigation
        navigate(href);
        return;
      }

      // Si c'est un lien ancre (commence par #)
      if (href.startsWith('#')) {
        // Laisser le comportement par défaut (scroll vers l'ancre)
        return;
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleLinkClick);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('click', handleLinkClick);
      }
    };
  }, [navigate]);

  // ✅ CORRECTION MAJEURE : Version entièrement corrigée du toggle like
  const handleToggleLike = async () => {
    if (!post || loadingInteractions) return;

    const wasLiked = liked;
    const currentCount = likesCount;

    try {
      setLoadingInteractions(true);
      
      console.log('🔍 [DEBUG] Toggle like - État avant:', {
        wasLiked,
        currentCount,
        postId: post.id
      });
      
      // ✅ MISE À JOUR OPTIMISTE (UI instantanée)
      setLiked(!wasLiked);
      setLikesCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
      
      // ✅ Appel API avec le service corrigé
      const result = await interactionService.toggleLike('blog_post', Number(post.id));
      
      console.log('🔍 [DEBUG] Réponse toggle like:', {
        action: result.action,
        type: result.type,
        new_count: result.new_count
      });
      
      // ✅ CORRECTION CRITIQUE : Synchronisation avec la réponse serveur RÉELLE
      const isNowLiked = result.action === 'added';
      const serverCount = result.new_count;
      
      setLiked(isNowLiked);
      
      // ✅ GESTION ROBUSTE : S'assurer que new_count est bien un nombre
      if (typeof serverCount === 'number' && serverCount >= 0) {
        setLikesCount(serverCount);
        console.log('✅ Compteur likes synchronisé:', serverCount);
      } else {
        // ✅ FALLBACK : Recalculer si le serveur ne retourne pas new_count
        console.warn('⚠️ new_count invalide, recalcul local');
        setLikesCount(prev => isNowLiked ? prev : Math.max(0, prev - 1));
        
        // ✅ Recharger les statistiques pour être sûr
        setTimeout(() => {
          loadInteractionStatistics(Number(post.id));
        }, 500);
      }
      
      toast.success(
        result.action === 'added' 
          ? 'Article ajouté aux favoris' 
          : 'Article retiré des favoris'
      );

    } catch (error) {
      console.error('❌ Erreur toggle like:', error);
      
      // ✅ ROLLBACK en cas d'erreur
      setLiked(wasLiked);
      setLikesCount(currentCount);
      
      toast.error("Erreur lors de l'action");
    } finally {
      setLoadingInteractions(false);
    }
  };

  // ✅ NOUVEAU : Partager l'article
  const handleShare = async () => {
    if (!post) return;

    try {
      const baseUrl = window.location.origin;
      const postUrl = `${baseUrl}/user-blogs/${post.slug}`;
      
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.summary,
          url: postUrl
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        toast.success("Lien copié dans le presse-papiers");
      }

    } catch (error) {
      console.error('Erreur partage:', error);
      toast.error("Erreur lors du partage");
    }
  };

  // ✅ CORRECTION: Naviguer vers l'édition
  const handleEdit = () => {
    if (!post) return;
    navigate(`/dashboard/blog/edit/${post.id}`);
  };

  // ✅ CORRECTION : Voir sur le site public avec gestion des brouillons
const handleViewPublic = () => {
  if (!post) return;
  
  // ✅ NOUVEAU : Vérifier le statut du post
  if (post.status === 'published') {
    // Post publié → Ouvrir la page publique
    window.open(`/blog/${post.slug}`, '_blank');
  } else {
    // Post brouillon/programmé → Afficher un message ou rediriger
    toast.error(
      `Ce post est en "${post.status === 'draft' ? 'brouillon' : 'programmé'}". ` +
      'Publiez-le d\'abord pour le voir en mode public.'
    );
    
    // Optionnel : Ouvrir quand même en mode aperçu
    // window.open(`/user-blogs/${post.slug}?preview=true`, '_blank');
  }
};

  // ✅ CORRECTION : Callback pour mise à jour du compteur de commentaires
  const handleCommentsUpdate = (newCount: number) => {
    setCommentsCount(newCount);
    console.log(`🔍 [DEBUG] Comments count updated: ${newCount}`);
  };


// ✅ Fonction pour gérer le clic sur l'auteur
const handleAuthorClick = (authorId: number | string) => {
  navigate(`/blog/author/${authorId}`);
};

  // ✅ NOUVEAU : Fonction utilitaire pour formater la date
  const formattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  };

  // ✅ NOUVEAU : Obtenir l'image d'en-tête
  const getHeaderImage = (post: BlogPost): string => {
    return post.header_image || post.headerImage || `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format&q=80&seed=${post.id}`;
  };

  // ✅ NOUVEAU : Obtenir la date de publication
  const getPublishDate = (post: BlogPost): string => {
    return post.published_at || post.publishDate || post.created_at || new Date().toISOString();
  };

  // ✅ UNIFORME : Obtenir l'auteur avec avatar uniforme
  const getAuthor = (post: BlogPost) => {
  if (post.user) {
    const displayName = (post.user.id === 1 || post.user.name === 'Admin') ? 'PixelRise' : post.user.name;
    return {
      id: post.user.id,
      name: displayName,
      avatar: getUniformAvatarUrl(post.user.avatar), // ✅ UTILISE FONCTION UNIFORME
      initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    };
  }
  if (post.author) {
    const displayName = (post.author.id === 1 || post.author.name === 'Admin') ? 'PixelRise' : post.author.name;
    return {
      id: post.author.id,
      name: displayName,
      avatar: getUniformAvatarUrl(post.author.avatar), // ✅ UTILISE FONCTION UNIFORME
      initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    };
  }

  // ✅ FALLBACK : Si pas d'auteur trouvé, retourner un auteur par défaut avec ID
  return {
    id: 'unknown',
    name: 'Anonyme',
    avatar: getUniformAvatarUrl(null), // ✅ UTILISE FONCTION UNIFORME
    initials: 'AN'
  };
};

  // ✅ NOUVEAU : Obtenir les catégories pour l'affichage
  const getDisplayCategories = (post: BlogPost): string[] => {
    if (post.categories && post.categories.length > 0) {
      return post.categories.map(cat => cat.name);
    }
    return post.tags || [];
  };

  // ✅ États de chargement et erreur...
  if (loading) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/mon-actualite")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de l'article...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/mon-actualite")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Article non trouvé</h1>
          <p className="text-muted-foreground mb-8">L'article que vous recherchez n'existe pas ou a été supprimé.</p>
          <Button onClick={() => navigate("/user-blogs")}>
            Voir tous les articles
          </Button>
        </div>
      </div>
    );
  }

  const author = getAuthor(post);

  // ✅ SEO : Nettoyer la description pour les meta tags (max 160 caractères)
  const cleanDescription = (text: string): string => {
    return text
      .replace(/<[^>]*>/g, '') // Retirer les balises HTML
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples
      .trim()
      .substring(0, 160); // Limiter à 160 caractères pour Google
  };

  const metaTitle = post.title || 'Article - PixelRise';
  const metaDescription = cleanDescription(post.summary || post.content || 'Découvrez cet article sur PixelRise');
  const metaImage = getHeaderImage(post);
  const canonicalUrl = `https://app.pixel-rise.com/user-blogs/${post.slug}`;

  return (
    <div className="p-6">
      {/* ✅ SEO DYNAMIQUE POUR GOOGLE */}
      <Helmet>
        {/* Meta titre dynamique */}
        <title>{metaTitle}</title>

        {/* Meta description dynamique */}
        <meta name="description" content={metaDescription} />

        {/* Open Graph pour Facebook/LinkedIn */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={metaImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="PixelRise" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={metaImage} />

        {/* Article metadata */}
        <meta property="article:published_time" content={getPublishDate(post)} />
        <meta property="article:author" content={author.name} />
        {post.tags && post.tags.map((tag, index) => (
          <meta key={index} property="article:tag" content={tag} />
        ))}

        {/* Canonical URL */}
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      {/* ✅ Header avec actions */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/mon-actualite")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEdit} 
          >
            <Edit className="h-4 w-4 mr-1" />
            Modifier
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewPublic}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Voir public
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* ✅ Header de l'article avec statut */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
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
            
            {(post.is_ai_generated ?? post.isAIGenerated) && (
              <Badge variant="outline" className="border-blue-500 text-blue-600">
                Généré par IA
              </Badge>
            )}
            
            {/* ✅ NOUVEAU : Indicateur de synchronisation */}
            {!interactionsLoaded && (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Sync interactions...
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
          
          {post.summary && (
            <p className="text-lg text-muted-foreground mb-4">{post.summary}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {getDisplayCategories(post).map((category, i) => (
              <Badge key={i} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
  {/* ✅ Avatar corrigé */}
  <div
    className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-brand-blue/50 transition-all duration-200 rounded-full overflow-hidden"
    onClick={() => handleAuthorClick(author.id)}
  >
    <img
      src={author.avatar}
      alt={author.name}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.name);
      }}
    />
  </div>
  <div>
    <div 
      className="font-medium cursor-pointer text-text-primary hover:text-brand-blue transition-colors duration-200"
      onClick={() => handleAuthorClick(author.id)}
    >
      {author.name}
    </div>
    <div className="text-sm text-muted-foreground">
      Publié {formattedDate(getPublishDate(post))}
    </div>
  </div>
</div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {viewsCount}
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-1" />
                Partager
              </Button>
            </div>
          </div>
          
          <div className="aspect-video w-full mb-8 rounded-lg overflow-hidden">
            <img 
              src={getHeaderImage(post)} 
              alt={post.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          </div>
        </div>
        
        <div className="prose prose-lg max-w-none mb-10" ref={contentRef}>
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
        
        {/* ✅ CORRECTION FINALE : Barre d'interactions avec debug visuel */}
        <div className="border-t border-b py-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <Button 
                variant="outline"
                size="lg"
                className={`rounded-full transition-all duration-300 ${
                  liked 
                    ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100" 
                    : "hover:bg-gray-50"
                }`}
                onClick={handleToggleLike}
                disabled={loadingInteractions}
              >
                {loadingInteractions ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Heart 
                    className={`h-5 w-5 mr-2 transition-all duration-300 ${
                      liked 
                        ? "fill-red-500 text-red-500 scale-110" 
                        : "text-gray-500"
                    }`} 
                  />
                )}
                {likesCount} J'aime
                
                {/* ✅ DEBUG VISUEL en mode développement */}
                {process.env.NODE_ENV === 'development' && (
                  <span className="ml-2 text-xs opacity-50">
                    [{liked ? 'ON' : 'OFF'}]
                  </span>
                )}
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="rounded-full"
                onClick={() => document.getElementById('comments')?.scrollIntoView({behavior: 'smooth'})}
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                {commentsCount} Commentaires
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={() => setBookmarked(!bookmarked)}
              >
                <Bookmark className={`h-5 w-5 ${bookmarked ? "fill-current" : ""}`} />
              </Button>
              
              <Button 
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* ✅ CORRECTION: Section commentaires avec props corrigées */}
        <div id="comments">
          <CommentSection 
            comments={Array.isArray(post.comments) ? post.comments : []} 
            postId={post.id.toString()} 
            currentUser={currentUser}
            postType="blog_post" 
            onCommentsUpdate={handleCommentsUpdate}  
          />
        </div>
      </div>
    </div>
  );
};

const UserBlogDetails = () => {
  return (
    <SidebarProvider>
      <DashboardLayout>
        <UserBlogDetailsContent />
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default UserBlogDetails;