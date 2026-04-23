import React, { useState } from "react";
import { Menu, X, ChevronDown, LayoutDashboard, User, CreditCard, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import LogoutConfirmButton from "@/components/auth/LogoutConfirmButton";

const LandingNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, getAvatarUrl } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const avatarUrl = getAvatarUrl(user?.avatar);
  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <img
              src={`${import.meta.env.VITE_API_URL}/landing-assets/images/pixi-1.png`}
              alt="PixelRise Logo"
              className="h-12 sm:h-14 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <a
              href="https://pixel-rise.com/fonctionalite.html"
              className="text-sm text-gray-600 hover:text-[#0066cc] font-medium transition-colors"
            >
              Fonctionalité
            </a>
            <a
              href="https://pixel-rise.com/tarification.html"
              className="text-sm text-gray-600 hover:text-[#0066cc] font-medium transition-colors"
            >
              Tarification
            </a>
            <a
              href="https://pixel-rise.com/contact.html"
              className="text-sm text-gray-600 hover:text-[#0066cc] font-medium transition-colors"
            >
              Aide
            </a>
          </div>

          {/* Desktop Buttons / User Menu */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated && user ? (
              // Menu utilisateur connecté
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 h-11 px-3 hover:bg-blue-50"
                  >
                    <div className="w-9 h-9 ring-2 ring-blue-200 rounded-full overflow-hidden">
                      <img
                        src={avatarUrl}
                        alt={user.name || "Avatar"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User');
                        }}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <ChevronDown size={16} className="text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-3 p-2">
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <img
                          src={avatarUrl}
                          alt={user.name || "Avatar"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User');
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link
                      to="/workspace"
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Dashboard</p>
                        <p className="text-xs text-muted-foreground">
                          Tableau de bord
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/features"
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Mes fonctionnalités</p>
                        <p className="text-xs text-muted-foreground">
                          Gérer vos fonctionnalités
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Profil</p>
                        <p className="text-xs text-muted-foreground">
                          Informations personnelles
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
              // Boutons pour utilisateurs non connectés
              <>
                <a
                  href="/login"
                  className="px-5 py-2 text-sm bg-white text-gray-600 font-medium border border-gray-200 rounded-lg hover:text-[#0066cc] transition-colors"
                >
                  Se connecter
                </a>
                <a
                  href="/register"
                  className="px-5 py-2 text-sm bg-[#d6fa3d] text-black font-bold rounded-lg hover:bg-[#9cef17] transition-colors"
                >
                  Essayer gratuitement
                </a>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden p-2 text-gray-700 hover:text-[#0066cc] transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={toggleMenu}
          />

          {/* Menu Content */}
          <div className="fixed top-20 left-0 right-0 bg-white z-50 shadow-lg lg:hidden">
            <div className="px-4 py-6 space-y-3">
              {/* User Info Mobile (si connecté) */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={avatarUrl} alt={user.name || "Avatar"} />
                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-indigo-600 text-white font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}

              <a
                href="https://pixel-rise.com/fonctionalite.html"
                className="block py-2.5 text-sm text-gray-600 hover:text-[#0066cc] font-medium transition-colors border-b border-gray-100"
                onClick={toggleMenu}
              >
                Fonctionalité
              </a>
              <a
                href="https://pixel-rise.com/tarification.html"
                className="block py-2.5 text-sm text-gray-600 hover:text-[#0066cc] font-medium transition-colors border-b border-gray-100"
                onClick={toggleMenu}
              >
                Tarification
              </a>
              <a
                href="https://pixel-rise.com/contact.html"
                className="block py-2.5 text-sm text-gray-600 hover:text-[#0066cc] font-medium transition-colors border-b border-gray-100"
                onClick={toggleMenu}
              >
                Aide
              </a>

              {isAuthenticated && user ? (
                // Menu mobile pour utilisateur connecté
                <div className="pt-3 space-y-2.5 border-t border-gray-200">
                  <Link
                    to="/workspace"
                    className="flex items-center gap-3 py-2.5 px-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#0066cc] font-medium rounded-lg transition-colors"
                    onClick={toggleMenu}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link
                    to="/features"
                    className="flex items-center gap-3 py-2.5 px-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#0066cc] font-medium rounded-lg transition-colors"
                    onClick={toggleMenu}
                  >
                    <CreditCard className="w-4 h-4" />
                    Mes fonctionnalités
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 py-2.5 px-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#0066cc] font-medium rounded-lg transition-colors"
                    onClick={toggleMenu}
                  >
                    <User className="w-4 h-4" />
                    Profil
                  </Link>
                  <div className="pt-2">
                    <LogoutConfirmButton
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 px-3 rounded-lg"
                      redirectTo="/"
                    />
                  </div>
                </div>
              ) : (
                // Boutons mobile pour utilisateur non connecté
                <div className="pt-3 space-y-2.5">
                  <a
                    href="/login"
                    className="block w-full py-2.5 text-sm text-center bg-white text-gray-600 font-medium border border-gray-200 rounded-lg hover:text-[#0066cc] transition-colors"
                    onClick={toggleMenu}
                  >
                    Se connecter
                  </a>
                  <a
                    href="/register"
                    className="block w-full py-2.5 text-sm text-center bg-[#d6fa3d] text-black font-bold rounded-lg hover:bg-[#9cef17] transition-colors"
                    onClick={toggleMenu}
                  >
                    Essayer gratuitement
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default LandingNavbar;
