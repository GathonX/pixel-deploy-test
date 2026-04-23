// src/components/blog-author/AuthorArticlesList.tsx
import React from "react";
import { BlogPost } from "@/services/blogService";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, TrendingUp, Heart, Star } from "lucide-react";

interface AuthorArticlesListProps {
  authorPosts: BlogPost[];
  realStats: {
    totalArticles: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgLikesPerArticle: number;
    lastPostDate: Date | null;
    isActive: boolean;
  };
}

export const AuthorArticlesList: React.FC<AuthorArticlesListProps> = ({
  authorPosts,
  realStats,
}) => {
  if (authorPosts.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-card backdrop-blur-glass rounded-2xl border border-white/20">
        <div className="h-16 w-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-brand-blue" />
        </div>
        <p className="text-text-secondary text-lg">
          Cet auteur n'a pas encore publié d'articles.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Statistiques réelles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-card backdrop-blur-glass border border-white/20 hover:shadow-premium transition-all duration-300">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {realStats.totalArticles}
            </div>
            <div className="text-text-muted">Articles publiés</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card backdrop-blur-glass border border-white/20 hover:shadow-premium transition-all duration-300">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 bg-red-100 rounded-full">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600 mb-1">
              {realStats.totalLikes}
            </div>
            <div className="text-text-muted">Likes reçus</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card backdrop-blur-glass border border-white/20 hover:shadow-premium transition-all duration-300">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Star className="h-6 w-6 text-brand-blue" />
              </div>
            </div>
            <div className="text-3xl font-bold text-brand-blue mb-1">
              {realStats.avgLikesPerArticle.toFixed(1)}
            </div>
            <div className="text-text-muted">Likes/article</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Grille des articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {authorPosts.map(post => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};