// utils/socialPostUtils.ts - Utilitaires pour la copie et l'export des posts

import { SocialMediaPost } from "@/services/socialMediaService";
import { toast } from "sonner";

/**
 * Copier du texte dans le presse-papier
 */
export const copyToClipboard = async (text: string, successMessage = "Copié !") => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch (error) {
    // Fallback pour les navigateurs sans support clipboard
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(successMessage);
      return true;
    } catch (fallbackError) {
      toast.error("Impossible de copier le texte");
      return false;
    }
  }
};

/**
 * Formater le post complet pour copie
 */
export const formatPostForCopy = (post: SocialMediaPost): string => {
  let formatted = post.content;
  
  if (post.tags && post.tags.length > 0) {
    formatted += '\n\n' + post.tags.join(' ');
  }
  
  return formatted;
};

/**
 * Formater uniquement les hashtags
 */
export const formatHashtagsForCopy = (post: SocialMediaPost): string => {
  return post.tags?.join(' ') || '';
};

/**
 * Générer contenu optimisé pour une plateforme spécifique
 */
export const formatForPlatform = (post: SocialMediaPost, targetPlatform: string): string => {
  const content = post.content;
  const hashtags = post.tags?.join(' ') || '';
  
  const platformLimits = {
    twitter: 280,
    facebook: 2000,
    instagram: 2200,
    linkedin: 3000
  };
  
  const limit = platformLimits[targetPlatform as keyof typeof platformLimits] || 2000;
  const fullContent = `${content}\n\n${hashtags}`;
  
  if (fullContent.length <= limit) {
    return fullContent;
  }
  
  // Tronquer le contenu en gardant les hashtags
  const availableSpace = limit - hashtags.length - 4; // -4 pour \n\n
  const truncatedContent = content.substring(0, availableSpace - 3) + '...';
  
  return `${truncatedContent}\n\n${hashtags}`;
};

/**
 * Télécharger le post comme fichier texte
 */
export const downloadPostAsText = (post: SocialMediaPost, filename?: string) => {
  const content = formatPostForCopy(post);
  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = filename || `post-${post.platform}-${post.id}-${timestamp}.txt`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast.success("Post téléchargé !");
};

/**
 * Télécharger les images du post
 */
export const downloadPostImages = async (post: SocialMediaPost) => {
  if (!post.images || post.images.length === 0) {
    toast.error("Aucune image à télécharger");
    return;
  }
  
  try {
    for (let i = 0; i < post.images.length; i++) {
      const imageUrl = post.images[i];
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `post-${post.id}-image-${i + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    toast.success(`${post.images.length} image(s) téléchargée(s) !`);
  } catch (error) {
    toast.error("Erreur lors du téléchargement des images");
  }
};

/**
 * Exporter vers une plateforme sociale spécifique
 */
export const exportToPlatform = (post: SocialMediaPost, platform: string) => {
  const formattedContent = formatForPlatform(post, platform);
  
  // URLs des plateformes
  const platformUrls = {
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    twitter: 'https://twitter.com/compose/tweet',
    linkedin: 'https://www.linkedin.com/feed/',
  };
  
  const url = platformUrls[platform.toLowerCase() as keyof typeof platformUrls];
  
  if (!url) {
    toast.error(`Plateforme ${platform} non supportée`);
    return;
  }
  
  // Copier le contenu formaté
  copyToClipboard(formattedContent, `Contenu copié et optimisé pour ${platform} !`);
  
  // Ouvrir la plateforme
  window.open(url, '_blank');
  
  toast.info(`Redirection vers ${platform}`, {
    description: "Le contenu a été copié et optimisé pour cette plateforme"
  });
};

/**
 * Générer un aperçu du post pour différentes plateformes
 */
export const generatePlatformPreviews = (post: SocialMediaPost) => {
  const platforms = ['twitter', 'facebook', 'instagram', 'linkedin'];
  
  return platforms.reduce((previews, platform) => {
    previews[platform] = {
      content: formatForPlatform(post, platform),
      characterCount: formatForPlatform(post, platform).length,
      platform: platform
    };
    return previews;
  }, {} as Record<string, { content: string; characterCount: number; platform: string }>);
};

/**
 * Valider si le contenu respecte les limites de la plateforme
 */
export const validateForPlatform = (content: string, platform: string) => {
  const platformLimits = {
    twitter: 280,
    facebook: 2000,
    instagram: 2200,
    linkedin: 3000
  };
  
  const limit = platformLimits[platform as keyof typeof platformLimits] || 2000;
  
  return {
    isValid: content.length <= limit,
    currentLength: content.length,
    maxLength: limit,
    remaining: limit - content.length
  };
};

/**
 * Créer un lien de partage rapide
 */
export const createShareableLink = (post: SocialMediaPost) => {
  // Créer un lien vers la page de détail du post
  const baseUrl = window.location.origin;
  return `${baseUrl}/social-media/post/${post.id}`;
};

/**
 * Partager via l'API Web Share (mobile)
 */
export const shareViaWebAPI = async (post: SocialMediaPost) => {
  if (!navigator.share) {
    toast.error("Partage non supporté sur ce navigateur");
    return;
  }
  
  try {
    await navigator.share({
      title: `Post ${post.platform}`,
      text: post.content.substring(0, 100) + '...',
      url: createShareableLink(post)
    });
  } catch (error) {
    // L'utilisateur a annulé ou erreur
    console.log('Partage annulé');
  }
};