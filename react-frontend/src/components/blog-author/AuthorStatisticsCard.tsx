// src/components/blog-author/AuthorStatisticsCard.tsx
import React from "react";
import { TrendingUp } from "lucide-react";

interface AuthorStatisticsCardProps {
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

export const AuthorStatisticsCard: React.FC<AuthorStatisticsCardProps> = ({
  realStats,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-text-primary flex items-center">
        <TrendingUp className="h-5 w-5 mr-2 text-brand-blue" />
        Statistiques réelles
      </h3>
      <div className="space-y-3 pl-7">
        <div className="text-text-secondary">
          <span className="font-medium">Articles publiés :</span>
          <br />
          <span className="text-2xl font-bold text-green-600">{realStats.totalArticles}</span>
        </div>
        
        <div className="text-text-secondary">
          <span className="font-medium">Total des vues :</span>
          <br />
          <span className="text-2xl font-bold text-blue-600">{realStats.totalViews.toLocaleString()}</span>
        </div>
        
        <div className="text-text-secondary">
          <span className="font-medium">Total des likes :</span>
          <br />
          <span className="text-2xl font-bold text-red-600">{realStats.totalLikes}</span>
        </div>
        
        <div className="text-text-secondary">
          <span className="font-medium">Commentaires reçus :</span>
          <br />
          <span className="text-2xl font-bold text-purple-600">{realStats.totalComments}</span>
        </div>
        
        <div className="text-text-secondary">
          <span className="font-medium">Moyenne likes/article :</span>
          <br />
          <span className="text-2xl font-bold text-orange-600">{realStats.avgLikesPerArticle.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};