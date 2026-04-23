import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: "/studio-domaine", label: "Accueil" },
    { href: "/studio-domaine/search", label: "Domaines" },
    { href: "/studio-domaine/request", label: "Demande" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/studio-domaine" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-hero">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              Studio Domaine
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/studio-domaine/dashboard">
              <Button variant="ghost" size="sm">
                Mon espace
              </Button>
            </Link>
            <Link to="/studio-domaine/search">
              <Button variant="default" size="sm">
                Vérifier un domaine
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                <Link to="/studio-domaine/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Mon espace
                  </Button>
                </Link>
                <Link to="/studio-domaine/search" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" className="w-full">
                    Vérifier un domaine
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
