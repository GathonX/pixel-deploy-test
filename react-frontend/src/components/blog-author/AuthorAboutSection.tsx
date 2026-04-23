// src/components/blog-author/AuthorAboutSection.tsx
import React from "react";
import { User as UserServiceUser } from "@/services/userService";
import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";
import { AuthorInformationCard } from "./AuthorInformationCard";
import { AuthorStatisticsCard } from "./AuthorStatisticsCard";
import { AuthorEngagementCard } from "./AuthorEngagementCard";
import { AuthorSpecialSection } from "./AuthorSpecialSection";
import { AuthorActivityHistory } from "./AuthorActivityHistory";

interface AuthorAboutSectionProps {
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
  authorStats: {
    social: {
      followers_count: number;
      following_count: number;
    };
  } | null;
}

export const AuthorAboutSection: React.FC<AuthorAboutSectionProps> = ({
  author,
  authorPosts,
  realStats,
  authorStats,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-gradient-card backdrop-blur-glass border border-white/20 shadow-premium">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6 flex items-center">
            <Award className="h-6 w-6 mr-3 text-brand-blue" />
            À propos de {author.name}
          </h2>
          
          <div className="space-y-8">
            {/* Biographie */}
            <div>
              <h3 className="font-semibold text-lg text-text-primary mb-3">Biographie</h3>
              <p className="text-text-secondary leading-relaxed">
                {author.bio || "Aucune biographie renseignée pour le moment."}
              </p>
            </div>
            
            {/* Grille d'informations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AuthorInformationCard 
                author={author}
                realStats={realStats}
              />
              
              <AuthorStatisticsCard 
                realStats={realStats}
              />
            </div>
            
            {/* Engagement en temps réel */}
            <AuthorEngagementCard 
              realStats={realStats}
            />
            
            {/* Section spéciale (IA ou Community) */}
            <AuthorSpecialSection 
              author={author}
              realStats={realStats}
              authorStats={authorStats}
            />
            
            {/* Historique d'activité */}
            <AuthorActivityHistory 
              author={author}
              authorPosts={authorPosts}
              realStats={realStats}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};