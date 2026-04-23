import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useLuxiosFonts, useIsMobile, useLx, FONT, navLinkStyle, useLuxiosContent } from './_luxiosTheme';
import { luxiosLangStore } from './luxiosLangStore';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
  onNavigate?: (slug: string) => void;
}

const DEFAULT_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'ABOUT', href: '/about' },
  { label: 'SERVICES', href: '/services' },
  { label: 'ROOMS', href: '/rooms' },
  { label: 'NEWS', href: '/news' },
  { label: 'CONTACT', href: '/contact' },
];

export function NavbarLuxios({ content: rawContent, styles, onNavigate }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [activeLang, setActiveLangState] = useState(() => luxiosLangStore.get());
  const [siteLangs, setSiteLangsState] = useState(() => luxiosLangStore.getLangs());
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return luxiosLangStore.subscribe(() => {
      setActiveLangState(luxiosLangStore.get());
      setSiteLangsState(luxiosLangStore.getLangs());
    });
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      const insideBtn = langBtnRef.current?.contains(target);
      const insidePortal = target.closest?.('[data-lang-dropdown]');
      if (!insideBtn && !insidePortal) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const openLangDropdown = () => {
    if (siteLangs.length <= 1) return;
    if (langBtnRef.current) {
      const rect = langBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + window.scrollY + 6, right: window.innerWidth - rect.right });
    }
    setLangOpen(o => !o);
  };

  const C = useLx(styles);

  const brandName: string  = content.brandName  || 'LUXIOS';
  const tagline: string    = content.tagline    || 'Resort';
  const logoUrl: string    = content.logoUrl    || '';
  const faviconUrl: string = content.faviconUrl || '';

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);

  let links = DEFAULT_LINKS;
  if (content.links) {
    try {
      const parsed = JSON.parse(content.links);
      // Support both {href} (editor) and {url} (seeder auto-generated) formats
      links = parsed.map((item: any) => ({ ...item, href: item.href ?? item.url ?? '/' }));
    } catch {}
  }

  const left  = links.slice(0, 3);
  const right = links.slice(3);

  const handleClick = (href: string, e: React.MouseEvent) => {
    setMenuOpen(false);
    if (!onNavigate) return;
    e.preventDefault();
    onNavigate(href);
  };

  const logoCircle = (
    <a
      href="/"
      onClick={(e) => handleClick('/', e)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        border: `1px solid ${C.fg}40`,
        flexShrink: 0,
        textDecoration: 'none',
      }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={brandName} style={{ width: '28px', height: '28px', objectFit: 'contain', opacity: 0.8 }} />
      ) : (
        <span style={{ fontFamily: FONT.heading, fontSize: '16px', fontWeight: 300, color: C.gold, letterSpacing: '0.1em' }}>
          {brandName.charAt(0)}
        </span>
      )}
    </a>
  );

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      overflow: 'visible',
      backgroundColor: C.bg + 'e6',
      backdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${C.border}55`,
    }}>
      {/* ── Desktop bar ── */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', gap: '32px', position: 'relative' }}>
          {left.map((item) => (
            <a key={item.label} href={item.href} onClick={(e) => handleClick(item.href, e)}
              style={navLinkStyle(C.fg)}
              onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.color = C.fg + 'cc')}
            >{item.label}</a>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            {logoCircle}
            {tagline && (
              <span style={{ fontFamily: FONT.body, fontSize: '8px', letterSpacing: '0.35em', textTransform: 'uppercase', color: C.fg + '55' }}>
                {tagline}
              </span>
            )}
          </div>
          {right.map((item) => (
            <a key={item.label} href={item.href} onClick={(e) => handleClick(item.href, e)}
              style={navLinkStyle(C.fg)}
              onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.color = C.fg + 'cc')}
            >{item.label}</a>
          ))}
          {/* ── Language switcher (desktop) ── */}
          {content.showLangSwitcher !== false && siteLangs.length >= 1 && (
            <div data-lang-dropdown style={{ position: 'absolute', right: '24px' }}>
              {/* Trigger : drapeau seul */}
              <button
                ref={langBtnRef}
                onClick={openLangDropdown}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'none',
                  border: `1px solid ${C.gold}55`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: siteLangs.length > 1 ? 'pointer' : 'default',
                  color: C.fg,
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>
                  {siteLangs.find(l => l.code === activeLang)?.flag
                    || siteLangs.find(l => l.isDefault)?.flag
                    || siteLangs[0]?.flag}
                </span>
                {siteLangs.length > 1 && (
                  <ChevronDown style={{ width: '12px', height: '12px', opacity: 0.6, transform: langOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                )}
              </button>
              {/* Dropdown via portal — rendered at body level to avoid z-index clipping */}
              {langOpen && siteLangs.length > 1 && dropdownPos && createPortal(
                <div
                  data-lang-dropdown
                  style={{
                    position: 'absolute',
                    top: dropdownPos.top,
                    right: dropdownPos.right,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    minWidth: '140px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    zIndex: 99999,
                  }}
                >
                  {siteLangs.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { luxiosLangStore.set(lang.code); setLangOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '10px 14px',
                        background: activeLang === lang.code ? C.gold + '22' : 'none',
                        border: 'none', cursor: 'pointer',
                        color: activeLang === lang.code ? C.gold : C.fg + 'cc',
                        fontFamily: FONT.body, fontSize: '12px', letterSpacing: '0.08em',
                        textTransform: 'uppercase', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mobile top bar ── */}
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          {logoCircle}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontFamily: FONT.heading, fontSize: '18px', fontWeight: 300, color: C.fg, letterSpacing: '0.2em' }}>
              {brandName}
            </span>
            {tagline && (
              <span style={{ fontFamily: FONT.body, fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: C.fg + '55' }}>
                {tagline}
              </span>
            )}
          </div>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: C.fg, display: 'flex' }}
          >
            {menuOpen
              ? <X style={{ width: '22px', height: '22px' }} />
              : <Menu style={{ width: '22px', height: '22px' }} />
            }
          </button>
        </div>
      )}

      {/* ── Mobile dropdown menu ── */}
      {isMobile && menuOpen && (
        <div style={{ backgroundColor: C.bgSec, borderTop: `1px solid ${C.border}` }}>
          {links.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleClick(item.href, e)}
              style={{
                ...navLinkStyle,
                display: 'block',
                padding: '14px 24px',
                borderBottom: `1px solid ${C.border}55`,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = C.gold)}
              onMouseLeave={e => (e.currentTarget.style.color = C.fg + 'cc')}
            >
              {item.label}
            </a>
          ))}
          {/* ── Language switcher (mobile) ── */}
          {content.showLangSwitcher !== false && siteLangs.length >= 1 && (
            <div style={{ padding: '8px 16px 12px', borderTop: `1px solid ${C.border}55` }}>
              <p style={{ fontFamily: FONT.body, fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.fg + '55', marginBottom: '8px' }}>
                Langue
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {siteLangs.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { luxiosLangStore.set(lang.code); setMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px',
                      background: activeLang === lang.code ? C.gold + '22' : 'none',
                      border: `1px solid ${activeLang === lang.code ? C.gold + '55' : 'transparent'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: activeLang === lang.code ? C.gold : C.fg + 'cc',
                      fontFamily: FONT.body, fontSize: '12px', letterSpacing: '0.08em',
                      textTransform: 'uppercase', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{lang.flag}</span>
                    {lang.name}
                    {activeLang === lang.code && (
                      <span style={{ marginLeft: 'auto', fontSize: '10px', color: C.gold }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
