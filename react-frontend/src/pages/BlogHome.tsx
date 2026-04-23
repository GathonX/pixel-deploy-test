import React, { useState, useEffect } from "react";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { blogService, BlogPost } from "@/services/blogService";
import SEOHead from "@/components/SEOHead";

const BlogHome: React.FC = () => {
  const [activeTab, setActiveTab] = useState("recent");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Charger les posts publics (incluant les posts admin publiés)
  useEffect(() => {
    const loadPublicPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Récupérer les posts publics depuis l'API publique
        const posts = await blogService.getPublicBlogPosts({
          per_page: 50,
          page: 1
        });

        // ✅ CORRECTION : Afficher TOUS les blogs (users, admin, manuel, IA)
        // Pas de filtre par user.name - tous les posts publiés doivent être visibles

        // Adapter les posts pour BlogPostCard
        const adaptedPosts: BlogPost[] = posts.map((post) => {
          // ✅ Utiliser une image Unsplash valide au lieu de Picsum
          const fallbackImage = post.header_image || `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop&auto=format&q=80&seed=${post.id}`;

          console.log("🖼️ [BlogHome] Post #" + post.id);
          console.log("   - header_image originale:", post.header_image);
          console.log("   - header_image finale:", fallbackImage);
          console.log("   - titre:", post.title);

          return {
            ...post,
            header_image: fallbackImage,
            tags: post.tags || [],
            user: {
              id: post.user.id,
              name: post.user.id === 1 || post.user.name === 'Admin' ? 'PixelRise' : post.user.name,
              email: post.user.email,
              avatar: post.user.avatar
            },
            generation_context: post.generation_context || null,
            comments: Array.isArray(post.comments) ? post.comments.length : post.comments || 0
          } as BlogPost;
        });

        console.log("📚 [BlogHome] Posts publics chargés:", adaptedPosts.length);
        console.log("📚 [BlogHome] Premier post complet:", adaptedPosts[0]);
        setPosts(adaptedPosts);
        setFilteredPosts(adaptedPosts);

      } catch (err) {
        console.error("❌ [BlogHome] Erreur chargement posts:", err);
        setError("Erreur lors du chargement des articles");
        setPosts([]);
        setFilteredPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPublicPosts();
  }, []);

  // ✅ CORRECTION : Filtrer et trier les posts basés sur l'API
  useEffect(() => {
    let filteredResults = [...posts];
    
    // Filter by search query if present
    if (searchQuery) {
      filteredResults = filteredResults.filter(
        post =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      );
    }
    
    // Sort based on active tab
    if (activeTab === "recent") {
      filteredResults.sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at).getTime();
        const dateB = new Date(b.published_at || b.created_at).getTime();
        return dateB - dateA;
      });
    } else if (activeTab === "popular") {
      filteredResults.sort((a, b) => b.views - a.views);
    } else if (activeTab === "trending") {
      filteredResults.sort((a, b) => b.likes - a.likes);
    }
    
    setFilteredPosts(filteredResults);
  }, [activeTab, searchQuery, posts]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <>
      <SEOHead
        title="Blog Pixel Rise – Articles sur le marketing automatisé par IA"
        description="Découvrez les derniers articles Pixel Rise sur l'automatisation marketing, la création de contenu SEO, la gestion des réseaux sociaux et la croissance des PME grâce à l'IA."
        canonicalUrl={`${import.meta.env.VITE_CANONICAL_URL}/blog`}
      />
      <div className="min-h-screen flex flex-col">
      <LandingNavbar />
      <div className="pt-20 flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-2/3">
              <Tabs defaultValue="recent" className="mb-8" onValueChange={setActiveTab}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    Articles du Blog
                    {!loading && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'})
                      </span>
                    )}
                  </h2>
                  <TabsList>
                    <TabsTrigger value="recent">Récents</TabsTrigger>
                    <TabsTrigger value="popular">Populaires</TabsTrigger>
                    <TabsTrigger value="trending">Tendances</TabsTrigger>
                  </TabsList>
                </div>
                
                {/* ✅ CORRECTION : États de chargement et erreur */}
                {loading && (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Chargement des articles...</span>
                  </div>
                )}
                
                {error && (
                  <div className="text-center py-12">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                      <div className="text-red-800 font-medium">
                        {error}
                      </div>
                      <button 
                        onClick={() => window.location.reload()} 
                        className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Réessayer
                      </button>
                    </div>
                  </div>
                )}
                
                {!loading && !error && filteredPosts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500">
                      {searchQuery ? 'Aucun article trouvé pour votre recherche' : 'Aucun article disponible'}
                    </div>
                  </div>
                )}
                
                {/* ✅ CORRECTION : Affichage des posts depuis l'API */}
                {!loading && !error && filteredPosts.length > 0 && (
                  <>
                    <TabsContent value="recent">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredPosts.map(post => (
                          <BlogPostCard key={post.id} post={post} />
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="popular">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredPosts.map(post => (
                          <BlogPostCard key={post.id} post={post} />
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="trending">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredPosts.map(post => (
                          <BlogPostCard key={post.id} post={post} />
                        ))}
                      </div>
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
            
            <div className="w-full md:w-1/3">
              <BlogSidebar onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </div>
      <LandingFooter />
      </div>
    </>
  );
};

export default BlogHome;