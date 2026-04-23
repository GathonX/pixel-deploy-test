import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Eye, Heart, MessageSquare, BookOpen, TrendingUp } from "lucide-react";
import { blogService } from "@/services/blogService";
import { interactionService } from "@/services/interactionService";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener";
import { toast } from "sonner";

interface AuthorWithStats {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  total_articles: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  last_post_date: string | null;
  is_active: boolean;
}

export function AuthorsList() {
  const navigate = useNavigate();
  const [authors, setAuthors] = useState<AuthorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 [AuthorsList] Chargement des auteurs...");

      // Récupérer tous les posts pour identifier les auteurs
      const allPosts = await blogService.getPublicBlogPosts({ per_page: 100 });
      console.log("📚 [AuthorsList] Posts récupérés:", allPosts.length);

      // Grouper par auteur
      const authorsMap = new Map<number, {
        user: any;
        posts: any[];
        totalViews: number;
        totalLikes: number;
        totalComments: number;
        totalShares: number;
      }>();

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

      console.log("👥 [AuthorsList] Auteurs identifiés:", authorsMap.size);

      // Créer la liste d'auteurs avec statistiques
      const authorsList: AuthorWithStats[] = Array.from(authorsMap.entries()).map(([authorId, authorData]) => {
        const lastPost = authorData.posts
          .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())[0];

        const lastPostDate = lastPost ? (lastPost.published_at || lastPost.created_at) : null;
        const isActive = lastPostDate ? (new Date().getTime() - new Date(lastPostDate).getTime()) < (30 * 24 * 60 * 60 * 1000) : false;

        const displayName = authorData.user.name === 'Admin' ? 'PixelRise' : authorData.user.name;

        return {
          id: authorId,
          name: displayName,
          email: authorData.user.email || '',
          avatar: authorData.user.avatar || null,
          total_articles: authorData.posts.length,
          total_views: authorData.totalViews,
          total_likes: authorData.totalLikes,
          total_comments: authorData.totalComments,
          total_shares: authorData.totalShares,
          last_post_date: lastPostDate,
          is_active: isActive
        };
      });

      // Trier par nombre d'articles puis par likes
      const sortedAuthors = authorsList.sort((a, b) => {
        if (b.total_articles !== a.total_articles) {
          return b.total_articles - a.total_articles;
        }
        return b.total_likes - a.total_likes;
      });

      setAuthors(sortedAuthors);
      console.log("✅ [AuthorsList] Auteurs chargés:", sortedAuthors.length);

    } catch (err) {
      console.error("❌ [AuthorsList] Erreur chargement auteurs:", err);
      setError("Erreur lors du chargement des auteurs");
      toast.error("Erreur lors du chargement des auteurs");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorClick = (authorId: number) => {
    navigate(`/blog/author/${authorId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Chargement des auteurs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadAuthors} variant="outline">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (authors.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Aucun auteur trouvé
          </p>
          <p className="text-xs text-slate-400">
            Les auteurs apparaîtront après publication d'articles
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tous les auteurs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {authors.length} auteur{authors.length > 1 ? 's' : ''} actif{authors.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Grille d'auteurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {authors.map((author) => (
          <Card
            key={author.id}
            className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-slate-50/50"
          >
            <CardContent className="p-6">
              {/* Avatar et nom */}
              <div className="flex flex-col items-center text-center mb-4">
                <div className="relative mb-3">
                  <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg group-hover:ring-brand-blue/30 transition-all duration-300">
                    <AvatarImage
                      src={getUniformAvatarUrl(author.avatar)}
                      alt={author.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-indigo-600 text-white font-bold text-xl">
                      {author.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Badge actif */}
                  {author.is_active && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center ring-2 ring-white">
                      <TrendingUp className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-lg text-slate-800 group-hover:text-brand-blue transition-colors">
                  {author.name}
                </h3>

                {author.is_active && (
                  <Badge variant="secondary" className="text-xs mt-2">
                    Actif ce mois-ci
                  </Badge>
                )}
              </div>

              {/* Statistiques principales */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <BookOpen className="h-4 w-4 text-brand-blue" />
                    <span className="font-bold text-lg text-slate-800">
                      {author.total_articles}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Article{author.total_articles > 1 ? 's' : ''}</p>
                </div>

                <div className="bg-white/80 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Eye className="h-4 w-4 text-slate-500" />
                    <span className="font-bold text-lg text-slate-800">
                      {author.total_views.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Vues</p>
                </div>
              </div>

              {/* Engagement */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-500" />
                  <span className={author.total_likes > 0 ? 'text-red-500 font-medium' : ''}>
                    {author.total_likes}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-blue-500" />
                  <span>{author.total_comments}</span>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="group-hover:bg-brand-blue group-hover:text-white group-hover:border-brand-blue transition-all"
                  onClick={() => handleAuthorClick(author.id)}
                >
                  Voir profil
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all"
                  onClick={() => navigate(`/author/${author.id}/blogs`)}
                >
                  Blogs
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
