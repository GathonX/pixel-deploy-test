import { useEffect, useState, useContext } from 'react';
import { luxiosGlobalStore } from './luxiosGlobalStore';
import { luxiosLangStore } from './luxiosLangStore';
import { PreviewViewportContext } from '../../../../contexts/PreviewViewportContext';

/**
 * Hook qui applique la traduction active sur le content d'une section.
 * Le content peut contenir __tr__ (translations object) injecté par le registry.
 * S'abonne à luxiosLangStore — chaque composant se met à jour automatiquement.
 */
export function useLuxiosContent(rawContent: Record<string, any>): Record<string, any> {
  const [activeLang, setActiveLang] = useState(() => luxiosLangStore.get());
  useEffect(() => luxiosLangStore.subscribe(() => setActiveLang(luxiosLangStore.get())), []);

  const translations = rawContent.__tr__ as Record<string, any> | undefined;
  const override = activeLang && translations?.[activeLang] ? translations[activeLang] : null;

  if (!override) return rawContent;
  // Merge translation override, strip internal __tr__ key from result
  const { __tr__: _removed, ...base } = rawContent;
  return { ...base, ...override };
}

// Luxios Resort — Design tokens
export const LX = {
  bg:       '#14171f',   // main background (dark navy)
  bgSoft:   '#1a1d23',   // resort-dark-soft
  bgSec:    '#272b35',   // secondary background
  fg:       '#f4f3ef',   // cream foreground
  gold:     '#c99645',   // primary gold (accent)
  muted:    '#8f95a3',   // muted text
  border:   '#363c49',   // subtle border
  goldHex:  '#c99645',
} as const;

export const FONT = {
  heading: "'Cormorant Garamond', serif",
  body:    "'Raleway', sans-serif",
} as const;

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Raleway:wght@300;400;500;600;700&display=swap';

export function useLuxiosFonts() {
  useEffect(() => {
    if (!document.getElementById('luxios-fonts')) {
      const link = document.createElement('link');
      link.id = 'luxios-fonts';
      link.rel = 'stylesheet';
      link.href = FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);
}

export function useIsMobile(breakpoint = 768) {
  const previewViewport = useContext(PreviewViewportContext);

  const [windowIsMobile, setWindowIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    if (previewViewport !== null) return;
    const handler = () => setWindowIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint, previewViewport]);

  return previewViewport !== null
    ? previewViewport === 'mobile'
    : windowIsMobile;
}

// ─── Style override helper ────────────────────────────────────────────────────
// Merges editor styles (backgroundColor, textColor, accentColor, paddingY,
// paddingX, maxWidth) with the Luxios design tokens. Pass `styles` prop here.
export function lx(styles?: Record<string, any>) {
  const bg   = styles?.backgroundColor || LX.bg;
  const fg   = styles?.textColor       || LX.fg;
  const gold = styles?.accentColor     || LX.gold;
  const maxWMap: Record<string, string> = {
    sm: '640px', md: '768px', lg: '1024px', xl: '1280px', full: '100%',
  };
  return {
    bg,
    // bgSoft tracks backgroundColor when overridden, keeps own shade otherwise
    bgSoft: styles?.backgroundColor ? bg : LX.bgSoft,
    bgSec:  LX.bgSec,
    fg,
    gold,
    muted:  LX.muted,
    border: LX.border,
    py:   (styles?.paddingY  as number | undefined) ?? null as number | null,
    px:   (styles?.paddingX  as number | undefined) ?? null as number | null,
    maxW: (styles?.maxWidth ? (maxWMap[styles.maxWidth] ?? null) : null) as string | null,
  };
}

// ─── Hook version of lx() — re-renders on global theme changes ───────────────
// Use this in all Luxios section components instead of lx().
export function useLx(styles?: Record<string, any>) {
  const [, rerender] = useState(0);
  useEffect(() => luxiosGlobalStore.subscribe(() => rerender(n => n + 1)), []);

  const g    = luxiosGlobalStore.get();
  const bg   = styles?.backgroundColor || g.bg;
  const fg   = styles?.textColor       || g.fg;
  const gold = styles?.accentColor     || g.gold;
  const maxWMap: Record<string, string> = {
    sm: '640px', md: '768px', lg: '1024px', xl: '1280px', full: '100%',
  };
  return {
    bg,
    bgSoft: styles?.backgroundColor ? bg : LX.bgSoft,
    bgSec:  LX.bgSec,
    fg,
    gold,
    muted:  LX.muted,
    border: LX.border,
    py:   (styles?.paddingY  as number | undefined) ?? null as number | null,
    px:   (styles?.paddingX  as number | undefined) ?? null as number | null,
    maxW: (styles?.maxWidth ? (maxWMap[styles.maxWidth] ?? null) : null) as string | null,
  };
}

// ─── Section padding helper ───────────────────────────────────────────────────
// Returns paddingTop/Bottom/Left/Right CSS properties, respecting editor
// paddingY / paddingX overrides. Falls back to section-specific defaults.
export function sectionPadStyle(
  C: ReturnType<typeof lx>,
  isMobile: boolean,
  def: { pyD?: number; pyM?: number; pxD?: number; pxM?: number } = {}
): React.CSSProperties {
  const pyD = def.pyD ?? 96;
  const pyM = def.pyM ?? 64;
  const pxD = def.pxD ?? 24;
  const pxM = def.pxM ?? (def.pxD != null ? def.pxD : 20);
  const py  = C.py != null ? C.py : (isMobile ? pyM : pyD);
  const px  = C.px != null ? C.px : (isMobile ? pxM : pxD);
  return { paddingTop: py, paddingBottom: py, paddingLeft: px, paddingRight: px };
}

// ─── Inner container max-width helper ────────────────────────────────────────
export function containerStyle(
  C: ReturnType<typeof lx>,
  defaultMaxWidth = '1100px'
): React.CSSProperties {
  return { maxWidth: C.maxW ?? defaultMaxWidth, margin: '0 auto' };
}

// Subtitle style (small gold tracking label) — factory so gold can be overridden
export function subtitleStyle(gold = LX.gold): React.CSSProperties {
  return {
    fontFamily: FONT.body,
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: gold,
  };
}

// Section title style — factory so fg can be overridden
export function sectionTitleStyle(fg = LX.fg): React.CSSProperties {
  return {
    fontFamily: FONT.heading,
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: 300,
    color: fg,
    lineHeight: 1.15,
  };
}

// Nav link style — factory so fg can be overridden
export function navLinkStyle(fg = LX.fg): React.CSSProperties {
  return {
    fontFamily: FONT.body,
    fontSize: '11px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: fg + 'cc',
    textDecoration: 'none',
    transition: 'color 0.3s',
  };
}
