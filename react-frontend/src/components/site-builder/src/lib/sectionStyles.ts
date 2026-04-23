// ============= Section Styles Library =============
// Advanced styles, gradients, patterns, shadows, and animations for beautiful sections

// Gradient Presets
export const gradients = {
  // Dark gradients
  midnight: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
  cosmic: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  darkPurple: 'linear-gradient(135deg, #1a0a2e 0%, #3d1a5f 50%, #1a0a2e 100%)',
  darkBlue: 'linear-gradient(135deg, #0c1445 0%, #1d3461 50%, #0c1445 100%)',
  
  // Vibrant gradients
  sunset: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
  ocean: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
  aurora: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #8b5cf6 100%)',
  fire: 'linear-gradient(135deg, #dc2626 0%, #f97316 50%, #fbbf24 100%)',
  neon: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
  
  // Soft gradients
  softPink: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)',
  softBlue: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
  softGreen: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
  softPurple: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)',
  
  // Mesh gradients (multi-stop)
  meshViolet: 'radial-gradient(at 40% 20%, hsla(262,83%,58%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(280,83%,65%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(262,83%,58%,0.2) 0px, transparent 50%)',
  meshBlue: 'radial-gradient(at 40% 20%, hsla(210,100%,50%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(190,100%,50%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(230,100%,60%,0.2) 0px, transparent 50%)',
  meshSunset: 'radial-gradient(at 40% 20%, hsla(30,100%,60%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(330,100%,60%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(280,100%,60%,0.2) 0px, transparent 50%)',
};

// SVG Pattern URLs
export const patterns = {
  dots: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.08'%3E%3Ccircle cx='3' cy='3' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
  grid: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%239C92AC' stroke-width='0.5' stroke-opacity='0.1'%3E%3Cpath d='M0 20h40M20 0v40'/%3E%3C/g%3E%3C/svg%3E")`,
  diagonal: `url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10L10 0' stroke='%239C92AC' stroke-opacity='0.1' stroke-width='0.5'/%3E%3C/svg%3E")`,
  waves: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10C25 10 25 0 50 0s25 10 50 10s25 10 50 10' fill='none' stroke='%239C92AC' stroke-opacity='0.1'/%3E%3C/svg%3E")`,
  circuit: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0v60M0 30h60M15 15h30v30H15z' fill='none' stroke='%239C92AC' stroke-opacity='0.08' stroke-width='0.5'/%3E%3C/svg%3E")`,
  hexagon: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%239C92AC' stroke-opacity='0.08'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5l-13-7.5v-15l13-7.5z'/%3E%3C/g%3E%3C/svg%3E")`,
};

// Shadow Presets
export const shadows = {
  none: 'none',
  soft: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  medium: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  large: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Colored glows
  glowPrimary: '0 0 40px -10px hsl(262 83% 58% / 0.4)',
  glowBlue: '0 0 40px -10px hsl(210 100% 50% / 0.4)',
  glowGreen: '0 0 40px -10px hsl(160 100% 40% / 0.4)',
  glowOrange: '0 0 40px -10px hsl(30 100% 50% / 0.4)',
  glowPink: '0 0 40px -10px hsl(330 100% 60% / 0.4)',
  
  // Neon effects
  neonPurple: '0 0 5px #8b5cf6, 0 0 20px #8b5cf6, 0 0 40px #8b5cf6',
  neonBlue: '0 0 5px #3b82f6, 0 0 20px #3b82f6, 0 0 40px #3b82f6',
  neonCyan: '0 0 5px #06b6d4, 0 0 20px #06b6d4, 0 0 40px #06b6d4',
  
  // Card shadows
  card: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  cardHover: '0 14px 28px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.12)',
  cardElevated: '0 19px 38px rgba(0,0,0,0.15), 0 15px 12px rgba(0,0,0,0.10)',
};

// Border Radius Presets
export const borderRadius = {
  none: '0',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  full: '9999px',
};

// Animation Classes
export const animations = {
  float: 'animate-float',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  fadeIn: 'animate-fade-in',
  fadeUp: 'animate-fade-up',
  scaleIn: 'animate-scale-in',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  gradient: 'animate-gradient',
  shimmer: 'animate-shimmer',
  glow: 'animate-glow',
};

// Glass Effect Styles
export const glassStyles = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  dark: {
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  colored: {
    background: 'rgba(139, 92, 246, 0.2)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
};

// Card Style Presets
export const cardStyles = {
  flat: {
    background: 'hsl(var(--card))',
    border: 'none',
    borderRadius: borderRadius.lg,
    boxShadow: 'none',
  },
  bordered: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: borderRadius.lg,
    boxShadow: 'none',
  },
  elevated: {
    background: 'hsl(var(--card))',
    border: 'none',
    borderRadius: borderRadius.xl,
    boxShadow: shadows.medium,
  },
  glass: {
    ...glassStyles.light,
    borderRadius: borderRadius.xl,
  },
  gradient: {
    background: gradients.softPurple,
    border: 'none',
    borderRadius: borderRadius.xl,
    boxShadow: shadows.soft,
  },
  '3d': {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: borderRadius.lg,
    boxShadow: '0 10px 0 -5px hsl(var(--border))',
    transform: 'translateY(-5px)',
  },
};

// Section Layout Presets
export const sectionLayouts = {
  centered: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  split: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4rem',
    alignItems: 'center',
  },
  splitReverse: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4rem',
    alignItems: 'center',
    direction: 'rtl' as const,
  },
  stacked: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  masonry: {
    columnCount: 3,
    columnGap: '1.5rem',
  },
};

// Helper function to get gradient background with overlay
export function getGradientBackground(gradientKey: keyof typeof gradients, withOverlay = false) {
  const gradient = gradients[gradientKey];
  if (withOverlay) {
    return `${gradient}, linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3))`;
  }
  return gradient;
}

// Helper function to combine pattern with background color
export function getPatternBackground(patternKey: keyof typeof patterns, backgroundColor: string) {
  return `${patterns[patternKey]}, ${backgroundColor}`;
}

// Helper function to get responsive grid columns
export function getGridColumns(columns: number) {
  return {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };
}

// Design system color palette for sections
export const sectionColors = {
  dark: {
    background: '#0a0a0a',
    text: '#ffffff',
    muted: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(255, 255, 255, 0.1)',
    accent: '#8b5cf6',
  },
  light: {
    background: '#ffffff',
    text: '#0a0a0a',
    muted: 'rgba(10, 10, 10, 0.6)',
    border: 'rgba(10, 10, 10, 0.1)',
    accent: '#8b5cf6',
  },
  gray: {
    background: '#f8f9fa',
    text: '#0a0a0a',
    muted: 'rgba(10, 10, 10, 0.6)',
    border: 'rgba(10, 10, 10, 0.08)',
    accent: '#8b5cf6',
  },
};
