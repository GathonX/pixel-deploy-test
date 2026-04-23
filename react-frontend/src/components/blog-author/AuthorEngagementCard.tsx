// src/components/blog-author/AuthorEngagementCard.tsx
import React from "react";
import { Sparkles } from "lucide-react";

interface AuthorEngagementCardProps {
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

export const AuthorEngagementCard: React.FC<AuthorEngagementCardProps> = ({
  realStats,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
      <h3 className="font-semibold text-lg text-text-primary mb-4 flex items-center">
        <Sparkles className="h-5 w-5 mr-2 text-indigo-600" />
        Engagement en temps réel
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600 mb-1">
            {realStats.totalViews > 0 ? 
              (((realStats.totalLikes + realStats.totalComments) / realStats.totalViews) * 100).toFixed(1) 
              : '0'}%
          </div>
          <div className="text-sm text-slate-600">Taux d'engagement</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600 mb-1">
            {realStats.totalLikes + realStats.totalComments}
          </div>
          <div className="text-sm text-slate-600">Interactions totales</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600 mb-1">
            {realStats.totalArticles > 0 ? Math.round(realStats.totalViews / realStats.totalArticles) : 0}
          </div>
          <div className="text-sm text-slate-600">Vues moyennes/article</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600 mb-1">
            {realStats.isActive ? '✅' : '⏸️'}
          </div>
          <div className="text-sm text-slate-600">
            {realStats.isActive ? 'Actif' : 'Inactif'}
          </div>
        </div>
      </div>
    </div>
  );
};