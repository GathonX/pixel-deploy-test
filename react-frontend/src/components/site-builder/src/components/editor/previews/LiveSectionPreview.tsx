import { usePlatform } from '../../../contexts/PlatformContext';
import { renderSectionContent } from '../SectionRenderer';
import { SectionVariant } from '../../../data/sectionVariants';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface LiveSectionPreviewProps {
  sectionTypeId: string;
  variant?: SectionVariant;
  /** Width of the virtual render container */
  renderWidth?: number;
  /** Height of the visible thumbnail */
  thumbHeight?: number;
}

/**
 * Renders the actual section component scaled down to a miniature thumbnail.
 * Uses CSS transform: scale() to shrink a full-width render into a small card.
 */
export function LiveSectionPreview({ sectionTypeId, variant, renderWidth = 1200, thumbHeight = 140 }: LiveSectionPreviewProps) {
  const { sectionTypes } = usePlatform();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(200);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const sectionType = sectionTypes.find((st: any) => st.id === sectionTypeId);
  const defaultContent = sectionType?.defaultContent || sectionType?.default_content || {};
  const defaultStyles = sectionType?.defaultStyles || sectionType?.default_styles || {};

  // Merge variant styles over defaults
  const mergedContent = { ...defaultContent, ...(variant?.content || {}) };
  const mergedStyles = { ...defaultStyles, ...(variant?.styles || {}) };

  const scale = containerWidth / renderWidth;
  const innerHeight = thumbHeight / scale;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden relative bg-muted"
      style={{ height: thumbHeight }}
    >
      <div
        style={{
          width: renderWidth,
          height: innerHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {renderSectionContent(sectionTypeId, mergedContent, mergedStyles, sectionTypes)}
      </div>
    </div>
  );
}

interface LiveSectionPreviewHoverProps {
  sectionTypeId: string;
  variant: SectionVariant;
  /** Whether the hover popup is visible */
  show: boolean;
  /** Anchor element for positioning */
  anchorRef: React.RefObject<HTMLElement | null>;
}

/**
 * Large hover preview that appears when hovering a variant card.
 * Renders the section at ~500px wide in a floating popup.
 */
export function LiveSectionPreviewHover({ sectionTypeId, variant, show, anchorRef }: LiveSectionPreviewHoverProps) {
  const { sectionTypes } = usePlatform();
  const [position, setPosition] = useState<{ top: number; left: number; side: 'left' | 'right' }>({ top: 0, left: 0, side: 'right' });

  useEffect(() => {
    if (!show || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const popupW = 520;
    const gap = 12;

    // Position to the right if there's room, otherwise left
    let left: number;
    let side: 'left' | 'right' = 'right';
    if (rect.right + gap + popupW < viewportW) {
      left = rect.right + gap;
    } else {
      left = rect.left - gap - popupW;
      side = 'left';
    }

    // Vertically center relative to the card
    const top = Math.max(20, Math.min(rect.top - 40, window.innerHeight - 380));

    setPosition({ top, left, side });
  }, [show, anchorRef]);

  if (!show) return null;

  const sectionType = sectionTypes.find((st: any) => st.id === sectionTypeId);
  const defaultContent = sectionType?.defaultContent || sectionType?.default_content || {};
  const defaultStyles = sectionType?.defaultStyles || sectionType?.default_styles || {};
  const mergedContent = { ...defaultContent, ...(variant.content || {}) };
  const mergedStyles = { ...defaultStyles, ...variant.styles };

  const renderWidth = 1200;
  const popupWidth = 500;
  const scale = popupWidth / renderWidth;
  const maxHeight = 340;
  const innerHeight = maxHeight / scale;

  return createPortal(
    <div
      className={cn(
        "fixed z-[99999] rounded-xl overflow-hidden border shadow-2xl transition-all duration-200",
        show ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        top: position.top,
        left: position.left,
        width: popupWidth,
        backgroundColor: 'var(--background, #ffffff)',
        borderColor: 'rgba(0,0,0,0.1)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
        <span className="text-xs font-semibold">{variant.name}</span>
        <span className="text-[10px] text-muted-foreground">Aperçu</span>
      </div>
      {/* Section render */}
      <div
        className="overflow-hidden relative"
        style={{ height: maxHeight }}
      >
        <div
          style={{
            width: renderWidth,
            height: innerHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {renderSectionContent(sectionTypeId, mergedContent, mergedStyles, sectionTypes)}
        </div>
      </div>
    </div>,
    document.body
  );
}
