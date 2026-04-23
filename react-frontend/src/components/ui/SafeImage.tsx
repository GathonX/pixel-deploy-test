

// src/components/ui/SafeImage.tsx
// ✅ COMPOSANT SÉCURISÉ POUR IMAGES AVEC FALLBACK AUTOMATIQUE
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  onError?: () => void;
  showPlaceholder?: boolean;
}

/**
 * ✅ COMPOSANT IMAGE SÉCURISÉ AVEC FALLBACK AUTOMATIQUE
 * 
 * Fonctionnalités:
 * - Fallback automatique en cas d'erreur 404
 * - Placeholder pendant le chargement
 * - Support pour images Unsplash problématiques
 * - Gestion d'erreurs silencieuse
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackSrc,
  className,
  onError,
  showPlaceholder = true,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ URLs de fallback par défaut pour différents domaines
  const getDefaultFallback = (originalSrc: string): string => {
    // Si c'est une URL Unsplash problématique, utiliser une image valide
    if (originalSrc.includes('images.unsplash.com/featured/')) {
      return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format';
    }
    
    // Autres fallbacks selon le contexte
    if (originalSrc.includes('business') || originalSrc.includes('marketing')) {
      return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=600&fit=crop&auto=format';
    }
    
    if (originalSrc.includes('technology') || originalSrc.includes('programming')) {
      return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format';
    }

    // Fallback par défaut
    return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format';
  };

  // ✅ Reset state when src changes
  useEffect(() => {
    console.log("🔄 [SafeImage] Nouvelle source:", src);
    setCurrentSrc(src);
    setHasError(false);
    setIsLoading(true);

    // ✅ CORRECTION CRITIQUE: Timeout de sécurité pour éviter le blocage infini
    const timeoutId = setTimeout(() => {
      console.warn("⏰ [SafeImage] Timeout de chargement pour:", src);
      setIsLoading(false);
    }, 5000); // 5 secondes max

    return () => clearTimeout(timeoutId);
  }, [src]);

  // ✅ Gérer les erreurs de chargement
  const handleError = () => {
    console.warn(`❌ [SafeImage] Erreur chargement image: ${currentSrc}`);
    
    if (!hasError) {
      // Premier échec, essayer le fallback fourni ou par défaut
      const nextSrc = fallbackSrc || getDefaultFallback(src);
      console.log(`🔄 [SafeImage] Fallback vers: ${nextSrc}`);
      
      setCurrentSrc(nextSrc);
      setHasError(true);
    } else {
      // Même le fallback a échoué, garder l'image cassée ou placeholder
      console.error(`💥 [SafeImage] Même le fallback a échoué pour: ${alt}`);
    }
    
    setIsLoading(false);
    onError?.();
  };

  // ✅ Image chargée avec succès
  const handleLoad = () => {
    console.log("✅ [SafeImage] Image chargée avec succès:", currentSrc);
    setIsLoading(false);
  };

  // ✅ Si on veut un placeholder pendant le chargement
  if (isLoading && showPlaceholder) {
    return (
      <div
        className={cn(
          "bg-gray-200 animate-pulse flex items-center justify-center",
          className
        )}
        {...props}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={cn(className)}
      onError={handleError}
      onLoad={handleLoad}
      style={{
        ...props.style,
        display: isLoading ? 'none' : 'block'
      }}
    />
  );
};

export default SafeImage;