// src/pages/PublicBlogPost.tsx - Page publique pour voir les blogs
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { blogService } from "@/services/blogService";
import { interactionService } from "@/services/interactionService";
import { BlogPost } from "@/services/blogService";
import { Loader2, Eye, Heart, MessageSquare, Share2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CommentSection } from "@/components/blog/CommentSection";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import SEOHead from "@/components/SEOHead";

const PublicBlogPost: React.FC = () => {
  // 🔍 DEBUG LOG - PREMIER LOG
  console.log("🚨 DEBUT PublicBlogPost - Composant se monte");

  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [stats, setStats] = useState({
    likes: 0,
    comments: 0,
    views: 0
  });

  // 🔍 DEBUG LOG
  console.log("🔄 PublicBlogPost - Composant monté avec slug:", slug);

  useEffect(() => {
    const loadPublicPost = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 [DEBUG] Recherche post public avec slug:', slug);
        
        // ÉTAPE 1 : Vérifier d'abord si des posts publics existent
        console.log('📋 [DEBUG] Vérification posts publics disponibles...');
        const allPublicPosts = await blogService.getPublicBlogPosts({ per_page: 100 });
        console.log('📋 [DEBUG] Posts publics trouvés:', allPublicPosts.length);
        
        if (allPublicPosts.length > 0) {
          console.log('📋 [DEBUG] Slugs disponibles:', allPublicPosts.map(p => p.slug));
          
          // Chercher le post avec le slug exact
          const foundPost = allPublicPosts.find(p => p.slug === slug);
          if (foundPost) {
            console.log('✅ [DEBUG] Post trouvé via liste publique:', foundPost.title);
            setPost(foundPost);
            
            // Charger les statistiques
            try {
              const publicStats = await interactionService.getPublicPostStatistics('blog_post', foundPost.id);
              setStats({
                likes: publicStats.total_likes,
                comments: publicStats.total_comments,
                views: publicStats.total_views
              });
            } catch (statsError) {
              console.warn('Erreur stats publiques:', statsError);
            }
            
            // Incrémenter la vue
            try {
              await interactionService.viewBlogPost(foundPost.id);
            } catch (viewError) {
              console.warn('Erreur vue:', viewError);
            }
            
            setLoading(false);
            return;
          }
        }
        
        // ÉTAPE 2 : Si pas trouvé, essayer la méthode directe par slug
        console.log('🔍 [DEBUG] Tentative récupération directe par slug...');
        const publicPost = await blogService.getPublicBlogPost(slug);
        console.log('✅ [DEBUG] Post trouvé via méthode directe:', publicPost.title);
        setPost(publicPost);

        // Charger les statistiques publiques
        const publicStats = await interactionService.getPublicPostStatistics('blog_post', publicPost.id);
        setStats({
          likes: publicStats.total_likes,
          comments: publicStats.total_comments,
          views: publicStats.total_views
        });

        // Incrémenter la vue
        await interactionService.viewBlogPost(publicPost.id);

      } catch (error) {
        console.error('❌ [DEBUG] Erreur chargement post public:', error);
        
        // ÉTAPE 3 : Debug supplémentaire - tester l'endpoint directement
        console.log('🔧 [DEBUG] Test endpoint API direct...');
        try {

          // ✅ NOUVEAU CODE (CORRIGÉ)
const debugResponse = await blogService.debugBackendResponse(`/public/blog/${slug}`);

          console.log('🔧 [DEBUG] Réponse backend directe:', debugResponse);
        } catch (debugError) {
          console.error('❌ [DEBUG] Erreur test endpoint:', debugError);
        }
        
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPublicPost();
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

  const getHeaderImage = (post: BlogPost): string => {
    return post.header_image || `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format&q=80&seed=${post.id}`;
  };

  const getAuthor = (post: BlogPost) => {
    if (post.user) {
      const displayName = (post.user.id === 1 || post.user.name === 'Admin') ? 'PixelRise' : post.user.name;
      const avatarUrl = post.user.avatar
        ? post.user.avatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0066cc&color=fff&size=128`;

      return {
        name: displayName,
        avatar: avatarUrl
      };
    }
    return {
      name: 'Anonyme',
      avatar: 'https://ui-avatars.com/api/?name=Anonyme&background=6b7280&color=fff&size=128'
    };
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      
      if (navigator.share) {
        await navigator.share({
          title: post?.title,
          text: post?.summary,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Lien copié dans le presse-papiers");
      }
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <LandingNavbar />
        <div className="flex-grow flex items-center justify-center pt-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de l'article...</p>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  if (notFound || !post) {
    // Rediriger immédiatement vers Google avec le slug
    useEffect(() => {
      if (slug) {
        const searchTerm = slug.replace(/-/g, ' ');
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
      }
    }, [slug]);

    // Ne rien afficher pendant la redirection
    return null;
  }

  const author = getAuthor(post);

  const seoTitle = post.title
    ? `${post.title} | Pixel Rise`
    : "Article de blog – Pixel Rise";

  const seoDescription = post.summary && post.summary.trim().length > 0
    ? post.summary
    : "Découvrez un article du blog Pixel Rise sur le marketing automatisé, la création de contenu et la croissance de votre business avec l'IA.";

  const seoKeywords = Array.isArray(post.tags) && post.tags.length > 0
    ? post.tags.join(", ")
    : "blog Pixel Rise, marketing automatisé, contenu IA, croissance PME";

  // 🔍 DEBUG LOGS
  console.log("📝 PublicBlogPost - Données du post:", {
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    tags: post.tags,
    seoTitle,
    seoDescription,
    seoKeywords
  });

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={`${import.meta.env.VITE_CANONICAL_URL}/blog/${post.slug}`}
      />
      <div className="min-h-screen flex flex-col">
        <LandingNavbar />

        <main className="flex-grow pt-20">
          <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
            <article className="flex-1 lg:max-w-4xl order-2 lg:order-1">
              {/* Bouton Retour */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/blog')}
                className="mb-6 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux articles
              </Button>

              {/* Header */}
              <header className="mb-8">
                <div className="flex gap-2 mb-4">
                  {post.is_ai_generated && (
                    <Badge variant="outline" className="border-blue-500 text-blue-600">
                      Généré par IA
                    </Badge>
                  )}
                  <Badge variant="secondary">Article public</Badge>
                </div>

                <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

                {post.summary && (
                  <p className="text-xl text-muted-foreground mb-6">{post.summary}</p>
                )}

                {/* Métadonnées */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden">
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
                      <div className="font-semibold">{author.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Publié {formatDate(post.published_at || post.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {stats.views}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-1" />
                      Partager
                    </Button>
                  </div>
                </div>

                {/* Image d'en-tête */}
                <div className="aspect-video w-full mb-8 rounded-lg overflow-hidden">
                  <img
                    src={getHeaderImage(post)}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </header>

              {/* Contenu */}
              <div className="prose prose-lg max-w-none mb-10" ref={contentRef}>
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </div>

              {/* Statistiques */}
              <div className="border-t border-b py-6 mb-8">
                <div className="flex justify-center gap-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="h-5 w-5" />
                    <span>{stats.likes} J'aime</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-5 w-5" />
                    <span>{stats.comments} Commentaires</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-5 w-5" />
                    <span>{stats.views} Vues</span>
                  </div>
                </div>
              </div>

              {/* Section commentaires */}
              <CommentSection
                comments={[]}
                postId={post.id.toString()}
                postType="blog_post"
                currentUser={undefined} // Pas d'utilisateur connecté sur la page publique
              />
            </article>

          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
};

export default PublicBlogPost;