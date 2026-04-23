import React from 'react';
import { motion } from 'framer-motion';
import { useLuxiosFonts, useLx, FONT, useLuxiosContent } from './_luxiosTheme';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

const DEFAULT_BG = '/images/hero-bg.jpg';

export function HeroLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const C = useLx(styles);

  const bgImage: string  = content.backgroundImage || DEFAULT_BG;
  const brandName: string = content.brandName || 'LUXIOS';
  const tagline: string   = content.tagline   || 'Resort';
  const subtitle: string  = content.subtitle  || 'A world of serenity awaits';
  const ctaText: string   = content.ctaText   || 'Discover';
  const ctaUrl: string    = content.ctaUrl    || '#rooms';
  const scrollText: string = content.scrollText || 'Scroll';

  return (
    <section style={{
      position: 'relative',
      height: '100vh',
      minHeight: '600px',
      width: '100%',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Background image */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: C.bg + '99' }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <h1 style={{
            fontFamily: FONT.heading,
            fontSize: 'clamp(2.8rem, 12vw, 9rem)',
            fontWeight: 300,
            letterSpacing: '0.15em',
            color: C.fg,
            margin: 0,
            lineHeight: 1,
          }}>
            {brandName}
          </h1>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <span style={{ height: '1px', width: '80px', backgroundColor: C.fg + '80' }} />
            <span style={{
              fontFamily: FONT.body,
              fontSize: '11px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: C.fg + 'cc',
            }}>
              {tagline}
            </span>
            <span style={{ height: '1px', width: '80px', backgroundColor: C.fg + '80' }} />
          </div>

          <p style={{
            fontFamily: FONT.body,
            fontSize: '14px',
            letterSpacing: '0.15em',
            color: C.fg + 'aa',
            marginTop: '24px',
            fontWeight: 300,
          }}>
            {subtitle}
          </p>

          <a
            href={ctaUrl}
            style={{
              display: 'inline-block',
              marginTop: '40px',
              padding: '14px 40px',
              border: `1px solid ${C.gold}`,
              color: C.gold,
              fontFamily: FONT.body,
              fontSize: '11px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'background 0.3s, color 0.3s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = C.gold;
              e.currentTarget.style.color = C.bg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = C.gold;
            }}
          >
            {ctaText}
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontFamily: FONT.body, fontSize: '10px', letterSpacing: '0.3em', color: C.fg + '66', textTransform: 'uppercase' }}>
          {scrollText}
        </span>
        <div style={{ width: '1px', height: '40px', backgroundColor: C.fg + '44' }} />
      </div>
    </section>
  );
}
