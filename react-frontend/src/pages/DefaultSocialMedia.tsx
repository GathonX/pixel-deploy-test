import React, { useState, useEffect, useCallback, Suspense } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  socialMediaService,
  SocialMediaPost,
} from "@/services/socialMediaService";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Loader2,
  BarChart3,
  Newspaper,
  Clock,
  AlertCircle,
  RefreshCw,
  Lock,
  Zap,
} from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";

// ✅ LAZY LOADING des composants lourds
const ProgressiveLoadingModal = React.lazy(() => import("@/components/ui/ProgressiveLoadingModal"));
const SocialMediaPostsTable = React.lazy(() => import("@/components/social-media").then(module => ({ default: module.SocialMediaPostsTable })));
const SocialMediaFilters = React.lazy(() => import("@/components/social-media").then(module => ({ default: module.SocialMediaFilters })));

interface PlatformStats {
  platform: string;
  slug: string;
  icon: React.ComponentType<any>;
  count: number;
  color: string;
  published: number;
  scheduled: number;
  drafts: number;
}

const DefaultSocialMedia = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const { workspace } = useWorkspace();
  const isPro = workspace?.plan_key === 'pro' || workspace?.plan_key === 'premium';

  // États principaux
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);

  // État pour éviter la page blanche après activation
  const [hasReceivedFirstPost, setHasReceivedFirstPost] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Modal de loading progressif
  const [showProgressiveModal, setShowProgressiveModal] = useState(false);

  // État des plateformes activées
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState<Record<string, boolean>>({});

  // États des filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  // Charger les plateformes activées
  const loadEnabledPlatforms = useCallback(async () => {
    try {
      const response = await api.get("/features/social-platforms", {
        params: siteId ? { site_id: siteId } : {}
      });
      if (response.data.success) {
        setEnabledPlatforms(response.data.data.platforms || []);
      }
    } catch (error) {
      console.error("Erreur chargement plateformes:", error);
    }
  }, [siteId]);

  const handleTogglePlatform = async (platform: string, isActive: boolean) => {

    setLoadingPlatforms(prev => ({ ...prev, [platform]: true }));

    try {
      const response = await api.post("/features/toggle-platform", {
        platform: platform.toLowerCase(),
        activate: !isActive,
        ...(siteId ? { site_id: siteId } : {}),
      });

      if (response.data.success) {
        if (!isActive) {
          setEnabledPlatforms(prev => [...prev, platform.toLowerCase()]);
          toast.success(`${platform} activé`, {
            description: "Génération des posts en cours..."
          });
        } else {
          setEnabledPlatforms(prev => prev.filter(p => p !== platform.toLowerCase()));
          toast.success(`${platform} désactivé`);
        }

        setTimeout(() => {
          loadSocialPosts();
        }, 2000);
      }
    } catch (error: any) {
      console.error("Erreur toggle plateforme:", error);
      toast.error("Erreur lors de la modification", {
        description: error.response?.data?.message || "Veuillez réessayer"
      });
    } finally {
      setLoadingPlatforms(prev => ({ ...prev, [platform]: false }));
    }
  };

  // Charger les posts utilisateur
  const loadSocialPosts = useCallback(async () => {
    if (!user?.id) return;

    try {
      if (!hasReceivedFirstPost) {
        setLoading(true);
      }

      const socialPosts = await socialMediaService.getSocialPosts({
        per_page: 100,
        ...(siteId ? { site_id: siteId } : {}),
      });

      if (Array.isArray(socialPosts)) {
        setPosts((prevPosts) => {
          if (hasReceivedFirstPost && prevPosts.length > 0) {
            const existingIds = prevPosts.map(p => p.id);
            const newPosts = socialPosts.filter(p => !existingIds.includes(p.id));
            return [...prevPosts, ...newPosts];
          }
          return socialPosts;
        });

        console.log(`✅ ${socialPosts.length} posts social media chargés`);
      } else {
        console.warn("Réponse API non valide:", socialPosts);
        if (!hasReceivedFirstPost) {
          setPosts([]);
        }
      }
    } catch (error) {
      console.error("Erreur chargement posts:", error);
      toast.error("Erreur lors du chargement des posts");
      if (!hasReceivedFirstPost) {
        setPosts([]);
      }
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

      if (featureKey === "social_media" && firstPost) {
        console.log("🚀 [FeatureActivation] Premier social post reçu", firstPost);

        setShowProgressiveModal(false);
        setHasReceivedFirstPost(true);
        setIsInitialLoad(false);

        if (firstPost.social_posts && firstPost.social_posts.length > 0) {
          const newSocialPost = firstPost.social_posts[0];
          setPosts((prevPosts) => [newSocialPost, ...prevPosts]);
          setLoading(false);

          toast.success("Premier post social généré !", {
            description: "Votre contenu est disponible sur " + newSocialPost.platform,
            duration: 5000,
          });

          setTimeout(() => {
            loadSocialPosts();
          }, 3000);
        } else {
          loadSocialPosts();
        }
      }
    };

    window.addEventListener("featureActivated", handleFeatureActivation as EventListener);
    return () => {
      window.removeEventListener("featureActivated", handleFeatureActivation as EventListener);
    };
  }, [user, loadSocialPosts]);

  // Écouter les événements de génération globale
  useEffect(() => {
    const handleGlobalPostGenerated = (event: CustomEvent) => {
      const { featureKey } = event.detail;

      if (featureKey === 'social_media') {
        console.log('🎉 [DefaultSocialMedia] Nouveau post généré globalement');
        setTimeout(() => {
          loadSocialPosts();
        }, 2000);
      }
    };

    window.addEventListener('globalPostGenerated', handleGlobalPostGenerated as EventListener);
    return () => {
      window.removeEventListener('globalPostGenerated', handleGlobalPostGenerated as EventListener);
    };
  }, [loadSocialPosts]);

  // Charger au montage
  useEffect(() => {
    if (user) {
      loadSocialPosts();
      loadEnabledPlatforms();
    }
  }, [user, loadSocialPosts, loadEnabledPlatforms]);

  // Supprimer un post
  const handleDeletePost = async (postId: number) => {
    try {
      await socialMediaService.deleteSocialPost(postId);
      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
      toast.success("Post supprimé avec succès");
    } catch (error) {
      console.error("Erreur suppression post:", error);
      toast.error("Erreur lors de la suppression du post");
    }
  };

  // Mettre à jour un post
  const handlePostUpdated = (updatedPost: SocialMediaPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
    toast.success("Post mis à jour");
  };

  // Filtrer les posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      searchTerm === "" ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlatform =
      platformFilter === "all" || post.platform === platformFilter;

    const matchesStatus =
      statusFilter === "all" || post.status === statusFilter;

    return matchesSearch && matchesPlatform && matchesStatus;
  });

  // Calculer les statistiques par plateforme
  const getPlatformStats = (): PlatformStats[] => {
    const platforms = [
      { platform: "Facebook", slug: "facebook", icon: Facebook, color: "bg-blue-500" },
      { platform: "Instagram", slug: "instagram", icon: Instagram, color: "bg-pink-500" },
      { platform: "Twitter", slug: "twitter", icon: Twitter, color: "bg-blue-400" },
      { platform: "LinkedIn", slug: "linkedin", icon: Linkedin, color: "bg-blue-700" },
    ];

    return platforms.map((platform) => {
      const platformPosts = posts.filter((p) => p.platform === platform.slug);
      return {
        ...platform,
        count: platformPosts.length,
        published: platformPosts.filter((p) => p.status === "published").length,
        scheduled: platformPosts.filter((p) => p.status === "scheduled").length,
        drafts: platformPosts.filter((p) => p.status === "draft").length,
      };
    });
  };

  const platformStats = getPlatformStats();
  const totalPosts = posts.length;
  const totalPublished = posts.filter((p) => p.status === "published").length;
  const totalScheduled = posts.filter((p) => p.status === "scheduled").length;
  const totalDrafts = posts.filter((p) => p.status === "draft").length;

  // Loading screen intelligent
  if (!user || (loading && isInitialLoad && !hasReceivedFirstPost)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-business rounded-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <p className="text-slate-600 font-medium">
              {!user ? "Connexion en cours..." : "Chargement de vos posts social media..."}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">

        {/* Bannière Social IA automatique — verrouillé pour Starter */}
        {!isPro && workspace && (
          <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-violet-800">Publications IA automatiques — Plan Pro</p>
                <p className="text-xs text-violet-600 truncate">Générez 1 post/jour par réseau social avec l'IA</p>
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

        {/* Header */}
        <div className="bg-gradient-black-blue p-6 rounded-lg border border-gray-200 shadow-premium">
          <h1 className="text-2xl font-bold text-white mb-2">
            Réseaux sociaux par défaut
          </h1>
          <p className="text-gray-200 mb-4">
            {"Vos posts sont générés automatiquement. 7 posts par semaine répartis sur différentes plateformes."}
          </p>

          {/* Boutons d'action */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/mon-actualite")}
              className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Newspaper className="h-4 w-4" />
              Voir l'Actualité
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/analytics")}
              className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <BarChart3 className="h-4 w-4" />
              Statistiques détaillées
            </Button>
          </div>
        </div>

        {/* Message informatif génération automatique */}
        <div className="bg-gradient-landing p-4 rounded-lg border border-blue-200">
          <div className="text-center text-slate-700">
            <span className="font-medium">Génération automatique :</span>
            <span className="ml-2">
              Vos posts sont créés automatiquement selon vos projets et tâches.
              <span className="text-brand-blue font-medium"> Rotation intelligente</span> entre plateformes.
            </span>
            <div className="mt-2 text-xs text-slate-500">
              Nouveaux posts générés automatiquement toutes les 10 minutes
            </div>
          </div>
        </div>

        {/* Indicateur de chargement en cours */}
        {loading && !isInitialLoad && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Synchronisation en cours...</span>
            </div>
          </div>
        )}

        {/* Statistiques globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{totalPublished}</div>
            <div className="text-sm text-slate-600">Publiés</div>
          </div>
          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{totalScheduled}</div>
            <div className="text-sm text-slate-600">Programmés</div>
          </div>
          <div className="bg-gradient-card p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-1">{totalDrafts}</div>
            <div className="text-sm text-slate-600">Brouillons</div>
          </div>
        </div>

        {/* Cartes plateformes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-5">
          {platformStats.map((platform) => {
            const Icon = platform.icon;
            const isActive = enabledPlatforms.includes(platform.slug);
            const isLoading = loadingPlatforms[platform.platform];

            return (
              <div
                key={platform.slug}
                className={`bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-all ${
                  isActive ? "border-green-300 bg-green-50/30" : "border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center ${!isActive && "opacity-50"}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isActive ? "text-slate-800" : "text-slate-500"}`}>
                          {platform.platform}
                        </span>
                        {isActive && (
                          <Badge variant="default" className="bg-green-500 text-xs">Actif</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{platform.count} posts</div>
                    </div>
                  </div>

                  {/* Toggle Switch - Désactivé si expiré */}
                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => handleTogglePlatform(platform.platform, isActive)}
                        className="data-[state=checked]:bg-green-500"
                        disabled={false}
                      />
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className={`font-medium ${isActive ? "text-green-600" : "text-slate-400"}`}>
                      {platform.published}
                    </div>
                    <div className="text-slate-500">Publiés</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-medium ${isActive ? "text-purple-600" : "text-slate-400"}`}>
                      {platform.scheduled}
                    </div>
                    <div className="text-slate-500">Programmés</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-medium ${isActive ? "text-yellow-600" : "text-slate-400"}`}>
                      {platform.drafts}
                    </div>
                    <div className="text-slate-500">Brouillons</div>
                  </div>
                </div>

                {!isActive && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-slate-500 text-center">
                      Activez cette plateforme pour générer des posts
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Filtres - LAZY */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <Suspense fallback={
            <div className="h-16 bg-gray-50 rounded animate-pulse flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          }>
            <SocialMediaFilters
              searchQuery={searchTerm}
              onSearchChange={setSearchTerm}
              selectedStatus={statusFilter}
              onStatusChange={setStatusFilter}
              selectedPlatform={platformFilter}
              onPlatformChange={setPlatformFilter}
              platforms={[
                { value: "all", label: "Toutes les plateformes" },
                { value: "facebook", label: "Facebook" },
                { value: "instagram", label: "Instagram" },
                { value: "twitter", label: "Twitter" },
                { value: "linkedin", label: "LinkedIn" },
              ]}
            />
          </Suspense>
        </div>

        {/* Liste des posts - LAZY */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <Suspense fallback={
            <div className="h-96 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Chargement des posts...</p>
              </div>
            </div>
          }>
            <SocialMediaPostsTable
              filteredPosts={filteredPosts}
              handleDeletePost={handleDeletePost}
            />
          </Suspense>
        </div>

        {/* État vide */}
        {filteredPosts.length === 0 && !loading && (
          <div className="text-center py-12 bg-gradient-landing rounded-lg border border-gray-200">
            <div className="text-slate-500 space-y-4">
              {posts.length === 0 ? (
                <>
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                    <Clock className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium">Aucun post trouvé</p>
                  <p className="text-sm">Vos posts seront générés automatiquement.</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Aucun post trouvé</p>
                  <p className="text-sm">Essayez de modifier vos filtres de recherche</p>
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
              featureKey="social_media"
              onComplete={(result) => {
                console.log("✅ [SocialPage] Génération terminée", result);
                setShowProgressiveModal(false);
                setTimeout(() => loadSocialPosts(), 1000);
              }}
            />
          </Suspense>
        )}

      </div>
    </DashboardLayout>
  );
};

export default DefaultSocialMedia;
