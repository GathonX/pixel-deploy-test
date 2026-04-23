import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { blogService } from "@/services/blogService";
import SEOHead from "@/components/SEOHead";
import { UserPlus, Loader2 } from "lucide-react";

interface Author {
  id: number;
  name: string;
  avatar: string;
  posts_count: number;
  total_likes: number;
  latest_post: {
    title: string;
    slug: string;
  } | null;
}

const BlogAuthors: React.FC = () => {
  const navigate = useNavigate();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    try {
      setLoading(true);
      const posts = await blogService.getPublicBlogPosts({ per_page: 100 });

      // Grouper les posts par auteur
      const authorsMap = new Map<number, Author>();

      posts.forEach(post => {
        if (post.user) {
          const userId = post.user.id;
          const displayName = userId === 1 || post.user.name === 'Admin' ? 'PixelRise' : post.user.name;

          if (!authorsMap.has(userId)) {
            authorsMap.set(userId, {
              id: userId,
              name: displayName,
              avatar: post.user.avatar,
              posts_count: 0,
              total_likes: 0,
              latest_post: null
            });
          }

          const author = authorsMap.get(userId)!;
          author.posts_count++;
          author.total_likes += post.likes || 0;

          if (!author.latest_post || new Date(post.published_at || post.created_at) > new Date(author.latest_post.slug)) {
            author.latest_post = {
              title: post.title,
              slug: post.slug
            };
          }
        }
      });

      // Convertir en tableau et trier par nombre d'articles
      const authorsArray = Array.from(authorsMap.values())
        .sort((a, b) => b.posts_count - a.posts_count);

      setAuthors(authorsArray);
    } catch (error) {
      console.error('Erreur chargement auteurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    return `https://app.pixel-rise.com/storage/${avatar}`;
  };

  return (
    <>
      <SEOHead
        title="Auteurs - Blog Pixel Rise"
        description="Découvrez tous les auteurs qui contribuent au blog Pixel Rise"
        canonicalUrl={`${import.meta.env.VITE_CANONICAL_URL}/blog/authors`}
      />
      <div className="min-h-screen flex flex-col">
        <LandingNavbar />
        <div className="pt-20 flex-grow">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Nos Auteurs</h1>
              <p className="text-muted-foreground">
                Découvrez les contributeurs du blog Pixel Rise
              </p>
            </div>

            {/* Liste des auteurs */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-3 text-gray-600">Chargement des auteurs...</span>
              </div>
            ) : authors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {authors.map((author) => (
                  <Card key={author.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden">
                          <img
                            src={getAvatarUrl(author.avatar) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.name)}
                            alt={author.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.name);
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1">{author.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                            <span>{author.posts_count} article{author.posts_count > 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span className={author.total_likes > 0 ? 'text-red-500 font-bold' : ''}>
                              {author.total_likes} like{author.total_likes > 1 ? 's' : ''}
                            </span>
                          </div>

                          {author.latest_post && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              Dernier: {author.latest_post.title}
                            </p>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate(`/blog/author/${author.id}`)}
                          >
                            Voir les articles
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">Aucun auteur trouvé</p>
              </div>
            )}

            {/* Bouton retour */}
            <div className="mt-8 text-center">
              <Button variant="ghost" onClick={() => navigate('/blog')}>
                ← Retour au blog
              </Button>
            </div>
          </div>
        </div>
        <LandingFooter />
      </div>
    </>
  );
};

export default BlogAuthors;
