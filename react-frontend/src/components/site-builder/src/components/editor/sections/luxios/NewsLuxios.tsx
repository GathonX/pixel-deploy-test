import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLuxiosFonts, useIsMobile, useLx, FONT, subtitleStyle, sectionTitleStyle, sectionPadStyle, containerStyle, useLuxiosContent } from './_luxiosTheme';
import { luxiosLangStore } from './luxiosLangStore';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

interface LiveArticle {
  image: string;
  title: string;
  category: string;
  desc: string;
  url: string;
}

const DEFAULT_ARTICLES: LiveArticle[] = [
  {
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
    title: 'Top Views',
    category: 'Sightseeing',
    desc: 'Discover the most breathtaking panoramas from our resort\'s private observation points.',
    url: '#',
  },
  {
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
    title: 'Zen Gardens',
    category: 'Relaxation',
    desc: 'Explore our serene zen gardens, a sanctuary of peace and mindful contemplation.',
    url: '#',
  },
];

const API_BASE = '/api/site-builder/public/sites';

export function NewsLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const C = useLx(styles);

  const [liveArticles, setLiveArticles] = useState<LiveArticle[] | null>(null);
  const [activeLang, setActiveLang] = useState(() => luxiosLangStore.get());
  const [activeLangName, setActiveLangName] = useState(() => {
    const langs = luxiosLangStore.getLangs();
    return langs.find(l => l.code === luxiosLangStore.get())?.name ?? '';
  });

  useEffect(() => luxiosLangStore.subscribe(() => {
    const lang = luxiosLangStore.get();
    const langs = luxiosLangStore.getLangs();
    setActiveLang(lang);
    setActiveLangName(langs.find(l => l.code === lang)?.name ?? '');
  }), []);

  const siteId: string | undefined = rawContent.__siteId__;

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (activeLang) {
      params.set('lang', activeLang);
      if (activeLangName) params.set('lang_name', activeLangName);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    fetch(`${API_BASE}/${siteId}/posts${query}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled || !json.success) return;
        const posts: LiveArticle[] = (json.data ?? []).slice(0, 6).map((p: any) => ({
          image:    p.header_image || DEFAULT_ARTICLES[0].image,
          title:    p.title || '',
          category: p.tags?.[0] || 'Article',
          desc:     p.summary || '',
          url:      `/blog/${p.slug}`,
        }));
        if (posts.length > 0) setLiveArticles(posts);
      })
      .catch(() => { /* silencieux — fallback statique */ });
    return () => { cancelled = true; };
  }, [siteId, activeLang, activeLangName]);

  const subtitle: string = content.subtitle || 'our blog';
  const title: string    = content.title    || 'News & Articles';
  const ctaText: string  = content.ctaText  || 'View All';
  const ctaUrl: string   = content.ctaUrl   || '/blog';
  const readMore: string = content.readMore || 'Read more';

  // Utiliser les vrais articles si disponibles, sinon le contenu statique
  const articles: LiveArticle[] = liveArticles ?? [1, 2].map((i, idx) => ({
    image:    content[`article${i}Image`]    || DEFAULT_ARTICLES[idx].image,
    title:    content[`article${i}Title`]    || DEFAULT_ARTICLES[idx].title,
    category: content[`article${i}Category`] || DEFAULT_ARTICLES[idx].category,
    desc:     content[`article${i}Desc`]     || DEFAULT_ARTICLES[idx].desc,
    url:      content[`article${i}Url`]      || '/blog',
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
          {articles.map((article, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <div style={{ overflow: 'hidden', marginBottom: '24px' }}>
                <img
                  src={article.image}
                  alt={article.title}
                  style={{ width: '100%', height: '256px', objectFit: 'cover', display: 'block', transition: 'transform 0.7s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>
              <h3 style={{ fontFamily: FONT.heading, fontSize: '1.5rem', color: C.fg, fontWeight: 300, marginBottom: '12px' }}>
                {article.title}
              </h3>
              <p style={{ fontFamily: FONT.body, fontSize: '13px', color: C.muted, lineHeight: '1.8', fontWeight: 300, marginBottom: '16px' }}>
                {article.desc}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <a
                  href={article.url || '#'}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.gold, fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', textDecoration: 'none' }}
                >
                  <span>{readMore}</span>
                  <ArrowRight style={{ width: '12px', height: '12px' }} />
                </a>
                <span style={{ fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted }}>
                  {article.category}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

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
