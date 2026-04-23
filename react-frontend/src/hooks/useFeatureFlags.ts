export const useFeatureFlags = () => {
  return {
    hero: import.meta.env.VITE_FEATURE_HERO === 'true',
    features: import.meta.env.VITE_FEATURE_FEATURES === 'true',
    about: import.meta.env.VITE_FEATURE_ABOUT === 'true',
    howItWorks: import.meta.env.VITE_FEATURE_HOW_IT_WORKS === 'true',
    pricing: import.meta.env.VITE_FEATURE_PRICING === 'true',
    testimonials: import.meta.env.VITE_FEATURE_TESTIMONIALS === 'true',
    faq: import.meta.env.VITE_FEATURE_FAQ === 'true',
    newsletter: import.meta.env.VITE_FEATURE_NEWSLETTER === 'true',
    cta: import.meta.env.VITE_FEATURE_CTA === 'true',
  };
};
