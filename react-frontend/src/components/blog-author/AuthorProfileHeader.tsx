// src/components/blog-author/AuthorProfileHeader.tsx - VERSION CORRIGÉE AVEC LOGS
import React from "react";
import { User as UserServiceUser } from "@/services/userService";
import { User } from "@/contexts/AuthContext";
import { FollowStatus } from "@/services/followService";
import { Badge } from "@/components/ui/badge";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener";
import { AuthorProfileStats } from "./AuthorProfileStats";
import { AuthorFollowButton } from "./AuthorFollowButton";
import { Award, Users, TrendingUp, Sparkles } from "lucide-react";

interface AuthorProfileHeaderProps {
  author: UserServiceUser;
  currentUser: User | null;
  followStatus: FollowStatus | null;
  followLoading: boolean;
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
  onFollowToggle: () => void;
  getAuthorAvatarUrl: (avatarPath?: string) => string;
}

export const AuthorProfileHeader: React.FC<AuthorProfileHeaderProps> = ({
  author,
  currentUser,
  followStatus,
  followLoading,
  realStats,
  authorStats,
  onFollowToggle,
  getAuthorAvatarUrl,
}) => {
  // ✅ Afficher "PixelRise" pour les posts admin
  const displayName = (author.id === 1 || author.name === 'Admin') ? 'PixelRise' : author.name;

  // ✅ LOGS DÉTAILLÉS POUR DIAGNOSTIC DU NOMBRE D'ABONNÉS
  console.log('📊 [AuthorProfileHeader] Rendu avec données:', {
    authorId: author?.id,
    authorName: author?.name,
    displayName: displayName,
    authorFollowersFromAuthor: author?.followers_count,
    authorFollowersFromStats: authorStats?.social?.followers_count,
    currentUserId: currentUser?.id,
    followStatus: followStatus,
    followLoading: followLoading
  });

  // ✅ CORRECTION : Utiliser une logique de fallback pour les followers
  const getFollowersCount = (): number => {
    // Priorité 1: authorStats (données les plus récentes)
    if (authorStats?.social?.followers_count !== undefined) {
      console.log('✅ [AuthorProfileHeader] Utilisation followers depuis authorStats:', authorStats.social.followers_count);
      return authorStats.social.followers_count;
    }
    
    // Priorité 2: author.followers_count (données initiales)
    if (author?.followers_count !== undefined) {
      console.log('✅ [AuthorProfileHeader] Utilisation followers depuis author:', author.followers_count);
      return author.followers_count;
    }
    
    // Fallback: 0
    console.log('⚠️ [AuthorProfileHeader] Aucune donnée followers - utilisation 0');
    return 0;
  };

  const followersCount = getFollowersCount();
  console.log('📊 [AuthorProfileHeader] Nombre final de followers:', followersCount);

  // ✅ CORRECTION : Handler avec logs détaillés
  const handleFollowToggle = () => {
    console.log('🔄 [AuthorProfileHeader] handleFollowToggle appelé:', {
      authorId: author.id,
      currentFollowersCount: followersCount,
      isFollowing: followStatus?.is_following
    });
    
    onFollowToggle();
  };

  return (
    <div className="relative bg-gradient-card backdrop-blur-glass p-8 rounded-2xl mb-8 shadow-premium border border-white/20 overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-business opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-cta opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
      
      <div className="relative flex flex-col lg:flex-row items-center gap-8">
        {/* Avatar avec indicateur d'activité */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-business rounded-full animate-glow opacity-20"></div>
          <div className="h-32 w-32 relative border-4 border-white shadow-premium rounded-full overflow-hidden">
            <img
              src={getAuthorAvatarUrl(author.avatar)}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log('❌ [AuthorProfileHeader] Erreur chargement avatar, fallback');
                e.currentTarget.src = getUniformAvatarUrl(null);
              }}
            />
          </div>
          {realStats.isActive && (
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-400 to-green-600 rounded-full p-2 shadow-cta">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        
        {/* Informations principales */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
            <h1 className="text-3xl font-bold text-text-primary">{displayName}</h1>
            <div className="flex items-center gap-2">
              {currentUser && author.id === currentUser.id && (
                <Badge className="bg-gradient-business text-white">
                  <Award className="h-3 w-3 mr-1" />
                  Votre profil
                </Badge>
              )}
              {followStatus?.is_followed_by && (
                <Badge className="bg-gradient-success text-white">
                  <Users className="h-3 w-3 mr-1" />
                  Vous suit
                </Badge>
              )}
              {realStats.isActive && (
                <Badge className="bg-gradient-to-r from-green-400 to-green-600 text-white">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-text-secondary mb-6 text-lg">
            {author.bio || "Auteur passionné sur PixelRise - Créateur de contenu de qualité"}
          </p>
          
          {/* ✅ STATISTIQUES AVEC LOGS */}
          <AuthorProfileStats 
            realStats={realStats}
            authorStats={authorStats}
          />
          
          {/* ✅ DEBUG: Affichage temporaire du nombre de followers */}
          <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
            🐛 DEBUG: Followers = {followersCount} 
            (authorStats: {authorStats?.social?.followers_count ?? 'undefined'}, 
            author: {author?.followers_count ?? 'undefined'})
          </div>
        </div>
        
        {/* Bouton follow avec logs */}
        <div className="flex-shrink-0">
          <AuthorFollowButton
            author={author}
            currentUser={currentUser}
            followStatus={followStatus}
            followLoading={followLoading}
            onFollowToggle={handleFollowToggle}
          />
        </div>
      </div>
    </div>
  );
};