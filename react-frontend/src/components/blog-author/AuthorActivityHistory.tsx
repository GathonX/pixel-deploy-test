// src/components/blog-author/AuthorActivityHistory.tsx
import React from "react";
import { User as UserServiceUser } from "@/services/userService";
import { Calendar } from "lucide-react";

interface AuthorActivityHistoryProps {
  author: UserServiceUser;
  authorPosts: any[];
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

export const AuthorActivityHistory: React.FC<AuthorActivityHistoryProps> = ({
  author,
  authorPosts,
  realStats,
}) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
      <h3 className="font-semibold text-lg text-purple-800 mb-4 flex items-center">
        <Calendar className="h-5 w-5 mr-2" />
        Historique d'activité
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-purple-700">Première publication</span>
          <span className="font-medium text-purple-800">
            {authorPosts.length > 0 ? 
              new Date(authorPosts[authorPosts.length - 1].created_at).toLocaleDateString('fr-FR') 
              : 'Aucune publication'
            }
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-purple-700">Dernière publication</span>
          <span className="font-medium text-purple-800">
            {realStats.lastPostDate ? 
              realStats.lastPostDate.toLocaleDateString('fr-FR') 
              : 'Aucune publication'
            }
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-purple-700">Statut d'activité</span>
          <span className={`font-medium ${realStats.isActive ? 'text-green-600' : 'text-orange-600'}`}>
            {realStats.isActive ? '🟢 Actif (publié récemment)' : '🟡 Inactif (pas de publication récente)'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-purple-700">Fréquence de publication</span>
          <span className="font-medium text-purple-800">
            {authorPosts.length > 0 && realStats.lastPostDate ? 
              `${(authorPosts.length / Math.max(1, Math.ceil((new Date().getTime() - new Date(author.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)))).toFixed(1)} articles/mois`
              : 'Aucune donnée'
            }
          </span>
        </div>
      </div>
    </div>
  );
};