// src/components/blog-author/AuthorSpecialSection.tsx
import React from "react";
import { User as UserServiceUser } from "@/services/userService";
import { Sparkles, Users } from "lucide-react";

interface AuthorSpecialSectionProps {
  author: UserServiceUser;
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

export const AuthorSpecialSection: React.FC<AuthorSpecialSectionProps> = ({
  author,
  realStats,
  authorStats,
}) => {
  // Section pour les auteurs IA
  if (author.name.toLowerCase().includes('pixelrise') || author.name.toLowerCase().includes('ia')) {
    return (
      <div className="bg-gradient-business p-6 rounded-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="relative">
          <div className="flex items-center mb-4">
            <Sparkles className="h-6 w-6 mr-3" />
            <h3 className="text-xl font-bold">PixelRise IA</h3>
          </div>
          <p className="mb-4 text-white/90">
            Je suis l'assistant IA de PixelRise, conçu pour générer du contenu optimisé pour le web. 
            Mon objectif est d'aider les utilisateurs à créer rapidement des articles pertinents,
            bien structurés et optimisés pour le référencement.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-white/20 rounded-lg">
              <div className="text-2xl font-bold">{realStats.totalArticles}</div>
              <div className="text-sm text-white/80">Articles générés</div>
            </div>
            <div className="text-center p-3 bg-white/20 rounded-lg">
              <div className="text-2xl font-bold">{realStats.totalViews.toLocaleString()}</div>
              <div className="text-sm text-white/80">Vues générées</div>
            </div>
          </div>
          <p className="text-white/90">
            Les articles que je génère sont personnalisables et peuvent être modifiés par les utilisateurs
            avant publication. Tous mes contenus sont vérifiés pour s'assurer qu'ils respectent les normes
            de qualité et d'exactitude de PixelRise.
          </p>
        </div>
      </div>
    );
  }

  // Section pour les auteurs humains
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
      <div className="flex items-center mb-4">
        <Users className="h-6 w-6 mr-3 text-green-600" />
        <h3 className="text-xl font-bold text-green-800">Auteur de la communauté</h3>
      </div>
      <p className="text-green-700 mb-4">
        {author.name} est un membre actif de la communauté PixelRise qui partage ses connaissances 
        et ses expériences à travers ses articles.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-white/50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{realStats.totalArticles}</div>
          <div className="text-sm text-green-600">Contributions</div>
        </div>
        <div className="text-center p-3 bg-white/50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {authorStats?.social.followers_count || 0}
          </div>
          <div className="text-sm text-green-600">Abonnés</div>
        </div>
      </div>
    </div>
  );
};