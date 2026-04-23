// src/pages/BlogEmbedPage.tsx - PAGE ARTICLE EMBED

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye, Heart, MessageCircle, Share2, ExternalLink, Calendar } from 'lucide-react';
import embedService, { EmbedBlogArticle } from '@/services/embedService';
import interactionService from '@/services/interactionService';

const BlogEmbedPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  const [article, setArticle] = useState<EmbedBlogArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionStats, setInteractionStats] = useState({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0
  });

  // Paramètres UTM depuis l'URL
  const utmParams = {
    client_id: searchParams.get('client_id'),
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
    utm_content: searchParams.get('utm_content')
  };

  useEffect(() => {
    if (!slug) {
      setError('Slug article manquant');
      setLoading(false);
      return;
    }

    loadArticle();
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

  const loadArticle = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer l'article via le service embed
      const articleData = await embedService.getBlogArticle(slug!, utmParams);
      setArticle(articleData);
      
      // Mettre à jour les stats d'interaction
      setInteractionStats(articleData.stats);

      // Injecter les métadonnées Schema.org
      const schemaScript = embedService.generateArticleSchemaOrg(articleData);
      const scriptElement = document.createElement('div');
      scriptElement.innerHTML = schemaScript;
      document.head.appendChild(scriptElement.firstChild!);

      // Mettre à jour le titre de la page
      const authorName = (articleData.author.id === 1 || articleData.author.name === 'Admin') ? 'PixelRise' : articleData.author.name;
      document.title = `${articleData.title} - ${authorName}`;

    } catch (error) {
      console.error('Erreur chargement article embed:', error);
      setError('Article non trouvé ou inaccessible');
    } finally {
      setLoading(false);
    }
  };

  const handleInteraction = async (type: 'like' | 'share'): Promise<void> => {
    if (!article) return;

    try {
      if (type === 'like') {
        // Toggle like sur l'article
        const result = await interactionService.toggleReaction({
          reactable_type: 'blog_post',
          reactable_id: article.id,
          type: 'like'
        });

        setInteractionStats(prev => ({
          ...prev,
          likes: result.new_count
        }));

      } else if (type === 'share') {
        // Enregistrer le partage
        const result = await interactionService.shareBlogPost(article.id);
        
        setInteractionStats(prev => ({
          ...prev,
          shares: result.shares
        }));

        // Partager natif du navigateur si disponible
        if (navigator.share) {
          await navigator.share({
            title: article.title,
            text: article.summary,
            url: window.location.href
          });
        } else {
          // Fallback : copier le lien
          navigator.clipboard.writeText(window.location.href);
          alert('Lien copié dans le presse-papiers !');
        }
      }
    } catch (error) {
      console.error(`Erreur ${type}:`, error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de l'article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <div className="text-red-500 mb-4">
              <ExternalLink className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Article non trouvé</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
            >
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header avec image */}
      {article.header_image && (
        <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
          <img
            src={article.header_image}
            alt={article.title}
            className="w-full h-full object-cover"
            style={{ objectFit: 'cover' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            {/* En-tête article */}
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight mb-4">
                {article.title}
              </h1>

              {/* Métadonnées */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(article.published_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{interactionStats.views} vues</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{interactionStats.likes} likes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{interactionStats.comments} commentaires</span>
                  </div>
                </div>
              </div>

              {/* Catégories */}
              {article.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {article.categories.map((category, index) => (
                    <Badge key={index} variant="secondary">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator className="mb-6" />

            {/* Résumé */}
            {article.summary && (
              <div className="mb-8">
                <div className="bg-blue-50 border-l-4 border-brand-blue p-4 rounded-r">
                  <p className="text-slate-700 font-medium italic">
                    {article.summary}
                  </p>
                </div>
              </div>
            )}

            {/* Contenu principal */}
            <div
              className="prose prose-lg max-w-none mb-8"
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <Separator className="mb-6" />

            {/* Actions d'interaction */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => handleInteraction('like')}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200"
                >
                  <Heart className="h-4 w-4" />
                  J'aime ({interactionStats.likes})
                </Button>

                <Button
                  onClick={() => handleInteraction('share')}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200"
                >
                  <Share2 className="h-4 w-4" />
                  Partager ({interactionStats.shares})
                </Button>
              </div>

              {/* Lien vers le site client */}
              {article.author.website && article.author.website !== '#' && (
                <Button
                  onClick={() => window.open(article.author.website, '_blank')}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visiter le site
                </Button>
              )}
            </div>

            {/* Backlink vers le site client */}
            <div className="bg-slate-50 rounded-lg p-4 text-center border-2 border-slate-200">
              <p className="text-slate-600 text-sm">
                {article.backlink.text}
              </p>
              {article.author.website && article.author.website !== '#' && (
                <Button
                  onClick={() => window.open(article.author.website, '_blank')}
                  variant="link"
                  className="text-brand-blue hover:text-brand-blue/80 p-0 mt-2"
                >
                  {article.author.website}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Pixel Rise */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>
            Propulsé par{' '}
            <a 
              href="https://pixel-rise.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-brand-blue hover:underline font-medium"
            >
              Pixel Rise
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BlogEmbedPage;