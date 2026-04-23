# MadagasBooking 🌴

Plateforme de gestion de réservations pour hébergements, excursions et services touristiques à Madagascar.

## Architecture

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend** : Lovable Cloud (Supabase) — base de données PostgreSQL, Edge Functions, authentification
- **Librairies clés** : Framer Motion, Recharts, jsPDF, TanStack Query

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Planning** | Vue timeline interactive par site avec drag & drop, filtres par statut, vue liste |
| **Produits** | CRUD complet, 3 types (chambre/excursion/service), amenités chambres avec icônes |
| **Saisonnalité** | 4 niveaux de saison (base, moyenne, haute, très haute) avec prix et mois configurables |
| **Réservations** | Formulaire multi-étapes avec panier, séparation adultes/enfants, vérification disponibilité |
| **CGV** | Page publique `/cgv` + éditeur admin HTML |
| **Fournisseurs** | Gestion fournisseurs + prix d'achat par produit pour calcul de marge |
| **Emails** | Templates éditables avec variables (`{{client_name}}`, `{{dates}}`, etc.), envoi via Resend |
| **Météo** | Widget OpenWeather par site (5 jours) via Edge Function proxy |
| **Export** | CSV et PDF des réservations avec filtres actifs |
| **Statistiques** | Graphiques revenus, taux d'occupation, marge fournisseur |

## Pages & Routes

| Route | Page |
|-------|------|
| `/` | Landing page |
| `/reserver` | Formulaire de réservation public (multi-étapes) |
| `/cgv` | Conditions Générales de Vente (public) |
| `/login` | Connexion admin |
| `/dashboard` | Dashboard principal — planning timeline |
| `/dashboard/site/:id` | Vue détaillée d'un site |
| `/dashboard/stats` | Statistiques et graphiques |
| `/dashboard/produits` | Gestion des produits et saisons |
| `/dashboard/emails` | Templates email |
| `/dashboard/cgv` | Éditeur CGV |
| `/dashboard/fournisseurs` | Gestion fournisseurs |

## Schéma Base de Données

```
sites (id, name, location, type)
  └── products (id, site_id, name, type, price, capacity, max_capacity, stock, description, image, amenities[])
        ├── product_seasons (id, product_id, season, price, start_month, end_month)
        ├── reservations (id, product_id, client_name, client_email, client_phone, start_date, end_date, status, persons, adults, children, notes, history, linked_product_id)
        └── supplier_prices (id, product_id, supplier_id, cost_price)

suppliers (id, name, contact_email, phone, notes)
email_templates (id, type, subject, body_html)
settings (id, key, value)
```

**Enums** : `product_type` (chambre, excursion, service) · `reservation_status` (pending, confirmed, cancelled, maintenance) · `season_type` (base, moyenne, haute, tres_haute)

## Edge Functions

| Fonction | Rôle |
|----------|------|
| `weather` | Proxy OpenWeather API — retourne prévisions 5 jours |
| `send-notification` | Envoi email transactionnel via Resend avec template DB |

## Secrets requis

| Secret | Usage |
|--------|-------|
| `OPENWEATHER_API_KEY` | Widget météo |
| `RESEND_API_KEY` | Notifications email |

## Développement local

```sh
git clone <URL>
cd madagas-booking
npm install
npm run dev
```

L'application se connecte automatiquement au backend Lovable Cloud via les variables d'environnement `.env`.

## Stack technique

- [React](https://react.dev) + [TypeScript](https://typescriptlang.org)
- [Vite](https://vitejs.dev) — build tool
- [Tailwind CSS](https://tailwindcss.com) — styling
- [shadcn/ui](https://ui.shadcn.com) — composants UI
- [TanStack Query](https://tanstack.com/query) — data fetching
- [Framer Motion](https://framer.com/motion) — animations
- [Recharts](https://recharts.org) — graphiques
- [jsPDF](https://github.com/parallax/jsPDF) — export PDF
- [Lucide React](https://lucide.dev) — icônes
