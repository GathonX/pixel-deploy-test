import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Search, Newspaper, Tag, TrendingUp, Loader2, Mail, Eye, Heart } from "lucide-react";
import { toast } from "sonner";

// ✅ CORRECTION : Imports des services backend
import { blogService, BlogPost } from "@/services/blogService";
import { categoryService, Category } from "@/services/categoryService";
import { interactionService } from "@/services/interactionService";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener"; // ✅ IMPORT UNIFORME
import SafeImage from "@/components/ui/SafeImage";

interface BlogSidebarProps {
  currentCategory?: string; // ✅ Pour highlighting la catégorie active
  onSearch?: (query: string) => void; // ✅ Callback pour recherche
  showNewsletter?: boolean; // ✅ Optionnel - afficher newsletter
}

export function BlogSidebar({ 
  currentCategory, 
  onSearch, 
  showNewsletter = true 
}: BlogSidebarProps) {
  const navigate = useNavigate();

  // ✅ NOUVEAU : États pour les données backend avec statistiques réelles
  const [popularPosts, setPopularPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommendedAuthors, setRecommendedAuthors] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingAuthors, setLoadingAuthors] = useState(true);
  
  // ✅ NOUVEAU : États pour la recherche et newsletter
  const [searchQuery, setSearchQuery] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribingNewsletter, setSubscribingNewsletter] = useState(false);

  // ✅ NOUVEAU : Charger les articles populaires avec statistiques réelles
  useEffect(() => {
    const loadPopularPosts = async () => {
      try {
        setLoadingPosts(true);
        
        console.log("🔍 [BlogSidebar] Début chargement articles populaires...");
        
        // Récupérer tous les posts publiés
        const posts = await blogService.getPublicBlogPosts({ 
          per_page: 20
        });
        
        console.log("📚 [BlogSidebar] Posts récupérés depuis API:", posts.length);
        console.log("🔍 [BlogSidebar] Premier post (brut):", JSON.stringify(posts[0], null, 2));
        
        // ✅ CORRECTION : Charger par batch de 5 avec délai de 200ms
        const BATCH_SIZE = 5;
        const DELAY_MS = 200;
        const postsWithRealStats = [];

        for (let i = 0; i < posts.length; i += BATCH_SIZE) {
          const batch = posts.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.all(
            batch.map(async (post) => {
              try {
                const stats = await interactionService.getPublicPostStatistics('blog_post', post.id);
                return {
                  ...post,
                  realStats: stats,
                  likes: stats.total_likes || 0,
                  views: stats.total_views || 0,
                  comments: typeof post.comments === 'number' ? post.comments : (stats.total_comments || 0),
                  shares: post.shares || 0
                };
              } catch (statsError) {
                return {
                  ...post,
                  realStats: null,
                  likes: post.likes || 0,
                  views: post.views || 0
                };
              }
            })
          );

          postsWithRealStats.push(...batchResults);

          if (i + BATCH_SIZE < posts.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }
        
        console.log("📊 [BlogSidebar] Posts avec stats réelles:", postsWithRealStats.map(p => ({
          id: p.id,
          title: p.title.substring(0, 30),
          likes: p.likes,
          views: p.views,
          hasRealStats: !!p.realStats
        })));
        
        // Trier par vues et prendre le top 5
        const sortedByViews = postsWithRealStats
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 5);
        
        console.log("🏆 [BlogSidebar] Top 5 articles populaires (triés par vues):", sortedByViews.map(p => ({
          id: p.id,
          title: p.title.substring(0, 30),
          likes: p.likes,
          views: p.views
        })));
        
        setPopularPosts(sortedByViews);

      } catch (error) {
        console.error('❌ [BlogSidebar] Erreur chargement articles populaires:', error);
        setPopularPosts([]);
      } finally {
        setLoadingPosts(false);
        console.log("✅ [BlogSidebar] Chargement articles terminé");
      }
    };

    loadPopularPosts();
  }, []);

  // ✅ CORRECTION FINALE : Charger les catégories via le service public
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        
        console.log("🏷️ [BlogSidebar] Chargement catégories...");
        
        // ✅ SOLUTION : Utiliser la méthode getPublicCategories du service
        const allCategories = await categoryService.getPublicCategories(100);
        
        console.log("🏷️ [BlogSidebar] Catégories récupérées:", allCategories.length);
        console.log("🏷️ [BlogSidebar] Premières catégories:", allCategories.slice(0, 3).map(c => ({ 
          id: c.id, 
          name: c.name, 
          slug: c.slug,
          blog_posts_count: c.blog_posts_count 
        })));
        
        // Trier par nombre de posts (si disponible)
        const sortedCategories = allCategories.sort((a, b) => {
          const aCount = a.blog_posts_count || 0;
          const bCount = b.blog_posts_count || 0;
          return bCount - aCount;
        });
        
        setCategories(sortedCategories.slice(0, 8)); // Limiter à 8 catégories
        console.log(`✅ [BlogSidebar] ${allCategories.length} catégories chargées, ${sortedCategories.slice(0, 8).length} affichées`);

      } catch (error) {
        console.error('❌ [BlogSidebar] Erreur chargement catégories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // ✅ NOUVEAU : Charger les auteurs recommandés avec vraies statistiques
  useEffect(() => {
    const loadRecommendedAuthors = async () => {
      try {
        setLoadingAuthors(true);
        
        console.log("👥 [BlogSidebar] Chargement auteurs recommandés...");
        
        // Récupérer les posts pour identifier les auteurs actifs
        const allPosts = await blogService.getPublicBlogPosts({ per_page: 100 });
        
        // ✅ CORRECTION : Charger par batch de 5 avec délai de 200ms
        const BATCH_SIZE = 5;
        const DELAY_MS = 200;
        const postsWithStats = [];

        for (let i = 0; i < allPosts.length; i += BATCH_SIZE) {
          const batch = allPosts.slice(i, i + BATCH_SIZE);

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
                return post;
              }
            })
          );

          postsWithStats.push(...batchResults);

          if (i + BATCH_SIZE < allPosts.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }
        
        // Grouper par auteur et calculer les statistiques
        const authorsMap = new Map();
        
        for (const post of postsWithStats) {
          const authorId = post.user.id;

          if (!authorsMap.has(authorId)) {
            const displayName = post.user.name === 'Admin' ? 'PixelRise' : post.user.name;
            authorsMap.set(authorId, {
              id: authorId,
              name: displayName,
              email: post.user.email,
              avatar: getUniformAvatarUrl(post.user.avatar), // ✅ UTILISE FONCTION UNIFORME
              initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(), // ✅ AJOUTÉ
              posts_count: 0,
              total_views: 0,
              total_likes: 0,
              total_comments: 0,
              total_shares: 0,
              latest_post: null
            });
          }
          
          const author = authorsMap.get(authorId);
          author.posts_count += 1;
          author.total_views += post.views || 0;
          author.total_likes += post.likes || 0; // ✅ Maintenant utilise les vraies stats
          author.total_comments += post.comments || 0;
          author.total_shares += post.shares || 0;
          
          // Garder le post le plus récent
          if (!author.latest_post || new Date(post.published_at || post.created_at) > new Date(author.latest_post.published_at || author.latest_post.created_at)) {
            author.latest_post = post;
          }
        }
        
        // Convertir en array et trier par nombre de posts puis par likes
        const authorsArray = Array.from(authorsMap.values())
          .sort((a, b) => {
            if (b.posts_count !== a.posts_count) {
              return b.posts_count - a.posts_count;
            }
            return b.total_likes - a.total_likes;
          })
          .slice(0, 3); // Top 3 auteurs
        
        console.log("👥 [BlogSidebar] Auteurs recommandés (avec vraies stats):", authorsArray.map(a => ({
          name: a.name,
          posts: a.posts_count,
          likes: a.total_likes, // ✅ Maintenant synchronisé
          views: a.total_views,
          comments: a.total_comments
        })));
        
        setRecommendedAuthors(authorsArray);

      } catch (error) {
        console.error('❌ [BlogSidebar] Erreur chargement auteurs:', error);
        setRecommendedAuthors([]);
      } finally {
        setLoadingAuthors(false);
      }
    };

    loadRecommendedAuthors();
  }, []);

  // ✅ NOUVEAU : Gérer la recherche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (onSearch) {
      onSearch(searchQuery.trim());
    } else {
      // Naviguer vers la page de recherche
      navigate(`/blog/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    
    setSearchQuery("");
  };

  // ✅ NOUVEAU : Gérer l'abonnement newsletter
  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterEmail.trim()) {
      toast.error("Veuillez saisir une adresse email");
      return;
    }

    try {
      setSubscribingNewsletter(true);
      
      // ✅ Simulation d'abonnement newsletter (remplacer par votre endpoint)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Inscription réussie ! Vous recevrez nos derniers articles.");
      setNewsletterEmail("");

    } catch (error) {
      console.error('❌ [BlogSidebar] Erreur abonnement newsletter:', error);
      toast.error("Erreur lors de l'inscription à la newsletter");
    } finally {
      setSubscribingNewsletter(false);
    }
  };

  // ✅ UNIFORME : Fonction utilitaire pour obtenir l'auteur avec avatar uniforme
  const getAuthor = (post: BlogPost) => {
    if (post.user) {
      const displayName = post.user.id === 1 || post.user.name === 'Admin' ? 'PixelRise' : post.user.name;
      return {
        name: displayName,
        avatar: getUniformAvatarUrl(post.user.avatar), // ✅ UTILISE FONCTION UNIFORME
        initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
    }
    return {
      name: 'Anonyme',
      avatar: getUniformAvatarUrl(null), // ✅ UTILISE FONCTION UNIFORME
      initials: 'AN'
    };
  };

  // ✅ CORRECTION : Fonction utilitaire pour obtenir l'image d'en-tête
  const getHeaderImage = (post: BlogPost): string => {
    return post.header_image || `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format&q=80&seed=${post.id}`;
  };

  
  // ✅ UNIFORME : Render d'un auteur recommandé avec navigation et avatar correct
  const renderRecommendedAuthor = (author: any) => {
    const handleViewAuthor = () => {
      navigate(`/blog/author/${author.id}`);
    };

    return (
      <div key={author.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
        {/* ✅ Avatar avec image correcte */}
        <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden">
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
          <h4 className="font-medium text-sm truncate">
            {author.id === 1 || author.name === 'Admin' ? 'PixelRise' : author.name}
          </h4>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{author.posts_count} article{author.posts_count > 1 ? 's' : ''}</span>
            <span>•</span>
            <span 
              style={{ 
                color: author.total_likes > 0 ? 'red' : 'inherit',
                fontWeight: author.total_likes > 0 ? 'bold' : 'normal'
              }}
            >
              {author.total_likes} like{author.total_likes > 1 ? 's' : ''}
            </span>
          </div>
          {author.latest_post && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Dernier: {author.latest_post.title}
            </p>
          )}
        </div>
        
        <Button 
          size="sm" 
          variant="outline" 
          className="text-xs px-2 py-1 h-7"
          onClick={handleViewAuthor}
        >
          Voir
        </Button>
      </div>
    );
  };

  // ✅ NOUVEAU : Debug render des posts
  const renderPopularPost = (post: BlogPost & { realStats?: any }) => {
    const author = getAuthor(post);
    
    console.log(`🎨 [BlogSidebar] Render post ${post.id}:`, {
      title: post.title.substring(0, 30),
      likes: post.likes,
      views: post.views,
      hasRealStats: !!post.realStats,
      author: author.name
    });
    
    return (
      <div key={post.id} className="pb-3 mb-3 border-b last:border-b-0">
        <div className="flex gap-3">
          {/* ✅ NOUVEAU : Miniature de l'article */}
          <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0">
            <SafeImage 
              src={getHeaderImage(post)} 
              alt={post.title}
              className="w-full h-full object-cover"
              fallbackSrc="/placeholder.svg"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <Link to={`/blog/${post.slug}`} className="hover:text-pixelrise-blue">
              <h4 className="font-medium text-sm line-clamp-2 mb-1">{post.title}</h4>
            </Link>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate">{author.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span 
                    title={`Vues: ${post.views || 0} ${post.realStats ? '(stats réelles)' : '(données post)'}`}
                  >
                    {post.views || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span 
                    title={`Likes: ${post.likes || 0} ${post.realStats ? '(stats réelles)' : '(données post)'}`}
                    style={{ 
                      color: (post.likes || 0) > 0 ? 'red' : 'inherit',
                      fontWeight: (post.likes || 0) > 0 ? 'bold' : 'normal'
                    }}
                  >
                    {post.likes || 0}
                  </span>
                </div>
              </div>
            </div>
            
            {/* ✅ NOUVEAU : Badge debug pour voir la source des données */}
            {post.realStats && (
              <div className="mt-1 flex gap-1">
                <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                  Stats API
                </Badge>
              </div>
            )}
            
            {/* ✅ NOUVEAU : Badge IA si généré par IA */}
            {post.is_ai_generated && (
              <Badge variant="outline" className="text-xs mt-1 border-blue-500 text-blue-600">
                IA
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ✅ NOUVEAU : Section recherche améliorée */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-4 w-4" />
            Rechercher
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pixelrise-blue"
                placeholder="Rechercher des articles..."
                type="search"
              />
              <Button 
                type="submit"
                className="absolute right-1 top-1 h-8" 
                size="sm"
                disabled={!searchQuery.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ✅ NOUVEAU : Articles populaires avec données backend et debug */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Articles populaires
            {loadingPosts && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {loadingPosts ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : popularPosts.length > 0 ? (
              <div className="space-y-4">
                {popularPosts.map((post) => renderPopularPost(post))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Aucun article populaire disponible
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ✅ IMPLÉMENTATION : Section auteurs recommandés */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Auteurs recommandés
            {loadingAuthors && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAuthors ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded mb-1"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recommendedAuthors.length > 0 ? (
            <div className="space-y-3">
              {recommendedAuthors.map((author) => renderRecommendedAuthor(author))}

              {/* ✅ Bouton "Voir tous les auteurs" */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => navigate('/blog/authors')}
                >
                  Voir tous les auteurs
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <UserPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Aucun auteur trouvé
              </p>
              <p className="text-xs text-muted-foreground">
                Les auteurs apparaîtront après publication d'articles
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NOUVEAU : Catégories avec données backend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Catégories
            {loadingCategories && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCategories ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse"></div>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Link key={category.id} to={`/blog/category/${category.slug}`}>
                  <div 
                    className={`text-sm px-3 py-1 rounded-full transition-colors ${
                      currentCategory === category.slug 
                        ? "bg-pixelrise-blue text-white" 
                        : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    }`}
                  >
                    {category.name} 
                    <span className="opacity-70 ml-1">
                      ({category.blog_posts_count || 0})
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Aucune catégorie disponible
            </p>
          )}
        </CardContent>
      </Card>

      {/* ✅ NOUVEAU : Newsletter avec formulaire fonctionnel */}
      {showNewsletter && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Newsletter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Abonnez-vous pour recevoir les derniers articles et mises à jour directement dans votre boîte mail.
            </p>
            <form className="space-y-3" onSubmit={handleNewsletterSubscribe}>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pixelrise-blue"
                  placeholder="votre@email.com"
                  type="email"
                  required
                  disabled={subscribingNewsletter}
                />
              </div>
              <Button 
                type="submit"
                className="w-full" 
                disabled={subscribingNewsletter || !newsletterEmail.trim()}
              >
                {subscribingNewsletter ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Inscription...
                  </>
                ) : (
                  "S'abonner"
                )}
              </Button>
            </form>
            
            {/* ✅ NOUVEAU : Informations sur la newsletter */}
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Gratuit</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Hebdomadaire</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Pas de spam</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ NOUVEAU : Section statistiques rapides avec debug */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h4 className="font-semibold mb-3">Rejoignez notre communauté</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg text-pixelrise-blue">
                  {popularPosts.reduce((sum, post) => sum + (post.views || 0), 0).toLocaleString()}
                </div>
                <div className="text-muted-foreground">Vues</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-pixelrise-blue">
                  {categories.length}+
                </div>
                <div className="text-muted-foreground">Catégories</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}