
import { 
  Heart,
} from "lucide-react";
import { Link } from "react-router-dom";

const FooterDashboard = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-400">
      {/* Main Footer Content */}
      <div className="">
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



export default FooterDashboard;