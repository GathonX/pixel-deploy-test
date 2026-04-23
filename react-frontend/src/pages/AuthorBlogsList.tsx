// src/pages/AuthorBlogsList.tsx - PAGE DES BLOGS D'UN AUTEUR
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, Users, BookOpen } from "lucide-react";
import { blogService, BlogPost } from "@/services/blogService";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener";
import { toast } from "sonner";
import { BlogPostCard } from "@/components/blog/BlogPostCard";

interface AuthorInfo {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

const AuthorBlogsListContent = () => {
  const { authorId } = useParams<{ authorId: string }>();
  const navigate = useNavigate();

  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuthorPosts();
  }, [authorId]);

  const loadAuthorPosts = async () => {
    if (!authorId) {
      setError("ID d'auteur manquant");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔍 [AuthorBlogsList] Chargement des posts pour auteur:", authorId);

      // Récupérer tous les posts publics
      const allPosts = await blogService.getPublicBlogPosts({ per_page: 100 });

      // Filtrer les posts de cet auteur
      const authorPosts = allPosts.filter(post =>
        post.user?.id === Number(authorId)
      );

      console.log(`📚 [AuthorBlogsList] ${authorPosts.length} posts trouvés pour l'auteur ${authorId}`);

      if (authorPosts.length > 0) {
        // Récupérer les infos de l'auteur depuis le premier post
        const firstPost = authorPosts[0];
        const authorData = firstPost.user;

        if (authorData) {
          const displayName = authorData.name === 'Admin' ? 'PixelRise' : authorData.name;
          setAuthor({
            id: authorData.id,
            name: displayName,
            email: authorData.email || '',
            avatar: authorData.avatar || null
          });
        }
      }

      // Trier par date de publication (plus récent en premier)
      const sortedPosts = authorPosts.sort((a, b) => {
        const dateA = new Date(b.published_at || b.created_at).getTime();
        const dateB = new Date(a.published_at || a.created_at).getTime();
        return dateA - dateB;
      });

      setPosts(sortedPosts);

    } catch (err) {
      console.error("❌ [AuthorBlogsList] Erreur chargement posts auteur:", err);
      setError("Erreur lors du chargement des articles");
      toast.error("Erreur lors du chargement des articles");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/user-blogs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Chargement des articles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/user-blogs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">{error || "Auteur non trouvé"}</p>
            <Button onClick={() => navigate("/user-blogs")} variant="outline">
              Retour aux auteurs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/user-blogs")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux auteurs
        </Button>

        {/* Informations de l'auteur */}
        <div className="flex items-center gap-4 mb-6 p-6 bg-gradient-to-br from-white to-slate-50/50 rounded-xl border border-slate-100">
          <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
            <AvatarImage
              src={getUniformAvatarUrl(author.avatar)}
              alt={author.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-brand-blue to-indigo-600 text-white font-bold text-xl">
              {author.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 mb-1">{author.name}</h1>
            <p className="text-sm text-muted-foreground mb-3">
              {posts.length} article{posts.length > 1 ? 's' : ''} publié{posts.length > 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/blog/author/${author.id}`)}
              >
                <Users className="h-4 w-4 mr-1" />
                Voir le profil
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des articles */}
      {posts.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Aucun article publié
            </p>
            <p className="text-xs text-slate-400">
              Cet auteur n'a pas encore publié d'articles
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">
              Articles de {author.name}
            </h2>
            <Badge variant="secondary">
              {posts.length} article{posts.length > 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogPostCard
                key={post.id}
                post={post}
                onClick={() => navigate(`/user-blogs/${post.slug}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AuthorBlogsList = () => {
  return (
    <SidebarProvider>
      <DashboardLayout>
        <AuthorBlogsListContent />
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default AuthorBlogsList;
