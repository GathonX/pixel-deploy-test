// src/components/blog-author/AuthorFollowButton.tsx - VERSION CORRIGÉE AVEC LOGS
import React from "react";
import { useNavigate } from "react-router-dom";
import { User as UserServiceUser } from "@/services/userService";
import { User } from "@/contexts/AuthContext";
import { FollowStatus } from "@/services/followService";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface AuthorFollowButtonProps {
  author: UserServiceUser;
  currentUser: User | null;
  followStatus: FollowStatus | null;
  followLoading: boolean;
  onFollowToggle: () => void;
}

export const AuthorFollowButton: React.FC<AuthorFollowButtonProps> = ({
  author,
  currentUser,
  followStatus,
  followLoading,
  onFollowToggle,
}) => {
  const navigate = useNavigate();

  // ✅ LOGS DÉTAILLÉS POUR DIAGNOSTIC
  console.log('🔍 [AuthorFollowButton] Rendu avec:', {
    authorId: author?.id,
    authorName: author?.name,
    currentUserId: currentUser?.id,
    currentUserName: currentUser?.name,
    followStatus: followStatus,
    followLoading: followLoading,
    isOwnProfile: currentUser && currentUser.id === author.id
  });

  // ✅ CORRECTION 1 : Vérification stricte des IDs (les deux peuvent être number ou string)
  const isOwnProfile = currentUser && author && 
    (currentUser.id === author.id || currentUser.id.toString() === author.id.toString());

  console.log('🔍 [AuthorFollowButton] Vérification profil:', {
    isOwnProfile,
    currentUserIdType: typeof currentUser?.id,
    authorIdType: typeof author?.id,
    comparison: currentUser?.id === author?.id,
    stringComparison: currentUser?.id.toString() === author?.id.toString()
  });

  // Si c'est l'utilisateur connecté qui regarde son propre profil
  if (isOwnProfile) {
    console.log('✅ [AuthorFollowButton] Profil personnel - pas de bouton');
    return null;
  }

  // Si l'utilisateur n'est pas connecté
  if (!currentUser) {
    console.log('🔍 [AuthorFollowButton] Utilisateur non connecté - bouton connexion');
    return (
      <Button
        onClick={() => {
          console.log('🔗 [AuthorFollowButton] Clic bouton connexion');
          toast.info("Connectez-vous pour suivre cet auteur");
          navigate("/login");
        }}
        className="min-w-[140px] h-12 rounded-xl font-semibold transition-all duration-300 bg-gradient-business text-white hover:shadow-premium"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Se connecter pour suivre
      </Button>
    );
  }

  // ✅ CORRECTION 2 : Vérification de followStatus avant utilisation
  if (!followStatus) {
    console.log('⚠️ [AuthorFollowButton] followStatus est null - bouton désactivé');
    return (
      <Button
        disabled={true}
        className="min-w-[140px] h-12 rounded-xl font-semibold bg-gray-300 text-gray-500 cursor-not-allowed"
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Chargement...
      </Button>
    );
  }

  // ✅ CORRECTION 3 : Logs détaillés de l'état du bouton
  console.log('🔍 [AuthorFollowButton] État bouton follow:', {
    canFollow: followStatus.can_follow,
    isFollowing: followStatus.is_following,
    relationship: followStatus.relationship,
    disabled: followLoading || !followStatus.can_follow
  });

  // ✅ CORRECTION 4 : Handler avec logs détaillés
  const handleClick = () => {
    console.log('🔄 [AuthorFollowButton] Clic bouton follow:', {
      authorId: author.id,
      currentFollowStatus: followStatus.is_following,
      canFollow: followStatus.can_follow,
      followLoading: followLoading
    });

    if (followLoading) {
      console.log('⏳ [AuthorFollowButton] Action en cours - clic ignoré');
      return;
    }

    if (!followStatus.can_follow) {
      console.log('❌ [AuthorFollowButton] Follow non autorisé - clic ignoré');
      toast.error("Impossible de suivre cet utilisateur");
      return;
    }

    console.log('✅ [AuthorFollowButton] Déclenchement onFollowToggle');
    onFollowToggle();
  };

  // Utilisateur connecté - bouton follow normal
  console.log('🔍 [AuthorFollowButton] Rendu bouton normal');
  return (
    <Button
      onClick={handleClick}
      disabled={followLoading || !followStatus.can_follow}
      className={`min-w-[140px] h-12 rounded-xl font-semibold transition-all duration-300 ${
        followStatus.is_following 
          ? 'bg-white border-2 border-brand-blue text-brand-blue hover:bg-blue-50'
          : 'bg-gradient-cta text-white hover:shadow-cta'
      }`}
    >
      {followLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {followStatus.is_following ? 'Désabonnement...' : 'Abonnement...'}
        </>
      ) : followStatus.is_following ? (
        <>
          <UserCheck className="h-4 w-4 mr-2" /> Abonné
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" /> Suivre
        </>
      )}
    </Button>
  );
};