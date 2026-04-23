// src/components/blog-author/AuthorInformationCard.tsx
import React from "react";
import { User as UserServiceUser } from "@/services/userService";
import { Calendar } from "lucide-react";
import { formatLanguage, getLanguageFlag } from "@/utils/languageUtils";

interface AuthorInformationCardProps {
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
}

export const AuthorInformationCard: React.FC<AuthorInformationCardProps> = ({
  author,
  realStats,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg text-text-primary flex items-center">
        <Calendar className="h-5 w-5 mr-2 text-brand-blue" />
        Informations
      </h3>
      <div className="space-y-3 pl-7">
        <div className="text-text-secondary">
          <span className="font-medium">Membre depuis :</span>
          <br />
          {new Date(author.created_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        
        {author.email && (
          <div className="text-text-secondary">
            <span className="font-medium">Email :</span>
            <br />
            {author.email}
          </div>
        )}
        
        {author.phone && (
          <div className="text-text-secondary">
            <span className="font-medium">Téléphone :</span>
            <br />
            {author.phone}
          </div>
        )}
        
        {author.address && (
          <div className="text-text-secondary">
            <span className="font-medium">Adresse :</span>
            <br />
            {author.address}
          </div>
        )}
        
        {author.language && (
          <div className="text-text-secondary">
            <span className="font-medium">Langue :</span>
            <br />
            {formatLanguage(author.language)} {getLanguageFlag(author.language)}
          </div>
        )}
        
        {realStats.lastPostDate && (
          <div className="text-text-secondary">
            <span className="font-medium">Dernier article :</span>
            <br />
            {realStats.lastPostDate.toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        )}
      </div>
    </div>
  );
};