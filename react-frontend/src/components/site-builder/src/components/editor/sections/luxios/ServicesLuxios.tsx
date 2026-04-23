import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLuxiosFonts, useIsMobile, useLx, FONT, subtitleStyle, sectionTitleStyle, sectionPadStyle, containerStyle, useLuxiosContent } from './_luxiosTheme';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

const DEFAULT_SERVICES = [
  {
    image: '/images/restaurant.jpg',
    category: 'Dining',
    name: 'Restaurant',
    desc: 'Savor world-class cuisine crafted by our award-winning chefs using the finest local ingredients.',
    position: 'right',
  },
  {
    image: '/images/spa.jpg',
    category: 'Relax',
    name: 'Spa & Wellness',
    desc: 'Rejuvenate your body and mind with our exclusive treatments and personalized wellness programs.',
    position: 'left',
  },
  {
    image: '/images/bar.jpg',
    category: 'Drinks',
    name: 'Roof Top Bar',
    desc: 'Enjoy handcrafted cocktails and breathtaking panoramic views from our stunning rooftop terrace.',
    position: 'right',
  },
];

export function ServicesLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const C = useLx(styles);

  const subtitle: string = content.subtitle || 'Dine & Relax';
  const title: string    = content.title    || 'Services';

  const exploreText: string = content.exploreText || 'Explore';

  const services = [1, 2, 3].map((i, idx) => ({
    image:    content[`service${i}Image`]    || DEFAULT_SERVICES[idx].image,
    category: content[`service${i}Category`] || DEFAULT_SERVICES[idx].category,
    name:     content[`service${i}Name`]     || DEFAULT_SERVICES[idx].name,
    desc:     content[`service${i}Desc`]     || DEFAULT_SERVICES[idx].desc,
    url:      content[`service${i}Url`]      || '#',
    position: DEFAULT_SERVICES[idx].position,
  }));

  return (
    <section style={{ backgroundColor: C.bgSoft, ...sectionPadStyle(C, isMobile) }}>
      <div style={containerStyle(C, '1000px')}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '64px' }}
        >
          <p style={subtitleStyle(C.gold)}>{subtitle}</p>
          <h2 style={{ ...sectionTitleStyle(C.fg), marginTop: '12px' }}>{title}</h2>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : service.position === 'left' ? 'row-reverse' : 'row',
                minHeight: isMobile ? undefined : '300px',
              }}
            >
              {/* Text */}
              <div style={{
                flex: '1 1 300px',
                backgroundColor: C.bgSec,
                padding: isMobile ? '32px 24px' : '48px 40px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}>
                <p style={{ fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: C.gold, marginBottom: '8px' }}>
                  {service.category}
                </p>
                <h3 style={{ fontFamily: FONT.heading, fontSize: '2rem', color: C.fg, fontWeight: 300, marginBottom: '16px' }}>
                  {service.name}
                </h3>
                <p style={{ fontFamily: FONT.body, fontSize: '13px', color: C.muted, lineHeight: '1.8', fontWeight: 300, marginBottom: '24px' }}>
                  {service.desc}
                </p>
                <a
                  href={service.url}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.gold, fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', textDecoration: 'none' }}
                >
                  <span>{exploreText}</span>
                  <ArrowRight style={{ width: '14px', height: '14px' }} />
                </a>
              </div>

              {/* Image */}
              <div style={{ flex: '1 1 300px', overflow: 'hidden', minHeight: '280px' }}>
                <img
                  src={service.image}
                  alt={service.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s', display: 'block' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
