// src/utils/languageUtils.ts - UTILITAIRES POUR LES LANGUES

/**
 * ✅ MAPPING DES LANGUES COHÉRENT
 * Utilisé dans ProfilePage.tsx et BlogAuthor.tsx pour afficher les langues
 */
export const LANGUAGE_LABELS: Record<string, string> = {
  french: 'Français',
  english: 'English',
  spanish: 'Español', 
  german: 'Deutsch',
  chinese: '中文',
  arabic: 'العربية',
  portuguese: 'Português',
  russian: 'Русский',
  japanese: '日本語',
  hindi: 'हिन्दी',
};

/**
 * ✅ FONCTION POUR FORMATER UNE LANGUE
 * @param languageCode Code de la langue (ex: 'french')
 * @returns Nom affiché (ex: 'Français')
 */
export const formatLanguage = (languageCode?: string): string => {
  if (!languageCode) return 'Non spécifié';
  return LANGUAGE_LABELS[languageCode] || languageCode;
};

/**
 * ✅ FONCTION POUR OBTENIR TOUTES LES OPTIONS DE LANGUE
 * Utilisée dans les selects de ProfilePage.tsx
 */
export const getLanguageOptions = () => {
  return Object.entries(LANGUAGE_LABELS).map(([code, label]) => ({
    value: code,
    label: label
  }));
};

/**
 * ✅ FONCTION POUR OBTENIR LE FLAG EMOJI D'UNE LANGUE
 * Optionnel : pour afficher des drapeaux
 */
export const getLanguageFlag = (languageCode?: string): string => {
  const flags: Record<string, string> = {
    french: '🇫🇷',
    english: '🇺🇸',
    spanish: '🇪🇸',
    german: '🇩🇪',
    chinese: '🇨🇳',
    arabic: '🇸🇦',
    portuguese: '🇵🇹',
    russian: '🇷🇺',
    japanese: '🇯🇵',
    hindi: '🇮🇳',
  };
  
  return flags[languageCode || ''] || '🌐';
};