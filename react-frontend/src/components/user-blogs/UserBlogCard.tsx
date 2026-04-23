
// ===== UserBlogCard.tsx - DESIGN PREMIUM PIXELRISE =====

// src/components/user-blogs/UserBlogCard.tsx - DESIGN PREMIUM PIXELRISE
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  MessageCircle, 
  Eye, 
  Share, 
  Sparkles, 
  Clock,
  TrendingUp,
  BookOpen,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { BlogPost } from "@/services/blogService";
import { interactionService } from "@/services/interactionService";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener";

interface UserBlogCardProps {
  post: BlogPost;
  onPostUpdated?: (updatedPost: BlogPost) => void;
  showInteractionButtons?: boolean;
}

export function UserBlogCard({ 
  post, 
  onPostUpdated, 
  showInteractionButtons = true 
}: UserBlogCardProps) {
  // États existants (logique préservée)
  const [currentLikes, setCurrentLikes] = useState(post.likes || 0);
  const [currentViews, setCurrentViews] = useState(post.views || 0);
  const [currentComments, setCurrentComments] = useState(getCommentsCount(post));
  const [currentShares, setCurrentShares] = useState(post.shares || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);
  const [loadingReactions, setLoadingReactions] = useState(false);

  // ✅ TOUTE LA LOGIQUE EXISTANTE PRÉSERVÉE
  function getCommentsCount(post: BlogPost): number {
    if (typeof post.comments === 'number') return post.comments;
    if (Array.isArray(post.comments)) return post.comments.length;
    return 0;
  }

  const formattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  };

  const getHeaderImage = (): string => {
    return post.header_image || `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format&q=80&seed=${post.id}`;
  };

  const getPublishDate = (): string => {
    return post.published_at || post.created_at || new Date().toISOString();
  };

  const getIsAIGenerated = (): boolean => {
    return post.is_ai_generated ?? false;
  };

  const getAuthor = (): { id: string | number; name: string; avatar: string; initials: string } => {
    const author = post.user || { id: 'anonymous', name: 'Anonyme', avatar: null };
    const displayName = (author.id === 1 || author.name === 'Admin') ? 'PixelRise' : author.name;
    return {
      id: author.id,
      name: displayName,
      avatar: getUniformAvatarUrl(author.avatar),
      initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    };
  };

  const getDisplayCategories = (): Array<{ name: string; slug?: string }> => {
    if (post.categories && post.categories.length > 0) {
      return post.categories.map(cat => ({
        name: cat.name,
        slug: cat.slug
      }));
    }
    return (post.tags || []).map(tag => ({
      name: tag,
      slug: tag.toLowerCase().replace(/\s+/g, '-')
    }));
  };

  // TOUTE LA LOGIQUE D'INTERACTION PRÉSERVÉE
  const loadUserReactions = useCallback(async () => {
    if (!showInteractionButtons) return;
    try {
      setLoadingReactions(true);
      const reactions = await interactionService.getUserReactions('blog_post', Number(post.id));
      setIsLiked(reactions.has_liked);
    } catch (error) {
      console.error('❌ [UserBlogCard] Erreur chargement réactions:', error);
      setIsLiked(false);
    } finally {
      setLoadingReactions(false);
    }
  }, [post.id, showInteractionButtons]);

  const loadPostStatistics = useCallback(async () => {
    try {
      const stats = await interactionService.getPostStatistics('blog_post', Number(post.id));
      setCurrentLikes(stats.total_likes);
      setCurrentViews(stats.total_views);
      setCurrentComments(stats.total_comments);
      setCurrentShares(stats.total_shares || 0);
    } catch (error) {
      console.warn('⚠️ [UserBlogCard] Erreur chargement stats:', error);
    }
  }, [post.id]);

  useEffect(() => {
    loadUserReactions();
    loadPostStatistics();
  }, [loadUserReactions, loadPostStatistics]);

  useEffect(() => {
    setCurrentLikes(post.likes || 0);
    setCurrentViews(post.views || 0);
    setCurrentComments(getCommentsCount(post));
    setCurrentShares(post.shares || 0);
  }, [post.likes, post.views, post.comments, post.shares]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingLike) return;
    const wasLiked = isLiked;
    const currentCount = currentLikes;
    try {
      setLoadingLike(true);
      setIsLiked(!wasLiked);
      setCurrentLikes(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
      const result = await interactionService.toggleLike('blog_post', Number(post.id));
      setIsLiked(result.action === 'added');
      setCurrentLikes(result.new_count);
      if (onPostUpdated) {
        const updatedPost: BlogPost = { ...post, likes: result.new_count };
        onPostUpdated(updatedPost);
      }
      toast.success(result.action === 'added' ? 'Post aimé !' : 'Like retiré');
    } catch (error) {
      console.error('❌ [UserBlogCard] Erreur like:', error);
      setIsLiked(wasLiked);
      setCurrentLikes(currentCount);
      toast.error("Erreur lors de l'interaction");
    } finally {
      setLoadingLike(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingShare) return;
    try {
      setLoadingShare(true);
      const baseUrl = window.location.origin;
      const postUrl = `${baseUrl}/user-blogs/${post.slug}`;
      const newSharesCount = currentShares + 1;
      setCurrentShares(newSharesCount);
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.summary,
          url: postUrl,
        });
        toast.success("Contenu partagé !");
      } else {
        await navigator.clipboard.writeText(postUrl);
        toast.success("Lien copié dans le presse-papiers !");
      }
      try {
        const result = await interactionService.recordShare('blog_post', Number(post.id));
        setCurrentShares(result.shares);
        if (onPostUpdated) {
          const updatedPost: BlogPost = { ...post, shares: result.shares };
          onPostUpdated(updatedPost);
        }
      } catch (shareError) {
        console.warn('⚠️ [UserBlogCard] Erreur enregistrement partage:', shareError);
      }
    } catch (error) {
      console.error('❌ [UserBlogCard] Erreur partage:', error);
      setCurrentShares(prev => Math.max(0, prev - 1));
      if (error.name !== 'AbortError') {
        toast.error("Erreur lors du partage");
      }
    } finally {
      setLoadingShare(false);
    }
  };

  const handleCardClick = async () => {
    try {
      const result = await interactionService.viewBlogPost(Number(post.id));
      setCurrentViews(result.views);
      if (onPostUpdated) {
        const updatedPost: BlogPost = { ...post, views: result.views };
        onPostUpdated(updatedPost);
      }
    } catch (error) {
      console.error('❌ [UserBlogCard] Erreur incrémentation vue:', error);
    }
  };

  const handleCommentsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const stats = await interactionService.getPostStatistics('blog_post', Number(post.id));
      setCurrentComments(stats.total_comments);
      if (onPostUpdated) {
        const updatedPost: BlogPost = { ...post, comments: stats.total_comments };
        onPostUpdated(updatedPost);
      }
    } catch (error) {
      console.warn('⚠️ [UserBlogCard] Erreur update commentaires:', error);
    }
  };

  const author = getAuthor();

  return (
    <Card className="group overflow-hidden flex flex-col h-full bg-gradient-to-br from-white/95 to-slate-50/90 backdrop-blur-sm border-slate-200/60 hover:border-brand-blue/30 hover:shadow-xl transition-all duration-500 ease-out">
      {/* ✅ IMAGE HEADER - Design Premium */}
      <Link 
        to={`/user-blogs/${post.slug}`} 
        className="relative overflow-hidden aspect-video bg-gradient-to-br from-slate-100 to-slate-200"
        onClick={handleCardClick}
      >
        <img
          src={getHeaderImage()}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        
        {/* ✅ OVERLAY GRADIENT */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* ✅ BADGES PREMIUM */}
        <div className="absolute top-3 left-3 flex gap-2">
          {getIsAIGenerated() && (
            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 shadow-lg backdrop-blur-sm">
              <Sparkles className="h-3 w-3 mr-1" />
              IA Généré
            </Badge>
          )}
        </div>

        {/* ✅ READING TIME BADGE */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-slate-700 border-0 shadow-md">
            <BookOpen className="h-3 w-3 mr-1" />
            5 min
          </Badge>
        </div>
      </Link>
      
      {/* ✅ HEADER - Titre et Catégories */}
      <CardHeader className="p-5 pb-3 space-y-3">
        {/* ✅ CATÉGORIES PREMIUM */}
        <div className="flex items-center gap-2 flex-wrap">
          {getDisplayCategories().slice(0, 2).map((category, i) => (
            <Link 
              to={`/user-blogs/category/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`} 
              key={i}
              className="group/badge"
            >
              <Badge 
                variant="secondary" 
                className="bg-gradient-to-r from-brand-blue/10 to-indigo-500/10 text-brand-blue border-brand-blue/20 hover:bg-gradient-to-r hover:from-brand-blue/20 hover:to-indigo-500/20 transition-all duration-300 cursor-pointer font-medium"
              >
                {category.name}
              </Badge>
            </Link>
          ))}
          {getDisplayCategories().length > 2 && (
            <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600">
              +{getDisplayCategories().length - 2}
            </Badge>
          )}
        </div>
        
        {/* ✅ TITRE PREMIUM */}
        <Link 
          to={`/user-blogs/${post.slug}`} 
          className="group/title"
          onClick={handleCardClick}
        >
          <h3 className="text-xl font-bold line-clamp-2 text-brand-black group-hover/title:text-brand-blue transition-colors duration-300 leading-tight">
            {post.title}
          </h3>
        </Link>
      </CardHeader>
      
      {/* ✅ CONTENT - Résumé */}
      <CardContent className="px-5 pb-0 flex-grow">
        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
          {post.summary}
        </p>
      </CardContent>
      
      {/* ✅ FOOTER - Auteur et Actions */}
      <CardFooter className="p-5 pt-4 flex flex-col gap-4">
        {/* ✅ AUTEUR PREMIUM */}
        <div className="flex items-center justify-between w-full">
          <Link
            to={`/user-blogs/author/${author.id}`}
            className="flex items-center gap-2 group/author hover:bg-slate-50/80 rounded-lg p-2 -m-2 transition-all duration-300 flex-1 min-w-0"
          >
            <div className="h-10 w-10 flex-shrink-0 ring-2 ring-transparent group-hover/author:ring-brand-blue/30 transition-all duration-300 rounded-full overflow-hidden">
              <img
                src={author.avatar}
                alt={author.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.name);
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-brand-black group-hover/author:text-brand-blue transition-colors duration-300 truncate">
                {author.name}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{formattedDate(getPublishDate())}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* ✅ ACTIONS PREMIUM */}
        {showInteractionButtons && (
          <div className="flex flex-col gap-3 w-full pt-3 border-t border-slate-100">
            {/* ✅ BOUTONS D'INTERACTION */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1 flex-wrap">
                {/* ✅ LIKE BUTTON PREMIUM */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2.5 rounded-full transition-all duration-300 ${
                    isLiked
                      ? 'text-red-500 bg-red-50 hover:bg-red-100 shadow-sm'
                      : 'text-slate-600 hover:text-red-500 hover:bg-red-50'
                  }`}
                  onClick={handleLike}
                  disabled={loadingLike || loadingReactions}
                >
                  <Heart className={`h-4 w-4 mr-1.5 transition-all duration-300 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium">{currentLikes}</span>
                </Button>

                {/* ✅ COMMENTS BUTTON PREMIUM */}
                <Link
                  to={`/user-blogs/${post.slug}#comments`}
                  onClick={handleCommentsClick}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 rounded-full text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
                  >
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    <span className="text-xs font-medium">{currentComments}</span>
                  </Button>
                </Link>

                {/* ✅ SHARE BUTTON PREMIUM */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 rounded-full text-slate-600 hover:text-green-600 hover:bg-green-50 transition-all duration-300"
                  onClick={handleShare}
                  disabled={loadingShare}
                >
                  <Share className="h-4 w-4 mr-1.5" />
                  <span className="text-xs font-medium">{currentShares}</span>
                </Button>
              </div>

              {/* ✅ VIEWS COUNTER PREMIUM */}
              <div className="flex items-center gap-1.5 text-slate-500 flex-shrink-0">
                <Eye className="h-4 w-4" />
                <span className="text-xs font-medium">{currentViews}</span>
              </div>
            </div>
          </div>
        )}

        {/* ✅ LOADING INDICATOR PREMIUM */}
        {loadingReactions && (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-4 h-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
              <span className="text-xs">Chargement...</span>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// ===== BlogPostCard.tsx - DESIGN PREMIUM PIXELRISE =====

// [Le contenu du BlogPostCard suivra le même pattern de design premium]
// Logique préservée intégralement, seul le design est amélioré avec :
// - Couleurs Pixelrise Premium
// - Icônes cohérentes (pas d'emojis)
// - Animations subtiles
// - Gradients et effets modernes
// - Hover states sophistiqués
// - Typography premium
// - Spacing harmonieux