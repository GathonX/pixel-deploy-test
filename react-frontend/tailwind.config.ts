// tailwind.config.ts
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
        "./src/components/marketplace/src/**/*.{ts,tsx}",
        "./src/components/studio-site/src/**/*.{ts,tsx}",
        "./src/components/funnel-crm/src/**/*.{ts,tsx}",
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        extend: {
            // 🔤 POLICES SYSTÈME NATIVES
            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    '"Helvetica Neue"',
                    'Arial',
                    '"Noto Sans"',
                    'sans-serif',
                    '"Apple Color Emoji"',
                    '"Segoe UI Emoji"',
                    '"Segoe UI Symbol"',
                    '"Noto Color Emoji"'
                ],
                mono: [
                    'ui-monospace',
                    'SFMono-Regular',
                    '"SF Mono"',
                    'Menlo',
                    'Monaco',
                    'Consolas',
                    '"Liberation Mono"',
                    '"Courier New"',
                    'monospace'
                ]
            },
            // 🎨 PALETTE PREMIUM PIXELRISE - COULEURS EXCLUSIVES
            colors: {
                // Variables CSS préservées pour shadcn/ui
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                },

                // PALETTE PRINCIPALE PREMIUM - COULEURS PRIMAIRES
                'brand-blue': '#2563eb',        // Brand Primary
                'brand-yellow': '#f59e0b',      // Accent Primary
                'brand-black': '#0f172a',       // 🖤 NOUVEAU: Noir Premium Principal

                // 🔵 PALETTE BLEUE COMPLÈTE (Brand Primary)
                'blue-50': '#eff6ff',
                'blue-100': '#dbeafe',
                'blue-200': '#bfdbfe',
                'blue-300': '#93c5fd',
                'blue-400': '#60a5fa',
                'blue-500': '#3b82f6',
                'blue-600': '#2563eb',          // Couleur principale
                'blue-700': '#1d4ed8',
                'blue-800': '#1e40af',
                'blue-900': '#1e3a8a',

                // 🟡 PALETTE JAUNE/ORANGE COMPLÈTE (Accent Primary)
                'yellow-300': '#fcd34d',
                'yellow-400': '#fbbf24',
                'yellow-500': '#f59e0b',        // Couleur principale
                'yellow-600': '#d97706',
                'orange-500': '#f97316',
                'orange-600': '#ea580c',
                'red-500': '#ef4444',           // Pour urgence/CTA

                // 🖤 PALETTE NOIRE COMPLÈTE (Nouveau Brand Primary)
                'black-50': '#f8fafc',          // Presque blanc (pour backgrounds)
                'black-100': '#f1f5f9',         // Très clair
                'black-200': '#e2e8f0',         // Clair
                'black-300': '#cbd5e1',         // Moyen clair
                'black-400': '#94a3b8',         // Moyen
                'black-500': '#64748b',         // Moyen foncé
                

                // 🟣 COULEURS SECONDAIRES PREMIUM
                'purple-500': '#8b5cf6',
                'purple-600': '#7c3aed',
                'purple-700': '#6d28d9',
                'indigo-600': '#4f46e5',
                'indigo-700': '#4338ca',

                // 🟢 VERT (Success/Trust)
                'green-400': '#4ade80',
                'green-500': '#22c55e',
                'green-600': '#16a34a',
                'emerald-500': '#10b981',
                'emerald-600': '#059669',

               

                // 🎭 GRILLES DE GRIS SOPHISTIQUÉES (Préservées)
                'slate-50': '#f8fafc',
                'slate-100': '#f1f5f9',
                'slate-200': '#e2e8f0',
                'slate-300': '#cbd5e1',
                'slate-400': '#94a3b8',
                'slate-500': '#64748b',
                'slate-600': '#475569',
                'slate-700': '#334155',
                'slate-800': '#1e293b',         // Textes principaux
                'slate-900': '#0f172a',         // Headers/CTA dark

                'gray-50': '#f9fafb',
                'gray-100': '#f3f4f6',
                'gray-600': '#4b5563',
                'gray-900': '#111827',          // Footer/Dark sections

                // ✨ COULEURS SPÉCIALISÉES
                success: '#22c55e',             // Green-500
                warning: '#f59e0b',             // Yellow-500
                error: '#ef4444',               // Red-500
                info: '#3b82f6',                // Blue-500

                // 📅 COULEURS STATUT RÉSERVATIONS (mada-booking)
                'status-confirmed':  '#10b981', // Vert émeraude — confirmée
                'status-pending':    '#f59e0b', // Ambre — en attente
                'status-cancelled':  '#ef4444', // Rouge — annulée
                'status-maintenance':'#94a3b8', // Gris slate — maintenance

                // 🎨 COULEURS TEXTE STATUT
                'emerald': '#10b981',
                'sunset':  '#f59e0b',
                'coral':   '#ef4444',

                // 🌈 COULEURS FOND CLAIR (badges, indicateurs mada-booking)
                'emerald-light': '#d1fae5',  // fond disponible (vert pâle)
                'coral-light':   '#fee2e2',  // fond indisponible (rouge pâle)
                'ocean-light':   '#cffafe',  // fond icône feature (cyan pâle)

                // 📝 COULEURS TEXTE (Applications par Type)
                'text-primary': '#0f172a',      // 🖤 NOUVEAU: brand-black
                'text-secondary': '#64748b',    // Slate-500
                'text-muted': '#94a3b8',        // Slate-400
                'text-accent': '#2563eb',       // Blue-600
                'text-hover': '#1d4ed8',        // Blue-700
                'text-dark': '#0f172a',         // 🖤 NOUVEAU: Texte noir premium
                'text-light': '#f8fafc',        // 🖤 NOUVEAU: Texte clair sur fond noir

                // 🛒 COULEURS MARKETPLACE (Alignées avec le thème Pixel Rise)
                'header': '#0f172a',            // Marketplace header = brand-black
                'grey': '#64748b',              // Marketplace grey text = slate-500
                'grey-medium': '#94a3b8',       // Marketplace medium grey = slate-400
                'grey-light': '#f8fafc',        // Marketplace light background = slate-50

                // 📦 COULEURS CONTAINERS
                'card-bg': 'rgba(255, 255, 255, 0.9)',
                'card-border': 'rgba(255, 255, 255, 0.5)',
                'glass-bg': 'rgba(255, 255, 255, 0.1)',
                'glass-border': 'rgba(255, 255, 255, 0.2)',
                'dark-bg': 'rgba(15, 23, 42, 0.9)',         // 🖤 NOUVEAU: Background noir
                'dark-border': 'rgba(15, 23, 42, 0.5)',     // 🖤 NOUVEAU: Border noir
            },
            
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },

            // 🔥 GRADIENTS SIGNATURE PIXELRISE (Avec intégration du noir)
            backgroundImage: {
                // Gradients CTA (Conversion)
                'gradient-cta': 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
                'gradient-cta-hover': 'linear-gradient(135deg, #d97706 0%, #ea580c 50%, #dc2626 100%)',
                
                // Gradient Business (Premium)
                'gradient-business': 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #4f46e5 100%)',
                
                // Gradient Success (Validation)
                'gradient-success': 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                
                // Gradient Dark (Premium sections)
                'gradient-dark': 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #7c3aed 100%)',
                
                // 🖤 NOUVEAUX GRADIENTS AVEC NOIR
                'gradient-black': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                'gradient-black-blue': 'linear-gradient(135deg, #0f172a 0%, #2563eb 50%, #7c3aed 100%)',
                'gradient-black-yellow': 'linear-gradient(135deg, #0f172a 0%, #f59e0b 50%, #f97316 100%)',
                'gradient-elegant': 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #64748b 100%)',
                
                // Gradients Background (Sections)
                'gradient-landing': 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 30%, #f3e8ff 100%)',
                'gradient-newsletter': 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #4f46e5 100%)',
                'gradient-cta-section': 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #7c3aed 100%)',

                // Gradients Supplémentaires Premium
                'gradient-hero': 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 30%, #f3e8ff 100%)',
                'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                
                // 🖤 GRADIENTS GLASS NOIR
                'gradient-glass-dark': 'linear-gradient(135deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.05) 100%)',
                'gradient-card-dark': 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.7) 100%)',
            },

            // 🎬 ANIMATIONS PREMIUM PRESERVÉES
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                'fade-out': {
                    '0%': { opacity: '1', transform: 'translateY(0)' },
                    '100%': { opacity: '0', transform: 'translateY(10px)' }
                },
                'scale-in': {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' }
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' }
                },
                'pulse-light': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' }
                },
                'slide-in-right': {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' }
                },
                // ✨ NOUVELLES ANIMATIONS PREMIUM
                'shine': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                },
                'bounce-light': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' }
                },
                'glow': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(37, 99, 235, 0.5)' },
                    '50%': { boxShadow: '0 0 20px rgba(37, 99, 235, 0.8)' }
                },
                // 🖤 NOUVELLES ANIMATIONS NOIR
                'glow-dark': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(15, 23, 42, 0.5)' },
                    '50%': { boxShadow: '0 0 20px rgba(15, 23, 42, 0.8)' }
                },
                'fade-dark': {
                    '0%': { backgroundColor: 'rgba(15, 23, 42, 0)' },
                    '100%': { backgroundColor: 'rgba(15, 23, 42, 0.1)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fade-in 0.8s ease-out',
                'scale-in': 'scale-in 0.6s ease-out',
                'float': 'float 6s ease-in-out infinite',
                'pulse-light': 'pulse-light 3s ease-in-out infinite',
                'slide-in-right': 'slide-in-right 0.8s ease-out',
                // Nouvelles animations premium
                'shine': 'shine 2s ease-in-out infinite',
                'bounce-light': 'bounce-light 2s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite',
                // 🖤 NOUVELLES ANIMATIONS NOIR
                'glow-dark': 'glow-dark 2s ease-in-out infinite',
                'fade-dark': 'fade-dark 0.8s ease-out',
            },

            // 🔍 FILTRES ET EFFETS PREMIUM
            backdropBlur: {
                'xs': '2px',
                'glass': '16px',
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                'premium': '0 20px 60px -12px rgba(37, 99, 235, 0.25)',
                'cta': '0 10px 40px -12px rgba(245, 158, 11, 0.4)',
                // 🖤 NOUVELLES OMBRES NOIR
                'dark': '0 8px 32px 0 rgba(15, 23, 42, 0.37)',
                'premium-dark': '0 20px 60px -12px rgba(15, 23, 42, 0.25)',
                'elegant': '0 10px 40px -12px rgba(15, 23, 42, 0.4)',
            }
        }
    },
    plugins: [animate, typography],
} satisfies Config;