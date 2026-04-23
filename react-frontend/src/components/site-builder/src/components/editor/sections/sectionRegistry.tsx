/**
 * sectionRegistry.tsx — single source of truth for all section types.
 *
 * Adding a new template:
 *  1. Create section components in sections/<template>/
 *  2. Add entries to SECTION_RENDERERS and SECTION_EDITORS below
 *  3. Update the seeder (SiteBuilderSeeder.php)
 *
 * No other files need to be modified for rendering/editing.
 */

import React from 'react';
import {
  NavbarLuxios, HeroLuxios, PageHeroLuxios, BookingLuxios, WelcomeLuxios,
  RoomsLuxios, AmenitiesLuxios, ServicesLuxios, NewsLuxios, FooterLuxios, ContactLuxios,
} from './luxios';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Separator } from '../../ui/separator';
import { ImageUploader } from '../../ui/image-uploader';

// ─── Types ────────────────────────────────────────────────────────────────────

type RenderFn = (
  content: Record<string, any>,
  styles: Record<string, any>,
  onNavigate?: (slug: string) => void,
) => React.ReactElement;

type EditorFn = (
  content: Record<string, any>,
  updateContent: (key: string, value: any) => void,
) => React.ReactElement;

// ─── Render registry ──────────────────────────────────────────────────────────

const SECTION_RENDERERS: Record<string, RenderFn> = {
  // Luxios Hotel
  'luxios-navbar':     (c, s, nav) => <NavbarLuxios    content={c} styles={s} onNavigate={nav} />,
  'luxios-hero':       (c, s)      => <HeroLuxios      content={c} styles={s} />,
  'luxios-page-hero':  (c, s)      => <PageHeroLuxios  content={c} styles={s} />,
  'luxios-booking':    (c, s)      => <BookingLuxios   content={c} styles={s} />,
  'luxios-welcome':    (c, s)      => <WelcomeLuxios   content={c} styles={s} />,
  'luxios-rooms':      (c, s)      => <RoomsLuxios     content={c} styles={s} />,
  'luxios-amenities':  (c, s)      => <AmenitiesLuxios content={c} styles={s} />,
  'luxios-services':   (c, s)      => <ServicesLuxios  content={c} styles={s} />,
  'luxios-news':       (c, s)      => <NewsLuxios      content={c} styles={s} />,
  'luxios-footer':     (c, s, nav) => <FooterLuxios    content={c} styles={s} onNavigate={nav} />,
  'luxios-contact':    (c, s)      => <ContactLuxios   content={c} styles={s} />,
};

// ─── Editor registry ──────────────────────────────────────────────────────────

const SECTION_EDITORS: Record<string, EditorFn> = {
  'luxios-page-hero': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-titre doré (petit)</Label>
        <Input value={content.subtitle || ''} onChange={e => uc('subtitle', e.target.value)} placeholder="our story" />
      </div>
      <div className="space-y-2">
        <Label>Titre principal</Label>
        <Input value={content.title || ''} onChange={e => uc('title', e.target.value)} placeholder="About Us" />
      </div>
      <div className="space-y-2">
        <Label>Image de fond</Label>
        <ImageUploader value={content.backgroundImage || ''} onChange={url => uc('backgroundImage', url)} placeholder="URL de l'image" />
      </div>
      <div className="space-y-2">
        <Label>Opacité de l'overlay (0 = transparent, 1 = opaque)</Label>
        <Input
          type="number"
          min="0" max="1" step="0.05"
          value={content.overlayOpacity ?? 0.55}
          onChange={e => uc('overlayOpacity', parseFloat(e.target.value))}
        />
      </div>
    </div>
  ),

  'luxios-navbar': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom de la marque</Label>
        <Input value={content.brandName || ''} onChange={e => uc('brandName', e.target.value)} placeholder="LUXIOS" />
      </div>
      <div className="space-y-2">
        <Label>Tagline (sous le nom)</Label>
        <Input value={content.tagline || ''} onChange={e => uc('tagline', e.target.value)} placeholder="Resort" />
      </div>
      <div className="space-y-2">
        <Label>Logo (image)</Label>
        <ImageUploader value={content.logoUrl || ''} onChange={url => uc('logoUrl', url)} placeholder="URL du logo" />
      </div>
      <div className="space-y-2">
        <Label>Favicon du site</Label>
        <ImageUploader value={content.faviconUrl || ''} onChange={url => uc('faviconUrl', url)} placeholder="URL du favicon" />
        <p className="text-xs text-muted-foreground">Icône affichée dans l'onglet du navigateur</p>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label>Liens de navigation (JSON)</Label>
        <Textarea
          value={content.links || ''}
          onChange={e => uc('links', e.target.value)}
          rows={5}
          className="text-xs font-mono"
          placeholder='[{"label":"HOME","href":"/"},{"label":"ABOUT","href":"/about"}]'
        />
        <p className="text-xs text-muted-foreground">Format: tableau JSON avec "label" et "href"</p>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm">Sélecteur de langue</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Afficher le bouton de choix de langue</p>
        </div>
        <button
          type="button"
          onClick={() => uc('showLangSwitcher', content.showLangSwitcher === false ? true : false)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            content.showLangSwitcher === false ? 'bg-slate-200' : 'bg-indigo-600'
          }`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform ${
            content.showLangSwitcher === false ? 'translate-x-0' : 'translate-x-4'
          }`} />
        </button>
      </div>
    </div>
  ),

  'luxios-hero': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image de fond</Label>
        <ImageUploader value={content.backgroundImage || ''} onChange={url => uc('backgroundImage', url)} placeholder="URL de l'image" />
      </div>
      <div className="space-y-2">
        <Label>Nom de la marque</Label>
        <Input value={content.brandName || ''} onChange={e => uc('brandName', e.target.value)} placeholder="LUXIOS" />
      </div>
      <div className="space-y-2">
        <Label>Tagline</Label>
        <Input value={content.tagline || ''} onChange={e => uc('tagline', e.target.value)} placeholder="Resort" />
      </div>
      <div className="space-y-2">
        <Label>Sous-titre</Label>
        <Input value={content.subtitle || ''} onChange={e => uc('subtitle', e.target.value)} placeholder="A world of serenity awaits" />
      </div>
      <div className="space-y-2">
        <Label>Texte du bouton CTA</Label>
        <Input value={content.ctaText || ''} onChange={e => uc('ctaText', e.target.value)} placeholder="Discover" />
      </div>
      <div className="space-y-2">
        <Label>Lien du bouton CTA</Label>
        <Input value={content.ctaUrl || ''} onChange={e => uc('ctaUrl', e.target.value)} placeholder="#rooms" />
      </div>
      <div className="space-y-2">
        <Label>Texte indicateur de défilement</Label>
        <Input value={content.scrollText || ''} onChange={e => uc('scrollText', e.target.value)} placeholder="Scroll" />
      </div>
    </div>
  ),

  'luxios-booking': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Texte du bouton</Label>
        <Input value={content.ctaText || ''} onChange={e => uc('ctaText', e.target.value)} placeholder="Check Availability" />
      </div>
      <Separator />
      {[
        { i: 1, labelPlaceholder: 'Guests', optionsPlaceholder: '1 Adult,2 Adults,3 Adults,4 Adults' },
        { i: 2, labelPlaceholder: 'Room Type', optionsPlaceholder: 'Deluxe Room,Oceanview Suite,Premier Suite' },
        { i: 3, labelPlaceholder: 'Duration', optionsPlaceholder: '0 Children,1 Child,2 Children' },
      ].map(({ i, labelPlaceholder, optionsPlaceholder }) => (
        <div key={i} className="space-y-3 p-3 border rounded-lg">
          <p className="text-sm font-medium text-muted-foreground">Filtre {i}</p>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={content[`label${i}`] || ''} onChange={e => uc(`label${i}`, e.target.value)} placeholder={labelPlaceholder} />
          </div>
          <div className="space-y-2">
            <Label>Options (séparées par virgule)</Label>
            <Input value={content[`opts${i}`] || ''} onChange={e => uc(`opts${i}`, e.target.value)} placeholder={optionsPlaceholder} />
          </div>
        </div>
      ))}
    </div>
  ),

  'luxios-welcome': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-titre doré</Label>
        <Input value={content.subtitle || ''} onChange={e => uc('subtitle', e.target.value)} placeholder="welcome" />
      </div>
      <div className="space-y-2">
        <Label>Titre principal</Label>
        <Input value={content.title || ''} onChange={e => uc('title', e.target.value)} placeholder="epitome of serenity" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={content.description || ''} onChange={e => uc('description', e.target.value)} rows={4} />
      </div>
      <div className="space-y-2">
        <Label>Photo du directeur</Label>
        <ImageUploader value={content.managerImage || ''} onChange={url => uc('managerImage', url)} placeholder="URL de la photo" />
      </div>
      <div className="space-y-2">
        <Label>Nom du directeur</Label>
        <Input value={content.managerName || ''} onChange={e => uc('managerName', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Titre du directeur</Label>
        <Input value={content.managerTitle || ''} onChange={e => uc('managerTitle', e.target.value)} />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label>Icône de contact</Label>
        <select
          value={content.phoneIcon || ''}
          onChange={e => uc('phoneIcon', e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">📞 Téléphone (défaut)</option>
          <option value="PhoneCall">📲 Appel entrant</option>
          <option value="Smartphone">📱 Smartphone</option>
          <option value="Mail">✉️ Email</option>
          <option value="Globe">🌐 Site web</option>
          <option value="MessageCircle">💬 Message</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Label téléphone</Label>
        <Input value={content.phoneLabel || ''} onChange={e => uc('phoneLabel', e.target.value)} placeholder="Reservation" />
      </div>
      <div className="space-y-2">
        <Label>Numéro de téléphone</Label>
        <Input value={content.phone || ''} onChange={e => uc('phone', e.target.value)} placeholder="+123 456 789" />
      </div>
    </div>
  ),

  'luxios-rooms': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-titre</Label>
        <Input value={content.subtitle || ''} onChange={e => uc('subtitle', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input value={content.title || ''} onChange={e => uc('title', e.target.value)} />
      </div>
      <Separator />
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-3 p-3 border rounded-lg">
          <p className="text-sm font-medium text-muted-foreground">Chambre {i}</p>
          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUploader value={content[`room${i}Image`] || ''} onChange={url => uc(`room${i}Image`, url)} />
          </div>
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={content[`room${i}Name`] || ''} onChange={e => uc(`room${i}Name`, e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Superficie</Label>
              <Input value={content[`room${i}Size`] || ''} onChange={e => uc(`room${i}Size`, e.target.value)} placeholder="39 sqm." />
            </div>
            <div className="space-y-2">
              <Label>Prix</Label>
              <Input value={content[`room${i}Price`] || ''} onChange={e => uc(`room${i}Price`, e.target.value)} placeholder="$300" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Lien (clic sur la carte)</Label>
            <Input value={content[`room${i}Url`] || ''} onChange={e => uc(`room${i}Url`, e.target.value)} placeholder="/rooms/deluxe" />
          </div>
        </div>
      ))}
      <div className="space-y-2">
        <Label>Texte bouton "Voir tout"</Label>
        <Input value={content.ctaText || ''} onChange={e => uc('ctaText', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Lien bouton "Voir tout"</Label>
        <Input value={content.ctaUrl || ''} onChange={e => uc('ctaUrl', e.target.value)} placeholder="/rooms" />
      </div>
      <div className="space-y-2">
        <Label>Texte "par nuit"</Label>
        <Input value={content.nightText || ''} onChange={e => uc('nightText', e.target.value)} placeholder="/ night" />
      </div>
    </div>
  ),

  'luxios-amenities': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-titre</Label>
        <Input value={content.subtitle || ''} onChange={e => uc('subtitle', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input value={content.title || ''} onChange={e => uc('title', e.target.value)} />
      </div>
      <Separator />
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="space-y-2 p-3 border rounded-lg">
          <p className="text-sm font-medium text-muted-foreground">Équipement {i}</p>
          <div className="space-y-2">
            <Label>Icône</Label>
            <select
              value={content[`amenity${i}Icon`] || ''}
              onChange={e => uc(`amenity${i}Icon`, e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">-- Défaut --</option>
              <option value="Snowflake">❄️ Air Conditionné</option>
              <option value="Coffee">☕ Petit-déjeuner</option>
              <option value="Wifi">📶 Wifi</option>
              <option value="Waves">🌊 Piscine</option>
              <option value="BedDouble">🛏 Service chambre</option>
              <option value="Car">🚗 Parking</option>
              <option value="Shirt">👔 Blanchisserie</option>
              <option value="Shell">🐚 Plage privée</option>
              <option value="Utensils">🍴 Restaurant</option>
              <option value="Dumbbell">💪 Salle de sport</option>
              <option value="Bath">🛁 Spa / Bain</option>
              <option value="Wine">🍷 Bar</option>
              <option value="Tv">📺 Télévision</option>
              <option value="Leaf">🌿 Jardin</option>
              <option value="Star">⭐ Concierge</option>
              <option value="Globe">🌐 Tour opérateur</option>
              <option value="Music">🎵 Divertissement</option>
              <option value="ShoppingBag">🛍 Boutique</option>
              <option value="Clock">🕐 24h/24</option>
              <option value="Phone">📞 Téléphone</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={content[`amenity${i}Name`] || ''} onChange={e => uc(`amenity${i}Name`, e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={content[`amenity${i}Desc`] || ''} onChange={e => uc(`amenity${i}Desc`, e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  ),

  'luxios-services': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-titre</Label>
        <Input value={content.subtitle || ''} onChange={e => uc('subtitle', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input value={content.title || ''} onChange={e => uc('title', e.target.value)} />
      </div>
      <Separator />
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-3 p-3 border rounded-lg">
          <p className="text-sm font-medium text-muted-foreground">Service {i}</p>
          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUploader value={content[`service${i}Image`] || ''} onChange={url => uc(`service${i}Image`, url)} />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Input value={content[`service${i}Category`] || ''} onChange={e => uc(`service${i}Category`, e.target.value)} placeholder="Dining" />
          </div>
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={content[`service${i}Name`] || ''} onChange={e => uc(`service${i}Name`, e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={content[`service${i}Desc`] || ''} onChange={e => uc(`service${i}Desc`, e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Lien "Explorer"</Label>
            <Input value={content[`service${i}Url`] || ''} onChange={e => uc(`service${i}Url`, e.target.value)} placeholder="#" />
          </div>
        </div>
      ))}
      <div className="space-y-2">
        <Label>Texte du lien "Explorer"</Label>
        <Input value={content.exploreText || ''} onChange={e => uc('exploreText', e.target.value)} placeholder="Explore" />
      </div>
    </div>
  ),

  'luxios-news': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-titre</Label>
        <Input value={content.subtitle || ''} onChange={e => uc('subtitle', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input value={content.title || ''} onChange={e => uc('title', e.target.value)} />
      </div>
      <Separator />
      {[1, 2].map(i => (
        <div key={i} className="space-y-3 p-3 border rounded-lg">
          <p className="text-sm font-medium text-muted-foreground">Article {i}</p>
          <div className="space-y-2">
            <Label>Image</Label>
            <ImageUploader value={content[`article${i}Image`] || ''} onChange={url => uc(`article${i}Image`, url)} />
          </div>
          <div className="space-y-2">
            <Label>Titre de l'article</Label>
            <Input value={content[`article${i}Title`] || ''} onChange={e => uc(`article${i}Title`, e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Input value={content[`article${i}Category`] || ''} onChange={e => uc(`article${i}Category`, e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={content[`article${i}Desc`] || ''} onChange={e => uc(`article${i}Desc`, e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Lien "Lire la suite"</Label>
            <Input value={content[`article${i}Url`] || ''} onChange={e => uc(`article${i}Url`, e.target.value)} placeholder="/blog/article" />
          </div>
        </div>
      ))}
      <div className="space-y-2">
        <Label>Texte bouton "Voir tout"</Label>
        <Input value={content.ctaText || ''} onChange={e => uc('ctaText', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Lien bouton "Voir tout"</Label>
        <Input value={content.ctaUrl || ''} onChange={e => uc('ctaUrl', e.target.value)} placeholder="/news" />
      </div>
      <div className="space-y-2">
        <Label>Texte "Lire la suite"</Label>
        <Input value={content.readMore || ''} onChange={e => uc('readMore', e.target.value)} placeholder="Read more" />
      </div>
    </div>
  ),

  'luxios-contact': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-titre doré</Label>
        <Input value={content.subtitle || ''} onChange={e => uc('subtitle', e.target.value)} placeholder="luxios resort" />
      </div>
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input value={content.title || ''} onChange={e => uc('title', e.target.value)} placeholder="Get In Touch" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={content.description || ''} onChange={e => uc('description', e.target.value)} rows={3} />
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Label "Téléphone"</Label>
          <Input value={content.infoPhoneLabel || ''} onChange={e => uc('infoPhoneLabel', e.target.value)} placeholder="Phone" />
        </div>
        <div className="space-y-2">
          <Label>Valeur téléphone</Label>
          <Input value={content.phone || ''} onChange={e => uc('phone', e.target.value)} placeholder="+123 456 789" />
        </div>
        <div className="space-y-2">
          <Label>Label "Email"</Label>
          <Input value={content.infoEmailLabel || ''} onChange={e => uc('infoEmailLabel', e.target.value)} placeholder="Email" />
        </div>
        <div className="space-y-2">
          <Label>Valeur email</Label>
          <Input value={content.email || ''} onChange={e => uc('email', e.target.value)} placeholder="info@luxiosresort.com" />
        </div>
        <div className="space-y-2">
          <Label>Label "Adresse"</Label>
          <Input value={content.infoAddressLabel || ''} onChange={e => uc('infoAddressLabel', e.target.value)} placeholder="Address" />
        </div>
        <div className="space-y-2">
          <Label>Valeur adresse</Label>
          <Input value={content.address || ''} onChange={e => uc('address', e.target.value)} placeholder="123 Coastal Drive" />
        </div>
        <div className="space-y-2">
          <Label>Label "Horaires"</Label>
          <Input value={content.infoHoursLabel || ''} onChange={e => uc('infoHoursLabel', e.target.value)} placeholder="Reception" />
        </div>
        <div className="space-y-2">
          <Label>Valeur horaires</Label>
          <Input value={content.hours || ''} onChange={e => uc('hours', e.target.value)} placeholder="24 hours, 7 days a week" />
        </div>
      </div>
      <Separator />
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Labels du formulaire</Label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Champ Nom</Label>
          <Input value={content.fieldNameLabel || ''} onChange={e => uc('fieldNameLabel', e.target.value)} placeholder="Name" />
        </div>
        <div className="space-y-2">
          <Label>Champ Email</Label>
          <Input value={content.fieldEmailLabel || ''} onChange={e => uc('fieldEmailLabel', e.target.value)} placeholder="Email" />
        </div>
        <div className="space-y-2">
          <Label>Champ Sujet</Label>
          <Input value={content.fieldSubjectLabel || ''} onChange={e => uc('fieldSubjectLabel', e.target.value)} placeholder="Subject" />
        </div>
        <div className="space-y-2">
          <Label>Champ Message</Label>
          <Input value={content.fieldMessageLabel || ''} onChange={e => uc('fieldMessageLabel', e.target.value)} placeholder="Message" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Texte du bouton</Label>
        <Input value={content.btnText || ''} onChange={e => uc('btnText', e.target.value)} placeholder="Send Message" />
      </div>
    </div>
  ),

  'luxios-footer': (content, uc) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom de la marque</Label>
        <Input value={content.brandName || ''} onChange={e => uc('brandName', e.target.value)} placeholder="luxios" />
      </div>
      <div className="space-y-2">
        <Label>Tagline</Label>
        <Input value={content.tagline || ''} onChange={e => uc('tagline', e.target.value)} placeholder="resort" />
      </div>
      <div className="space-y-2">
        <Label>Logo (image)</Label>
        <ImageUploader value={content.logoUrl || ''} onChange={url => uc('logoUrl', url)} placeholder="URL du logo" />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label>Email de contact</Label>
        <Input value={content.email || ''} onChange={e => uc('email', e.target.value)} placeholder="contact@luxios.com" />
      </div>
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Input value={content.address || ''} onChange={e => uc('address', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Copyright</Label>
        <Input value={content.copyright || ''} onChange={e => uc('copyright', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Liens du footer (JSON)</Label>
        <Textarea
          value={content.links || ''}
          onChange={e => uc('links', e.target.value)}
          rows={4}
          className="text-xs font-mono"
          placeholder='[{"label":"About","href":"/about"}]'
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Réseaux sociaux (URL ou vide)</Label>
      </div>
      <div className="space-y-2">
        <Label>Instagram</Label>
        <Input value={content.socialInstagram || ''} onChange={e => uc('socialInstagram', e.target.value)} placeholder="https://instagram.com/..." />
      </div>
      <div className="space-y-2">
        <Label>Facebook</Label>
        <Input value={content.socialFacebook || ''} onChange={e => uc('socialFacebook', e.target.value)} placeholder="https://facebook.com/..." />
      </div>
      <div className="space-y-2">
        <Label>Twitter / X</Label>
        <Input value={content.socialTwitter || ''} onChange={e => uc('socialTwitter', e.target.value)} placeholder="https://twitter.com/..." />
      </div>
      <div className="space-y-2">
        <Label>LinkedIn</Label>
        <Input value={content.socialLinkedIn || ''} onChange={e => uc('socialLinkedIn', e.target.value)} placeholder="https://linkedin.com/..." />
      </div>
      <div className="space-y-2">
        <Label>YouTube</Label>
        <Input value={content.socialYoutube || ''} onChange={e => uc('socialYoutube', e.target.value)} placeholder="https://youtube.com/..." />
      </div>
    </div>
  ),
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Render a section component.
 * Returns null for unknown section types (callers should render a fallback).
 */
export function renderSection(
  typeId: string,
  content: Record<string, any>,
  styles: Record<string, any>,
  onNavigate?: (slug: string) => void,
  key?: string,
  translations?: Record<string, any>,
): React.ReactElement | null {
  const fn = SECTION_RENDERERS[typeId];
  if (!fn) return null;
  // Inject translations so each Luxios component can apply them reactively via useLuxiosContent
  const enrichedContent = translations ? { ...content, __tr__: translations } : content;
  const el = fn(enrichedContent, styles, onNavigate);
  return key ? React.cloneElement(el, { key }) : el;
}

/**
 * Render the editor UI for a section.
 * Returns null for unknown section types (callers should render a generic fallback).
 */
export function renderSectionEditor(
  typeId: string,
  content: Record<string, any>,
  updateContent: (key: string, value: any) => void,
): React.ReactElement | null {
  const fn = SECTION_EDITORS[typeId];
  if (!fn) return null;
  return fn(content, updateContent);
}

/** Returns true if a section type is registered */
export function isSectionRegistered(typeId: string): boolean {
  return typeId in SECTION_RENDERERS;
}
