// ============= Design Presets =============
// Complete design themes for cohesive website styling

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  style: 'minimal' | 'modern' | 'elegant' | 'bold' | 'organic' | 'playful' | 'corporate';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadowIntensity: 'none' | 'light' | 'medium' | 'heavy';
}

export const designPresets: DesignPreset[] = [
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Elegant gold and black theme for premium brands',
    colors: {
      primary: '#d4af37',
      secondary: '#1a1a1a',
      accent: '#b8860b',
      background: '#0a0a0a',
      foreground: '#ffffff',
      muted: '#a0a0a0',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    style: 'elegant',
    borderRadius: 'sm',
    shadowIntensity: 'heavy',
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Modern blue gradient for tech companies',
    colors: {
      primary: '#3b82f6',
      secondary: '#0f172a',
      accent: '#06b6d4',
      background: '#0a0a0a',
      foreground: '#ffffff',
      muted: '#94a3b8',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    style: 'modern',
    borderRadius: 'lg',
    shadowIntensity: 'medium',
  },
  {
    id: 'nature-organic',
    name: 'Nature & Organic',
    description: 'Fresh green theme for eco-friendly brands',
    colors: {
      primary: '#22c55e',
      secondary: '#fefce8',
      accent: '#84cc16',
      background: '#ffffff',
      foreground: '#1a1a1a',
      muted: '#6b7280',
    },
    fonts: {
      heading: 'Outfit',
      body: 'Inter',
    },
    style: 'organic',
    borderRadius: 'xl',
    shadowIntensity: 'light',
  },
  {
    id: 'bold-energy',
    name: 'Bold & Energy',
    description: 'Vibrant red and orange for dynamic brands',
    colors: {
      primary: '#dc2626',
      secondary: '#0a0a0a',
      accent: '#f97316',
      background: '#0a0a0a',
      foreground: '#ffffff',
      muted: '#a0a0a0',
    },
    fonts: {
      heading: 'Bebas Neue',
      body: 'Inter',
    },
    style: 'bold',
    borderRadius: 'none',
    shadowIntensity: 'heavy',
  },
  {
    id: 'clean-minimal',
    name: 'Clean & Minimal',
    description: 'Ultra-clean design with subtle accents',
    colors: {
      primary: '#0a0a0a',
      secondary: '#ffffff',
      accent: '#6b7280',
      background: '#ffffff',
      foreground: '#0a0a0a',
      muted: '#9ca3af',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    style: 'minimal',
    borderRadius: 'sm',
    shadowIntensity: 'none',
  },
  {
    id: 'creative-purple',
    name: 'Creative Purple',
    description: 'Vibrant purple for creative agencies',
    colors: {
      primary: '#8b5cf6',
      secondary: '#1a1a2e',
      accent: '#ec4899',
      background: '#0a0a0a',
      foreground: '#ffffff',
      muted: '#a78bfa',
    },
    fonts: {
      heading: 'Space Grotesk',
      body: 'Inter',
    },
    style: 'modern',
    borderRadius: 'xl',
    shadowIntensity: 'medium',
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional blue for business websites',
    colors: {
      primary: '#1d4ed8',
      secondary: '#f8fafc',
      accent: '#0ea5e9',
      background: '#ffffff',
      foreground: '#1e293b',
      muted: '#64748b',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    style: 'corporate',
    borderRadius: 'md',
    shadowIntensity: 'light',
  },
  {
    id: 'warm-sunset',
    name: 'Warm Sunset',
    description: 'Warm orange and pink gradient theme',
    colors: {
      primary: '#f97316',
      secondary: '#fef3c7',
      accent: '#ec4899',
      background: '#fffbeb',
      foreground: '#1c1917',
      muted: '#78716c',
    },
    fonts: {
      heading: 'Outfit',
      body: 'Inter',
    },
    style: 'playful',
    borderRadius: 'xl',
    shadowIntensity: 'light',
  },
  {
    id: 'dark-elegant',
    name: 'Dark Elegant',
    description: 'Sophisticated dark theme with subtle accents',
    colors: {
      primary: '#e5e5e5',
      secondary: '#171717',
      accent: '#a3a3a3',
      background: '#0a0a0a',
      foreground: '#fafafa',
      muted: '#737373',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    style: 'elegant',
    borderRadius: 'sm',
    shadowIntensity: 'none',
  },
  {
    id: 'ocean-calm',
    name: 'Ocean Calm',
    description: 'Calming teal and blue for wellness brands',
    colors: {
      primary: '#14b8a6',
      secondary: '#f0fdfa',
      accent: '#0ea5e9',
      background: '#ffffff',
      foreground: '#134e4a',
      muted: '#5eead4',
    },
    fonts: {
      heading: 'Outfit',
      body: 'Inter',
    },
    style: 'organic',
    borderRadius: 'xl',
    shadowIntensity: 'light',
  },
];

// Helper function to get a preset by ID
export function getDesignPreset(id: string): DesignPreset | undefined {
  return designPresets.find(preset => preset.id === id);
}

// Helper function to generate CSS variables from a preset
export function presetToCssVariables(preset: DesignPreset): Record<string, string> {
  return {
    '--preset-primary': preset.colors.primary,
    '--preset-secondary': preset.colors.secondary,
    '--preset-accent': preset.colors.accent,
    '--preset-background': preset.colors.background,
    '--preset-foreground': preset.colors.foreground,
    '--preset-muted': preset.colors.muted,
    '--preset-font-heading': preset.fonts.heading,
    '--preset-font-body': preset.fonts.body,
  };
}
