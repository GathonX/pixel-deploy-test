import React, { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  X,
  Bell,
  User,
  Settings,
  LayoutDashboard,
  FileText,
  UserPlus,
  LogIn,
  Shield,
  Home,
  Newspaper,
  Info,
  Mail,
  HelpCircle,
  CreditCard,
  Calendar,
  BarChart3,
  Briefcase,
  Sparkles,
  Zap,
  ChevronDown,
  Star,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import LogoutConfirmButton from "@/components/auth/LogoutConfirmButton";
import NotificationBell from "./ui/notification-bell";
import ExpirationDropdown from "./ui/expiration-dropdown";

// ✅ INTERFACES TYPESCRIPT STRICTES
interface NavigationItem {
  readonly label: string;
  readonly href: string;
  readonly icon?: React.ReactNode;
  readonly requireAuth?: boolean;
  readonly publicOnly?: boolean;
  readonly adminOnly?: boolean;
  readonly description?: string;
  readonly badge?: string;
  readonly isNew?: boolean;
  readonly isPopular?: boolean;
}

interface NavbarProps {
  className?: string;
  variant?: "default" | "transparent" | "solid" | "premium";
  showSearch?: boolean;
  sticky?: boolean;
  showSidebarTrigger?: boolean;
}

// ✅ NAVIGATION OPTIMISÉE POUR CONVERSION
const PUBLIC_NAVIGATION: NavigationItem[] = [
  {
    label: "Blog",
    href: "/blog",

    description: "Decouvrez tout les publications des utilisateurs",
  },
  {
    label: "Fonctionnalités",
    href: "/#features",

    description: "Découvrez nos outils IA",
    isPopular: true,
  },
  {
    label: "Comment ça marche",
    href: "/how-it-works",

    description: "Guide en 3 étapes simples",
  },

  {
    label: "Tarifs",
    href: "/pricing",

    description: "Plans adaptés à votre business",
    badge: "GRATUIT",
  },

  {
    label: "Contact",
    href: "/contact",
    description: "Contactez nous rapidement",
  },
  {
    label: "About",
    href: "/about",

    description: "En savoir plus sur nous",
  },
];

const USER_NAVIGATION: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/workspace",

    requireAuth: true,
    description: "Tableau de bord IA",
  },
  {
    label: "Mes Contenus",
    href: "/user-blogs",

    requireAuth: true,
    description: "Contenus générés par IA",
  },
  {
    label: "Calendrier",
    href: "/calendar",

    requireAuth: true,
    description: "Planning automatisé",
  },
  {
    label: "Projets",
    href: "/projects",

    requireAuth: true,
    description: "Vos business projets",
    isNew: true,
  },
  {
    label: "Analytics",
    href: "/analytics",

    requireAuth: true,
    description: "Performance & ROI",
  },
];

const ADMIN_NAVIGATION: NavigationItem[] = [
  {
    label: "Admin Panel",
    href: "/admin",
    icon: <Shield size={18} />,
    adminOnly: true,
    description: "Administration avancée",
  },
];

const Navbar: React.FC<NavbarProps> = ({
  className,
  variant = "premium",
  showSearch = false,
  sticky = true,
  showSidebarTrigger = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, getAvatarUrl } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ✅ DÉTECTION ROUTES DASHBOARD
  const isDashboardRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/user-") ||
    location.pathname.startsWith("/calendar") ||
    location.pathname.startsWith("/analytics") ||
    location.pathname.startsWith("/payment") ||
    location.pathname.startsWith("/subscription");

  const shouldShowSidebarTrigger =
    showSidebarTrigger && isDashboardRoute && isAuthenticated;

  // ✅ SYNCHRONISATION : Utiliser getAvatarUrl du contexte
  const avatarUrl = getAvatarUrl(user?.avatar);

  // ✅ GESTION DU SCROLL AVEC EFFET GLASSMORPHISM
  useEffect(() => {
    if (!sticky) return;

    const handleScroll = (): void => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sticky]);

  // ✅ FERMETURE AUTO MENU MOBILE
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // ✅ NAVIGATION DYNAMIQUE SELON STATUT UTILISATEUR
  const navigationItems = useMemo(() => {
    let items = [...PUBLIC_NAVIGATION];

    if (isAuthenticated) {
      items = [...items, ...USER_NAVIGATION];

      if (user?.role === "admin") {
        items = [...items, ...ADMIN_NAVIGATION];
      }
    }

    return items.filter((item) => {
      if (item.requireAuth && !isAuthenticated) return false;
      if (item.publicOnly && isAuthenticated) return false;
      if (item.adminOnly && user?.role !== "admin") return false;
      return true;
    });
  }, [isAuthenticated, user?.role]);

  // ✅ GESTION LIENS ACTIFS OPTIMISÉE
  const isActiveLink = useCallback(
    (href: string): boolean => {
      if (href === "/") return location.pathname === "/";
      if (href.startsWith("/#"))
        return location.pathname === "/" && location.hash === href.substring(1);
      return location.pathname.startsWith(href);
    },
    [location.pathname, location.hash]
  );

  // ✅ CALLBACKS MENU MOBILE
  const closeMobileMenu = useCallback((): void => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback((): void => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // ✅ STYLES PREMIUM DYNAMIQUES
  const navbarClasses = cn(
    "w-full transition-all duration-300 z-50",
    sticky && "sticky top-0",
    variant === "premium" && [
      "bg-white/80 backdrop-blur-md border-b border-white/20",
      isScrolled && "bg-white/95 shadow-lg shadow-black/5 border-slate-200/50",
    ],
    variant === "transparent" && "bg-transparent border-transparent",
    variant === "solid" && "bg-white border-slate-200",
    variant === "default" && "bg-background/95 backdrop-blur border-border",
    className
  );

  // ✅ HANDLER SCROLL VERS SECTIONS
  const handleSectionScroll = (href: string) => {
    if (href.startsWith("/#")) {
      const element = document.querySelector(href.substring(2));
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <nav className={navbarClasses}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* ✅ SECTION GAUCHE: Logo Premium */}
          <div className="flex items-center gap-4">
            {shouldShowSidebarTrigger && <SidebarTrigger className="h-9 w-9" />}

            {/* Logo Premium avec animation */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <span className="text-white font-bold text-lg">P</span>
                  {/* Effet de brillance */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                {/* Indicator IA Active */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>

              <div className="hidden md:block">
                <h1 className="font-bold text-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                  Pixel<span className="text-blue-600">Rise</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  IA MARKETING AUTOMATION
                </p>
              </div>
            </Link>
          </div>

          {/* ✅ NAVIGATION DESKTOP PREMIUM */}
          <div className="hidden lg:flex items-center space-x-2">
            {navigationItems.slice(0, 6).map((item) => (
              <div key={item.href} className="relative group">
                {item.href.startsWith("/#") ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "relative h-11 px-4 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600",
                      isActiveLink(item.href) && "bg-blue-100 text-blue-600"
                    )}
                    onClick={() => handleSectionScroll(item.href)}
                  >
                    {item.icon}
                    <span className="ml-2 font-medium">{item.label}</span>

                    {/* Badges et indicateurs */}
                    {item.badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded-full font-bold animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {item.isNew && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full font-bold">
                        NEW
                      </span>
                    )}
                    {item.isPopular && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-500 text-white rounded-full font-bold">
                        HOT
                      </span>
                    )}
                  </Button>
                ) : (
                  <Link to={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "relative h-11 px-4 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600",
                        isActiveLink(item.href) && "bg-blue-100 text-blue-600"
                      )}
                    >
                      {item.icon}
                      <span className="ml-2 font-medium">{item.label}</span>

                      {/* Badges et indicateurs */}
                      {item.badge && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded-full font-bold animate-pulse">
                          {item.badge}
                        </span>
                      )}
                      {item.isNew && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full font-bold">
                          NEW
                        </span>
                      )}
                      {item.isPopular && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-500 text-white rounded-full font-bold">
                          HOT
                        </span>
                      )}
                    </Button>
                  </Link>
                )}

                {/* Tooltip Premium */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.description}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-800"></div>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ SECTION DROITE: CTA & UTILISATEUR */}
          <div className="flex items-center gap-3">
            {/* ✅ NOUVEAU: Notifications + Expirations Premium */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-2">
                <NotificationBell
                  className="h-11 w-11"
                  showBadge={true}
                  maxDisplayed={8}
                  compact={false}
                />
                <ExpirationDropdown className="h-11 w-11" />
              </div>
            )}

            {/* Menu Utilisateur Desktop Premium */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center gap-3 h-11 px-3 hover:bg-blue-50"
                  >
                    <Avatar className="w-9 h-9 ring-2 ring-blue-200">
                      <AvatarImage
                        src={avatarUrl}
                        alt={user?.name || "Avatar"}
                        className="w-9 h-9 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getAvatarUrl();
                        }}
                      />
                      <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-sm">{user?.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        {user?.role} • {user?.isPremium ? 'Premium' : 'Gratuit'}
                      </p>
                    </div>
                    <ChevronDown size={16} className="text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-3 p-2">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={avatarUrl} alt={user?.name || "Avatar"} />
                        <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
                            {user?.role}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user?.isPremium
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user?.isPremium ? 'Premium' : 'Gratuit'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link
                      to="/workspace"
                      className="flex items-center gap-3 p-3 rounded-lg"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Dashboard</p>
                        <p className="text-xs text-muted-foreground">
                          Tableau de bord IA
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 p-3 rounded-lg"
                    >
                      <User className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Mon Profil</p>
                        <p className="text-xs text-muted-foreground">
                          Informations personnelles
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/features"
                      className="flex items-center gap-3 p-3 rounded-lg"
                    >
                      <CreditCard className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Mes fontionnalités</p>
                        <p className="text-xs text-muted-foreground">
                          Gérer votre fonctionnalité
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <LogoutConfirmButton
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 p-3 rounded-lg"
                      redirectTo="/"
                    />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // ✅ CTA PREMIUM POUR VISITEURS
              <div className="hidden md:flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="h-11 px-4">
                    <LogIn size={16} className="mr-2" />
                    Connexion
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="h-11 px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                    <Zap size={16} className="mr-2" />
                    Démarrer GRATUIT
                  </Button>
                </Link>
              </div>
            )}

            {/* ✅ MENU MOBILE PREMIUM */}
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 w-11"
                    onClick={toggleMobileMenu}
                  >
                    {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-80 p-0">
                  <SheetHeader className="p-6 border-b">
                    <SheetTitle className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">P</span>
                      </div>
                      <div>
                        <p className="font-bold">PixelRise</p>
                        <p className="text-xs text-muted-foreground font-normal">
                          IA Marketing Automation
                        </p>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="flex flex-col h-full">
                    {/* Profile utilisateur connecté */}
                    {isAuthenticated && user && (
                      <div className="p-6 border-b">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                          <Avatar className="w-14 h-14 ring-2 ring-blue-200">
                            <AvatarImage src={avatarUrl} alt={user.name} />
                            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{user.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {user.email}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium capitalize">
                                {user.role}
                              </span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                Premium
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation mobile */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                          Navigation
                        </h4>
                        {navigationItems.map((item) => (
                          <div key={item.href}>
                            {item.href.startsWith("/#") ? (
                              <button
                                onClick={() => {
                                  handleSectionScroll(item.href);
                                  closeMobileMenu();
                                }}
                                className={cn(
                                  "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
                                  isActiveLink(item.href)
                                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                                    : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                  {item.icon}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {item.label}
                                    </span>
                                    {item.badge && (
                                      <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full font-bold">
                                        {item.badge}
                                      </span>
                                    )}
                                    {item.isNew && (
                                      <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full font-bold">
                                        NEW
                                      </span>
                                    )}
                                    {item.isPopular && (
                                      <span className="px-2 py-0.5 text-xs bg-purple-500 text-white rounded-full font-bold">
                                        HOT
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ) : (
                              <Link
                                to={item.href}
                                onClick={closeMobileMenu}
                                className={cn(
                                  "flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
                                  isActiveLink(item.href)
                                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                                    : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                  {item.icon}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {item.label}
                                    </span>
                                    {item.badge && (
                                      <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full font-bold">
                                        {item.badge}
                                      </span>
                                    )}
                                    {item.isNew && (
                                      <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full font-bold">
                                        NEW
                                      </span>
                                    )}
                                    {item.isPopular && (
                                      <span className="px-2 py-0.5 text-xs bg-purple-500 text-white rounded-full font-bold">
                                        HOT
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions utilisateur en bas */}
                    <div className="p-6 border-t bg-slate-50">
                      {isAuthenticated ? (
                        <div className="space-y-3">
                          <Link to="/profile" onClick={closeMobileMenu}>
                            <Button
                              variant="outline"
                              className="w-full justify-start h-12"
                            >
                              <User size={18} className="mr-3" />
                              Mon Profil
                            </Button>
                          </Link>
                          <LogoutConfirmButton
                            variant="destructive"
                            className="w-full h-12"
                            redirectTo="/"
                            onClose={closeMobileMenu}
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Link to="/login" onClick={closeMobileMenu}>
                            <Button
                              variant="outline"
                              className="w-full justify-start h-12"
                            >
                              <LogIn size={18} className="mr-3" />
                              Connexion
                            </Button>
                          </Link>
                          <Link to="/register" onClick={closeMobileMenu}>
                            <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-bold">
                              <Zap size={18} className="mr-3" />
                              Démarrer GRATUIT
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
