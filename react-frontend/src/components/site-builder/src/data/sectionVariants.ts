// Section Style Variants - Multiple style presets for each section type

export interface SectionVariant {
  id: string;
  name: string;
  description: string;
  preview: string; // Color/gradient preview
  styles: Record<string, any>;
  content?: Record<string, any>; // Optional content overrides
}

export interface SectionVariantsConfig {
  sectionTypeId: string;
  variants: SectionVariant[];
}

export const sectionVariants: SectionVariantsConfig[] = [
  {
    sectionTypeId: 'navbar',
    variants: [
      {
        id: 'navbar-transparent',
        name: 'Transparent',
        description: 'Navigation transparente sur fond sombre',
        preview: 'linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
        styles: { backgroundColor: 'transparent', textColor: '#ffffff', sticky: true }
      },
      {
        id: 'navbar-white',
        name: 'Blanc classique',
        description: 'Navigation blanche avec texte sombre',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', textColor: '#0a0a0a', sticky: true }
      },
      {
        id: 'navbar-dark',
        name: 'Sombre',
        description: 'Navigation noire élégante',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', sticky: true }
      },
      {
        id: 'navbar-gradient',
        name: 'Dégradé violet',
        description: 'Navigation avec accent coloré',
        preview: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
        styles: { backgroundColor: '#8b5cf6', textColor: '#ffffff', sticky: true }
      },
      {
        id: 'navbar-blur',
        name: 'Blur Glass',
        description: 'Effet verre dépoli moderne',
        preview: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))',
        styles: { backgroundColor: 'rgba(255,255,255,0.8)', textColor: '#0a0a0a', sticky: true, blur: true }
      },
      {
        id: 'navbar-bordered',
        name: 'Avec bordure',
        description: 'Navigation blanche avec bordure subtile',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', textColor: '#0a0a0a', sticky: true, bordered: true }
      },
      {
        id: 'navbar-blue',
        name: 'Bleu professionnel',
        description: 'Navigation bleue corporate',
        preview: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
        styles: { backgroundColor: '#1d4ed8', textColor: '#ffffff', sticky: true }
      },
      {
        id: 'navbar-minimal',
        name: 'Minimaliste',
        description: 'Style très épuré',
        preview: 'linear-gradient(135deg, #fafafa, #f5f5f5)',
        styles: { backgroundColor: '#fafafa', textColor: '#333333', sticky: false }
      }
    ]
  },
  {
    sectionTypeId: 'hero',
    variants: [
      {
        id: 'hero-dark',
        name: 'Sombre moderne',
        description: 'Fond noir avec gradient subtil',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'hero-light',
        name: 'Blanc épuré',
        description: 'Fond clair et minimaliste',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', textColor: '#0a0a0a', gradient: false }
      },
      {
        id: 'hero-purple',
        name: 'Violet vibrant',
        description: 'Gradient violet énergique',
        preview: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
        styles: { backgroundColor: '#8b5cf6', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'hero-blue',
        name: 'Bleu professionnel',
        description: 'Gradient bleu corporate',
        preview: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        styles: { backgroundColor: '#3b82f6', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'hero-green',
        name: 'Vert nature',
        description: 'Gradient vert éco-friendly',
        preview: 'linear-gradient(135deg, #10b981, #059669)',
        styles: { backgroundColor: '#10b981', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'hero-orange',
        name: 'Orange chaleureux',
        description: 'Gradient orange dynamique',
        preview: 'linear-gradient(135deg, #f97316, #ea580c)',
        styles: { backgroundColor: '#f97316', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'hero-split',
        name: 'Split bicolore',
        description: 'Moitié sombre, moitié claire',
        preview: 'linear-gradient(90deg, #0a0a0a 50%, #f8f9fa 50%)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'split' }
      },
      {
        id: 'hero-gradient-mesh',
        name: 'Mesh gradient',
        description: 'Dégradé multicolore moderne',
        preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f97316 100%)',
        styles: { backgroundColor: '#667eea', textColor: '#ffffff', gradient: true, meshGradient: true }
      },
      {
        id: 'hero-minimal',
        name: 'Ultra minimaliste',
        description: 'Très épuré, focus sur le texte',
        preview: 'linear-gradient(135deg, #fafafa, #ffffff)',
        styles: { backgroundColor: '#fafafa', textColor: '#0a0a0a', padding: '80px', gradient: false }
      },
      {
        id: 'hero-navy',
        name: 'Bleu marine',
        description: 'Bleu profond élégant',
        preview: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
        styles: { backgroundColor: '#1e3a5f', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'hero-rose',
        name: 'Rose moderne',
        description: 'Gradient rose tendance',
        preview: 'linear-gradient(135deg, #ec4899, #f472b6)',
        styles: { backgroundColor: '#ec4899', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'hero-teal',
        name: 'Teal frais',
        description: 'Couleur turquoise apaisante',
        preview: 'linear-gradient(135deg, #14b8a6, #0d9488)',
        styles: { backgroundColor: '#14b8a6', textColor: '#ffffff', gradient: true }
      }
    ]
  },
  {
    sectionTypeId: 'features',
    variants: [
      {
        id: 'features-white',
        name: 'Blanc classique',
        description: 'Fond blanc avec cartes',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', columns: 3 }
      },
      {
        id: 'features-gray',
        name: 'Gris clair',
        description: 'Fond gris doux',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', columns: 3 }
      },
      {
        id: 'features-dark',
        name: 'Sombre',
        description: 'Fond noir avec cartes sombres',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', columns: 3 }
      },
      {
        id: 'features-2cols',
        name: '2 colonnes',
        description: 'Layout à 2 colonnes plus large',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', columns: 2 }
      },
      {
        id: 'features-4cols',
        name: '4 colonnes',
        description: 'Layout compact à 4 colonnes',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', columns: 4 }
      },
      {
        id: 'features-cards-bordered',
        name: 'Cartes bordées',
        description: 'Cartes avec bordures visibles',
        preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
        styles: { backgroundColor: '#ffffff', columns: 3, cardStyle: 'bordered' }
      },
      {
        id: 'features-cards-shadow',
        name: 'Cartes ombrées',
        description: 'Cartes avec ombres portées',
        preview: 'linear-gradient(135deg, #f8f9fa, #e8e8e8)',
        styles: { backgroundColor: '#f8f9fa', columns: 3, cardStyle: 'shadow' }
      },
      {
        id: 'features-icons-colored',
        name: 'Icônes colorées',
        description: 'Icônes avec arrière-plan coloré',
        preview: 'linear-gradient(135deg, #ffffff, #f0f9ff)',
        styles: { backgroundColor: '#ffffff', columns: 3, iconStyle: 'colored' }
      },
      {
        id: 'features-list',
        name: 'Style liste',
        description: 'Affichage en liste verticale',
        preview: 'linear-gradient(135deg, #ffffff, #fafafa)',
        styles: { backgroundColor: '#ffffff', layout: 'list' }
      },
      {
        id: 'features-gradient-bg',
        name: 'Fond dégradé',
        description: 'Dégradé subtil en arrière-plan',
        preview: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
        styles: { backgroundColor: '#f0f9ff', columns: 3, gradientBg: true }
      }
    ]
  },
  {
    sectionTypeId: 'stats',
    variants: [
      {
        id: 'stats-dark',
        name: 'Sombre',
        description: 'Fond noir professionnel',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff' }
      },
      {
        id: 'stats-white',
        name: 'Blanc',
        description: 'Fond clair et épuré',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', textColor: '#0a0a0a' }
      },
      {
        id: 'stats-purple',
        name: 'Violet',
        description: 'Fond violet vibrant',
        preview: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        styles: { backgroundColor: '#8b5cf6', textColor: '#ffffff' }
      },
      {
        id: 'stats-gradient',
        name: 'Dégradé bleu',
        description: 'Dégradé bleu moderne',
        preview: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        styles: { backgroundColor: '#3b82f6', textColor: '#ffffff' }
      },
      {
        id: 'stats-green',
        name: 'Vert',
        description: 'Fond vert nature',
        preview: 'linear-gradient(135deg, #10b981, #059669)',
        styles: { backgroundColor: '#10b981', textColor: '#ffffff' }
      },
      {
        id: 'stats-gray',
        name: 'Gris élégant',
        description: 'Fond gris professionnel',
        preview: 'linear-gradient(135deg, #374151, #1f2937)',
        styles: { backgroundColor: '#374151', textColor: '#ffffff' }
      },
      {
        id: 'stats-animated',
        name: 'Avec animation',
        description: 'Chiffres qui s\'animent',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', animated: true }
      },
      {
        id: 'stats-cards',
        name: 'En cartes',
        description: 'Chaque stat dans une carte',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', textColor: '#0a0a0a', layout: 'cards' }
      }
    ]
  },
  {
    sectionTypeId: 'services',
    variants: [
      {
        id: 'services-white',
        name: 'Blanc avec cartes',
        description: 'Fond blanc, cartes avec bordures',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'cards' }
      },
      {
        id: 'services-gray',
        name: 'Gris élégant',
        description: 'Fond gris avec cartes blanches',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', layout: 'cards' }
      },
      {
        id: 'services-dark',
        name: 'Sombre premium',
        description: 'Fond noir avec cartes sombres',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'cards' }
      },
      {
        id: 'services-timeline',
        name: 'Timeline',
        description: 'Services en ligne du temps',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', layout: 'timeline' }
      },
      {
        id: 'services-grid',
        name: 'Grille simple',
        description: 'Disposition en grille sans cartes',
        preview: 'linear-gradient(135deg, #fafafa, #f5f5f5)',
        styles: { backgroundColor: '#fafafa', layout: 'grid' }
      },
      {
        id: 'services-pricing',
        name: 'Avec prix',
        description: 'Services avec tarifs visibles',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'pricing', showPrices: true }
      },
      {
        id: 'services-icons-large',
        name: 'Grandes icônes',
        description: 'Icônes proéminentes',
        preview: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
        styles: { backgroundColor: '#f0f9ff', layout: 'cards', iconSize: 'large' }
      },
      {
        id: 'services-numbered',
        name: 'Numérotées',
        description: 'Services avec numéros',
        preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
        styles: { backgroundColor: '#ffffff', layout: 'numbered' }
      }
    ]
  },
  {
    sectionTypeId: 'about',
    variants: [
      {
        id: 'about-gray',
        name: 'Gris clair',
        description: 'Fond gris avec layout split',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', layout: 'split' }
      },
      {
        id: 'about-white',
        name: 'Blanc',
        description: 'Fond blanc minimaliste',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', layout: 'split' }
      },
      {
        id: 'about-dark',
        name: 'Sombre',
        description: 'Fond noir élégant',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'split' }
      },
      {
        id: 'about-centered',
        name: 'Centré',
        description: 'Contenu centré sans image',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', layout: 'centered' }
      },
      {
        id: 'about-image-right',
        name: 'Image à droite',
        description: 'Texte à gauche, image à droite',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'image-right' }
      },
      {
        id: 'about-image-left',
        name: 'Image à gauche',
        description: 'Image à gauche, texte à droite',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', layout: 'image-left' }
      },
      {
        id: 'about-timeline',
        name: 'Timeline',
        description: 'Histoire en ligne du temps',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', layout: 'timeline' }
      },
      {
        id: 'about-cards',
        name: 'En cartes',
        description: 'Informations en cartes',
        preview: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
        styles: { backgroundColor: '#f0f9ff', layout: 'cards' }
      }
    ]
  },
  {
    sectionTypeId: 'team',
    variants: [
      {
        id: 'team-white',
        name: 'Blanc 4 colonnes',
        description: 'Grille 4 colonnes sur fond blanc',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', columns: 4 }
      },
      {
        id: 'team-gray',
        name: 'Gris 3 colonnes',
        description: 'Grille 3 colonnes sur fond gris',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', columns: 3 }
      },
      {
        id: 'team-dark',
        name: 'Sombre',
        description: 'Fond noir premium',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', columns: 4 }
      },
      {
        id: 'team-2cols',
        name: '2 colonnes large',
        description: 'Grandes cartes 2 colonnes',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', columns: 2 }
      },
      {
        id: 'team-circular',
        name: 'Photos rondes',
        description: 'Avatars circulaires centrés',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', columns: 4, avatarStyle: 'circular' }
      },
      {
        id: 'team-cards-hover',
        name: 'Cartes avec hover',
        description: 'Effet au survol avec réseaux sociaux',
        preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
        styles: { backgroundColor: '#ffffff', columns: 3, hoverEffect: true }
      },
      {
        id: 'team-minimal',
        name: 'Minimaliste',
        description: 'Style très épuré',
        preview: 'linear-gradient(135deg, #fafafa, #f5f5f5)',
        styles: { backgroundColor: '#fafafa', columns: 4, style: 'minimal' }
      },
      {
        id: 'team-detailed',
        name: 'Détaillé',
        description: 'Avec bio et liens',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', columns: 2, style: 'detailed' }
      }
    ]
  },
  {
    sectionTypeId: 'testimonials',
    variants: [
      {
        id: 'testimonials-dark',
        name: 'Sombre',
        description: 'Fond noir avec citations lumineuses',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'grid' }
      },
      {
        id: 'testimonials-white',
        name: 'Blanc',
        description: 'Fond blanc épuré',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', textColor: '#0a0a0a', layout: 'grid' }
      },
      {
        id: 'testimonials-gray',
        name: 'Gris',
        description: 'Fond gris doux',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', textColor: '#0a0a0a', layout: 'grid' }
      },
      {
        id: 'testimonials-purple',
        name: 'Violet',
        description: 'Fond violet inspirant',
        preview: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        styles: { backgroundColor: '#8b5cf6', textColor: '#ffffff', layout: 'grid' }
      },
      {
        id: 'testimonials-carousel',
        name: 'Carrousel',
        description: 'Défilement horizontal',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', textColor: '#0a0a0a', layout: 'carousel' }
      },
      {
        id: 'testimonials-single',
        name: 'Un seul grand',
        description: 'Un témoignage mis en avant',
        preview: 'linear-gradient(135deg, #f8f9fa, #e8e8e8)',
        styles: { backgroundColor: '#f8f9fa', textColor: '#0a0a0a', layout: 'single' }
      },
      {
        id: 'testimonials-masonry',
        name: 'Masonry',
        description: 'Disposition en maçonnerie',
        preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
        styles: { backgroundColor: '#ffffff', textColor: '#0a0a0a', layout: 'masonry' }
      },
      {
        id: 'testimonials-cards',
        name: 'Grandes cartes',
        description: 'Cartes avec photos et étoiles',
        preview: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
        styles: { backgroundColor: '#f0f9ff', textColor: '#0a0a0a', layout: 'cards' }
      },
      {
        id: 'testimonials-bubble',
        name: 'Bulles de chat',
        description: 'Style messagerie',
        preview: 'linear-gradient(135deg, #f8f9fa, #f0f0f0)',
        styles: { backgroundColor: '#f8f9fa', textColor: '#0a0a0a', layout: 'bubble' }
      },
      {
        id: 'testimonials-video',
        name: 'Avec vidéo',
        description: 'Témoignages vidéo intégrés',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'video' }
      }
    ]
  },
  {
    sectionTypeId: 'gallery',
    variants: [
      {
        id: 'gallery-white',
        name: 'Blanc 3 colonnes',
        description: 'Galerie classique',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', columns: 3, gap: '16px' }
      },
      {
        id: 'gallery-dark',
        name: 'Sombre',
        description: 'Galerie sur fond noir',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', columns: 3, gap: '16px' }
      },
      {
        id: 'gallery-4cols',
        name: '4 colonnes compact',
        description: 'Plus d\'images visibles',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', columns: 4, gap: '12px' }
      },
      {
        id: 'gallery-2cols',
        name: '2 colonnes large',
        description: 'Images plus grandes',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', columns: 2, gap: '24px' }
      },
      {
        id: 'gallery-masonry',
        name: 'Masonry',
        description: 'Disposition en maçonnerie',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', layout: 'masonry', gap: '16px' }
      },
      {
        id: 'gallery-lightbox',
        name: 'Avec lightbox',
        description: 'Agrandissement au clic',
        preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
        styles: { backgroundColor: '#ffffff', columns: 3, lightbox: true }
      },
      {
        id: 'gallery-slider',
        name: 'Slider',
        description: 'Carrousel d\'images',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', layout: 'slider' }
      },
      {
        id: 'gallery-polaroid',
        name: 'Polaroid',
        description: 'Style photos instantanées',
        preview: 'linear-gradient(135deg, #f5f5f5, #e8e8e8)',
        styles: { backgroundColor: '#f5f5f5', columns: 3, style: 'polaroid' }
      },
      {
        id: 'gallery-overlap',
        name: 'Superposées',
        description: 'Images qui se chevauchent',
        preview: 'linear-gradient(135deg, #ffffff, #fafafa)',
        styles: { backgroundColor: '#ffffff', layout: 'overlap' }
      },
      {
        id: 'gallery-fullwidth',
        name: 'Pleine largeur',
        description: 'Images bord à bord',
        preview: 'linear-gradient(135deg, #f0f0f0, #e5e5e5)',
        styles: { backgroundColor: '#f0f0f0', columns: 1, fullWidth: true }
      }
    ]
  },
  {
    sectionTypeId: 'pricing',
    variants: [
      {
        id: 'pricing-gray',
        name: 'Gris classique',
        description: 'Fond gris professionnel',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', highlightPlan: 'Pro' }
      },
      {
        id: 'pricing-white',
        name: 'Blanc',
        description: 'Fond blanc minimaliste',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', highlightPlan: 'Pro' }
      },
      {
        id: 'pricing-dark',
        name: 'Sombre premium',
        description: 'Fond noir luxueux',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', highlightPlan: 'Pro' }
      },
      {
        id: 'pricing-gradient',
        name: 'Dégradé violet',
        description: 'Fond dégradé accrocheur',
        preview: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
        styles: { backgroundColor: '#8b5cf6', textColor: '#ffffff', highlightPlan: 'Pro' }
      },
      {
        id: 'pricing-comparison',
        name: 'Tableau comparatif',
        description: 'Comparaison détaillée',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'comparison' }
      },
      {
        id: 'pricing-toggle',
        name: 'Mensuel/Annuel',
        description: 'Toggle de période',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', showToggle: true }
      },
      {
        id: 'pricing-cards-border',
        name: 'Cartes bordées',
        description: 'Cartes avec bordures colorées',
        preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
        styles: { backgroundColor: '#ffffff', cardStyle: 'bordered' }
      },
      {
        id: 'pricing-horizontal',
        name: 'Horizontal',
        description: 'Plans en ligne',
        preview: 'linear-gradient(135deg, #f8f9fa, #e8e8e8)',
        styles: { backgroundColor: '#f8f9fa', layout: 'horizontal' }
      }
    ]
  },
  {
    sectionTypeId: 'contact',
    variants: [
      {
        id: 'contact-white',
        name: 'Blanc avec formulaire',
        description: 'Formulaire moderne sur fond blanc',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', formStyle: 'modern', layout: 'split' }
      },
      {
        id: 'contact-gray',
        name: 'Gris élégant',
        description: 'Formulaire sur fond gris',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', formStyle: 'modern', layout: 'split' }
      },
      {
        id: 'contact-dark',
        name: 'Sombre',
        description: 'Formulaire sur fond noir',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', formStyle: 'modern', layout: 'split' }
      },
      {
        id: 'contact-centered',
        name: 'Centré simple',
        description: 'Formulaire centré sans split',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', formStyle: 'minimal', layout: 'centered' }
      },
      {
        id: 'contact-with-map',
        name: 'Avec carte',
        description: 'Formulaire + carte Google Maps',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', showMap: true, layout: 'split' }
      },
      {
        id: 'contact-minimal',
        name: 'Minimaliste',
        description: 'Juste les essentiels',
        preview: 'linear-gradient(135deg, #fafafa, #f5f5f5)',
        styles: { backgroundColor: '#fafafa', formStyle: 'minimal', layout: 'centered' }
      },
      {
        id: 'contact-social',
        name: 'Avec réseaux',
        description: 'Icônes réseaux sociaux proéminentes',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', showSocials: true, layout: 'split' }
      },
      {
        id: 'contact-gradient',
        name: 'Fond dégradé',
        description: 'Dégradé violet moderne',
        preview: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
        styles: { backgroundColor: '#8b5cf6', textColor: '#ffffff', layout: 'split' }
      }
    ]
  },
  {
    sectionTypeId: 'cta',
    variants: [
      {
        id: 'cta-purple',
        name: 'Violet vibrant',
        description: 'Gradient violet énergique',
        preview: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
        styles: { backgroundColor: '#8b5cf6', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'cta-blue',
        name: 'Bleu confiance',
        description: 'Gradient bleu professionnel',
        preview: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        styles: { backgroundColor: '#3b82f6', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'cta-dark',
        name: 'Noir élégant',
        description: 'Fond noir premium',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', gradient: false }
      },
      {
        id: 'cta-green',
        name: 'Vert action',
        description: 'Gradient vert pour conversion',
        preview: 'linear-gradient(135deg, #10b981, #059669)',
        styles: { backgroundColor: '#10b981', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'cta-orange',
        name: 'Orange dynamique',
        description: 'Gradient orange chaleureux',
        preview: 'linear-gradient(135deg, #f97316, #ea580c)',
        styles: { backgroundColor: '#f97316', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'cta-pink',
        name: 'Rose moderne',
        description: 'Gradient rose tendance',
        preview: 'linear-gradient(135deg, #ec4899, #db2777)',
        styles: { backgroundColor: '#ec4899', textColor: '#ffffff', gradient: true }
      },
      {
        id: 'cta-newsletter',
        name: 'Newsletter',
        description: 'Avec champ email',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', textColor: '#0a0a0a', layout: 'newsletter' }
      },
      {
        id: 'cta-banner',
        name: 'Bandeau',
        description: 'Format bandeau horizontal',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'banner' }
      },
      {
        id: 'cta-floating',
        name: 'Flottant',
        description: 'Carte flottante avec ombre',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', textColor: '#0a0a0a', layout: 'floating' }
      },
      {
        id: 'cta-gradient-mesh',
        name: 'Mesh gradient',
        description: 'Dégradé multicolore',
        preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f97316 100%)',
        styles: { backgroundColor: '#667eea', textColor: '#ffffff', gradient: true, meshGradient: true }
      }
    ]
  },
  {
    sectionTypeId: 'faq',
    variants: [
      {
        id: 'faq-gray',
        name: 'Gris classique',
        description: 'Fond gris clair',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa' }
      },
      {
        id: 'faq-white',
        name: 'Blanc',
        description: 'Fond blanc épuré',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff' }
      },
      {
        id: 'faq-dark',
        name: 'Sombre',
        description: 'Fond noir élégant',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff' }
      },
      {
        id: 'faq-tabs',
        name: 'En onglets',
        description: 'Questions groupées par thème',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'tabs' }
      },
      {
        id: 'faq-search',
        name: 'Avec recherche',
        description: 'Barre de recherche intégrée',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', showSearch: true }
      },
      {
        id: 'faq-two-columns',
        name: '2 colonnes',
        description: 'Questions sur 2 colonnes',
        preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
        styles: { backgroundColor: '#ffffff', columns: 2 }
      }
    ]
  },
  {
    sectionTypeId: 'footer',
    variants: [
      {
        id: 'footer-dark',
        name: 'Sombre classique',
        description: 'Footer noir standard',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#a0a0a0' }
      },
      {
        id: 'footer-darker',
        name: 'Très sombre',
        description: 'Footer noir profond',
        preview: 'linear-gradient(135deg, #000000, #0a0a0a)',
        styles: { backgroundColor: '#000000', textColor: '#888888' }
      },
      {
        id: 'footer-white',
        name: 'Blanc',
        description: 'Footer clair moderne',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', textColor: '#666666' }
      },
      {
        id: 'footer-gray',
        name: 'Gris',
        description: 'Footer gris doux',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', textColor: '#555555' }
      },
      {
        id: 'footer-gradient',
        name: 'Dégradé',
        description: 'Footer avec dégradé subtil',
        preview: 'linear-gradient(135deg, #1a1a2e, #0a0a0a)',
        styles: { backgroundColor: '#1a1a2e', textColor: '#a0a0a0' }
      },
      {
        id: 'footer-minimal',
        name: 'Minimaliste',
        description: 'Footer très épuré',
        preview: 'linear-gradient(135deg, #fafafa, #f5f5f5)',
        styles: { backgroundColor: '#fafafa', textColor: '#666666', style: 'minimal' }
      },
      {
        id: 'footer-newsletter',
        name: 'Avec newsletter',
        description: 'Inscription newsletter intégrée',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#a0a0a0', showNewsletter: true }
      },
      {
        id: 'footer-mega',
        name: 'Mega footer',
        description: 'Footer large avec beaucoup de liens',
        preview: 'linear-gradient(135deg, #111111, #0a0a0a)',
        styles: { backgroundColor: '#111111', textColor: '#888888', style: 'mega' }
      }
    ]
  },
  {
    sectionTypeId: 'logos',
    variants: [
      {
        id: 'logos-white',
        name: 'Blanc',
        description: 'Fond blanc avec logos en grille',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'grid', grayscale: true }
      },
      {
        id: 'logos-dark',
        name: 'Sombre',
        description: 'Fond noir élégant',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'grid', grayscale: true }
      },
      {
        id: 'logos-scroll',
        name: 'Défilant',
        description: 'Logos qui défilent automatiquement',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', layout: 'scroll', grayscale: false }
      },
      {
        id: 'logos-minimal',
        name: 'Minimaliste',
        description: 'Style très épuré',
        preview: 'linear-gradient(135deg, #ffffff, #fafafa)',
        styles: { backgroundColor: '#ffffff', layout: 'minimal', grayscale: true }
      },
      {
        id: 'logos-colored',
        name: 'En couleur',
        description: 'Logos en couleurs sur fond clair',
        preview: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
        styles: { backgroundColor: '#f0f9ff', layout: 'grid', grayscale: false }
      }
    ]
  },
  {
    sectionTypeId: 'newsletter',
    variants: [
      {
        id: 'newsletter-centered',
        name: 'Centré',
        description: 'Formulaire centré classique',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', layout: 'centered' }
      },
      {
        id: 'newsletter-dark',
        name: 'Sombre',
        description: 'Fond noir moderne',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'centered' }
      },
      {
        id: 'newsletter-split',
        name: 'Split',
        description: 'Texte à gauche, formulaire à droite',
        preview: 'linear-gradient(135deg, #1a1a2e, #0a0a0a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'split' }
      },
      {
        id: 'newsletter-card',
        name: 'En carte',
        description: 'Formulaire dans une carte flottante',
        preview: 'linear-gradient(135deg, #f8f9fa, #ffffff)',
        styles: { backgroundColor: '#f8f9fa', layout: 'card' }
      },
      {
        id: 'newsletter-minimal',
        name: 'Minimaliste',
        description: 'Bande compacte',
        preview: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
        styles: { backgroundColor: '#ffffff', layout: 'minimal' }
      },
      {
        id: 'newsletter-gradient',
        name: 'Gradient',
        description: 'Fond dégradé subtil',
        preview: 'linear-gradient(135deg, #f0f9ff, #fdf4ff)',
        styles: { backgroundColor: '#f0f9ff', layout: 'centered', gradient: true }
      }
    ]
  },
  {
    sectionTypeId: 'timeline',
    variants: [
      {
        id: 'timeline-vertical',
        name: 'Vertical',
        description: 'Timeline verticale classique',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'vertical' }
      },
      {
        id: 'timeline-horizontal',
        name: 'Horizontal',
        description: 'Timeline horizontale',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', layout: 'horizontal' }
      },
      {
        id: 'timeline-alternating',
        name: 'Alterné',
        description: 'Éléments alternés gauche/droite',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', layout: 'alternating' }
      },
      {
        id: 'timeline-dark',
        name: 'Sombre',
        description: 'Timeline sur fond noir',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'vertical' }
      },
      {
        id: 'timeline-gray',
        name: 'Gris',
        description: 'Fond gris professionnel',
        preview: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
        styles: { backgroundColor: '#f3f4f6', layout: 'vertical' }
      }
    ]
  },
  {
    sectionTypeId: 'blog',
    variants: [
      {
        id: 'blog-grid',
        name: 'Grille',
        description: 'Articles en grille 3 colonnes',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'grid', columns: 3 }
      },
      {
        id: 'blog-featured',
        name: 'Mis en avant',
        description: 'Un article principal + articles secondaires',
        preview: 'linear-gradient(135deg, #f8f9fa, #e5e7eb)',
        styles: { backgroundColor: '#f8f9fa', layout: 'featured' }
      },
      {
        id: 'blog-list',
        name: 'Liste',
        description: 'Articles en liste verticale',
        preview: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
        styles: { backgroundColor: '#ffffff', layout: 'list' }
      },
      {
        id: 'blog-minimal',
        name: 'Minimaliste',
        description: 'Style très épuré',
        preview: 'linear-gradient(135deg, #fafafa, #f5f5f5)',
        styles: { backgroundColor: '#fafafa', layout: 'minimal' }
      },
      {
        id: 'blog-dark',
        name: 'Sombre',
        description: 'Fond noir moderne',
        preview: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
        styles: { backgroundColor: '#0a0a0a', textColor: '#ffffff', layout: 'grid', columns: 3 }
      },
      {
        id: 'blog-2cols',
        name: '2 colonnes',
        description: 'Grille 2 colonnes large',
        preview: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
        styles: { backgroundColor: '#ffffff', layout: 'grid', columns: 2 }
      }
    ]
  }
];

// Helper functions
export function getSectionVariants(sectionTypeId: string): SectionVariant[] {
  const config = sectionVariants.find(sv => sv.sectionTypeId === sectionTypeId);
  return config?.variants || [];
}

export function getSectionVariant(sectionTypeId: string, variantId: string): SectionVariant | undefined {
  const variants = getSectionVariants(sectionTypeId);
  return variants.find(v => v.id === variantId);
}
