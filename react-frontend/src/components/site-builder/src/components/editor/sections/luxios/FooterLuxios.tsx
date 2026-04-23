import React from 'react';
import { Instagram, Facebook, Twitter, Linkedin, Youtube } from 'lucide-react';
import { useLuxiosFonts, useIsMobile, useLx, FONT, subtitleStyle, useLuxiosContent } from './_luxiosTheme';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
  onNavigate?: (slug: string) => void;
}

export function FooterLuxios({ content: rawContent, styles, onNavigate }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const C = useLx(styles);

  const brandName: string = content.brandName || 'luxios';
  const tagline: string   = content.tagline   || 'resort';
  const logoUrl: string   = content.logoUrl   || '';
  const copyright: string = content.copyright || `© ${brandName} Resort. All Rights Reserved.`;
  const email: string     = content.email     || '';
  const address: string   = content.address   || '';

  const socialInstagram: string = content.socialInstagram || '';
  const socialFacebook: string  = content.socialFacebook  || '';
  const socialTwitter: string   = content.socialTwitter   || '';
  const socialLinkedIn: string  = content.socialLinkedIn  || '';
  const socialYoutube: string   = content.socialYoutube   || '';

  const socialLinks = [
    { href: socialInstagram, Icon: Instagram },
    { href: socialFacebook,  Icon: Facebook  },
    { href: socialTwitter,   Icon: Twitter   },
    { href: socialLinkedIn,  Icon: Linkedin  },
    { href: socialYoutube,   Icon: Youtube   },
  ].filter(s => s.href);

  const socialIconStyle = { width: '18px', height: '18px' } as React.CSSProperties;

  let links: { label: string; href: string }[] = [];
  if (content.links) {
    try {
      const parsed = JSON.parse(content.links);
      // Support both {href} and {url} (seeder auto-generated) formats
      links = parsed.map((item: any) => ({ ...item, href: item.href ?? item.url ?? '/' }));
    } catch {}
  } else {
    links = [
      { label: 'About', href: '/about' },
      { label: 'Rooms', href: '/rooms' },
      { label: 'Services', href: '/services' },
      { label: 'Contact', href: '/contact' },
    ];
  }

  const handleClick = (href: string, e: React.MouseEvent) => {
    if (!onNavigate) return;
    e.preventDefault();
    onNavigate(href);
  };

  return (
    <footer style={{
      backgroundColor: C.bgSoft,
      borderTop: `1px solid ${C.border}`,
      padding: '64px 24px 40px',
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: FONT.heading, fontSize: '2.5rem', color: C.fg, fontWeight: 300, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {brandName}
        </h2>
        <p style={{ ...subtitleStyle(C.gold), marginTop: '4px' }}>{tagline}</p>

        {logoUrl && (
          <img
            src={logoUrl}
            alt={brandName}
            style={{ width: '40px', height: '40px', objectFit: 'contain', opacity: 0.55, margin: '24px auto 0', display: 'block' }}
          />
        )}

        {/* Nav links */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center', alignItems: 'center', gap: isMobile ? '14px' : '32px', flexWrap: 'wrap', margin: '32px 0' }}>
          {links.map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={e => handleClick(link.href, e)}
              style={{
                fontFamily: FONT.body,
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: C.muted,
                textDecoration: 'none',
                transition: 'color 0.3s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.gold}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '28px' }}>
            {socialLinks.map(({ href, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.muted, transition: 'color 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.color = C.gold}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}
              >
                <Icon style={socialIconStyle} />
              </a>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: C.border, margin: '0 auto 24px', maxWidth: '80px' }} />

        {/* Contact info */}
        {(email || address) && (
          <div style={{ marginBottom: '20px' }}>
            {address && <p style={{ fontFamily: FONT.body, fontSize: '12px', color: C.muted, letterSpacing: '0.1em', marginBottom: '4px' }}>{address}</p>}
            {email && <p style={{ fontFamily: FONT.body, fontSize: '12px', color: C.muted, letterSpacing: '0.1em' }}>{email}</p>}
          </div>
        )}

        <p style={{ fontFamily: FONT.body, fontSize: '11px', color: C.muted + '99', letterSpacing: '0.15em' }}>
          {copyright}
        </p>
      </div>
    </footer>
  );
}
