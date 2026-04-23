import React from 'react';
import { motion } from 'framer-motion';
import { Snowflake, Coffee, Wifi, Waves, BedDouble, Car, Shirt, Shell,
         Utensils, Dumbbell, Bath, Wine, Tv, Leaf, Star, Globe, Music,
         ShoppingBag, Clock, Phone } from 'lucide-react';
import { useLuxiosFonts, useIsMobile, useLx, FONT, subtitleStyle, sectionTitleStyle, sectionPadStyle, containerStyle, useLuxiosContent } from './_luxiosTheme';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

// Map of icon name strings → lucide icon components
export const AMENITY_ICON_MAP: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  Snowflake, Coffee, Wifi, Waves, BedDouble, Car, Shirt, Shell,
  Utensils, Dumbbell, Bath, Wine, Tv, Leaf, Star, Globe, Music,
  ShoppingBag, Clock, Phone,
};

const DEFAULT_ICONS = [Snowflake, Coffee, Wifi, Waves, BedDouble, Car, Shirt, Shell];

const DEFAULT_AMENITIES = [
  { name: 'Air Conditioner', desc: 'Climate-controlled rooms for your comfort.' },
  { name: 'Breakfast', desc: 'Daily gourmet breakfast included.' },
  { name: 'Fiber Wifi', desc: 'High-speed internet throughout the resort.' },
  { name: 'Pool', desc: 'Infinity pool with ocean view.' },
  { name: 'Room Service', desc: '24/7 dedicated room service.' },
  { name: 'Parking', desc: 'Secure valet parking available.' },
  { name: 'Laundry', desc: 'Same-day laundry and dry cleaning.' },
  { name: 'Beach Access', desc: 'Private beach with sunbeds and umbrellas.' },
];

export function AmenitiesLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const C = useLx(styles);

  const subtitle: string = content.subtitle || 'our facilities';
  const title: string    = content.title    || 'Hotel Amenities';

  const amenities = DEFAULT_AMENITIES.map((d, i) => ({
    name: content[`amenity${i + 1}Name`] || d.name,
    desc: content[`amenity${i + 1}Desc`] || d.desc,
  }));

  return (
    <section style={{ backgroundColor: C.bg, ...sectionPadStyle(C, isMobile) }}>
      <div style={containerStyle(C, '960px')}>
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

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '140px' : '200px'}, 1fr))`, gap: '8px' }}>
          {amenities.map((item, i) => {
            const Icon = AMENITY_ICON_MAP[content[`amenity${i + 1}Icon`] as string] || DEFAULT_ICONS[i] || Snowflake;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '32px 16px',
                  gap: '14px',
                  borderBottom: `1px solid ${C.border}55`,
                }}
              >
                <Icon style={{ width: '28px', height: '28px', color: C.gold, strokeWidth: 1.2 }} />
                <h4 style={{ fontFamily: FONT.heading, fontSize: '1.1rem', color: C.fg, fontWeight: 400, margin: 0, textAlign: 'center' }}>
                  {item.name}
                </h4>
                <p style={{ fontFamily: FONT.body, fontSize: '12px', color: C.muted, textAlign: 'center', lineHeight: '1.7', fontWeight: 300 }}>
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
