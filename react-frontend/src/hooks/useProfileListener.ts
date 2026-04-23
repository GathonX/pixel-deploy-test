// src/hooks/useProfileListener.ts - HOOK POUR ÉCOUTER LES CHANGEMENTS DE PROFIL

import { useState, useEffect } from 'react';
import { User } from '@/contexts/AuthContext';

// Avatar par défaut uniforme
const DEFAULT_AVATAR = 'https://github.com/shadcn.png';

/**
 * ✅ FONCTION UTILITAIRE : Générer URL avatar uniforme
 */
export const getUniformAvatarUrl = (avatarPath?: string | null): string => {
  // Protection contre valeurs invalides
  if (!avatarPath || avatarPath === '0' || avatarPath === 'null' || avatarPath.trim() === '') {
    return DEFAULT_AVATAR;
  }
  
  // Si c'est déjà une URL complète, la retourner
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }
  
  // Construire l'URL avec le domaine API
  return `${import.meta.env.VITE_API_URL}/storage/${avatarPath}`;
};

/**
 * ✅ HOOK POUR ÉCOUTER LES CHANGEMENTS DE PROFIL
 * 
 * Permet aux composants d'écouter les mises à jour du profil utilisateur
 * en temps réel, même s'ils ne sont pas dans le contexte Auth direct.
 * 
 * @returns Les données du profil mises à jour ou null
 */
export const useProfileListener = () => {
  const [updatedProfile, setUpdatedProfile] = useState<User | null>(null);

  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent<User>) => {
      setUpdatedProfile(event.detail);
      console.log('🔔 [useProfileListener] Profil mis à jour reçu:', event.detail.name);
    };

    // ✅ Écouter l'événement personnalisé
    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  return updatedProfile;
};

/**
 * ✅ HOOK POUR ÉCOUTER SPÉCIFIQUEMENT LES CHANGEMENTS D'AVATAR
 * 
 * Version spécialisée qui retourne l'URL de l'avatar formatée uniformément
 */
export const useAvatarListener = () => {
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);

  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent<User>) => {
      const user = event.detail;
      const uniformUrl = getUniformAvatarUrl(user.avatar);
      setAvatarUrl(uniformUrl);
      console.log('🖼️ [useAvatarListener] Avatar mis à jour:', uniformUrl);
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  return avatarUrl;
};

/**
 * ✅ HOOK COMBINÉ : Profil + Avatar URL uniforme
 * 
 * Retourne à la fois le profil et l'URL avatar formatée
 */
export const useProfileWithAvatar = () => {
  const [updatedProfile, setUpdatedProfile] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);

  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent<User>) => {
      const user = event.detail;
      setUpdatedProfile(user);
      
      const uniformUrl = getUniformAvatarUrl(user.avatar);
      setAvatarUrl(uniformUrl);
      
      console.log('🔄 [useProfileWithAvatar] Profil + Avatar mis à jour:', {
        name: user.name,
        avatarUrl: uniformUrl
      });
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  return { updatedProfile, avatarUrl };
};