

// ===== BlogPostCard.tsx - DESIGN PREMIUM PIXELRISE =====

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  MessageCircle, 
  Eye, 
  Share, 
  Bookmark,
  Clock, 
  Calendar, 
  Sparkles,
  TrendingUp,
  BookOpen,
  User,
  LogIn
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ✅ LOGIQUE PRÉSERVÉE - Imports des services backend + Auth
import { interactionService } from "@/services/interactionService";
import { BlogPost } from "@/services/blogService";
import { useAuth } from "@/hooks/useAuth";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener";
import SafeImage from "@/components/ui/SafeImage";

interface BlogPostCardProps {
  post: BlogPost;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  onLikeUpdate?: (postId: string | number, newCount: number) => void;
  onViewIncrement?: (postId: string | number) => void;
}

export function BlogPostCard({ 
  post, 
  showActions = true,
  variant = 'default',
  onLikeUpdate,
  onViewIncrement 
}: BlogPostCardProps) {
  // ✅ LOGIQUE PRÉSERVÉE - Hook d'authentification
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ✅ LOGIQUE PRÉSERVÉE - États pour les interactions
  const getCommentsCount = (post: BlogPost): number => {
    if (typeof post.comments === 'number') return post.comments;
    if (Array.isArray(post.comments)) return post.comments.length;
    return 0;
  };

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [commentsCount, setCommentsCount] = useState(getCommentsCount(post));
  const [sharesCount, setSharesCount] = useState(post.shares || 0);
  const [viewsCount, setViewsCount] = useState(post.views || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingInteractions, setLoadingInteractions] = useState(true);

  // ✅ LOGIQUE PRÉSERVÉE - Charger les vraies statistiques
  useEffect(() => {
    const loadInteractions = async () => {
      try {
        const stats = await interactionService.getPublicPostStatistics('blog_post', post.id);
        setLikesCount(stats.total_likes || post.likes || 0);
        setCommentsCount(stats.total_comments || getCommentsCount(post));
        setSharesCount(stats.total_shares || post.shares || 0);
        setViewsCount(stats.total_views || post.views || 0);
        
        if (isAuthenticated) {
          try {
            const reactions = await interactionService.getUserReactions('blog_post', post.id);
            setLiked(reactions.has_liked);
          } catch (reactionError) {
            console.warn('Erreur chargement réactions utilisateur:', reactionError);
          }
        }
      } catch (error) {
        console.warn('Erreur chargement interactions:', error);
        setLikesCount(post.likes || 0);
        setCommentsCount(getCommentsCount(post));
        setSharesCount(post.shares || 0);
        setViewsCount(post.views || 0);
      } finally {
        setLoadingInteractions(false);
      }
    };

    loadInteractions();
  }, [post.id, isAuthenticated]);

  // ✅ LOGIQUE PRÉSERVÉE - Fonctions utilitaires
  const getAuthor = (post: BlogPost) => {
    if (post.user) {
      const displayName = (post.user.id === 1 || post.user.name === 'Admin') ? 'PixelRise' : post.user.name;
      return {
        id: post.user.id,
        name: displayName,
        avatar: getUniformAvatarUrl(post.user.avatar),
        initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
    }
    if (post.author) {
      const displayName = (post.author.id === 1 || post.author.name === 'Admin') ? 'PixelRise' : post.author.name;
      return {
        id: post.author.id,
        name: displayName,
        avatar: getUniformAvatarUrl(post.author.avatar),
        initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
    }
    return {
      id: 'anonymous',
      name: 'Anonyme',
      avatar: getUniformAvatarUrl(null),
      initials: 'AN'
    };
  };

  const handleAuthorClick = (authorId: number | string) => {
    navigate(`/blog/author/${authorId}`);
  };

  const getHeaderImage = (post: BlogPost): string => {
    // ✅ CORRECTION: Ne pas utiliser /placeholder.svg si on a déjà un fallback
    const imageUrl = post.header_image || post.headerImage || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop&auto=format&q=80';
    console.log("🖼️ [BlogPostCard] getHeaderImage pour post", post.id, "->", imageUrl);
    return imageUrl;
  };

  const getPublishDate = (post: BlogPost): string => {
    return post.published_at || post.publishDate || post.created_at || new Date().toISOString();
  };

  const getDisplayCategories = (post: BlogPost): Array<{name: string, slug?: string}> => {
    if (post.categories && post.categories.length > 0) {
      return post.categories.map(cat => ({ name: cat.name, slug: cat.slug }));
    }
    return post.tags.map(tag => ({ name: tag, slug: tag.toLowerCase().replace(/\s+/g, '-') }));
  };

  const formattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  };

  const fullFormattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd MMMM yyyy", { locale: fr });
  };

  // ✅ LOGIQUE PRÉSERVÉE - Gestionnaires d'événements
  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Vous devez être connecté pour aimer un article", {
        action: {
          label: "Se connecter",
          onClick: () => navigate("/login")
        }
      });
      return;
    }

    if (loadingLike) return;

    try {
      setLoadingLike(true);
      const result = await interactionService.toggleLike('blog_post', Number(post.id));
      const isLiked = result.action === 'added';
      setLiked(isLiked);
      setLikesCount(result.new_count);

      if (onLikeUpdate) {
        onLikeUpdate(post.id, result.new_count);
      }

      toast.success(isLiked ? 'Article ajouté aux favoris' : 'Article retiré des favoris');
    } catch (error) {
      console.error('Erreur toggle like:', error);
      toast.error("Erreur lors de l'action");
    } finally {
      setLoadingLike(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const baseUrl = window.location.origin;
      const postUrl = `${baseUrl}/blog/${post.slug}`;
      
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

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error("Vous devez être connecté pour sauvegarder un article", {
        action: {
          label: "Se connecter",
          onClick: () => navigate("/login")
        }
      });
      return;
    }

    setBookmarked(!bookmarked);
    toast.success(bookmarked ? 'Article retiré des favoris' : 'Article ajouté aux favoris');
  };

  const handleCardClick = () => {
    if (onViewIncrement) {
      onViewIncrement(post.id);
    }
  };

  const author = getAuthor(post);
  const categories = getDisplayCategories(post);

  // ✅ VARIANT COMPACT - DESIGN PREMIUM
  if (variant === 'compact') {
    return (
      <Card className="group overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/90 backdrop-blur-sm border-slate-200/60 hover:border-brand-blue/30 hover:shadow-lg transition-all duration-400">
        <Link to={`/blog/${post.slug}`} onClick={handleCardClick}>
          <div className="flex gap-4 p-4">
            <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200">
              <SafeImage
                src={getHeaderImage(post)}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                fallbackSrc="/placeholder.svg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm line-clamp-2 mb-2 text-brand-black group-hover:text-brand-blue transition-colors duration-300">
                {post.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <User className="h-3 w-3" />
                <span className="font-medium">{author.name}</span>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>{formattedDate(getPublishDate(post))}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span className="font-medium">{viewsCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span className="font-medium">{likesCount}</span>
                </div>
                {/* ✅ BOUTON COMMENTAIRE - Redirige vers /login ou /mon-actualite */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isAuthenticated) {
                      toast.error("Vous devez être connecté pour commenter", {
                        action: {
                          label: "Se connecter",
                          onClick: () => navigate("/login")
                        }
                      });
                    } else {
                      navigate("/mon-actualite");
                    }
                  }}
                  className="flex items-center gap-1 hover:text-brand-blue transition-colors cursor-pointer"
                  title={isAuthenticated ? "Aller à l'actualité pour commenter" : "Connectez-vous pour commenter"}
                >
                  <MessageCircle className="h-3 w-3" />
                  <span className="font-medium">{commentsCount}</span>
                </button>
              </div>
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  // ✅ VARIANT FEATURED - DESIGN PREMIUM
  if (variant === 'featured') {
    return (
      <Card className="group overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/90 backdrop-blur-sm border-2 border-brand-blue/20 hover:border-brand-blue/40 hover:shadow-2xl transition-all duration-500">
        <Link to={`/blog/${post.slug}`} onClick={handleCardClick} className="block">
          <div className="aspect-[16/9] overflow-hidden relative bg-gradient-to-br from-slate-100 to-slate-200">
            <SafeImage
              src={getHeaderImage(post)}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              fallbackSrc="/placeholder.svg"
            />
            
            {/* ✅ OVERLAY GRADIENT PREMIUM */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* ✅ BADGES PREMIUM */}
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-gradient-to-r from-brand-yellow to-orange-500 text-white border-0 shadow-lg backdrop-blur-sm font-semibold">
                <TrendingUp className="h-3 w-3 mr-1" />
                Article vedette
              </Badge>
              {(post.is_ai_generated ?? post.isAIGenerated) && (
                <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 shadow-lg backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              )}
            </div>

            {/* ✅ READING TIME */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-slate-700 border-0 shadow-md">
                <BookOpen className="h-3 w-3 mr-1" />
                5 min
              </Badge>
            </div>
          </div>
        </Link>
        
        <CardHeader className="p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.slice(0, 2).map((category, i) => (
              <Link 
                key={i} 
                to={`/blog/category/${category.slug}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge className="bg-gradient-to-r from-brand-blue/10 to-indigo-500/10 text-brand-blue border-brand-blue/30 hover:bg-gradient-to-r hover:from-brand-blue/20 hover:to-indigo-500/20 transition-all duration-300 cursor-pointer font-medium">
                  {category.name}
                </Badge>
              </Link>
            ))}
          </div>
          
          <Link to={`/blog/${post.slug}`} onClick={handleCardClick} className="group/title">
            <h3 className="text-2xl font-bold line-clamp-2 mb-3 text-brand-black group-hover/title:text-brand-blue transition-colors duration-300 leading-tight">
              {post.title}
            </h3>
          </Link>
          
          <p className="text-slate-600 line-clamp-3 text-base leading-relaxed">
            {post.summary}
          </p>
        </CardHeader>
        
        <CardFooter className="p-6 pt-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 cursor-pointer ring-2 ring-transparent hover:ring-brand-blue/40 transition-all duration-300 rounded-full overflow-hidden"
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
                className="font-bold cursor-pointer text-brand-black hover:text-brand-blue transition-colors duration-300"
                onClick={() => handleAuthorClick(author.id)}
              >
                {author.name}
              </div>
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fullFormattedDate(getPublishDate(post))}
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleLike}
                  disabled={loadingLike}
                  className={`h-10 w-10 rounded-full transition-all duration-300 ${
                    liked 
                      ? "text-red-500 bg-red-50 hover:bg-red-100 shadow-md" 
                      : "text-slate-600 hover:text-red-500 hover:bg-red-50"
                  }`}
                >
                  <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleLike}
                  className="h-10 w-10 rounded-full text-slate-600 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
                  title="Connectez-vous pour aimer cet article"
                >
                  <Heart className="h-5 w-5" />
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleShare}
                className="h-10 w-10 rounded-full text-slate-600 hover:text-green-600 hover:bg-green-50 transition-all duration-300"
              >
                <Share className="h-5 w-5" />
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    );
  }

  // ✅ VARIANT DEFAULT - DESIGN PREMIUM
  return (
    <Card className="group overflow-hidden flex flex-col h-full bg-gradient-to-br from-white/95 to-slate-50/90 backdrop-blur-sm border-slate-200/60 hover:border-brand-blue/30 hover:shadow-xl transition-all duration-500">
      <Link to={`/blog/${post.slug}`} onClick={handleCardClick} className="overflow-hidden aspect-video relative bg-gradient-to-br from-slate-100 to-slate-200">
        <SafeImage
          src={getHeaderImage(post)}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          fallbackSrc="/placeholder.svg"
        />
        
        {/* ✅ OVERLAY GRADIENT */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* ✅ STATUS BADGES */}
        {post.status !== 'published' && (
          <div className="absolute top-3 right-3">
            <Badge 
              className={`${
                post.status === 'scheduled' 
                  ? 'bg-gradient-to-r from-brand-yellow to-orange-500 text-white' 
                  : 'bg-white/90 text-slate-700 border-slate-300'
              } border-0 shadow-lg backdrop-blur-sm font-medium`}
            >
              {post.status === 'scheduled' ? (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Programmé
                </>
              ) : (
                'Brouillon'
              )}
            </Badge>
          </div>
        )}

        {/* ✅ AI BADGE */}
        {(post.is_ai_generated ?? post.isAIGenerated) && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 shadow-lg backdrop-blur-sm">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
        )}
      </Link>

      <CardHeader className="p-5 pb-3 flex-grow space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {categories.slice(0, 2).map((category, i) => (
            <Link 
              key={i} 
              to={`/blog/category/${category.slug}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Badge className="bg-gradient-to-r from-brand-blue/10 to-indigo-500/10 border-brand-blue/20 hover:bg-gradient-to-r hover:from-brand-blue/20 hover:to-indigo-500/20 transition-all duration-300 cursor-pointer font-medium text-xs">
                {category.name}
              </Badge>
            </Link>
          ))}
          {categories.length > 2 && (
            <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
              +{categories.length - 2}
            </Badge>
          )}
        </div>
        
        <Link to={`/blog/${post.slug}`} onClick={handleCardClick} className="group/title">
          <h3 className="text-xl font-bold line-clamp-2 mb-2 text-brand-black group-hover/title:text-brand-blue transition-colors duration-300 leading-tight">
            {post.title}
          </h3>
        </Link>
        
        {post.summary && (
          <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
            {post.summary}
          </p>
        )}
      </CardHeader>

      <CardFooter className="p-5 pt-3 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="h-9 w-9 flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-brand-blue/40 transition-all duration-300 rounded-full overflow-hidden"
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
            <div className="min-w-0 flex-1">
              <div 
                className="text-sm font-semibold truncate cursor-pointer text-brand-black hover:text-brand-blue transition-colors duration-300"
                onClick={() => handleAuthorClick(author.id)}
              >
                {author.name}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formattedDate(getPublishDate(post))}
              </div>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              {/* ✅ LIKE BUTTON PREMIUM */}
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleLike}
                  disabled={loadingLike}
                  className={`h-8 px-3 rounded-full transition-all duration-300 ${
                    liked 
                      ? "text-red-500 bg-red-50 hover:bg-red-100" 
                      : "text-slate-600 hover:text-red-500 hover:bg-red-50"
                  }`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${liked ? "fill-current" : ""}`} />
                  <span className="text-xs font-medium">{loadingInteractions ? "..." : likesCount}</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleLike}
                  className="h-8 px-3 rounded-full text-slate-600 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
                  title="Connectez-vous pour aimer cet article"
                >
                  <Heart className="h-4 w-4 mr-1" />
                  <span className="text-xs font-medium">{loadingInteractions ? "..." : likesCount}</span>
                </Button>
              )}

              {/* ✅ STATS DISPLAY */}
              <div className="flex items-center gap-3 text-slate-500">
                {/* ✅ BOUTON COMMENTAIRE - Redirige vers /login ou /mon-actualite */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isAuthenticated) {
                      toast.error("Vous devez être connecté pour commenter", {
                        action: {
                          label: "Se connecter",
                          onClick: () => navigate("/login")
                        }
                      });
                    } else {
                      navigate("/mon-actualite");
                    }
                  }}
                  className="flex items-center text-xs hover:text-brand-blue transition-colors cursor-pointer"
                  title={isAuthenticated ? "Aller à l'actualité pour commenter" : "Connectez-vous pour commenter"}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span className="font-medium">{loadingInteractions ? "..." : commentsCount}</span>
                </button>

                <div className="flex items-center text-xs">
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="font-medium">{loadingInteractions ? "..." : viewsCount}</span>
                </div>
              </div>
            </div>

            {/* ✅ ACTION BUTTONS */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleShare} 
                className="h-8 w-8 p-0 rounded-full text-slate-600 hover:text-green-600 hover:bg-green-50 transition-all duration-300"
                title="Partager cet article"
              >
                <Share className="h-4 w-4" />
              </Button>

              {isAuthenticated && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleToggleBookmark} 
                  className={`h-8 w-8 p-0 rounded-full transition-all duration-300 ${
                    bookmarked 
                      ? "text-brand-yellow bg-yellow-50 hover:bg-yellow-100" 
                      : "text-slate-600 hover:text-brand-yellow hover:bg-yellow-50"
                  }`}
                  title="Sauvegarder cet article"
                >
                  <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}