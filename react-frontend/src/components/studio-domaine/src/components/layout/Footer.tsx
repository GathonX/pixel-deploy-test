import { Link } from "react-router-dom";
import { Globe, Mail, Shield, FileText } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent">
                <Globe className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="font-display font-bold text-xl">Studio Domaine</span>
            </div>
            <p className="text-primary-foreground/70 text-sm">
              Votre partenaire de confiance pour les noms de domaine.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/studio-domaine/search" className="hover:text-primary-foreground transition-colors">
                  Recherche de domaines
                </Link>
              </li>
              <li>
                <Link to="/studio-domaine/request" className="hover:text-primary-foreground transition-colors">
                  Demande de domaine
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="font-display font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/studio-domaine/terms" className="hover:text-primary-foreground transition-colors flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Conditions générales
                </Link>
              </li>
              <li>
                <Link to="/studio-domaine/refund" className="hover:text-primary-foreground transition-colors flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Politique de remboursement
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <a
                href="mailto:contact@pixel-rise.com"
                className="flex items-center gap-2 hover:text-primary-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                contact@pixel-rise.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/60">
              © 2024 Studio Domaine. Tous droits réservés.
            </p>
            <div className="flex items-center gap-2 text-xs text-primary-foreground/50 bg-primary-foreground/10 px-4 py-2 rounded-full">
              <Shield className="h-3 w-3" />
              <span>Aucun domaine n'est activé sans validation manuelle.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
