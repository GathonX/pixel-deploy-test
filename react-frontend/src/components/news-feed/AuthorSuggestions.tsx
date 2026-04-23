import React, { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserPlus, UserCheck, Loader2, Lock, Eye, Heart, MessageSquare } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { followService, FollowUser } from "@/services/followService";
import { blogService } from "@/services/blogService";
import { interactionService } from "@/services/interactionService";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener";

interface AuthorSuggestionsProps {
  following: string[];
  onFollowToggle: (authorId: string) => void;
  isAuthenticated: boolean;
  onAuthorClick?: (authorId: number | string) => void;
}

// ✅ INTERFACE POUR AUTEUR AVEC VRAIES STATISTIQUES
interface AuthorWithStats extends FollowUser {
  real_stats: {
    total_articles: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    last_post_date: string | null;
    is_active: boolean;
  };
}

export function AuthorSuggestions({
  following,
  onFollowToggle,
  isAuthenticated,
  onAuthorClick,
}: AuthorSuggestionsProps) {
  const navigate = useNavigate();
  
  const [suggestions, setSuggestions] = useState<AuthorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FONCTION POUR GÉRER LE CLIC SUR L'AUTEUR
  const handleAuthorClick = (authorId: number | string) => {
    if (onAuthorClick) {
      onAuthorClick(authorId);
    } else {
      navigate(`/blog/author/${authorId}`);
    }
  };

  // ✅ CHARGER LES VRAIES DONNÉES DEPUIS LA BASE DE DONNÉES
  useEffect(() => {
    let isMounted = true;

    const loadRealAuthorData = async () => {
      if (!isMounted) return;

      try {
        setLoading(true);
        setError(null);

        console.log("🔍 [AuthorSuggestions] Chargement des auteurs depuis la base de données...");

        // ✅ ÉTAPE 1 : Récupérer tous les posts pour identifier les auteurs actifs
        const allPosts = await blogService.getPublicBlogPosts({ per_page: 100 });
        console.log("📚 [AuthorSuggestions] Posts récupérés:", allPosts.length);

        if (!isMounted) return;

        // ✅ ÉTAPE 2 : Grouper les posts par auteur
        const authorsMap = new Map<number, {
          user: any;
          posts: any[];
          totalViews: number;
          totalLikes: number;
          totalComments: number;
          totalShares: number;
        }>();

        // Analyser chaque post pour extraire les données des auteurs
        for (const post of allPosts) {
          if (!post.user?.id) continue;

          const authorId = post.user.id;
          
          if (!authorsMap.has(authorId)) {
            authorsMap.set(authorId, {
              user: post.user,
              posts: [],
              totalViews: 0,
              totalLikes: 0,
              totalComments: 0,
              totalShares: 0
            });
          }

          const author = authorsMap.get(authorId)!;
          author.posts.push(post);
          author.totalViews += post.views || 0;
          author.totalLikes += post.likes || 0;
          author.totalComments += typeof post.comments === 'number' ? post.comments : (post.comments?.length || 0);
          author.totalShares += post.shares || 0;
        }

        console.log("👥 [AuthorSuggestions] Auteurs identifiés:", authorsMap.size);

        if (!isMounted) return;

        // ✅ ÉTAPE 3 : Charger les vraies statistiques d'interaction pour chaque auteur
        const authorsWithRealStats = await Promise.all(
          Array.from(authorsMap.entries()).map(async ([authorId, authorData]) => {
            try {
              // Calculer les statistiques réelles en sommant les stats de tous les posts de l'auteur
              let realTotalViews = 0;
              let realTotalLikes = 0;
              let realTotalComments = 0;
              let realTotalShares = 0;

              // Charger les stats réelles pour chaque post de l'auteur
              for (const post of authorData.posts) {
                try {
                  const stats = await interactionService.getPublicPostStatistics('blog_post', post.id);
                  realTotalViews += stats.total_views || 0;
                  realTotalLikes += stats.total_likes || 0;
                  realTotalComments += stats.total_comments || 0;
                  realTotalShares += stats.total_shares || 0;
                } catch (statsError) {
                  console.warn(`❌ [AuthorSuggestions] Erreur stats post ${post.id}:`, statsError);
                  // Fallback sur les données du post
                  realTotalViews += post.views || 0;
                  realTotalLikes += post.likes || 0;
                  realTotalComments += typeof post.comments === 'number' ? post.comments : (post.comments?.length || 0);
                  realTotalShares += post.shares || 0;
                }
              }

              // Calculer la date du dernier post
              const lastPost = authorData.posts
                .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())[0];

              const lastPostDate = lastPost ? (lastPost.published_at || lastPost.created_at) : null;
              const isActive = lastPostDate ? (new Date().getTime() - new Date(lastPostDate).getTime()) < (30 * 24 * 60 * 60 * 1000) : false; // Actif si post dans les 30 derniers jours

              const displayName = authorData.user.name === 'Admin' ? 'PixelRise' : authorData.user.name;

              return {
                id: authorId,
                name: displayName,
                email: authorData.user.email || '',
                avatar: authorData.user.avatar || null,
                followed_at: new Date().toISOString(),
                articles_count: authorData.posts.length,
                real_stats: {
                  total_articles: authorData.posts.length,
                  total_views: realTotalViews,
                  total_likes: realTotalLikes,
                  total_comments: realTotalComments,
                  total_shares: realTotalShares,
                  last_post_date: lastPostDate,
                  is_active: isActive
                }
              } as AuthorWithStats;

            } catch (error) {
              console.error(`❌ [AuthorSuggestions] Erreur traitement auteur ${authorId}:`, error);
              return null;
            }
          })
        );

        if (!isMounted) return;

        // ✅ ÉTAPE 4 : Filtrer et trier les résultats
        const validAuthors = authorsWithRealStats
          .filter((author): author is AuthorWithStats => author !== null)
          .filter(author => author.real_stats.total_articles > 0) // Seulement les auteurs avec des articles
          .sort((a, b) => {
            // Trier par nombre d'articles, puis par likes
            if (b.real_stats.total_articles !== a.real_stats.total_articles) {
              return b.real_stats.total_articles - a.real_stats.total_articles;
            }
            return b.real_stats.total_likes - a.real_stats.total_likes;
          });

        console.log("✅ [AuthorSuggestions] Auteurs avec statistiques réelles:", validAuthors.map(a => ({
          name: a.name,
          articles: a.real_stats.total_articles,
          likes: a.real_stats.total_likes,
          views: a.real_stats.total_views,
          isActive: a.real_stats.is_active
        })));

        setSuggestions(validAuthors);

      } catch (error) {
        if (!isMounted) return;
        
        console.error("❌ [AuthorSuggestions] Erreur chargement données réelles:", error);
        setError("Impossible de charger les auteurs");
        setSuggestions([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRealAuthorData();

    return () => {
      isMounted = false;
    };
  }, []); // Pas de dépendances pour ne charger qu'une fois

  // ✅ ÉTAT DE CHARGEMENT
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-blue mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              Chargement des auteurs...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ÉTAT D'ERREUR
  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 rounded-full bg-red-100"></div>
          </div>
          <p className="text-sm text-slate-600 mb-3">{error}</p>
          <Link
            to="/user-blogs"
            className="inline-flex items-center gap-2 text-sm text-brand-blue hover:text-blue-700 font-medium transition-colors"
          >
            Découvrir tous les auteurs →
          </Link>
        </div>
      </div>
    );
  }

  // ✅ AUCUN AUTEUR TROUVÉ
  if (suggestions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Aucun auteur trouvé dans la base de données
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Les auteurs apparaîtront après publication d'articles
          </p>
          <Link
            to="/user-blogs"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-brand-blue to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Découvrir tous les auteurs
          </Link>
        </div>
      </div>
    );
  }

  // ✅ TRIER LES SUGGESTIONS : NON-SUIVIS EN PREMIER, PUIS PAR ACTIVITÉ
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const aFollowing = following.includes(a.id.toString());
    const bFollowing = following.includes(b.id.toString());

    if (aFollowing === bFollowing) {
      // Même statut de follow, trier par activité puis par likes
      if (a.real_stats.is_active !== b.real_stats.is_active) {
        return b.real_stats.is_active ? 1 : -1;
      }
      return b.real_stats.total_likes - a.real_stats.total_likes;
    }

    return aFollowing ? 1 : -1; // Non-suivis en premier
  });

  return (
    <div className="space-y-4">
      {sortedSuggestions.slice(0, 5).map((author, index) => {
        const isFollowing = following.includes(author.id.toString());

        return (
          <div key={author.id} className="group">
            <div className="flex flex-col justify-center items-center mx-auto rounded-xl hover:bg-slate-50/50 transition-all duration-200">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <Avatar 
                    className="h-10 w-10 flex-shrink-0 ring-2 ring-white shadow-md cursor-pointer hover:ring-2 hover:ring-brand-blue/50 transition-all duration-200" 
                    onClick={() => handleAuthorClick(author.id)}
                  >
                    <AvatarImage
                      src={getUniformAvatarUrl(author.avatar)}
                      alt={author.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-indigo-600 text-white font-medium text-xs">
                      {author.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* ✅ BADGE AUTEUR ACTIF */}
                  {author.real_stats.is_active && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">✨</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div 
                    className="font-medium text-sm text-slate-800 truncate group-hover:text-brand-blue transition-colors cursor-pointer hover:text-brand-blue"
                    onClick={() => handleAuthorClick(author.id)}
                  >
                    {author.name}
                  </div>
                  
                  {/* ✅ STATISTIQUES RÉELLES */}
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{author.real_stats.total_articles} article{author.real_stats.total_articles > 1 ? 's' : ''}</span>
                    {author.real_stats.is_active && (
                      <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="text-green-600 font-medium">Actif</span>
                      </>
                    )}
                  </div>
                  
                  {/* ✅ ENGAGEMENT RÉEL */}
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{author.real_stats.total_views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span 
                        className={author.real_stats.total_likes > 0 ? 'text-red-500 font-medium' : ''}
                      >
                        {author.real_stats.total_likes}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{author.real_stats.total_comments}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  className={`h-8 text-xs ml-3 flex-shrink-0 min-w-[80px] transition-all duration-200 ${
                    isFollowing
                      ? "border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white"
                      : isAuthenticated
                      ? "bg-gradient-to-r from-brand-blue to-indigo-600 hover:shadow-lg hover:scale-105"
                      : "bg-gradient-to-r from-orange-400 to-orange-600 hover:shadow-lg"
                  }`}
                  onClick={() => onFollowToggle(author.id.toString())}
                  disabled={!isAuthenticated && !isFollowing}
                >
                  {!isAuthenticated ? (
                    <>
                      <Lock className="h-3.5 w-3.5 mr-1" />
                      <span>Connexion</span>
                    </>
                  ) : isFollowing ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      <span>Suivi</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      <span>Suivre</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {index < sortedSuggestions.slice(0, 5).length - 1 && (
              <Separator className="my-3 bg-slate-100" />
            )}
          </div>
        );
      })}

      <div className="pt-4 border-t border-slate-100">
        <div className="mb-3">
          <Link
            to="/user-blogs"
            className="flex items-center justify-center gap-2 p-3 text-sm text-brand-blue hover:text-blue-700 hover:bg-blue-50/50 rounded-lg transition-all duration-200 font-medium group"
          >
            <span>Voir tous les auteurs ({suggestions.length})</span>
            <span className="transform group-hover:translate-x-1 transition-transform duration-200">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}