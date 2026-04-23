import React from 'react';
import { motion } from 'framer-motion';
import { Phone, PhoneCall, Smartphone, Mail, Globe, MessageCircle } from 'lucide-react';

const PHONE_ICON_MAP: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  Phone, PhoneCall, Smartphone, Mail, Globe, MessageCircle,
};
import { useLuxiosFonts, useIsMobile, useLx, FONT, subtitleStyle, sectionTitleStyle, sectionPadStyle, containerStyle, useLuxiosContent } from './_luxiosTheme';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

export function WelcomeLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const C = useLx(styles);

  const subtitle: string     = content.subtitle     || 'welcome';
  const title: string        = content.title        || 'epitome of serenity';
  const description: string  = content.description  || 'We are the best five star resort. Experience the perfect harmony of luxury and nature in our breathtaking surroundings. Every detail has been crafted for your ultimate comfort and relaxation.';
  const managerName: string  = content.managerName  || 'Jefferson Kuroiwa';
  const managerTitle: string = content.managerTitle || 'General Manager';
  const managerImage: string = content.managerImage || '';
  const PhoneIcon = PHONE_ICON_MAP[content.phoneIcon as string] || Phone;
  const phone: string        = content.phone        || '+123 456 789';
  const phoneLabel: string   = content.phoneLabel   || 'Reservation';

  return (
    <section style={{ backgroundColor: C.bg, ...sectionPadStyle(C, isMobile) }}>
      <div style={{ ...containerStyle(C, '900px'), display: 'flex', flexWrap: 'wrap', gap: isMobile ? '32px' : '64px', alignItems: 'center' }}>
        {/* Left — text */}
        <motion.div
          initial={{ opacity: 0, x: isMobile ? 0 : -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ flex: '1 1 280px' }}
        >
          <p style={subtitleStyle(C.gold)}>{subtitle}</p>
          <h2 style={{ ...sectionTitleStyle(C.fg), marginTop: '12px', marginBottom: '24px' }}>{title}</h2>
          <p style={{ fontFamily: FONT.body, fontSize: '13px', lineHeight: '1.85', color: C.muted, marginBottom: '32px', fontWeight: 300 }}>
            {description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {managerImage && (
              <img
                src={managerImage}
                alt={managerName}
                style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.gold}40`, flexShrink: 0 }}
              />
            )}
            <div>
              <p style={{ fontFamily: FONT.heading, fontSize: '20px', color: C.fg, fontWeight: 400 }}>{managerName}</p>
              <p style={{ fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginTop: '4px' }}>
                {managerTitle}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right — phone */}
        <motion.div
          initial={{ opacity: 0, x: isMobile ? 0 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <PhoneIcon style={{ width: '18px', height: '18px', color: C.gold }} />
            <span style={subtitleStyle(C.gold)}>{phoneLabel}</span>
          </div>
          <p style={{ fontFamily: FONT.heading, fontSize: '2rem', color: C.fg, fontWeight: 300 }}>{phone}</p>
        </motion.div>
      </div>
    </section>
  );
}
