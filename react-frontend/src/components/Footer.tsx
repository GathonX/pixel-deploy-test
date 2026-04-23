
import { Button } from "@/components/ui/button";
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 

  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Zap,
  Star,
  Award,
  Shield,
  Heart,
  Sparkles,
  Globe,
  CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-gray-300 relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "PixelRise",
          "url": "https://pixelrise.com",
          "logo": "https://pixelrise.com/logo.png",
          "description": "Plateforme d'automatisation marketing IA pour entrepreneurs",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "123 Avenue de l'Innovation",
            "addressLocality": "Paris",
            "postalCode": "75001",
            "addressCountry": "FR"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+33-1-23-45-67-89",
            "contactType": "customer service",
            "email": "support@pixelrise.com",
            "availableLanguage": "French"
          },
          "sameAs": [
            "https://facebook.com/pixelrise",
            "https://twitter.com/pixelrise",
            "https://linkedin.com/company/pixelrise",
            "https://instagram.com/pixelrise",
        
          ]
        })}
      </script>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-yellow-600/10 to-orange-600/10 rounded-full filter blur-3xl"></div>
      </div>

      {/* Main Footer Content */}
      <div className="relative z-10">
        
        {/* Newsletter CTA Section */}
        <div className="border-b border-slate-700/50">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-full px-4 py-2 text-sm font-medium text-blue-300 mb-6">
                <Sparkles size={16} />
                <span>Rejoignez 250,000+ Entrepreneurs</span>
              </div>
              
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Prêt à <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Transformer</span> votre Business ?
              </h3>
              
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Démarrez votre automatisation marketing IA aujourd'hui et rejoignez l'élite des entrepreneurs qui dominent leur marché.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/register">
                  <Button className="h-14 px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-full">
                    <Zap size={20} className="mr-2" />
                    Commencer Gratuitement
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                
                <Link to="/contact">
                  <Button variant="outline" className="h-14 px-8 border-2 border-slate-600 text-gray-300 hover:border-blue-500 hover:bg-blue-950/50 transition-all duration-300 rounded-full">
                    <Mail size={18} className="mr-2" />
                    Parler à un Expert
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Navigation */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            
            {/* Company Info - Enhanced */}
            <div className="lg:col-span-2">
              <div className="flex items-center mb-6">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">P</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
                </div>
                <div className="ml-3">
                  <span className="text-2xl font-bold text-white">PixelRise</span>
                  <p className="text-xs text-blue-400 font-medium">IA MARKETING AUTOMATION</p>
                </div>
              </div>
              
              <p className="text-gray-400 mb-6 leading-relaxed">
                <strong className="text-gray-200">PixelRise révolutionne</strong> l'automatisation marketing grâce à l'IA. 
                Nous aidons <em className="text-blue-400">250,000+ entrepreneurs</em> à développer leur business en ligne 
                <strong className="text-green-400"> automatiquement et intelligemment</strong>.
              </p>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm">
                  <Mail size={16} className="text-blue-400 mr-3" />
                  <a href="mailto:support@pixelrise.com" className="text-gray-300 hover:text-white transition-colors">
                    marketing@pixel-rise.com
                  </a>
                </div>
                <div className="flex items-center text-sm">
                  <Phone size={16} className="text-green-400 mr-3" />
                  <a href="tel:+33123456789" className="text-gray-300 hover:text-white transition-colors">
                    +261 32 87 392 35
                  </a>
                </div>
                <div className="flex items-center text-sm">
                  <MapPin size={16} className="text-purple-400 mr-3" />
                  <span className="text-gray-400">Rue Reine Tsiomeko la Baterie , hell ville, Nosy Be</span>
                </div>
              </div>

              {/* Enhanced Social Media */}
              <div className="space-y-4">
                <h4 className="text-white font-semibold text-sm">Suivez-nous</h4>
                <div className="flex space-x-3">
                  <SocialIcon 
                    icon={<Facebook size={18} />} 
                    href="https://facebook.com/pixelrise"
                    color="hover:bg-blue-600"
                    label="Facebook"
                  />
                  <SocialIcon 
                    icon={<Twitter size={18} />} 
                    href="https://twitter.com/pixelrise"
                    color="hover:bg-blue-400"
                    label="Twitter"
                  />
                  <SocialIcon 
                    icon={<Instagram size={18} />} 
                    href="https://instagram.com/pixelrise"
                    color="hover:bg-pink-600"
                    label="Instagram"
                  />
                  <SocialIcon 
                    icon={<Linkedin size={18} />} 
                    href="https://linkedin.com/company/pixelrise"
                    color="hover:bg-blue-700"
                    label="LinkedIn"
                  />
                 
                </div>
              </div>
            </div>
            
            {/* Product Links */}
            <div>
              <h3 className="text-white font-bold mb-6 flex items-center">
                <Zap size={18} className="mr-2 text-blue-400" />
                Produit
              </h3>
              <ul className="space-y-3">
                <FooterLink href="/#features">Fonctionnalités IA</FooterLink>
                <FooterLink href="/pricing">Plans & Tarifs</FooterLink>
                <FooterLink href="/integrations">Intégrations</FooterLink>
                <FooterLink href="/cas-usage">Cas d'Usage</FooterLink>
                <FooterLink href="/api-docs">Documentation API</FooterLink>
                <FooterLink href="/changelog">Nouveautés</FooterLink>
              </ul>
            </div>
            
            {/* Solutions Links */}
            <div>
              <h3 className="text-white font-bold mb-6 flex items-center">
                <Star size={18} className="mr-2 text-yellow-400" />
                Solutions
              </h3>
              <ul className="space-y-3">
                <FooterLink href="/entrepreneurs">Entrepreneurs</FooterLink>
                <FooterLink href="/startups">Startups</FooterLink>
                <FooterLink href="/agencies">Agences Marketing</FooterLink>
                <FooterLink href="/enterprise">Enterprise</FooterLink>
                <FooterLink href="/ecommerce">E-commerce</FooterLink>
                <FooterLink href="/consultants">Consultants</FooterLink>
              </ul>
            </div>
            
            {/* Company Links */}
            <div>
              <h3 className="text-white font-bold mb-6 flex items-center">
                <Award size={18} className="mr-2 text-purple-400" />
                Entreprise
              </h3>
              <ul className="space-y-3">
                <FooterLink href="/about">À Propos</FooterLink>
                <FooterLink href="/team">Notre Équipe</FooterLink>
                <FooterLink href="/blog">Blog & Actualités</FooterLink>
                <FooterLink href="/careers">Carrières</FooterLink>
                <FooterLink href="/press">Presse</FooterLink>
                <FooterLink href="/partners">Partenaires</FooterLink>
              </ul>
            </div>
            
            {/* Support Links */}
            <div>
              <h3 className="text-white font-bold mb-6 flex items-center">
                <Heart size={18} className="mr-2 text-red-400" />
                Support
              </h3>
              <ul className="space-y-3">
                <FooterLink href="/help">Centre d'Aide</FooterLink>
                <FooterLink href={import.meta.env.VITE_LANDING_URL_CONTACT || "/contact"}>Contact Support</FooterLink>
                <FooterLink href="/community">Communauté</FooterLink>
                <FooterLink href="/status">Status Système</FooterLink>
                <FooterLink href="/security">Sécurité</FooterLink>
                <FooterLink href="/training">Formation</FooterLink>
              </ul>
            </div>
          </div>
        </div>

        {/* Trust Indicators Section */}
        <div className="border-t border-slate-700/50">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center mb-2">
                  <Shield size={24} className="text-green-400" />
                </div>
                <p className="text-sm font-medium text-white">Sécurisé</p>
                <p className="text-xs text-gray-400">Certifié SOC2</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mb-2">
                  <Globe size={24} className="text-blue-400" />
                </div>
                <p className="text-sm font-medium text-white">Global</p>
                <p className="text-xs text-gray-400">50+ Pays</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mb-2">
                  <Award size={24} className="text-purple-400" />
                </div>
                <p className="text-sm font-medium text-white">Récompensé</p>
                <p className="text-xs text-gray-400">Top IA 2024</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 size={24} className="text-yellow-400" />
                </div>
                <p className="text-sm font-medium text-white">Fiable</p>
                <p className="text-xs text-gray-400">99.9% Uptime</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar - Enhanced */}
        <div className="border-t border-slate-700/50 bg-slate-800/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <p className="text-sm text-gray-400">
                  © {currentYear} <strong className="text-white">PixelRise</strong>. Tous droits réservés.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Made with</span>
                  <Heart size={12} className="text-red-500 animate-pulse" />
                  <span>in hell ville, Nosy Be, Madagascar</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-6">
                <Link to="/privacy">Politique de Confidentialité</Link>
                <Link to="/terms">Termes et Conditions</Link>
                <Link to="/cookies" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Cookies
                </Link>
                <Link to="/gdpr" className="text-sm text-gray-400 hover:text-white transition-colors">
                  RGPD
                </Link>
                <Link to="/login" className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

interface SocialIconProps {
  icon: React.ReactNode;
  href: string;
  color: string;
  label: string;
}

const SocialIcon = ({ icon, href, color, label }: SocialIconProps) => {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Suivez-nous sur ${label}`}
      className={`w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center ${color} transition-all duration-300 hover:scale-110 hover:shadow-lg group`}
    >
      <div className="group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </a>
  );
};

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

const FooterLink = ({ href, children, external = false }: FooterLinkProps) => {
  const isExternal = external || href.startsWith('http');
  
  if (isExternal) {
    return (
      <li>
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center group"
        >
          <span>{children}</span>
          <ArrowRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link 
        to={href} 
        className="text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center group"
      >
        <span>{children}</span>
        <ArrowRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    </li>
  );
};

export default Footer;