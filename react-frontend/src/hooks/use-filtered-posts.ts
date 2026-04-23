import { useState, useEffect, useMemo } from "react";
import { blogService, BlogPost } from "@/services/blogService";

interface UseFilteredPostsProps {
  activeTab: string;
  searchQuery: string;
  following: string[];
  defaultBlogTitle?: string;
}

export const useFilteredPosts = ({ activeTab, searchQuery, following, defaultBlogTitle }: UseFilteredPostsProps) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les posts depuis l'API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Récupérer tous les posts publics
        const allPosts = await blogService.getPublicBlogPosts({
          per_page: 100 // Récupérer plus de posts pour avoir un bon échantillon
        });
        
        setPosts(allPosts);
        console.log('📄 [useFilteredPosts] Posts récupérés:', allPosts.length);
      } catch (err) {
        console.error('❌ [useFilteredPosts] Erreur récupération posts:', err);
        setError('Erreur lors du chargement des posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []); // Se déclenche une seule fois au montage

  const filteredPosts = useMemo(() => {
    if (!posts.length) return [];

    let filteredList = [...posts];

    // Filtrer par recherche
    if (searchQuery) {
      filteredList = filteredList.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Appliquer le filtrage par onglet
    switch (activeTab) {
      case "following":
        return filteredList.filter(post => 
          post.user?.id && following.includes(post.user.id.toString())
        );
      case "popular":
        return [...filteredList].sort((a, b) => b.views - a.views);
      case "ai":
        return filteredList.filter(post => post.is_ai_generated);
      case "default":
        // Filtrer par titre de blog par défaut (utilise les tags pour l'instant)
        return defaultBlogTitle 
          ? filteredList.filter(post => post.tags.includes(defaultBlogTitle))
          : [];
      default: // "all"
        return filteredList;
    }
  }, [posts, activeTab, searchQuery, following, defaultBlogTitle]);

  return { 
    posts: filteredPosts, 
    loading, 
    error,
    refetch: async () => {
      try {
        setLoading(true);
        const allPosts = await blogService.getPublicBlogPosts({ per_page: 100 });
        setPosts(allPosts);
      } catch (err) {
        console.error('❌ [useFilteredPosts] Erreur refetch:', err);
        setError('Erreur lors du rechargement');
      } finally {
        setLoading(false);
      }
    }
  };
};