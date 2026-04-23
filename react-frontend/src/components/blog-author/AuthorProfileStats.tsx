// src/components/blog-author/AuthorProfileStats.tsx
import React from "react";
import { BookOpen, Heart, Eye, Users } from "lucide-react";

interface AuthorProfileStatsProps {
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
  authorStats: {
    social: {
      followers_count: number;
      following_count: number;
    };
  } | null;
}

export const AuthorProfileStats: React.FC<AuthorProfileStatsProps> = ({
  realStats,
  authorStats,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="text-center p-3 bg-white/30 rounded-xl backdrop-blur-xs">
        <div className="flex items-center justify-center mb-1">
          <BookOpen className="h-4 w-4 text-brand-blue mr-1" />
          <span className="font-bold text-text-primary">{realStats.totalArticles}</span>
        </div>
        <span className="text-sm text-text-muted">articles</span>
      </div>
      
      <div className="text-center p-3 bg-white/30 rounded-xl backdrop-blur-xs">
        <div className="flex items-center justify-center mb-1">
          <Heart className="h-4 w-4 text-red-500 mr-1" />
          <span className="font-bold text-red-600">{realStats.totalLikes}</span>
        </div>
        <span className="text-sm text-text-muted">likes</span>
      </div>
      
      <div className="text-center p-3 bg-white/30 rounded-xl backdrop-blur-xs">
        <div className="flex items-center justify-center mb-1">
          <Eye className="h-4 w-4 text-green-500 mr-1" />
          <span className="font-bold text-text-primary">{realStats.totalViews.toLocaleString()}</span>
        </div>
        <span className="text-sm text-text-muted">vues</span>
      </div>
      
      <div className="text-center p-3 bg-white/30 rounded-xl backdrop-blur-xs">
        <div className="flex items-center justify-center mb-1">
          <Users className="h-4 w-4 text-purple-500 mr-1" />
          <span className="font-bold text-text-primary">{authorStats?.social.followers_count || 0}</span>
        </div>
        <span className="text-sm text-text-muted">abonnés</span>
      </div>
    </div>
  );
};