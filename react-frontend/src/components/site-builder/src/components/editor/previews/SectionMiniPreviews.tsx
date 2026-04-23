import { SectionVariant } from '../../../data/sectionVariants';
import { cn } from '@/lib/utils';

interface MiniPreviewProps {
  variant: SectionVariant;
}

// Hero Section Mini Preview
export function HeroMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const layout = styles.layout || 'center';

  if (layout === 'split') {
    return (
      <div 
        className="w-full h-full p-2 flex items-center gap-2"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-12 bg-current rounded opacity-90" />
          <div className="h-1 w-8 bg-current/50 rounded" />
          <div className="flex gap-1 mt-1.5">
            <div className="h-2 w-5 bg-current/80 rounded-sm" />
            <div className="h-2 w-5 bg-current/30 rounded-sm" />
          </div>
        </div>
        <div className="w-10 h-10 bg-current/20 rounded-lg" />
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2 flex flex-col items-center justify-center"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      {variant.styles.badge !== false && (
        <div className="h-1 w-6 bg-current/40 rounded-full mb-1" />
      )}
      <div className="h-2 w-16 bg-current rounded mb-1 opacity-90" />
      <div className="h-1.5 w-12 bg-current/50 rounded mb-2" />
      <div className="flex gap-1">
        <div className="h-2.5 w-7 bg-current/80 rounded-sm" />
        <div className="h-2.5 w-7 bg-current/30 rounded-sm" />
      </div>
    </div>
  );
}

// Navbar Mini Preview
export function NavbarMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const isBlur = styles.blur;

  return (
    <div 
      className={cn(
        "w-full h-full p-2 flex items-center justify-between",
        isBlur && "backdrop-blur-[2px]"
      )}
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-2.5 w-8 bg-current/80 rounded font-bold text-[4px] flex items-center px-0.5">
        Logo
      </div>
      <div className="flex gap-1.5">
        <div className="w-3 h-1 bg-current/40 rounded" />
        <div className="w-3 h-1 bg-current/40 rounded" />
        <div className="w-3 h-1 bg-current/40 rounded" />
      </div>
      <div className="h-2.5 w-6 bg-primary rounded text-[3px] flex items-center justify-center text-white">
        CTA
      </div>
    </div>
  );
}

// Features Mini Preview
export function FeaturesMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const columns = styles.columns || 3;
  const layout = styles.layout;

  if (layout === 'list') {
    return (
      <div 
        className="w-full h-full p-2"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="h-1.5 w-10 bg-current/80 rounded mx-auto mb-2" />
        <div className="space-y-1">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-1 px-1">
              <div className="w-2.5 h-2.5 bg-primary/30 rounded" />
              <div className="flex-1 h-1 bg-current/30 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1.5 w-10 bg-current/80 rounded mx-auto mb-2" />
      <div className={cn(
        "grid gap-1",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4"
      )}>
        {Array.from({ length: Math.min(columns, 3) }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "p-1 rounded flex flex-col items-center",
              styles.cardStyle === 'bordered' && "border border-current/20",
              styles.cardStyle === 'shadow' && "shadow-sm bg-white/5",
              !styles.cardStyle && "bg-current/5"
            )}
          >
            <div className={cn(
              "w-2.5 h-2.5 rounded mb-0.5",
              styles.iconStyle === 'colored' ? "bg-primary/40" : "bg-current/20"
            )} />
            <div className="w-full h-0.5 bg-current/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Testimonials Mini Preview
export function TestimonialsMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff' || styles.backgroundColor === '#0a0a0a';
  const layout = styles.layout || 'grid';

  if (layout === 'carousel' || layout === 'single') {
    return (
      <div 
        className="w-full h-full p-2 flex items-center justify-center"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="w-full max-w-[90%] p-2 rounded bg-current/10 text-center">
          <div className="text-[6px] mb-1">"</div>
          <div className="h-1 w-full bg-current/30 rounded mb-1" />
          <div className="h-1 w-3/4 bg-current/20 rounded mx-auto mb-2" />
          <div className="flex items-center justify-center gap-1">
            <div className="w-2.5 h-2.5 bg-current/30 rounded-full" />
            <div className="w-6 h-0.5 bg-current/40 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1.5 w-10 bg-current/80 rounded mx-auto mb-2" />
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={cn(
              "p-1 rounded",
              styles.cardStyle === 'glass' ? "bg-white/10 backdrop-blur-[1px]" : "bg-current/10"
            )}
          >
            <div className="h-1.5 w-full bg-current/20 rounded mb-1" />
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 bg-current/30 rounded-full" />
              <div className="w-4 h-0.5 bg-current/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pricing Mini Preview
export function PricingMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const layout = styles.layout || 'cards';

  if (layout === 'toggle') {
    return (
      <div 
        className="w-full h-full p-2"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="flex justify-center mb-2">
          <div className="flex bg-current/20 rounded-full p-0.5">
            <div className="h-1.5 w-4 bg-primary rounded-full" />
            <div className="h-1.5 w-4 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "p-1 rounded text-center",
                i === 2 ? "bg-primary/20 ring-1 ring-primary/50" : "bg-current/10"
              )}
            >
              <div className="text-[4px] font-bold">€{i}9</div>
              <div className="h-2 w-3 bg-current/30 rounded mx-auto mt-0.5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'comparison') {
    return (
      <div 
        className="w-full h-full p-2"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="border border-current/20 rounded overflow-hidden">
          <div className="grid grid-cols-4 gap-px bg-current/10">
            <div className="bg-current/5 h-2" />
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-current/5 h-2 flex items-center justify-center">
                <div className="w-3 h-0.5 bg-current/40 rounded" />
              </div>
            ))}
          </div>
          {[1, 2].map(row => (
            <div key={row} className="grid grid-cols-4 gap-px bg-current/10">
              <div className="bg-current/5 h-1.5 flex items-center px-0.5">
                <div className="w-4 h-0.5 bg-current/30 rounded" />
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-current/5 h-1.5 flex items-center justify-center">
                  <div className={cn(
                    "w-1 h-1 rounded-full",
                    i === 2 ? "bg-primary" : "bg-current/30"
                  )} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1.5 w-8 bg-current/80 rounded mx-auto mb-2" />
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={cn(
              "p-1 rounded text-center",
              i === 2 ? "bg-primary/20 ring-1 ring-primary/50" : "bg-current/10",
              styles.cardStyle === 'glass' && "bg-white/10 backdrop-blur-[1px]"
            )}
          >
            <div className="w-4 h-0.5 bg-current/40 rounded mx-auto mb-0.5" />
            <div className="text-[5px] font-bold">€{i}9</div>
            <div className="h-2 w-4 bg-current/30 rounded mx-auto mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Mini Preview
export function StatsMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';

  return (
    <div 
      className="w-full h-full p-2 flex items-center justify-center"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="grid grid-cols-4 gap-2 w-full">
        {['10K', '99%', '24/7', '50+'].map((val, i) => (
          <div key={i} className="text-center">
            <div className="w-3 h-3 bg-primary/20 rounded mx-auto mb-0.5 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary/60 rounded-sm" />
            </div>
            <div className="text-[5px] font-bold">{val}</div>
            <div className="w-4 h-0.5 bg-current/30 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Team Mini Preview
export function TeamMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const columns = styles.columns || 4;
  const isCircular = styles.avatarStyle === 'circular';

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1.5 w-8 bg-current/80 rounded mx-auto mb-2" />
      <div className={cn(
        "grid gap-1",
        columns <= 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns >= 4 && "grid-cols-4"
      )}>
        {Array.from({ length: Math.min(columns, 4) }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className={cn(
              "w-4 h-4 bg-gradient-to-br from-primary/30 to-primary/10 mb-0.5",
              isCircular ? "rounded-full" : "rounded"
            )} />
            <div className="w-4 h-0.5 bg-current/40 rounded" />
            <div className="w-3 h-0.5 bg-current/20 rounded mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Footer Mini Preview
export function FooterMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff' || styles.backgroundColor === '#0a0a0a';
  const layout = styles.layout || 'default';

  if (layout === 'centered') {
    return (
      <div 
        className="w-full h-full p-2 flex flex-col items-center justify-center"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="h-2 w-8 bg-current/60 rounded mb-1" />
        <div className="flex gap-1 mb-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-3 h-0.5 bg-current/40 rounded" />
          ))}
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-2 h-2 bg-current/20 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'minimal') {
    return (
      <div 
        className="w-full h-full p-2 flex items-center justify-between"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="h-2 w-6 bg-current/60 rounded" />
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-3 h-0.5 bg-current/40 rounded" />
          ))}
        </div>
        <div className="flex gap-0.5">
          {[1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-current/20 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="flex justify-between mb-1">
        <div className="w-6 h-1.5 bg-current/60 rounded" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-0.5">
              <div className="w-3 h-0.5 bg-current/40 rounded" />
              <div className="w-2.5 h-0.5 bg-current/20 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="w-full h-px bg-current/20" />
      <div className="flex justify-between mt-1">
        <div className="w-10 h-0.5 bg-current/30 rounded" />
        <div className="flex gap-0.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-1.5 h-1.5 bg-current/20 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Services Mini Preview
export function ServicesMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1.5 w-8 bg-current/80 rounded mx-auto mb-2" />
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-1 rounded bg-current/10 border border-current/10">
            <div className="w-3 h-3 bg-primary/20 rounded mb-0.5 mx-auto" />
            <div className="w-full h-0.5 bg-current/40 rounded mb-0.5" />
            <div className="w-4 h-0.5 bg-primary/60 rounded mx-auto text-[3px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// About Mini Preview
export function AboutMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const layout = styles.layout || 'split';

  if (layout === 'centered') {
    return (
      <div 
        className="w-full h-full p-2 text-center"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="h-1.5 w-8 bg-current/80 rounded mx-auto mb-1" />
        <div className="h-1 w-full bg-current/30 rounded mb-0.5" />
        <div className="h-1 w-3/4 bg-current/20 rounded mx-auto" />
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2 flex gap-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="flex-1 flex flex-col justify-center gap-0.5">
        <div className="w-8 h-1.5 bg-current/80 rounded" />
        <div className="w-full h-1 bg-current/30 rounded" />
        <div className="w-3/4 h-1 bg-current/20 rounded" />
      </div>
      <div className="w-10 h-10 bg-gradient-to-br from-primary/30 to-primary/10 rounded" />
    </div>
  );
}

// Contact Mini Preview
export function ContactMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';

  return (
    <div 
      className="w-full h-full p-2 flex gap-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="flex-1 space-y-0.5">
        <div className="w-6 h-1 bg-current/80 rounded" />
        <div className="w-full h-1.5 bg-current/10 rounded" />
        <div className="w-full h-1.5 bg-current/10 rounded" />
        <div className="w-full h-3 bg-current/10 rounded" />
        <div className="w-6 h-2 bg-primary rounded mt-0.5" />
      </div>
      <div className="w-8 space-y-0.5">
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 bg-primary/30 rounded" />
          <div className="flex-1 h-0.5 bg-current/30 rounded" />
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 bg-primary/30 rounded" />
          <div className="flex-1 h-0.5 bg-current/30 rounded" />
        </div>
      </div>
    </div>
  );
}

// CTA Mini Preview
export function CTAMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';

  return (
    <div 
      className="w-full h-full p-2 flex flex-col items-center justify-center"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-2 w-14 bg-current rounded mb-1 opacity-90" />
      <div className="h-1 w-10 bg-current/50 rounded mb-2" />
      <div className="h-2.5 w-8 bg-white rounded" />
    </div>
  );
}

// FAQ Mini Preview
export function FAQMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1.5 w-6 bg-current/80 rounded mx-auto mb-2" />
      <div className="space-y-0.5 max-w-[90%] mx-auto">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-current/10 rounded p-1 flex justify-between items-center">
            <div className="w-8 h-0.5 bg-current/40 rounded" />
            <div className="w-1.5 h-1.5 border border-current/40 rounded-full flex items-center justify-center">
              <div className="w-0.5 h-0.5 bg-current/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gallery Mini Preview
export function GalleryMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1.5 w-8 bg-current/80 rounded mx-auto mb-2" />
      <div className="grid grid-cols-3 gap-0.5">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div 
            key={i} 
            className="aspect-square rounded-sm"
            style={{
              background: `linear-gradient(${45 + i * 30}deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.1))`
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Main Preview Selector Component
interface SectionMiniPreviewProps {
  sectionType: string;
  variant: SectionVariant;
}

export function SectionMiniPreview({ sectionType, variant }: SectionMiniPreviewProps) {
  const previewMap: Record<string, React.FC<MiniPreviewProps>> = {
    hero: HeroMiniPreview,
    navbar: NavbarMiniPreview,
    features: FeaturesMiniPreview,
    testimonials: TestimonialsMiniPreview,
    pricing: PricingMiniPreview,
    stats: StatsMiniPreview,
    team: TeamMiniPreview,
    footer: FooterMiniPreview,
    services: ServicesMiniPreview,
    about: AboutMiniPreview,
    contact: ContactMiniPreview,
    cta: CTAMiniPreview,
    faq: FAQMiniPreview,
    gallery: GalleryMiniPreview,
    logos: LogosMiniPreview,
    newsletter: NewsletterMiniPreview,
    timeline: TimelineMiniPreview,
    blog: BlogMiniPreview,
  };

  const PreviewComponent = previewMap[sectionType];

  if (PreviewComponent) {
    return <PreviewComponent variant={variant} />;
  }

  // Fallback to color preview
  return (
    <div 
      className="w-full h-full"
      style={{ background: variant.preview }}
    />
  );
}

// Logos Mini Preview
function LogosMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1 w-8 bg-current/60 rounded mx-auto mb-2" />
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div 
            key={i} 
            className={`w-4 h-2 rounded ${styles.grayscale ? 'bg-current/30' : 'bg-primary/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

// Newsletter Mini Preview
function NewsletterMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const layout = styles.layout || 'centered';

  if (layout === 'split') {
    return (
      <div 
        className="w-full h-full p-2 flex items-center justify-between"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="space-y-0.5">
          <div className="h-1.5 w-10 bg-current/80 rounded" />
          <div className="h-1 w-8 bg-current/40 rounded" />
        </div>
        <div className="flex gap-1">
          <div className="w-8 h-2 bg-current/20 rounded" />
          <div className="w-4 h-2 bg-primary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2 flex flex-col items-center justify-center"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="w-3 h-3 bg-primary/20 rounded-full mb-1 flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-primary/60" />
      </div>
      <div className="h-1.5 w-10 bg-current/80 rounded mb-1" />
      <div className="h-1 w-14 bg-current/40 rounded mb-2" />
      <div className="flex gap-1">
        <div className="w-10 h-2 bg-current/20 rounded" />
        <div className="w-5 h-2 bg-primary rounded" />
      </div>
    </div>
  );
}

// Timeline Mini Preview
function TimelineMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const layout = styles.layout || 'vertical';

  if (layout === 'horizontal') {
    return (
      <div 
        className="w-full h-full p-2 flex items-center"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="w-full">
          <div className="h-1.5 w-6 bg-current/80 rounded mx-auto mb-2" />
          <div className="relative flex justify-between px-2">
            <div className="absolute top-1 left-2 right-2 h-0.5 bg-current/20" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="relative z-10 flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full ${i <= 3 ? 'bg-primary' : 'bg-current/20 border border-current/30'}`} />
                <div className="w-3 h-0.5 bg-current/40 rounded mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1 w-6 bg-current/80 rounded mx-auto mb-2" />
      <div className="relative pl-3">
        <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-current/20" />
        {[1, 2, 3].map(i => (
          <div key={i} className="relative flex items-start gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full shrink-0 -ml-1.5 ${i <= 2 ? 'bg-primary' : 'bg-current/20 border border-current/30'}`} />
            <div>
              <div className="w-4 h-0.5 bg-current/60 rounded" />
              <div className="w-6 h-0.5 bg-current/30 rounded mt-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Blog Mini Preview
function BlogMiniPreview({ variant }: MiniPreviewProps) {
  const { styles } = variant;
  const isDark = styles.textColor === '#ffffff';
  const layout = styles.layout || 'grid';

  if (layout === 'featured') {
    return (
      <div 
        className="w-full h-full p-2"
        style={{ 
          background: variant.preview,
          color: isDark ? '#ffffff' : '#0a0a0a'
        }}
      >
        <div className="flex gap-1.5">
          <div className="flex-1">
            <div className="w-full h-6 bg-gradient-to-br from-primary/30 to-primary/10 rounded mb-1" />
            <div className="h-1 w-full bg-current/60 rounded" />
          </div>
          <div className="w-8 space-y-1">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded" />
              <div className="flex-1 space-y-0.5">
                <div className="h-0.5 w-full bg-current/40 rounded" />
                <div className="h-0.5 w-3/4 bg-current/20 rounded" />
              </div>
            </div>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded" />
              <div className="flex-1 space-y-0.5">
                <div className="h-0.5 w-full bg-current/40 rounded" />
                <div className="h-0.5 w-3/4 bg-current/20 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-2"
      style={{ 
        background: variant.preview,
        color: isDark ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div className="h-1 w-8 bg-current/80 rounded mx-auto mb-2" />
      <div className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map(i => (
          <div key={i}>
            <div className="aspect-[4/3] bg-gradient-to-br from-primary/30 to-primary/10 rounded mb-0.5" />
            <div className="h-0.5 w-full bg-current/40 rounded" />
            <div className="h-0.5 w-3/4 bg-current/20 rounded mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
