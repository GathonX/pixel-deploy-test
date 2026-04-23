

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  MessageCircle,
  Share,
  MoreVertical,
  UserPlus,
  UserMinus,
  Eye,
  Clock,
  Sparkles,
  Crown,
  ArrowRight,
  LogIn,
  Shield,
  Edit,
  EyeOff,
  Trash2,
  Code,
  AlertTriangle,
  Ban,
  Flag,
  Archive
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { BlogPost, Comment } from "@/services/blogService";
import { toast } from "sonner";
import { interactionService } from "@/services/interactionService";
import { moderationService } from "@/services/moderationService";
import { CommentSection } from "@/components/blog/CommentSection";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener";

interface NewsFeedPostProps {
  post: BlogPost;
  isFollowing: boolean;
  onFollowToggle: (authorId: string) => void;
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    following: string[];
    likes: string[];
  } | null;
  isFromDefaultBlog?: boolean;
  isAuthenticated: boolean;
  onAuthorClick?: (authorId: number | string) => void;
  initialUserReaction?: { has_liked: boolean };
}

export function NewsFeedPost({
  post,
  isFollowing,
  onFollowToggle,
  currentUser,
  isFromDefaultBlog,
  isAuthenticated,
  onAuthorClick,
  initialUserReaction
}: NewsFeedPostProps) {
  const navigate = useNavigate();

  // ✅ LOGIQUE PRÉSERVÉE - Fonction pour gérer le clic sur l'auteur
  const handleAuthorClick = (authorId: number | string) => {
    if (onAuthorClick) {
      onAuthorClick(authorId);
    } else {
      navigate(`/blog/author/${authorId}`);
    }
  };

  // ✅ LOGIQUE PRÉSERVÉE - Helper pour le nombre de commentaires
  const getCommentsCount = (): number => {
    return Array.isArray(post.comments) ? post.comments.length : (typeof post.comments === 'number' ? post.comments : 0);
  };

  // ✅ LOGIQUE PRÉSERVÉE - Helper pour enregistrer un partage
  const recordShare = async (): Promise<void> => {
    try {
      const result = await interactionService.recordShare('blog_post', post.id);
      setSharesCount(result.shares);
      console.log('Partage enregistré:', result.shares);
    } catch (error) {
      console.warn('Erreur enregistrement partage:', error);
    }
  };

  // ✅ LOGIQUE PRÉSERVÉE - États
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [commentsCount, setCommentsCount] = useState(getCommentsCount());
  const [viewsCount, setViewsCount] = useState(post.views);
  const [sharesCount, setSharesCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(
    Array.isArray(post.comments) ? post.comments : []
  );
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingInteractions, setLoadingInteractions] = useState(true);

  // ✅ LOGIQUE PRÉSERVÉE - Charger les interactions utilisateur
  useEffect(() => {
    const loadUserInteractions = async () => {
      if (!isAuthenticated || !currentUser) {
        setLoadingInteractions(false);
        return;
      }

      try {
        // ✅ UTILISER initialUserReaction si disponible (batch loaded par parent)
        if (initialUserReaction) {
          setIsLiked(initialUserReaction.has_liked);
        }

        const stats = await interactionService.getPostStatistics('blog_post', post.id);
        setLikesCount(stats.total_likes || post.likes);
        setCommentsCount(stats.total_comments || getCommentsCount());
        setViewsCount(stats.total_views || post.views);
        setSharesCount(stats.total_shares || 0);

      } catch (error) {
        console.warn('Erreur chargement interactions:', error);
      } finally {
        setLoadingInteractions(false);
      }
    };

    loadUserInteractions();
  }, [post.id, currentUser, isAuthenticated, initialUserReaction]);
  
  // ✅ LOGIQUE PRÉSERVÉE - Fonctions utilitaires
  const formattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  };

  const getHeaderImage = (): string => {
    return post.header_image || `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format&q=80&seed=${post.id}`;
  };

  const getPublishDate = (): string => {
    return post.published_at || post.created_at;
  };

  const getAuthor = () => {
    if (post.user) {
      const displayName = post.user.name === 'Admin' ? 'PixelRise' : post.user.name;
      return {
        id: post.user.id.toString(),
        name: displayName,
        avatar: getUniformAvatarUrl(post.user.avatar),
        initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
    }
    return {
      id: '',
      name: 'Anonyme',
      avatar: getUniformAvatarUrl(null),
      initials: 'AN'
    };
  };

  // ✅ LOGIQUE PRÉSERVÉE - Gérer les likes
  const handleLike = async () => {
    if (!isAuthenticated || !currentUser || loadingLike) {
      toast.error("Connectez-vous pour aimer les articles");
      return;
    }

    const wasLiked = isLiked;
    const currentCount = likesCount;

    try {
      setLoadingLike(true);
      
      setIsLiked(!wasLiked);
      setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

      const result = await interactionService.toggleReaction({
        reactable_type: 'blog_post',
        reactable_id: post.id,
        type: 'like'
      });

      setIsLiked(result.action === 'added');
      setLikesCount(result.new_count);

      toast.success(result.action === 'added'
        ? "Article ajouté à vos favoris"
        : "Article retiré de vos favoris");

    } catch (error) {
      console.error('Erreur toggle like:', error);
      
      setIsLiked(wasLiked);
      setLikesCount(currentCount);
      
      toast.error("Erreur lors de l'action");
    } finally {
      setLoadingLike(false);
    }
  };
  
  // ✅ LOGIQUE PRÉSERVÉE - Gérer le partage
  const handleShare = async () => {
    try {
      const baseUrl = window.location.origin;
      const postUrl = `${baseUrl}/user-blogs/${post.slug}`;
      
      const newCount = sharesCount + 1;
      setSharesCount(newCount);
      
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.summary,
          url: postUrl
        });
        
        toast.success("Article partagé avec succès");
      } else {
        await navigator.clipboard.writeText(postUrl);
        toast.success("Lien copié dans le presse-papier");
      }

      await recordShare();
      
    } catch (error) {
      console.error('Erreur partage:', error);
      setSharesCount(prev => Math.max(0, prev - 1));
      
      toast.error("Erreur lors du partage");
    }
  };
  
  // ✅ LOGIQUE PRÉSERVÉE - Gérer follow
  const handleFollow = () => {
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour suivre des auteurs");
      return;
    }

    const author = getAuthor();
    if (author.id) {
      onFollowToggle(author.id);

      toast.success(isFollowing
        ? `Vous ne suivez plus ${author.name}`
        : `Vous suivez maintenant ${author.name}`);
    }
  };

  // ✅ IMPLÉMENTÉ : Gérer les actions du menu trois points
  const handleHidePost = async () => {
    try {
      await moderationService.hideContent({
        hideable_type: 'blog_post',
        hideable_id: post.id
      });
      toast.success("📌 Publication masquée de votre fil d'actualité");
      // Recharger la page pour refléter le changement
      window.location.reload();
    } catch (error) {
      console.error('Erreur masquage:', error);
      toast.error("❌ Erreur lors du masquage de la publication");
    }
  };

  const handleDeletePost = async () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible.")) {
      try {
        await moderationService.deletePost('blog_post', post.id);
        toast.success("🗑️ Article supprimé avec succès");
        // Recharger la page ou rediriger
        window.location.reload();
      } catch (error) {
        console.error('Erreur suppression:', error);
        toast.error("❌ Erreur lors de la suppression de l'article");
      }
    }
  };

  const handleEmbedPost = () => {
    const embedCode = `<iframe src="${window.location.origin}/user-blogs/${post.slug}/embed" width="100%" height="400"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    toast.success("📋 Code d'intégration copié dans le presse-papier");
  };

  const handleInterested = async () => {
    try {
      await moderationService.setContentPreference({
        preferable_type: 'blog_post',
        preferable_id: post.id,
        preference: 'interested'
      });
      toast.success("⭐ Vous verrez plus de publications de ce type");
    } catch (error) {
      console.error('Erreur préférence:', error);
      toast.error("❌ Erreur lors de l'enregistrement de votre préférence");
    }
  };

  const handleNotInterested = async () => {
    try {
      await moderationService.setContentPreference({
        preferable_type: 'blog_post',
        preferable_id: post.id,
        preference: 'not_interested'
      });
      toast.success("👎 Vous verrez moins de publications de ce type");
    } catch (error) {
      console.error('Erreur préférence:', error);
      toast.error("❌ Erreur lors de l'enregistrement de votre préférence");
    }
  };

  const handleReportPost = async () => {
    const reason = prompt("Pourquoi signalez-vous cette publication ?\n\nRaisons possibles:\n- Spam\n- Contenu inapproprié\n- Harcèlement\n- Autre");

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await moderationService.reportContent({
        reportable_type: 'blog_post',
        reportable_id: post.id,
        reason: 'user_report',
        description: reason.trim()
      });
      toast.success("🚩 Publication signalée. Notre équipe va l'examiner.");
    } catch (error) {
      console.error('Erreur signalement:', error);
      toast.error("❌ Erreur lors du signalement de la publication");
    }
  };

  const handleBlockUser = async () => {
    const author = getAuthor();
    if (confirm(`Êtes-vous sûr de vouloir bloquer ${author.name} ? Vous ne verrez plus leurs publications.`)) {
      try {
        await moderationService.blockUser({
          blocked_user_id: Number(author.id)
        });
        toast.success(`🚫 ${author.name} a été bloqué avec succès`);
        // Recharger pour cacher tous les posts de cet utilisateur
        window.location.reload();
      } catch (error) {
        console.error('Erreur blocage:', error);
        toast.error("❌ Erreur lors du blocage de l'utilisateur");
      }
    }
  };

  // ✅ LOGIQUE PRÉSERVÉE - Gérer les commentaires
  const handleCommentsToggle = () => {
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour voir et écrire des commentaires");
      return;
    }
    setShowComments(!showComments);
  };
  
  const handleCommentsUpdate = (newCount: number) => {
    setCommentsCount(newCount);
    console.log(`Commentaires mis à jour: ${newCount}`);
  };

  const currentUserForComments = currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    avatar: currentUser.avatar,
    bio: "",
    followers: 0,
    articles: 0,
    likes: 0,
    comments: 0
  } : undefined;

  const author = getAuthor();

  return (
    <Card className="group overflow-hidden border-0 bg-gradient-to-br from-white/95 to-slate-50/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 ease-out">
      {/* ✅ HEADER PREMIUM */}
      <CardHeader className="p-6 bg-gradient-to-r from-white/80 to-slate-50/60 backdrop-blur-sm border-b border-slate-100/80">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {/* ✅ AVATAR PREMIUM avec status online */}
            <div className="relative">
              <div
                className="h-14 w-14 ring-3 ring-white shadow-lg group-hover:ring-brand-blue/40 transition-all duration-300 cursor-pointer rounded-full overflow-hidden"
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
              {/* ✅ STATUS ONLINE INDICATOR */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-3 border-white shadow-md"></div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="text-lg font-bold text-brand-black hover:text-brand-blue transition-colors duration-300 cursor-pointer"
                  onClick={() => handleAuthorClick(author.id)}
                >
                  {author.name}
                </div>
                
                {/* ✅ BADGES PREMIUM */}
                <div className="flex items-center gap-2">
                  
                  
                  {isFromDefaultBlog && (
                    <Badge className="bg-gradient-to-r from-brand-yellow to-orange-500 text-white border-0 text-xs shadow-md">
                      <Crown className="h-3 w-3 mr-1" />
                      Officiel
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* ✅ META INFO PREMIUM */}
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{formattedDate(getPublishDate())}</span>
                </div>
                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">{loadingInteractions ? "..." : viewsCount} vues</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* ✅ ACTION BUTTONS PREMIUM */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button 
                variant={isFollowing ? "outline" : "default"}
                size="sm" 
                onClick={handleFollow} 
                className={`text-sm gap-2 font-semibold transition-all duration-300 ${
                  isFollowing 
                    ? "border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white hover:shadow-lg hover:scale-105" 
                    : "bg-gradient-to-r from-brand-blue to-indigo-600 hover:shadow-lg hover:scale-105 text-white"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    <span className="hidden sm:inline">Suivi</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Suivre</span>
                  </>
                )}
              </Button>
            ) : (
              <Button 
                variant="outline"
                size="sm" 
                onClick={handleFollow} 
                className="text-sm gap-2 font-semibold border-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Connexion</span>
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-slate-100 transition-all duration-300"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[9999]">
                {currentUser?.id?.toString() === post.user.id?.toString() ? (
                  <>
                    {/* Menu pour ses propres posts */}
                    <DropdownMenuItem onClick={() => navigate(`/dashboard/blog/edit/${post.id}`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share className="h-4 w-4 mr-2" />
                      Partager
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleHidePost}>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Masquer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={handleDeletePost}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleEmbedPost}>
                      <Code className="h-4 w-4 mr-2" />
                      Intégrer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/contenus-masques')}>
                      <Archive className="h-4 w-4 mr-2" />
                      Voir contenus masqués
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    {/* Menu pour les posts des autres */}
                    <DropdownMenuItem onClick={handleInterested}>
                      <Eye className="h-4 w-4 mr-2" />
                      Intéressé
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleNotInterested}>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Pas intéressé
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleHidePost}>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Masquer la publication
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-orange-600" onClick={handleReportPost}>
                      <Flag className="h-4 w-4 mr-2" />
                      Signaler
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={handleBlockUser}>
                      <Ban className="h-4 w-4 mr-2" />
                      Bloquer {author.name}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/contenus-masques')}>
                      <Archive className="h-4 w-4 mr-2" />
                      Voir contenus masqués
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      {/* ✅ IMAGE PREMIUM avec overlay */}
      <Link 
        to={`/user-blogs/${post.slug}`} 
        className="block relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200"
      >
        <div className="relative aspect-video overflow-hidden">
          <img 
            src={getHeaderImage()} 
            alt={post.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* ✅ READING TIME BADGE */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <Badge className="bg-white/90 backdrop-blur-sm text-slate-700 border-0 shadow-lg">
              <Eye className="h-3 w-3 mr-1" />
              5 min de lecture
            </Badge>
          </div>
        </div>
      </Link>
      
      {/* ✅ CONTENT PREMIUM */}
      <CardContent className="p-6 space-y-4">
        <Link to={`/user-blogs/${post.slug}`} className="block group/title">
          <h3 className="text-2xl font-bold mb-3 text-brand-black group-hover/title:text-brand-blue transition-colors duration-300 line-clamp-2 leading-tight">
            {post.title}
          </h3>
        </Link>
        
        {/* ✅ TAGS PREMIUM */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.slice(0, 3).map((tag, i) => (
            <Badge 
              key={i} 
              variant="secondary" 
              className="text-xs bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 hover:bg-gradient-to-r hover:from-slate-200 hover:to-slate-100 transition-all duration-300 cursor-pointer border border-slate-200/60"
            >
              #{tag}
            </Badge>
          ))}
          {post.tags.length > 3 && (
            <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
              +{post.tags.length - 3} tags
            </Badge>
          )}
        </div>
        
        <p className="text-slate-600 line-clamp-3 leading-relaxed text-base mb-6">
          {post.summary}
        </p>
        
        {/* ✅ READ MORE PREMIUM */}
        <Link 
          to={`/user-blogs/${post.slug}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue hover:text-blue-700 transition-all duration-300 group/read bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full"
        >
          <span>Lire l'article complet</span>
          <ArrowRight className="h-4 w-4 transform group-hover/read:translate-x-1 transition-transform duration-300" />
        </Link>
      </CardContent>
      
      {/* ✅ FOOTER PREMIUM */}
      <CardFooter className="p-6 pt-4 border-t border-slate-100 bg-gradient-to-r from-slate-50/50 to-white/80">
        <div className="w-full space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {/* ✅ LIKE BUTTON PREMIUM */}
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  isLiked 
                    ? "text-red-500 bg-red-50 hover:bg-red-100 shadow-sm" 
                    : "text-slate-600 hover:text-red-500 hover:bg-red-50"
                } ${!isAuthenticated ? "opacity-60" : ""}`}
                onClick={handleLike}
                disabled={loadingLike || loadingInteractions}
              >
                <Heart className={`h-5 w-5 transition-all duration-300 ${
                  isLiked ? "fill-current scale-110" : ""
                }`} />
                <span className="font-bold">{loadingInteractions ? "..." : likesCount}</span>
                {!isAuthenticated && <Shield className="h-3 w-3 ml-1" />}
              </Button>
              
              {/* ✅ COMMENT BUTTON PREMIUM */}
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-slate-600 hover:text-brand-blue hover:bg-blue-50 transition-all duration-300 ${!isAuthenticated ? "opacity-60" : ""}`}
                onClick={handleCommentsToggle}
              >
                <MessageCircle className="h-5 w-5" />
                <span className="font-bold">{loadingInteractions ? "..." : commentsCount}</span>
                {!isAuthenticated && <Shield className="h-3 w-3 ml-1" />}
              </Button>
              
              {/* ✅ SHARE BUTTON PREMIUM */}
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-600 hover:text-green-600 hover:bg-green-50 transition-all duration-300"
                onClick={handleShare}
              >
                <Share className="h-5 w-5" />
                <span className="font-bold">{loadingInteractions ? "..." : sharesCount}</span>
              </Button>
            </div>
            
            {/* ✅ VIEWS COUNTER PREMIUM */}
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-semibold">{loadingInteractions ? "..." : viewsCount} vues</span>
            </div>
          </div>
          
          {/* ✅ COMMENTS SECTION PREMIUM */}
          {showComments && isAuthenticated && (
            <div className="mt-6 p-6 border-t border-slate-100 bg-gradient-to-br from-slate-50/50 to-white/80 rounded-xl">
              <CommentSection
                comments={comments}
                postId={post.id.toString()}
                currentUser={currentUserForComments}
                postType="blog_post"
                onCommentsUpdate={handleCommentsUpdate}
              />
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}