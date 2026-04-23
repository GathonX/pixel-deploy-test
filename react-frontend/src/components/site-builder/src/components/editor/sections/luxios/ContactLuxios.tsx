import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useLuxiosFonts, useIsMobile, useLx, FONT, subtitleStyle, sectionTitleStyle, sectionPadStyle, containerStyle, useLuxiosContent } from './_luxiosTheme';

interface Props {
  content: Record<string, any>;
  styles?: Record<string, any>;
}

export function ContactLuxios({ content: rawContent, styles }: Props) {
  const content = useLuxiosContent(rawContent);
  useLuxiosFonts();
  const isMobile = useIsMobile();
  const C = useLx(styles);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${C.border}`,
    padding: '12px 0',
    fontSize: '13px',
    fontFamily: FONT.body,
    color: C.fg,
    outline: 'none',
    transition: 'border-color 0.3s',
    fontWeight: 300,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: FONT.body,
    fontSize: '10px',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    color: C.muted,
    display: 'block',
    marginBottom: '4px',
  };

  const subtitle: string     = content.subtitle     || 'luxios resort';
  const title: string        = content.title        || 'Get In Touch';
  const description: string  = content.description  || "We'd love to hear from you. Whether you're planning your next getaway or have a question about our services, our team is here to help.";
  const phone: string        = content.phone        || '+123 456 789';
  const email: string        = content.email        || 'info@luxiosresort.com';
  const address: string      = content.address      || '123 Coastal Drive, Paradise Island';
  const hours: string        = content.hours        || '24 hours, 7 days a week';
  const btnText: string      = content.btnText      || 'Send Message';

  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitMsg, setSubmitMsg] = useState('');

  const siteId: string | undefined = rawContent.__siteId__;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !formData.name || !formData.email || !formData.message) return;
    setSubmitStatus('loading');
    try {
      const res = await fetch(`/api/site-builder/public/sites/${siteId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.subject
            ? `[${formData.subject}]\n\n${formData.message}`
            : formData.message,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitStatus('success');
        setSubmitMsg(json.message || 'Message envoyé avec succès.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
        setSubmitMsg(json.message || 'Une erreur est survenue.');
      }
    } catch {
      setSubmitStatus('error');
      setSubmitMsg('Erreur réseau. Veuillez réessayer.');
    }
  };

  const contactInfos = [
    { Icon: Phone,  label: content.infoPhoneLabel    || 'Phone',     value: phone   },
    { Icon: Mail,   label: content.infoEmailLabel    || 'Email',     value: email   },
    { Icon: MapPin, label: content.infoAddressLabel  || 'Address',   value: address },
    { Icon: Clock,  label: content.infoHoursLabel    || 'Reception', value: hours   },
  ];

  const fields = [
    { key: 'name',    label: content.fieldNameLabel    || 'Name',    type: 'text'  },
    { key: 'email',   label: content.fieldEmailLabel   || 'Email',   type: 'email' },
    { key: 'subject', label: content.fieldSubjectLabel || 'Subject', type: 'text'  },
  ];
  const fieldMessageLabel: string = content.fieldMessageLabel || 'Message';

  return (
    <section style={{ backgroundColor: C.bg, ...sectionPadStyle(C, isMobile) }}>
      <div style={containerStyle(C, '960px')}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '40px' : '64px' }}>

          {/* Left — contact info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ flex: '1 1 280px' }}
          >
            <p style={subtitleStyle(C.gold)}>{subtitle}</p>
            <h2 style={{ ...sectionTitleStyle(C.fg), marginTop: '12px', marginBottom: '24px' }}>{title}</h2>
            <p style={{ fontFamily: FONT.body, fontSize: '13px', lineHeight: '1.85', color: C.muted, marginBottom: '40px', fontWeight: 300 }}>
              {description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {contactInfos.map(({ Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <Icon style={{ width: '18px', height: '18px', color: C.gold, flexShrink: 0, marginTop: '2px', strokeWidth: 1.5 }} />
                  <div>
                    <p style={{ fontFamily: FONT.body, fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: C.gold, marginBottom: '4px' }}>
                      {label}
                    </p>
                    <p style={{ fontFamily: FONT.body, fontSize: '13px', color: C.fg + 'cc', fontWeight: 300 }}>
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — contact form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ flex: '1 1 280px' }}
          >
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
            >
              {fields.map(({ key, label, type }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type={type}
                    value={formData[key as keyof typeof formData]}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    onFocus={() => setFocusedField(key)}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      ...inputStyle,
                      borderBottomColor: focusedField === key ? C.gold : C.border,
                    }}
                  />
                </div>
              ))}

              <div>
                <label style={labelStyle}>{fieldMessageLabel}</label>
                <textarea
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  onFocus={() => setFocusedField('message')}
                  onBlur={() => setFocusedField(null)}
                  rows={4}
                  style={{
                    ...inputStyle,
                    borderBottomColor: focusedField === 'message' ? C.gold : C.border,
                    resize: 'none',
                    display: 'block',
                  }}
                />
              </div>

              {/* Feedback message */}
              {submitStatus === 'success' && (
                <p style={{ fontFamily: FONT.body, fontSize: '13px', color: '#4ade80', fontWeight: 300 }}>
                  ✓ {submitMsg}
                </p>
              )}
              {submitStatus === 'error' && (
                <p style={{ fontFamily: FONT.body, fontSize: '13px', color: '#f87171', fontWeight: 300 }}>
                  {submitMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitStatus === 'loading' || submitStatus === 'success'}
                style={{
                  alignSelf: isMobile ? 'stretch' : 'flex-start',
                  backgroundColor: submitStatus === 'success' ? C.border : C.gold,
                  color: C.bg,
                  border: 'none',
                  padding: '14px 40px',
                  fontFamily: FONT.body,
                  fontSize: '11px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  cursor: submitStatus === 'loading' || submitStatus === 'success' ? 'default' : 'pointer',
                  transition: 'opacity 0.2s',
                  marginTop: '8px',
                  opacity: submitStatus === 'loading' ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (submitStatus === 'idle' || submitStatus === 'error') e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => e.currentTarget.style.opacity = submitStatus === 'loading' ? '0.6' : '1'}
              >
                {submitStatus === 'loading' ? '...' : btnText}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
