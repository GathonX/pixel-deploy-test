import React from 'react';
import { useLuxiosFonts, useIsMobile, useLx, FONT, useLuxiosContent } from './_luxiosTheme';
import { ChevronDown } from 'lucide-react';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

export function BookingLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const C = useLx(styles);

  const selectStyle: React.CSSProperties = {
    appearance: 'none' as any,
    backgroundColor: 'transparent',
    border: `1px solid ${C.border}`,
    padding: '12px 40px 12px 20px',
    fontSize: '11px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: C.fg + 'cc',
    fontFamily: FONT.body,
    fontWeight: 400,
    cursor: 'pointer',
    minWidth: '180px',
    outline: 'none',
  };

  const ctaText: string = content.ctaText || 'Check Availability';
  const label1: string  = content.label1  || 'Guests';
  const label2: string  = content.label2  || 'Room Type';
  const label3: string  = content.label3  || 'Duration';

  const opts1: string[] = content.opts1 ? content.opts1.split(',').map((s: string) => s.trim()) : ['1 Adult', '2 Adults', '3 Adults', '4 Adults'];
  const opts2: string[] = content.opts2 ? content.opts2.split(',').map((s: string) => s.trim()) : ['0 Children', '1 Child', '2 Children'];
  const opts3: string[] = content.opts3 ? content.opts3.split(',').map((s: string) => s.trim()) : ['Oceanview Suite', 'Deluxe Room', 'Premier Suite'];

  const mobileSelectStyle: React.CSSProperties = {
    ...selectStyle,
    minWidth: 'unset',
    width: '100%',
  };

  return (
    <section style={{ backgroundColor: C.bgSec, padding: '28px 24px' }}>
      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: isMobile ? undefined : 'wrap',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        {[
          { label: label1, opts: opts1 },
          { label: label2, opts: opts2 },
          { label: label3, opts: opts3 },
        ].map(({ label, opts }) => (
          <div key={label} style={{ position: 'relative', width: isMobile ? '100%' : undefined }}>
            <p style={{ fontFamily: FONT.body, fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: C.muted, marginBottom: '4px' }}>
              {label}
            </p>
            <select defaultValue={opts[0]} style={isMobile ? mobileSelectStyle : selectStyle}>
              {opts.map(o => <option key={o} style={{ backgroundColor: C.bgSec, color: C.fg }}>{o}</option>)}
            </select>
            <ChevronDown style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: C.muted, pointerEvents: 'none' }} />
          </div>
        ))}

        <button
          style={{
            backgroundColor: C.gold,
            color: C.bg,
            border: 'none',
            padding: '12px 32px',
            fontFamily: FONT.body,
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            width: isMobile ? '100%' : undefined,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {ctaText}
        </button>
      </div>
    </section>
  );
}
