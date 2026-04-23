# Plan : Première paire — V6 (Adventure) + V7 (DirEngine)

## Principe fondamental
Chaque template est **unique et fidèle à son site exemplaire**. Pas de copie de V4/V5. Chaque version a sa propre identité visuelle, ses propres patterns de design, et ses propres couleurs.

---

## V6 — Adventure (Tour-operateur-2)
**Identité** : Éditorial/magazine voyage, dual-font (serif display + sans-serif léger)
**Couleurs** : Teal `#08c299` (boutons, sections, gradient) + Gold `#f9be37` (CTA, étoiles, accents) + Charcoal `#222831` (footer)
**Style** : Zigzag card layout, gradient vert overlay, serif headings, parallax

### 14 sections V6 à créer :
1. **NavbarPremiumV6** — Transparent → blanc on scroll, brand "Adventure" style serif, 6 liens + pas de CTA button visible
2. **HeroPremiumV6** — Full-height, gradient teal overlay, heading Abril Fatface (serif bold), sous-titre léger, barre de recherche tabulée (Vol/Hôtel/Voiture) qui overlap en bas
3. **ServicesPremiumV6** — 4 colonnes icônes dorées (yacht, globe, compass, map), titre + description, fond light gray
4. **FeaturesPremiumV6** — Cards zigzag (image/texte alternés), étoiles dorées, prix bleu, durée, location + bouton teal "Découvrir"
5. **GalleryPremiumV6** — 3 grandes cartes image plein fond (Plage, Groupe, Ville) avec texte overlay blanc, style "vacation ideas"
6. **StatsPremiumV6** — Parallax background + gradient teal overlay 0.9 opacity, 4 compteurs blancs (clients, destinations, hôtels, restaurants)
7. **TestimonialsPremiumV6** — Fond teal solide (#08c299), cards semi-transparentes blanches, avatar circulaire avec badge quote doré, texte blanc
8. **CtaPremiumV6** — Newsletter/Subscribe avec gradient teal, champ email + bouton, texte blanc
9. **AboutPremiumV6** — Split 50/50 : image gauche + texte "Meilleure Agence" à droite, style éditorial
10. **ContactPremiumV6** — Formulaire simple sur fond blanc, infos contact (adresse, téléphone, email), carte/map placeholder
11. **PricingPremiumV6** — Cards hôtel avec prix /nuit en bleu (#2f89fc), étoiles, bouton teal "Réserver"
12. **TeamPremiumV6** — Grid guides avec photo, nom, rôle, style simple sur fond light
13. **FaqPremiumV6** — Accordion avec bordures fines, style éditorial
14. **FooterPremiumV6** — Fond charcoal #222831, 4 colonnes (brand+social, infos, expériences, contact), social icons cercles

---

## V7 — DirEngine (Tour-operateur-3)
**Identité** : Directory/marketplace voyage, aquatique, content-rich
**Couleurs** : Sky Blue `#78d5ef` (liens, secondaire) + Coral `#f85959` (CTA, boutons action) + Teal gradient `#2ebdc4`→`#68e5b2` (overlays) + Charcoal `#222831` (footer)
**Style** : Search-portal, browse categories, overlapping services cards, split testimonial

### 14 sections V7 à créer :
1. **NavbarPremiumV7** — Transparent → blanc on scroll, brand "dirEngine." avec point, liens + bouton pill "Ajouter" avec bordure blanche, devient coral au hover
2. **HeroPremiumV7** — Full-height, dark overlay, heading bold "Explorez votre ville", barre de recherche intégrée (input + dropdown location + bouton coral), browse icons en dessous (Restaurant, Hôtel, Lieux, Shopping)
3. **ServicesPremiumV7** — 4 cartes valeur (-120px overlap hero), icône + titre + description, fond blanc avec shadow, fond section light gray
4. **FeaturesPremiumV7** — Carousel-style cards destinations avec image, nom ville, nombre de listings, hover reveal
5. **GalleryPremiumV7** — Cards tour packages plein largeur : image + info (étoiles, prix $200, durée, location, bouton "Découvrir"), séparateur hr
6. **StatsPremiumV7** — Parallax background, teal gradient overlay, 4 compteurs animés (clients, destinations, hôtels, restaurants), chiffres blancs
7. **TestimonialsPremiumV7** — Split layout : "Pourquoi nous choisir" texte à gauche (5/12) + carousel témoignages à droite (6/12), fond light gray
8. **CtaPremiumV7** — Newsletter gradient teal-to-mint (#2ebdc4 → #68e5b2), heading blanc, email input + subscribe button
9. **AboutPremiumV7** — Section descriptive avec heading mixte (light/bold), paragraphe, image de support
10. **ContactPremiumV7** — Formulaire sur fond blanc, grille d'infos contact
11. **PricingPremiumV7** — Cards hôtels par nuit (même pattern que destinations mais pricing/nuit), bouton coral outline "Réserver"
12. **TeamPremiumV7** — Grid simple avec photos, noms et rôles
13. **FaqPremiumV7** — Accordion style clean, bordure fine
14. **FooterPremiumV7** — Fond charcoal #222831, 4 colonnes (brand+social cercles, infos liens, support client, contact), copyright bar

---

## Étapes d'implémentation

### Phase 1 : Backend Seeder (28 nouveaux section types + 2 templates)
- Ajouter 14 section types `*-premium-v6` dans SiteBuilderSeeder.php
- Ajouter 14 section types `*-premium-v7` dans SiteBuilderSeeder.php
- Ajouter template `tour-operateur-adventure` (V6, 5 pages)
- Ajouter template `tour-operateur-direngine` (V7, 5 pages)

### Phase 2 : Créer 14 composants React V6 (Adventure)
- Fichiers dans `sections/premium/`
- Chaque composant est unique, inspiré du site exemplaire Tour-operateur-2

### Phase 3 : Créer 14 composants React V7 (DirEngine)
- Fichiers dans `sections/premium/`
- Chaque composant est unique, inspiré du site exemplaire Tour-operateur-3

### Phase 4 : Wiring (6 fichiers à mettre à jour)
1. `premium/index.ts` — 28 nouveaux exports
2. `SectionRenderer.tsx` — 28 nouveaux switch cases
3. `TemplatePreview.tsx` — 28 nouveaux switch cases
4. `Preview.tsx` — 28 nouveaux switch cases
5. `PublicPreview.tsx` — 28 nouveaux switch cases
6. `AddSectionPanel.tsx` — 28 nouvelles icônes + thumbnails + 2 catégories

### Phase 5 : Build, Seeder, Deploy
- `npm run build`
- Exécuter seeder
- Deploy avec nettoyage assets Docker

---

## Noms des templates
- **V6** : `tour-operateur-adventure` — "Tour Opérateur Adventure" — accent `#08c299`
- **V7** : `tour-operateur-direngine` — "Tour Opérateur DirEngine" — accent `#f85959`

## Catégories AddSectionPanel
- `premium-v6` : "Premium V6 — Adventure", accent `#08c299`
- `premium-v7` : "Premium V7 — DirEngine", accent `#f85959`
