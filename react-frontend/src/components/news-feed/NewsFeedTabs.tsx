import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, Search } from "lucide-react";
import { NewsFeedPost } from "./NewsFeedPost";
import { BlogPost } from "@/services/blogService";

interface NewsFeedTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  filteredPosts: BlogPost[];
  following: string[];
  toggleFollow: (authorId: string) => void;
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    following: string[];
    likes: string[];
  } | null;
  setSearchQuery: (query: string) => void;
  defaultBlogTitle?: string;
  isAuthenticated: boolean;
  onAuthorClick?: (authorId: number | string) => void;
  userReactions?: Record<string, { has_liked: boolean }>;
}

export function NewsFeedTabs({
  activeTab,
  setActiveTab,
  filteredPosts,
  following,
  toggleFollow,
  currentUser,
  setSearchQuery,
  defaultBlogTitle,
  isAuthenticated,
  onAuthorClick,
  userReactions = {}
}: NewsFeedTabsProps) {
  // Helper pour vérifier si on suit un auteur
  const isFollowingAuthor = (post: BlogPost): boolean => {
    return post.user?.id ? following.includes(post.user.id.toString()) : false;
  };

  // Helper pour obtenir l'ID de l'auteur
  const getAuthorId = (post: BlogPost): string => {
    return post.user?.id?.toString() || '';
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        
        {/* ✅ Contenu des onglets */}
        {["all", "following", "popular", "ai", "default"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0 p-6">
            <div className="space-y-6">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <NewsFeedPost
                    key={post.id}
                    post={post}
                    isFollowing={isFollowingAuthor(post)}
                    onFollowToggle={() => {
                      const authorId = getAuthorId(post);
                      if (authorId) {
                        toggleFollow(authorId);
                      }
                    }}
                    currentUser={currentUser}
                    isFromDefaultBlog={defaultBlogTitle && post.tags.includes(defaultBlogTitle)}
                    isAuthenticated={isAuthenticated}
                    onAuthorClick={onAuthorClick}
                    initialUserReaction={userReactions[post.id.toString()]}
                  />
                ))
              ) : (
                <EmptyStateCard 
                  tab={tab} 
                  setActiveTab={setActiveTab}
                  setSearchQuery={setSearchQuery}
                  isAuthenticated={isAuthenticated}
                />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface EmptyStateCardProps {
  tab: string;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  isAuthenticated: boolean;
}

function EmptyStateCard({ tab, setActiveTab, setSearchQuery, isAuthenticated }: EmptyStateCardProps) {
  const getEmptyStateContent = () => {
    switch (tab) {
      case "following":
        if (!isAuthenticated) {
          return {
            icon: UserX,
            title: "Connexion requise",
            description: "Connectez-vous pour voir les articles de vos auteurs préférés",
            actionText: "Se connecter",
            action: () => window.location.href = '/login',
            secondaryActionText: "Découvrir des auteurs",
            secondaryAction: () => setActiveTab("all")
          };
        }
        return {
          icon: Users,
          title: "Aucun abonnement",
          description: "Vous ne suivez pas encore d'auteurs ou aucun article ne correspond à votre recherche",
          actionText: "Découvrir des auteurs",
          action: () => setActiveTab("all"),
          gradient: "from-blue-500 to-indigo-600"
        };

      case "popular":
        return {
          icon: Heart,
          title: "Aucun article populaire",
          description: "Pas d'articles populaires disponibles actuellement",
          actionText: "Voir tous les articles",
          action: () => setActiveTab("all"),
          gradient: "from-pink-500 to-rose-600"
        };

      case "ai":
        return {
          icon: Bot,
          title: "Aucun contenu IA",
          description: "Pas d'articles générés par IA disponibles actuellement",
          actionText: "Voir tous les articles", 
          action: () => setActiveTab("all"),
          gradient: "from-purple-500 to-indigo-600"
        };

      case "default":
        return {
          icon: Building2,
          title: "Aucun article du blog officiel",
          description: "Aucun article du blog par défaut n'est disponible actuellement",
          actionText: "Voir tous les articles",
          action: () => setActiveTab("all"),
          gradient: "from-emerald-500 to-teal-600"
        };

      default:
        return {
          icon: Search,
          title: "Aucun résultat",
          description: "Aucun article ne correspond à votre recherche",
          actionText: "Effacer la recherche",
          action: () => setSearchQuery(""),
          gradient: "from-slate-500 to-gray-600"
        };
    }
  };

  const { icon: Icon, title, description, actionText, action, secondaryActionText, secondaryAction, gradient } = getEmptyStateContent();

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white/80 to-slate-50/50 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8">
        <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${gradient || 'from-brand-blue to-indigo-600'} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
          <Icon className="h-10 w-10 text-white" />
        </div>
        
        <h3 className="text-xl font-semibold text-slate-800 mb-3 text-center">{title}</h3>
        <p className="text-slate-600 mb-8 text-center max-w-md leading-relaxed">{description}</p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={action}
            className={`bg-gradient-to-r ${gradient || 'from-brand-blue to-indigo-600'} hover:shadow-lg transition-all duration-200 min-w-[160px]`}
          >
            {actionText}
          </Button>
          
          {secondaryActionText && secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 min-w-[160px]"
            >
              {secondaryActionText}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}