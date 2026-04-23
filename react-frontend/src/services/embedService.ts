// src/services/embedService.ts - SERVICE EMBED ARTICLES (VERSION SIMPLIFIÉE)

import api from "./api";
import { AxiosResponse } from "axios";

// ✅ TYPES TYPESCRIPT STRICTS
interface EmbedArticle {
  id: number; // ✅ AJOUTÉ - ID numérique requis
  title: string;
  excerpt: string;
  url: string;
  image: string | null;
  published_at: string;
  slug?: string; // ✅ AJOUTÉ - Pour la redirection vers l'article
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

interface EmbedBlogFeedResponse {
  success: boolean;
  data: {
    clientName: string;
    clientUrl: string;
    articles: EmbedArticle[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      from: number;
      to: number;
    };
  };
  message: string;
}

interface EmbedBlogArticle {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string;
  header_image: string | null;
  published_at: string;
  author: {
    id: number;
    name: string;
    website: string;
  };
  categories: Array<{
    name: string;
    slug: string;
  }>;
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  backlink: {
    text: string;
    url: string;
  };
}

interface EmbedBlogArticleResponse {
  success: boolean;
  data: EmbedBlogArticle;
  message: string;
}

interface ExportBlogArticle {
  title: string;
  content: string;
  excerpt: string;
  image: string | null;
  tags: string[];
  categories: string[];
  published_at: string;
}

interface ExportBlogArticleResponse {
  success: boolean;
  data: ExportBlogArticle;
  message: string;
}

/**
 * Service pour l'embed des articles de blog
 * Utilisé par les widgets JavaScript sur les sites clients
 */
class EmbedService {
  private readonly LOG_PREFIX = "🔗 [EmbedService]";

  /**
   * Récupérer le flux d'articles pour un client (pour widget JavaScript)
   * GET /api/embed/blogs?client_id=CLIENT_ID&page=1&per_page=6
   */
  async getBlogFeed(
    clientId: string | number,
    page: number = 1,
    perPage: number = 6
  ): Promise<EmbedBlogFeedResponse["data"]> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération flux blog pour client:`,
        clientId
      );

      const response: AxiosResponse<EmbedBlogFeedResponse> = await api.get(
        "/embed/blogs",
        {
          params: {
            client_id: clientId,
            page: page,
            per_page: perPage,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors de la récupération du flux"
        );
      }

      console.log(
        `${this.LOG_PREFIX} Flux récupéré:`,
        response.data.data.articles.length,
        "articles"
      );
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération flux:`, error);
      throw error;
    }
  }

  /**
   * Récupérer un article complet par slug (pour page article embed)
   * GET /api/embed/blog/{slug}
   */
  async getBlogArticle(
    slug: string,
    params?: {
      client_id?: string | number;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
    }
  ): Promise<EmbedBlogArticle> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération article:`, slug);

      const response: AxiosResponse<EmbedBlogArticleResponse> = await api.get(
        `/embed/blog/${slug}`,
        {
          params,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Article non trouvé");
      }

      console.log(
        `${this.LOG_PREFIX} Article récupéré:`,
        response.data.data.title
      );
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération article:`, error);
      throw error;
    }
  }

  /**
   * Exporter un article complet pour import CMS (Premium)
   * GET /api/embed/blog/article/{id}?client_id=CLIENT_ID
   */
  async exportBlogArticle(
    articleId: number,
    clientId: string | number
  ): Promise<ExportBlogArticle> {
    try {
      console.log(
        `${this.LOG_PREFIX} Export article premium:`,
        articleId,
        "pour client:",
        clientId
      );

      const response: AxiosResponse<ExportBlogArticleResponse> = await api.get(
        `/embed/blog/article/${articleId}`,
        {
          params: {
            client_id: clientId,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de l'export");
      }

      console.log(
        `${this.LOG_PREFIX} Article exporté:`,
        response.data.data.title
      );
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur export article:`, error);
      throw error;
    }
  }

  /**
   * Générer le code iframe pour le formulaire de réservation
   */
  generateReservationIframeCode(clientId: string | number, type: 'full' | 'quick' = 'full'): string {
    const envConfig = this.detectEnvironment();
    const endpoint = type === 'full' ? 'reservation-full' : 'reservation-quick';
    const height = type === 'full' ? '750' : '450';

    return `<iframe src="${envConfig.baseUrl}/iframe/${endpoint}?client_id=${clientId}" width="100%" height="${height}" frameborder="0" style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); min-width: 300px;" title="Formulaire de réservation ${type === 'full' ? 'complet' : 'rapide'}"></iframe>`;
  }

  /**
   * Générer le code iframe pour le formulaire de contact
   */
  generateContactIframeCode(clientId: string | number): string {
    const envConfig = this.detectEnvironment();

    return `<iframe src="${envConfig.baseUrl}/iframe/contact?client_id=${clientId}" width="100%" height="550" frameborder="0" style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); min-width: 300px;" title="Formulaire de contact"></iframe>`;
  }

  /**
   * Détecter l'environnement et renvoyer l'URL de base appropriée
   * @returns Objet avec baseUrl, environment et autres configurations
   */
  detectEnvironment(): {
    baseUrl: string;
    apiUrl: string;
    articleBaseUrl: string;
    environment: 'local' | 'development' | 'production';
    apiEndpoints: {
      contact: string;
      reservation: string;
    };
  } {
    const hostname = window.location.hostname;
    const isDev = hostname === 'dev.pixel-rise.com' || hostname === '109.199.107.0';
    const isProd = hostname === 'app.pixel-rise.com' || hostname === '194.163.134.150';
    const isLocal = ['localhost', '127.0.0.1'].includes(hostname);

    let baseUrl: string;
    let environment: 'local' | 'development' | 'production';

    if (isDev) {
      baseUrl = 'https://dev.pixel-rise.com';
      environment = 'development';
    } else if (isProd) {
      baseUrl = 'https://app.pixel-rise.com';
      environment = 'production';
    } else {
      // Développement local avec fallback
      baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:8000';
      environment = 'local';
    }

      return {
      baseUrl,
      apiUrl: `${baseUrl}/api`,
      articleBaseUrl: `${baseUrl}/blog`,
      environment,
      apiEndpoints: {
        contact: `${baseUrl}/api/embed/contact`,
        reservation: `${baseUrl}/api/embed/reservation`
      }
    };
  }

  /**
   * ✅ NOUVEAU : Générer le code JavaScript pour le flux de blog avec pagination
   * Les commentaires sont maintenant uniquement sur la page dédiée
   */
  generateBlogEmbedCode(
    clientId: string | number, 
    options: {
      perPage?: number;
      showPagination?: boolean;
    } = {}
  ): string {
    const { perPage = 6, showPagination = true } = options;
    const envConfig = this.detectEnvironment();

    return `<script>
(function() {
  // ✅ Configuration injectée depuis le serveur - ENVIRONNEMENT FIXÉ
  const clientId = '${clientId}';
  const EMBED_CONFIG = ${JSON.stringify(envConfig)};
  
  // ✅ ENVIRONNEMENT FIXÉ : Utilise la configuration injectée depuis le serveur
  function detectEnvironment() {
    // ✅ PRIORITÉ 1 : Configuration injectée depuis le serveur (plus fiable)
    if (typeof EMBED_CONFIG !== 'undefined') {
      console.log('✅ Configuration serveur utilisée:', EMBED_CONFIG.environment);
      return {
        baseUrl: EMBED_CONFIG.baseUrl,
        apiUrl: EMBED_CONFIG.apiUrl,
        articleBaseUrl: EMBED_CONFIG.articleBaseUrl,
        env: EMBED_CONFIG.environment
      };
    }
    
    // ✅ FALLBACK : Détection manuelle (pour rétrocompatibilité)
    console.log('⚠️ Utilisation de la détection fallback');
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    console.log('📍 Hostname du client:', hostname);
    console.log('📍 Protocol du client:', protocol);

    // SEULS CAS LOCALHOST : Tests de développement local avec ports spécifiques
    const isLocalDevelopment = (
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      (window.location.port === '8080' || window.location.port === '3000' || window.location.port === '5173')
    ) || protocol === 'file:';

    if (isLocalDevelopment) {
      console.log('🏠 Fallback: LOCAL (développement)');
      return {
        baseUrl: 'http://localhost:8000',
        apiUrl: 'http://localhost:8000/api',
        articleBaseUrl: 'http://localhost:8000/blog', // ✅ CORRIGÉ : /blog au lieu de /article
        env: 'local'
      };
    }

    // ✅ NOUVEAU : Détection serveur DEV (dev.pixel-rise.com)
    // Note: Le code embed détecte où il tourne (site client), donc on force toujours PRODUCTION
    // La configuration serveur injectée (EMBED_CONFIG) gère automatiquement DEV vs PROD

    // ✅ PRODUCTION PAR DÉFAUT pour tous les autres cas
    console.log('🚀 Fallback: PRODUCTION (app.pixel-rise.com)');
    return {
      baseUrl: 'https://app.pixel-rise.com',
      apiUrl: 'https://app.pixel-rise.com/api',
      articleBaseUrl: 'https://app.pixel-rise.com/blog', // ✅ CORRIGÉ : /blog au lieu de /article
      env: 'production'
    };
  }
  
  const config = detectEnvironment();
  const apiUrl = config.apiUrl;
  const articleBaseUrl = config.articleBaseUrl;
  
  console.log('🔗 Pixel Rise Embed - Environnement détecté:', config.env);
  console.log('🔗 API URL:', apiUrl);
  
  const icons = {
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    heart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    heartFilled: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    message: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    share: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>'
  };
  
  // ✅ PAGINATION : Variables globales
  let currentPage = 1;
  let lastPage = 1;
  let isLoading = false;
  const perPage = ${perPage};

  const container = document.getElementById('pixel-rise-blog-container') || document.createElement('div');
  container.id = 'pixel-rise-blog-container';
  
  // ✅ Container principal avec zone pour pagination
  container.style.cssText = 'max-width: 1200px; margin: 0 auto; padding: 20px;';
  
  // ✅ Zones distinctes pour articles et pagination
  const articlesGrid = document.createElement('div');
  articlesGrid.id = 'pixel-rise-articles-grid';
  articlesGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, 350px); gap: 24px; justify-content: center; margin-bottom: 32px;';
  
  const paginationContainer = document.createElement('div');
  paginationContainer.id = 'pixel-rise-pagination';
  paginationContainer.style.cssText = '${showPagination ? 'display: flex;' : 'display: none;'} justify-content: center; align-items: center; gap: 12px; padding: 20px 0; border-top: 1px solid #e2e8f0; margin-top: 24px;';
  
  let interactionCooldowns = {};
  const COOLDOWN_MS = 2000;
  
  function getEmbedToken() {
    return btoa(clientId + ':' + Date.now()).substr(0, 32);
  }
  
  async function callPixelRiseAPI(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Embed-Token': getEmbedToken(),
          'X-Client-ID': clientId
        },
        credentials: 'omit'
      };
      
      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(apiUrl + endpoint, options);
      
      if (!response.ok) {
        throw new Error('Erreur API: ' + response.status);
      }
      
      return await response.json();
      
    } catch (error) {
      console.warn('⚠️ Pixel Rise API:', error);
      throw error;
    }
  }
  
  function redirectToArticle(slug) {
    const articleUrl = articleBaseUrl + '/' + slug;
    window.location.href = articleUrl;
  }
  
  async function handleRealInteraction(articleId, type, btn, counter) {
    const now = Date.now();
    const cooldownKey = type + '_' + articleId;
    
    if (interactionCooldowns[cooldownKey] && (now - interactionCooldowns[cooldownKey]) < COOLDOWN_MS) {
      console.log('🛡️ Rate limit: Interaction trop rapide');
      return;
    }
    
    interactionCooldowns[cooldownKey] = now;
    
    try {
      btn.style.opacity = '0.6';
      btn.disabled = true;
      
      if (type === 'like') {
        const result = await callPixelRiseAPI('/interactions/embed/like', 'POST', {
          post_type: 'blog',
          post_id: articleId
        });
        counter.textContent = result.data.new_count;

        // Animation de feedback
        if (result.data.action === 'added') {
          btn.innerHTML = icons.heartFilled;
          btn.style.color = '#ef4444';
          btn.setAttribute('data-liked', 'true');

          // Animation d'échelle pour feedback visuel
          btn.style.transform = 'scale(1.3)';
          setTimeout(() => {
            btn.style.transform = 'scale(1)';
          }, 200);

          showToast('❤️ Article ajouté aux favoris !', 'success');
        } else {
          btn.innerHTML = icons.heart;
          btn.style.color = '#64748b';
          btn.removeAttribute('data-liked');

          showToast('💔 Like retiré', 'success');
        }
      } else if (type === 'share') {
        const result = await callPixelRiseAPI('/interactions/embed/share', 'POST', {
          post_type: 'blog',
          post_id: articleId
        });
        counter.textContent = result.data.shares;

        const articleUrl = articleBaseUrl + '/' + btn.closest('article').querySelector('h3').textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (navigator.share) {
          try {
            await navigator.share({
              title: btn.closest('article').querySelector('h3').textContent,
              url: articleUrl
            });
            showToast('🔗 Article partagé avec succès !', 'success');
          } catch (err) {
            if (err.name !== 'AbortError') {
              console.warn('Partage annulé:', err);
            }
          }
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(articleUrl);

          const originalText = btn.innerHTML;
          btn.innerHTML = '<span style="font-size: 10px;">✓</span>';
          btn.style.backgroundColor = '#22c55e';
          btn.style.color = 'white';

          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = 'transparent';
            btn.style.color = '#64748b';
          }, 1500);

          showToast('📋 Lien copié dans le presse-papier !', 'success');
        } else {
          // Fallback : créer un textarea temporaire pour copier
          const textarea = document.createElement('textarea');
          textarea.value = articleUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span style="font-size: 10px;">✓</span>';
            btn.style.backgroundColor = '#22c55e';
            btn.style.color = 'white';

            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.backgroundColor = 'transparent';
              btn.style.color = '#64748b';
            }, 1500);

            showToast('📋 Lien copié !', 'success');
          } catch (err) {
            console.warn('Copie échouée:', err);
            showToast('❌ Impossible de copier le lien', 'error');
          } finally {
            document.body.removeChild(textarea);
          }
        }
      }
      
    } catch (error) {
      console.warn('Interaction échouée:', error);

      // Feedback visuel d'erreur
      if (type === 'like') {
        showToast('❌ Impossible d\\\'aimer cet article pour le moment', 'error');
      } else if (type === 'share') {
        showToast('❌ Impossible de partager cet article pour le moment', 'error');
      }

      // Incrémenter quand même le compteur localement en cas d'erreur réseau
      const currentCount = parseInt(counter.textContent);
      counter.textContent = currentCount + 1;

    } finally {
      btn.style.opacity = '1';
      btn.disabled = false;
    }
  }
  
  async function recordView(articleId) {
    try {
      await callPixelRiseAPI('/interactions/view', 'POST', {
        post_type: 'blog',
        post_id: parseInt(articleId)
      });
    } catch (error) {
      console.debug('Vue non enregistrée:', error);
    }
  }
  
  window.handleReaction = function(articleId, type, btn, counter) {
    handleRealInteraction(articleId, type, btn, counter);
  };
  
  window.redirectToArticle = function(slug) {
    redirectToArticle(slug);
  };

  // ✅ FONCTION TOAST NOTIFICATION
  function showToast(message, type = 'success') {
    const existingToast = document.getElementById('pixel-rise-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'pixel-rise-toast';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: ' +
      (type === 'success' ? '#22c55e' : '#ef4444') +
      '; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999; font-size: 14px; font-weight: 500; animation: slideIn 0.3s ease-out;';
    toast.textContent = message;

    // Ajout de l'animation CSS
    const style = document.createElement('style');
    style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
    document.head.appendChild(style);

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ✅ FONCTIONS PAGINATION
  function createPaginationButton(text, page, isActive = false, isDisabled = false) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = 'padding: 8px 12px; border: 1px solid #e2e8f0; background: ' + 
      (isActive ? '#3b82f6' : 'white') + '; color: ' + 
      (isActive ? 'white' : (isDisabled ? '#94a3b8' : '#374151')) + 
      '; border-radius: 6px; font-size: 14px; cursor: ' + 
      (isDisabled ? 'not-allowed' : 'pointer') + 
      '; transition: all 0.2s; min-width: 40px;';
    
    if (!isDisabled) {
      btn.onmouseover = function() {
        if (!isActive) {
          this.style.backgroundColor = '#f1f5f9';
          this.style.borderColor = '#3b82f6';
        }
      };
      btn.onmouseout = function() {
        if (!isActive) {
          this.style.backgroundColor = 'white';
          this.style.borderColor = '#e2e8f0';
        }
      };
      btn.onclick = function() {
        if (page !== currentPage) {
          loadPage(page);
        }
      };
    }
    
    return btn;
  }

  function updatePagination(pagination) {
    paginationContainer.innerHTML = '';
    
    if (pagination.last_page <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    
    paginationContainer.style.display = 'flex';
    currentPage = pagination.current_page;
    lastPage = pagination.last_page;
    
    // Bouton Précédent
    const prevBtn = createPaginationButton('‹ Précédent', currentPage - 1, false, currentPage <= 1);
    paginationContainer.appendChild(prevBtn);
    
    // Pages numériques
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(lastPage, currentPage + 2);
    
    // Ajuster la plage si nécessaire
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(lastPage, startPage + 4);
      } else if (endPage === lastPage) {
        startPage = Math.max(1, endPage - 4);
      }
    }
    
    // Page 1 si elle n'est pas dans la plage
    if (startPage > 1) {
      paginationContainer.appendChild(createPaginationButton('1', 1));
      if (startPage > 2) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.style.cssText = 'padding: 8px 4px; color: #94a3b8;';
        paginationContainer.appendChild(dots);
      }
    }
    
    // Pages dans la plage
    for (let i = startPage; i <= endPage; i++) {
      paginationContainer.appendChild(createPaginationButton(i.toString(), i, i === currentPage));
    }
    
    // Dernière page si elle n'est pas dans la plage
    if (endPage < lastPage) {
      if (endPage < lastPage - 1) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.style.cssText = 'padding: 8px 4px; color: #94a3b8;';
        paginationContainer.appendChild(dots);
      }
      paginationContainer.appendChild(createPaginationButton(lastPage.toString(), lastPage));
    }
    
    // Bouton Suivant
    const nextBtn = createPaginationButton('Suivant ›', currentPage + 1, false, currentPage >= lastPage);
    paginationContainer.appendChild(nextBtn);
    
    // Indicateur de position
    const info = document.createElement('div');
    info.style.cssText = 'margin-left: 16px; color: #64748b; font-size: 14px; padding: 8px 0;';
    info.textContent = 'Page ' + currentPage + ' sur ' + lastPage + ' (' + pagination.total + ' articles)';
    paginationContainer.appendChild(info);
  }
  
  function renderArticles(articles) {
    return articles.map(article => {
          const safeTitle = article.title.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
          const safeExcerpt = article.excerpt.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
          const articleSlug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          
          setTimeout(() => recordView(article.id), 1000);
          
          return '<article style="width: 350px; min-height: 480px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s ease; display: flex; flex-direction: column;" onmouseover="this.style.transform=\\'translateY(-4px)\\'; this.style.boxShadow=\\'0 8px 25px rgba(0,0,0,0.15)\\';" onmouseout="this.style.transform=\\'translateY(0)\\'; this.style.boxShadow=\\'0 2px 8px rgba(0,0,0,0.1)\\';">' +
            (article.image ? 
              '<div style="width: 100%; height: 200px; overflow: hidden;"><img src="' + article.image + '" style="width: 100%; height: 100%; object-fit: cover;" alt="' + safeTitle + '"></div>' :
              '<div style="width: 100%; height: 200px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);"></div>'
            ) +
            '<div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">' +
              '<h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: bold; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 48px;">' + safeTitle + '</h3>' +
              '<p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; flex: 1; min-height: 67px;">' + safeExcerpt + '</p>' +
              '<div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: auto;">' +
                
                '<!-- ✅ STATISTIQUES ET INTERACTIONS SIMPLIFIÉES -->' +
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">' +
                  '<div style="display: flex; gap: 12px; color: #94a3b8; font-size: 12px;">' +
                    '<span style="display: flex; align-items: center; gap: 4px;">' + icons.eye + ' ' + article.stats.views + '</span>' +
                    '<!-- ✅ NOUVEAU : Commentaires cliquables pour redirection -->' +
                    '<button onclick="redirectToArticle(\\''+articleSlug+'\\')" style="display: flex; align-items: center; gap: 4px; background: none; border: none; color: #94a3b8; font-size: 12px; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all 0.3s;" onmouseover="this.style.backgroundColor=\\'#f0f9ff\\'; this.style.color=\\'#3b82f6\\';" onmouseout="this.style.backgroundColor=\\'transparent\\'; this.style.color=\\'#94a3b8\\';" title="Voir les commentaires">' +
                      icons.message + ' ' + article.stats.comments +
                    '</button>' +
                  '</div>' +
                  '<div style="display: flex; gap: 8px; align-items: center;">' +
                    '<button onclick="handleReaction(' + article.id + ', \\'like\\', this, this.nextElementSibling)" style="background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; color: #64748b; transition: all 0.3s ease;" onmouseover="this.style.backgroundColor=\\'#fef2f2\\'; this.style.color=\\'#ef4444\\';" onmouseout="this.style.backgroundColor=\\'transparent\\'; this.style.color=\\'#64748b\\';">' + icons.heart + '</button>' +
                    '<span style="font-size: 12px; color: #94a3b8; min-width: 16px;">' + article.stats.likes + '</span>' +
                    '<button onclick="handleReaction(' + article.id + ', \\'share\\', this, this.nextElementSibling)" style="background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; color: #64748b; transition: all 0.3s ease;" onmouseover="this.style.backgroundColor=\\'#f0fdf4\\'; this.style.color=\\'#16a34a\\';" onmouseout="this.style.backgroundColor=\\'transparent\\'; this.style.color=\\'#64748b\\';">' + icons.share + '</button>' +
                    '<span style="font-size: 12px; color: #94a3b8; min-width: 16px;">' + article.stats.shares + '</span>' +
                  '</div>' +
                '</div>' +
                
                '<!-- ✅ BOUTON PRINCIPAL UNIQUE : Lire la suite -->' +
                '<a href="' + articleBaseUrl + '/' + articleSlug + '" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 16px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; display: block; text-align: center; transition: all 0.3s ease;" onmouseover="this.style.transform=\\'translateY(-1px)\\';" onmouseout="this.style.transform=\\'translateY(0)\\';">Lire la suite →</a>' +
              '</div>' +
            '</div>' +
          '</article>';
    }).join('');
  }

  function loadPage(page) {
    if (isLoading) return;
    
    isLoading = true;
    currentPage = page;
    
    // ✅ Indicateur de chargement
    articlesGrid.style.opacity = '0.6';
    articlesGrid.style.pointerEvents = 'none';
    
    fetch(apiUrl + '/embed/blogs?client_id=' + clientId + '&page=' + page + '&per_page=' + perPage)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.data.articles.length > 0) {
          articlesGrid.innerHTML = renderArticles(data.data.articles);
          if (data.data.pagination) {
            updatePagination(data.data.pagination);
          }
          
          // ✅ Scroll vers le haut des articles
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
        } else {
          articlesGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #64748b; padding: 40px;"><p>Aucun article disponible pour cette page.</p></div>';
        }
      })
      .catch(error => {
        articlesGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 40px;"><p>Erreur lors du chargement des articles.</p></div>';
      })
      .finally(() => {
        articlesGrid.style.opacity = '1';
        articlesGrid.style.pointerEvents = 'auto';
        isLoading = false;
      });
  }

  // ✅ CHARGEMENT INITIAL
  fetch(apiUrl + '/embed/blogs?client_id=' + clientId + '&page=1&per_page=' + perPage)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.data.articles.length > 0) {
        articlesGrid.innerHTML = renderArticles(data.data.articles);
        if (data.data.pagination) {
          updatePagination(data.data.pagination);
        }
        
      } else {
        articlesGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #64748b; padding: 40px;"><p>Aucun article disponible pour le moment.</p></div>';
      }
    })
    .catch(error => {
      articlesGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 40px;"><p>Erreur lors du chargement des articles.</p></div>';
    });
  
  // ✅ ASSEMBLAGE DU CONTAINER
  if (!document.getElementById('pixel-rise-blog-container')) {
    container.appendChild(articlesGrid);
    container.appendChild(paginationContainer);
    document.body.appendChild(container);
  }
})();
</script>`;
  }

  /**
   * Générer les métadonnées Schema.org pour un article
   */
  generateArticleSchemaOrg(article: EmbedBlogArticle): string {
    const envConfig = this.detectEnvironment();
    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.summary,
      url: `${envConfig.baseUrl}/embed/blog/${article.slug}`,
      image: article.header_image,
      publisher: {
        "@type": "Organization",
        name: article.author.name,
        url: article.author.website,
      },
      author: {
        "@type": "Organization",
        name: "Pixel Rise",
        url: "https://pixel-rise.com",
      },
    };

    return `<script type="application/ld+json">${JSON.stringify(
      schema,
      null,
      2
    )}</script>`;
  }

  /**
   * ✅ NOUVEAU : Générer TOUS les codes embed et iframes pour un client
   * Cette fonction centralise TOUTE la logique de génération pour garantir 
   * la synchronisation automatique entre la page utilisateur et admin
   */
  generateAllEmbedCodes(clientId: string | number): {
    blogEmbedCode: string;
    contactScriptCode: string;
    reservationQuickScriptCode: string;
    reservationFullScriptCode: string;
  } {
    const envConfig = this.detectEnvironment();
    const baseUrl = envConfig.baseUrl;

    const reservationQuickScriptCode = this.generateReservationScriptCode(clientId, 'quick');
    const reservationFullScriptCode = this.generateReservationScriptCode(clientId, 'full');
    const blogEmbedCode = this.generateBlogEmbedCode(clientId);
    const contactScriptCode = this.generateContactScriptCode(clientId);

    return {
      blogEmbedCode,
      contactScriptCode,
      reservationQuickScriptCode,
      reservationFullScriptCode,
    };
  }

  /**
   * Générer un script dynamique pour les formulaires de réservation avec sécurisation améliorée
   */
  generateReservationScriptCode(clientId: string | number, type: 'quick' | 'full' = 'full'): string {
    const envConfig = this.detectEnvironment();
    const baseUrl = envConfig.baseUrl;
    const height = type === 'full' ? 750 : 450;

    return `<script>
(function() {
  const clientId = '${clientId}';
  const baseUrl = '${baseUrl}';
  const type = '${type}';

  // Fonction pour générer le token embed
  function getEmbedToken(clientId) {
    const timestamp = Date.now();
    const tokenData = \`\${clientId}:\${timestamp}\`;
    return btoa(tokenData);
  }

  // Créer un conteneur pour le formulaire
  const container = document.createElement('div');
  container.id = 'pixel-rise-reservation-form';
  container.style.cssText = \`
    max-width: 600px; 
    margin: 0 auto; 
    padding: 20px; 
    font-family: 'Arial', sans-serif;
    background-color: #f9fafb;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    height: ${height}px;
    overflow-y: auto;
  \`;

  // Style du formulaire
  const formStyle = \`
    display: flex;
    flex-direction: column;
    gap: 15px;
  \`;

  // Style des inputs
  const inputStyle = \`
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
  \`;

  // Style du bouton
  const buttonStyle = \`
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: bold;
    margin-top: 15px;
  \`;

  // Créer le formulaire HTML
  container.innerHTML = \`
    <form id="pixel-rise-reservation-form-element" style="\${formStyle}">
      <input 
        type="text" 
        name="name" 
        placeholder="Votre nom complet" 
        required 
        style="\${inputStyle}"
      >
      <input 
        type="email" 
        name="email" 
        placeholder="Votre email" 
        required 
        style="\${inputStyle}"
      >
      <input 
        type="tel" 
        name="phone" 
        placeholder="Votre téléphone" 
        required 
        style="\${inputStyle}"
      >
      
      \${type === 'full' ? \`
        <input 
          type="date" 
          name="date" 
          placeholder="Date souhaitée" 
          required 
          style="\${inputStyle}"
        >
        <textarea 
          name="message" 
          placeholder="Détails supplémentaires" 
          rows="4" 
          style="\${inputStyle}"
        ></textarea>
      \` : ''}
      
      <input 
        type="hidden" 
        name="client_id" 
        value="\${clientId}"
      >
      <input 
        type="hidden" 
        name="reservation_type" 
        value="\${type}"
      >
      <button 
        type="submit" 
        style="\${buttonStyle}"
        onmouseover="this.style.transform='translateY(-2px)'"
        onmouseout="this.style.transform='translateY(0)'"
      >
        \${type === 'full' ? 'Réserver un rendez-vous complet' : 'Réservation rapide'}
      </button>
    </form>
  \`;

  // Gestion de la soumission du formulaire
  const form = container.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
      const embedToken = getEmbedToken(clientId);

      const response = await fetch(\`\${baseUrl}/api/embed/reservation\`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'X-Client-ID': clientId,
          'X-Embed-Token': embedToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData)
      });

      const result = await response.json();

      if (result.success) {
        form.innerHTML = \`
          <div style="text-align: center; color: #10b981; font-weight: bold;">
            Merci ! Votre réservation a été enregistrée.
            \${result.message ? \`<p style="font-size: 14px; color: #64748b;">\${result.message}</p>\` : ''}
          </div>
        \`;
      } else {
        throw new Error(result.message || "Erreur lors de la réservation");
      }
    } catch (error) {
      form.innerHTML = \`
        <div style="text-align: center; color: #ef4444; font-weight: bold;">
          Une erreur s'est produite. Veuillez réessayer.
          <p style="font-size: 14px; color: #64748b;">\${error.message}</p>
        </div>
      \`;
      console.error('Erreur réservation:', error);
    }
  });

  // Ajouter au document
  document.body.appendChild(container);
})();
</script>`;
  }

  /**
   * Générer un token embed sécurisé
   * @param clientId Identifiant du client
   * @returns Token embed base64
   */
  generateEmbedToken(clientId: string | number): string {
    const timestamp = Date.now();
    const tokenData = `${clientId}:${timestamp}`;
    return btoa(tokenData);
  }

  /**
   * Soumettre un formulaire embed avec sécurisation
   * @param baseUrl URL de base du backend
   * @param endpoint Point d'entrée de l'API
   * @param clientId Identifiant du client
   * @param formData Données du formulaire
   * @returns Promesse résolue avec la réponse du serveur
   */
  async submitEmbedForm(
    baseUrl: string, 
    endpoint: string, 
    clientId: string | number, 
    formData: FormData
  ): Promise<{
    success: boolean;
    message?: string;
    [key: string]: any;
  }> {
    try {
      const embedToken = this.generateEmbedToken(clientId);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'X-Client-ID': clientId.toString(),
          'X-Embed-Token': embedToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData as any)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Erreur lors de l'envoi");
      }

      return result;
    } catch (error) {
      console.error('Erreur formulaire embed:', error);
      throw error;
    }
  }

  /**
   * Générer un script dynamique pour le formulaire de contact avec gestion d'erreur améliorée
   */
  generateContactScriptCode(clientId: string | number): string {
    const envConfig = this.detectEnvironment();
    const baseUrl = envConfig.baseUrl;

    return `<script>
(function() {
  const clientId = '${clientId}';
  const baseUrl = '${baseUrl}';

  // Créer un conteneur pour le formulaire
  const container = document.createElement('div');
  container.id = 'pixel-rise-contact-form';
  container.style.cssText = \`
    max-width: 500px; 
    margin: 0 auto; 
    padding: 20px; 
    font-family: 'Arial', sans-serif;
    background-color: #f9fafb;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  \`;

  // Style du formulaire
  const formStyle = \`
    display: flex;
    flex-direction: column;
    gap: 15px;
  \`;

  // Style des inputs
  const inputStyle = \`
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
  \`;

  // Style du bouton
  const buttonStyle = \`
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: bold;
  \`;

  // Fonction pour générer le token embed
  function getEmbedToken(clientId) {
    const timestamp = Date.now();
    const tokenData = \`\${clientId}:\${timestamp}\`;
    return btoa(tokenData);
  }

  // Créer le formulaire HTML
  container.innerHTML = \`
    <form id="pixel-rise-contact-form-element" style="\${formStyle}">
      <input 
        type="text" 
        name="name" 
        placeholder="Votre nom" 
        required 
        style="\${inputStyle}"
      >
      <input 
        type="email" 
        name="email" 
        placeholder="Votre email" 
        required 
        style="\${inputStyle}"
      >
      <textarea 
        name="message" 
        placeholder="Votre message" 
        required 
        rows="4" 
        style="\${inputStyle}"
      ></textarea>
      <input 
        type="hidden" 
        name="client_id" 
        value="\${clientId}"
      >
      <button 
        type="submit" 
        style="\${buttonStyle}"
        onmouseover="this.style.transform='translateY(-2px)'"
        onmouseout="this.style.transform='translateY(0)'"
      >
        Envoyer votre message
      </button>
    </form>
  \`;

  // Gestion de la soumission du formulaire
  const form = container.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    
    try {
      const embedToken = getEmbedToken(clientId);

      const response = await fetch(\`\${baseUrl}/api/embed/contact\`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'X-Client-ID': clientId,
          'X-Embed-Token': embedToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData)
      });

      const result = await response.json();

      if (result.success) {
        form.innerHTML = \`
          <div style="text-align: center; color: #10b981; font-weight: bold;">
            Merci ! Votre message a été envoyé.
            \${result.message ? \`<p style="font-size: 14px; color: #64748b;">\${result.message}</p>\` : ''}
          </div>
        \`;
      } else {
        throw new Error(result.message || "Erreur lors de l'envoi");
      }
    } catch (error) {
      form.innerHTML = \`
        <div style="text-align: center; color: #ef4444; font-weight: bold;">
          Une erreur s'est produite. Veuillez réessayer.
          <p style="font-size: 14px; color: #64748b;">\${error.message}</p>
        </div>
      \`;
      console.error('Erreur formulaire:', error);
    }
  });

  // Ajouter au document
  document.body.appendChild(container);
})();
</script>`;
  }

  /**
   * Soumettre un formulaire de réservation embed
   * @param clientId Identifiant du client
   * @param formData Données du formulaire
   * @param type Type de réservation (rapide ou complète)
   * @returns Promesse résolue avec la réponse du serveur
   */
  async submitReservationForm(
    clientId: string | number, 
    formData: FormData,
    type: 'quick' | 'full' = 'full'
  ): Promise<{
    success: boolean;
    message?: string;
    reservation_id?: number;
    [key: string]: any;
  }> {
    try {
      const { baseUrl, apiEndpoints } = this.detectEnvironment();
      const embedToken = this.generateEmbedToken(clientId);

      // Ajouter le type de réservation aux données du formulaire
      formData.append('reservation_type', type);

      const response = await fetch(apiEndpoints.reservation, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'X-Client-ID': clientId.toString(),
          'X-Embed-Token': embedToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData as any)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Erreur lors de la réservation");
      }

      return result;
    } catch (error) {
      console.error('Erreur formulaire de réservation:', error);
      throw error;
    }
  }

  /**
   * Soumettre un formulaire de contact embed
   * @param clientId Identifiant du client
   * @param formData Données du formulaire
   * @returns Promesse résolue avec la réponse du serveur
   */
  async submitContactForm(
    clientId: string | number, 
    formData: FormData
  ): Promise<{
    success: boolean;
    message?: string;
    contact_id?: number;
    [key: string]: any;
  }> {
    try {
      const { baseUrl, apiEndpoints } = this.detectEnvironment();
      const embedToken = this.generateEmbedToken(clientId);

      const response = await fetch(apiEndpoints.contact, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'X-Client-ID': clientId.toString(),
          'X-Embed-Token': embedToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData as any)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Erreur lors de l'envoi du message de contact");
      }

      return result;
    } catch (error) {
      console.error('Erreur formulaire de contact:', error);
      throw error;
    }
  }

  /**
   * Vérifier la disponibilité des endpoints embed
   */
  async checkEmbedAvailability(): Promise<boolean> {
    try {
      // Test avec un client_id valide (ID 1 existe toujours)
      await this.getBlogFeed("1");
      return true;
    } catch (error) {
      console.warn(
        `${this.LOG_PREFIX} Endpoints embed non disponibles:`,
        error
      );
      return false;
    }
  }
}

// ✅ EXPORT SINGLETON
export const embedService = new EmbedService();
export default embedService;

// ✅ EXPORT TYPES
export type {
  EmbedArticle,
  EmbedBlogFeedResponse,
  EmbedBlogArticle,
  EmbedBlogArticleResponse,
  ExportBlogArticle,
  ExportBlogArticleResponse,
};
