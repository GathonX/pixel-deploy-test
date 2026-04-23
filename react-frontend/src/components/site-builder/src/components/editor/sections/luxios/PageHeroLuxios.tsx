import React from 'react';
import { motion } from 'framer-motion';
import { useLuxiosFonts, useLx, FONT, subtitleStyle, useLuxiosContent } from './_luxiosTheme';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

const DEFAULT_BG = '/images/about-hero.jpg';

export function PageHeroLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const C = useLx(styles);

  const title: string       = content.title      || 'Our Story';
  const subtitle: string    = content.subtitle   || '';
  const bgImage: string     = content.backgroundImage || DEFAULT_BG;
  const overlayOpacity: number = content.overlayOpacity ?? 0.55;

  return (
    <section style={{
      position: 'relative',
      height: '55vh',
      minHeight: '320px',
      width: '100%',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: C.bg,
          opacity: overlayOpacity,
        }} />
      </div>

      {/* Horizontal line decoration */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '1px',
        backgroundColor: C.border,
      }} />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 24px' }}
      >
        {subtitle && (
          <p style={{ ...subtitleStyle(C.gold), marginBottom: '16px' }}>{subtitle}</p>
        )}
        <h1 style={{
          fontFamily: FONT.heading,
          fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
          fontWeight: 300,
          letterSpacing: '0.1em',
          color: C.fg,
          margin: 0,
          lineHeight: 1.1,
        }}>
          {title}
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '20px',
        }}>
          <span style={{ height: '1px', width: '60px', backgroundColor: C.gold + '80' }} />
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: C.gold }} />
          <span style={{ height: '1px', width: '60px', backgroundColor: C.gold + '80' }} />
        </div>
      </motion.div>
    </section>
  );
}
