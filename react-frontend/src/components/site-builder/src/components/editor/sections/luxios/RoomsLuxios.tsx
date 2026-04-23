import React from 'react';
import { motion } from 'framer-motion';
import { useLuxiosFonts, useIsMobile, useLx, FONT, subtitleStyle, sectionTitleStyle, sectionPadStyle, containerStyle, useLuxiosContent } from './_luxiosTheme';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

const DEFAULT_ROOMS = [
  {
    image: '/images/deluxe-room.jpg',
    name: 'Deluxe Room',
    size: '39 sqm.',
    price: '$300',
  },
  {
    image: '/images/oceanview-suite.jpg',
    name: 'Oceanview Suite',
    size: '46 sqm.',
    price: '$520',
  },
  {
    image: '/images/premier-suite.jpg',
    name: 'Premier Suite',
    size: '54 sqm.',
    price: '$750',
  },
];

export function RoomsLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const C = useLx(styles);

  const subtitle: string  = content.subtitle  || 'luxios resort';
  const title: string     = content.title     || 'Rooms & Suites';
  const ctaText: string   = content.ctaText   || 'View All';
  const ctaUrl: string    = content.ctaUrl    || '/rooms';
  const nightText: string = content.nightText || '/ night';

  const rooms = [1, 2, 3].map(i => ({
    image: content[`room${i}Image`] || DEFAULT_ROOMS[i - 1].image,
    name:  content[`room${i}Name`]  || DEFAULT_ROOMS[i - 1].name,
    size:  content[`room${i}Size`]  || DEFAULT_ROOMS[i - 1].size,
    price: content[`room${i}Price`] || DEFAULT_ROOMS[i - 1].price,
    url:   content[`room${i}Url`]   || '',
  }));

  return (
    <section style={{ backgroundColor: C.bgSoft, ...sectionPadStyle(C, isMobile, { pxM: 16 }) }}>
      <div style={containerStyle(C, '1200px')}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: isMobile ? '40px' : '64px' }}
        >
          <p style={subtitleStyle(C.gold)}>{subtitle}</p>
          <h2 style={{ ...sectionTitleStyle(C.fg), marginTop: '12px' }}>{title}</h2>
        </motion.div>

        {/* Room cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {rooms.map((room, i) => (
            <motion.div
              key={room.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <a
                href={room.url || '#'}
                style={{ display: 'block', textDecoration: 'none', cursor: room.url ? 'pointer' : 'default' }}
              >
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <img
                  src={room.image}
                  alt={room.name}
                  style={{ width: '100%', height: '288px', objectFit: 'cover', display: 'block', transition: 'transform 0.7s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                {/* Info overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px' }}>
                  <p style={{ fontFamily: FONT.body, fontSize: '11px', color: C.fg + 'aa', letterSpacing: '0.2em', marginBottom: '6px' }}>
                    {room.size}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                    <span style={{ fontFamily: FONT.heading, fontSize: '1.6rem', color: C.gold, fontWeight: 400 }}>{room.price}</span>
                    <span style={{ fontFamily: FONT.body, fontSize: '11px', color: C.fg + '88' }}> {nightText}</span>
                  </div>
                  <h3 style={{ fontFamily: FONT.heading, fontSize: '1.25rem', color: C.fg, fontWeight: 400, margin: 0 }}>
                    {room.name}
                  </h3>
                </div>
              </div>
              </a>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <a
            href={ctaUrl}
            style={{
              display: 'inline-block',
              border: `1px solid ${C.gold}`,
              color: C.gold,
              padding: '12px 32px',
              fontFamily: FONT.body,
              fontSize: '11px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'background 0.3s, color 0.3s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.gold; e.currentTarget.style.color = C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = C.gold; }}
          >
            {ctaText}
          </a>
        </div>
      </div>
    </section>
  );
}
