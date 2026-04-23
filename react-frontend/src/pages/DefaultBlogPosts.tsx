import React, { useState, useEffect, useCallback, Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { toast } from "sonner";
import { Loader2, Clock, AlertCircle, RefreshCw, Lock, Zap } from "lucide-react";
import { blogService, BlogPost, BlogFilters } from "@/services/blogService";
import { categoryService, Category } from "@/services/categoryService";
import { adaptBlogPostForFrontend } from "@/data/blogData";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";

// ✅ LAZY LOADING des composants lourds pour réduire le temps de chargement initial
const UserBlogPostsFilters = React.lazy(() => import("@/components/user-blogs/UserBlogPostsFilters").then(module => ({ default: module.UserBlogPostsFilters })));
const UserBlogPostsTabs = React.lazy(() => import("@/components/user-blogs/UserBlogPostsTabs").then(module => ({ default: module.UserBlogPostsTabs })));
const DefaultBlogHeader = React.lazy(() => import("@/components/user-blogs/DefaultBlogHeader").then(module => ({ default: module.DefaultBlogHeader })));
const ProgressiveLoadingModal = React.lazy(() => import("@/components/ui/ProgressiveLoadingModal"));

interface BlogWebsite {
  id: string;
  title: string;
  description: string;
  domain: string;
  isDefault: boolean;
}

interface CategoryOption {
  value: string;
  label: string;
}

const DefaultBlogPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const { workspace } = useWorkspace();
  const isPro = workspace?.plan_key === 'pro' || workspace?.plan_key === 'premium';

  // États principaux
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [defaultBlog, setDefaultBlog] = useState<BlogWebsite | null>(null);
  const [loading, setLoading] = useState(true);

  // État pour éviter la page blanche après activation
  const [hasReceivedFirstPost, setHasReceivedFirstPost] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Modal de loading progressif depuis une autre page
  const [showProgressiveModal, setShowProgressiveModal] = useState(false);

  // États de filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Charger les données avec useCallback pour éviter les re-renders
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Ne pas activer loading si on a déjà reçu le premier post
      if (!hasReceivedFirstPost) {
        setLoading(true);
      }

      // Charger en parallèle
      const [blogPosts, blogCategories] = await Promise.all([
        blogService.getBlogPosts({
          user_id: user.id,
          ...(siteId ? { site_id: siteId } : {}),
          status: "all",
          per_page: 50,
        } as BlogFilters),
        categoryService.getCategories({
          is_active: true,
          type: "blog",
        }),
      ]);

      // Adapter les posts
      const adaptedPosts = blogPosts.map(adaptBlogPostForFrontend);

      // Fusionner avec les posts existants sans doublons
      setPosts((prevPosts) => {
        if (hasReceivedFirstPost && prevPosts.length > 0) {
          const existingIds = prevPosts.map((p) => p.id);
          const newPosts = adaptedPosts.filter(
            (p) => !existingIds.includes(p.id)
          );
          return [...prevPosts, ...newPosts];
        }
        return adaptedPosts;
      });

      setCategories(blogCategories);

      // Initialiser le blog par défaut
      setDefaultBlog({
        id: "default-blog",
        title: `Blog de ${user.name || "Utilisateur"}`,
        description: "Articles générés automatiquement chaque semaine",
        domain: "pixelrise.com",
        isDefault: true,
      });

      console.log(
        `✅ ${adaptedPosts.length} posts et ${blogCategories.length} catégories chargés`
      );
    } catch (error) {
      console.error("Erreur chargement données:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [user, siteId, hasReceivedFirstPost]);

  // Écouter les activations de fonctionnalités
  useEffect(() => {
    if (!user) return;

    const handleFeatureActivation = (event: CustomEvent) => {
      const { featureKey, firstPost } = event.detail;

      if (featureKey === "blog" && firstPost) {
        console.log(
          "🚀 [FeatureActivation] Premier blog post reçu immédiatement",
          firstPost
        );

        // Fermer le modal si ouvert depuis une autre page
        setShowProgressiveModal(false);

        // Marquer qu'on a reçu le premier post
        setHasReceivedFirstPost(true);
        setIsInitialLoad(false);

        // Ajouter immédiatement le premier post à l'état
        if (firstPost.blog_posts && firstPost.blog_posts.length > 0) {
          const adaptedPost = adaptBlogPostForFrontend(firstPost.blog_posts[0]);
          setPosts((prevPosts) => [adaptedPost, ...prevPosts]);

          // Stopper le loading immédiatement
          setLoading(false);

          toast.success("Premier article généré !", {
            description: "Votre contenu est maintenant disponible !",
            duration: 5000,
          });

          // Recharger complètement après 3 secondes pour synchroniser
          setTimeout(() => {
            loadData();
          }, 3000);
        } else {
          loadData();
        }
      }
    };

    window.addEventListener(
      "featureActivated",
      handleFeatureActivation as EventListener
    );

    return () => {
      window.removeEventListener(
        "featureActivated",
        handleFeatureActivation as EventListener
      );
    };
  }, [user, loadData]);

  // Écouter les événements de génération globale
  useEffect(() => {
    const handleGlobalPostGenerated = (event: CustomEvent) => {
      const { featureKey } = event.detail;

      if (featureKey === 'blog') {
        console.log('🎉 [DefaultBlogPosts] Nouveau post généré globalement, rechargement...');
        setTimeout(() => {
          loadData();
        }, 2000);
      }
    };

    window.addEventListener('globalPostGenerated', handleGlobalPostGenerated as EventListener);

    return () => {
      window.removeEventListener('globalPostGenerated', handleGlobalPostGenerated as EventListener);
    };
  }, [loadData]);

  // Handlers
  const handlePostUpdated = (updatedPost: BlogPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
    toast.success("Post mis à jour");
  };

  const handlePostDeleted = async (postId: string | number) => {
    try {
      await blogService.deleteBlogPost(Number(postId));
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
      toast.success("Post supprimé avec succès");
    } catch (error) {
      console.error("Erreur suppression post:", error);
      toast.error("Erreur lors de la suppression du post");
    }
  };

  // Charger au montage et changement d'utilisateur
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Filtrer les posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      post.categories?.some((cat) => cat.id.toString() === selectedCategory);

    const matchesStatus =
      selectedStatus === "all" || post.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Plan PRO = blog IA automatique, pas de notion d'expiration individuelle
  const isExpired = false;

  // Options de catégories
  const categoryOptions: CategoryOption[] = [
    { value: "all", label: "Toutes les catégories" },
    ...categories.map((category) => ({
      value: category.id.toString(),
      label: category.name,
    })),
  ];

  // Loading screen
  if (!user || (loading && isInitialLoad && !hasReceivedFirstPost)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-business rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <p className="text-slate-600 font-medium">
              {!user ? "Connexion en cours..." : "Chargement de vos articles..."}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">

        {/* Bannière Blog IA automatique — verrouillé pour Starter */}
        {!isPro && workspace && (
          <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-800">Blog automatique IA — Plan Pro</p>
                <p className="text-xs text-violet-600 truncate">Générez 1 article/jour automatiquement avec l'IA</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Passer à Pro
            </button>
          </div>
        )}

        {/* Header avec thème - LAZY */}
        <Suspense fallback={
          <div className="h-32 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        }>
          <DefaultBlogHeader
            blog={defaultBlog!}
            showStats={true}
            posts={posts.map((post) => ({
              id: post.id,
              title: post.title,
              status: post.status,
              is_ai_generated: post.is_ai_generated ?? post.isAIGenerated,
            }))}
          />
        </Suspense>

        {/* Message informatif génération automatique */}
        <div className="bg-gradient-landing p-4 rounded-lg border border-blue-200">
          <div className="text-center text-slate-700">
            <span className="font-medium">Génération automatique :</span>
            <span className="ml-2">
              Vos articles sont créés automatiquement.
              <span className="text-brand-blue font-medium">
                {" "}
                1 post publié aujourd'hui
              </span>
              , les autres programmés pour la semaine.
            </span>
            <div className="mt-2 text-xs text-slate-500">
              Nouveaux posts générés automatiquement toutes les 10 minutes
            </div>
          </div>
        </div>

        {/* Indicateur de chargement en cours (non bloquant) */}
        {loading && !isInitialLoad && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Synchronisation en cours...</span>
            </div>
          </div>
        )}

        {/* Filtres avec design amélioré - LAZY */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <Suspense fallback={
            <div className="h-16 bg-gray-50 rounded animate-pulse flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          }>
            <UserBlogPostsFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              categories={categoryOptions}
            />
          </Suspense>
        </div>

        {/* Liste des posts - LAZY */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <Suspense fallback={
            <div className="h-96 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Chargement des articles...</p>
              </div>
            </div>
          }>
            <UserBlogPostsTabs
              posts={filteredPosts}
              handleDeletePost={handlePostDeleted}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
            />
          </Suspense>
        </div>

        {/* État vide simplifié */}
        {filteredPosts.length === 0 && !loading && (
          <div className="text-center py-12 bg-gradient-landing rounded-lg border border-gray-200">
            <div className="text-slate-500 space-y-4">
              {posts.length === 0 ? (
                <>
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                    <Clock className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium">Aucun article trouvé</p>
                  <p className="text-sm">
                    {isExpired
                      ? "Aucun article n'a été créé pendant votre abonnement précédent."
                      : "Activez la fonctionnalité Blog pour générer automatiquement vos articles."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Aucun article trouvé</p>
                  <p className="text-sm">
                    Essayez de modifier vos filtres de recherche
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal de progression LAZY */}
        {showProgressiveModal && (
          <Suspense fallback={<div />}>
            <ProgressiveLoadingModal
              isOpen={showProgressiveModal}
              featureKey="blog"
              onComplete={(result) => {
                console.log("✅ [BlogPage] Génération terminée", result);
                setShowProgressiveModal(false);
                setTimeout(() => loadData(), 1000);
              }}
            />
          </Suspense>
        )}

      </div>
    </DashboardLayout>
  );
};

export default DefaultBlogPosts;
