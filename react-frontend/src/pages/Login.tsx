// src/pages/Login.tsx - VERSION CORRIGÉE AVEC REDIRECTION VERIFY EMAIL + THÈME PIXELRISE

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import PublicRoute from '@/components/PublicRoute';

// ✅ INTERFACES TYPESCRIPT STRICTES
interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

interface VerificationMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  show: boolean;
  context?: string;
  timestamp?: string;
}

interface EmailVerificationParams {
  verified: string | null;
  message: string | null;
  error: string | null;
  email: string | null;
  context: string | null;
  user_id: string | null;
  timestamp: string | null;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  
  // ✅ ÉTATS DU FORMULAIRE
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ ÉTATS POUR LES MESSAGES DE VÉRIFICATION EMAIL
  const [verificationMessage, setVerificationMessage] = useState<VerificationMessage>({
    type: 'info',
    title: '',
    message: '',
    show: false,
  });

  // ✅ EXTRACTION ET TRAITEMENT DES PARAMÈTRES URL DE VÉRIFICATION EMAIL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    
    const verificationParams: EmailVerificationParams = {
      verified: urlParams.get('verified'),
      message: urlParams.get('message'),
      error: urlParams.get('error'),
      email: urlParams.get('email'),
      context: urlParams.get('context'),
      user_id: urlParams.get('user_id'),
      timestamp: urlParams.get('timestamp'),
    };

    console.log('🔍 [Login] Paramètres URL reçus:', verificationParams);

    // ✅ PRÉ-REMPLIR L'EMAIL SI FOURNI
    if (verificationParams.email) {
      setFormData(prev => ({ 
        ...prev, 
        email: decodeURIComponent(verificationParams.email) 
      }));
      
      console.log('📧 [Login] Email pré-rempli:', verificationParams.email);
    }

    // ✅ GESTION MESSAGE DE SUCCÈS DE VÉRIFICATION
    if (verificationParams.verified === '1' && verificationParams.message) {
      const decodedMessage = decodeURIComponent(verificationParams.message);
      
      setVerificationMessage({
        type: 'success',
        title: 'Email vérifié avec succès !',
        message: decodedMessage,
        show: true,
        context: verificationParams.context || 'unknown',
        timestamp: verificationParams.timestamp || undefined,
      });

      // ✅ TOAST DE SUCCÈS AVEC CONTEXTE
      const contextMessage = verificationParams.context === 'newly_verified' 
        ? 'Félicitations ! Votre email a été vérifié. Vous pouvez maintenant vous connecter.'
        : 'Votre email est vérifié. Vous pouvez vous connecter.';
      
      toast.success('✅ Email vérifié !', {
        description: contextMessage,
        duration: 6000,
        action: {
          label: "Connectez-vous",
          onClick: () => {
            const emailInput = document.getElementById('email') as HTMLInputElement;
            const passwordInput = document.getElementById('password') as HTMLInputElement;
            if (emailInput) emailInput.focus();
            else if (passwordInput) passwordInput.focus();
          },
        },
      });

      console.log('✅ [Login] Message de succès affiché:', {
        context: verificationParams.context,
        message: decodedMessage,
      });
    }

    // ✅ GESTION MESSAGE D'ERREUR DE VÉRIFICATION
    else if (verificationParams.verified === '0' && verificationParams.error) {
      const decodedError = decodeURIComponent(verificationParams.error);
      
      setVerificationMessage({
        type: 'error',
        title: 'Erreur de vérification email',
        message: decodedError,
        show: true,
        context: 'verification_failed',
        timestamp: verificationParams.timestamp || undefined,
      });

      // ✅ TOAST D'ERREUR AVEC ACTION DE RENVOI
      toast.error('❌ Erreur de vérification', {
        description: decodedError,
        duration: 8000,
        action: {
          label: "Renvoyer email",
          onClick: () => navigate('/verify-email', { 
            state: { 
              email: verificationParams.email,
              fromError: true,
              originalError: decodedError,
            }
          }),
        },
      });

      console.log('❌ [Login] Message d\'erreur affiché:', decodedError);
    }

    // ✅ GESTION MESSAGE D'INFORMATION GÉNÉRAL
    else if (!verificationParams.verified && !verificationParams.error && verificationParams.message) {
      const decodedMessage = decodeURIComponent(verificationParams.message);
      
      setVerificationMessage({
        type: 'info',
        title: 'Information',
        message: decodedMessage,
        show: true,
      });

      console.log('ℹ️ [Login] Message d\'information affiché:', decodedMessage);
    }

    // ✅ NETTOYER L'URL APRÈS TRAITEMENT DES PARAMÈTRES
    if (Object.values(verificationParams).some(value => value !== null)) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      console.log('🧹 [Login] URL nettoyée après traitement des paramètres');
    }

  }, [location.search, navigate]);

  // ✅ GESTION SOUMISSION FORMULAIRE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || loading) return;

    // Validation côté client
    if (!formData.email || !formData.password) {
      toast.error('Erreur de validation', {
        description: 'Veuillez remplir tous les champs.',
        duration: 4000,
        dismissible: true,
        id: `validation-error-${Date.now()}`,
      });
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email invalide', {
        description: 'Veuillez saisir une adresse email valide.',
        duration: 4000,
        dismissible: true,
        id: `email-validation-error-${Date.now()}`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔐 [Login] Tentative de connexion pour:', formData.email);

      // ✅ TOAST DE CHARGEMENT CORRIGÉ
      const loadingToastId = toast.loading('🔐 Connexion en cours...', {
        description: 'Vérification de vos identifiants',
        dismissible: false, // Pas de fermeture pendant le chargement
        id: `login-loading-${Date.now()}`,
      });

      // ✅ APPEL À L'API DE CONNEXION
      const user = await login(formData.email, formData.password, formData.remember);

      console.log('✅ [Login] Connexion réussie pour:', user.name);
      console.log('🔍 [Login] Rôle utilisateur:', user.role);

      // ✅ TOAST DE SUCCÈS CORRIGÉ
      toast.success('✅ Connexion réussie !', {
        description: `Bienvenue ${user.name}`,
        id: loadingToastId, // Remplace le toast de chargement
        duration: 3000,
        dismissible: true,
      });

      // ✅ REDIRECTION BASÉE SUR LE RÔLE (super admin > workspace admin > member > default)
      let redirectPath = '/workspace'; // Par défaut : propriétaire / admin workspace

      if (user.role === 'admin') {
        // Super admin de la plateforme
        redirectPath = '/admin/dashboard';
        toast.info('👑 Mode Admin', {
          description: 'Redirection vers le dashboard administrateur',
          duration: 4000,
        });
      } else if (user.workspace_role === 'member' && user.workspace_site_id) {
        // Membre avec un site attribué → accès direct au site uniquement
        redirectPath = `/dashboard/site/${user.workspace_site_id}`;
      }
      // workspace_role === 'admin' → /workspace (déjà par défaut)
      // workspace_role === null (propriétaire) → /workspace (déjà par défaut)

      // ✅ REDIRECTION AVEC STATE
      navigate(redirectPath, { 
        replace: true,
        state: {
          fromLogin: true,
          loginSuccess: true,
          user: user,
          userRole: user.role,
        }
      });

    } catch (error: any) {
      console.error('❌ [Login] Erreur de connexion:', error);

      let errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      let actionButton: { label: string; onClick: () => void } | undefined;

      // ✅ GESTION D'ERREURS GRANULAIRE
      if (error.response?.status === 422) {
        errorMessage = 'Email ou mot de passe incorrect.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes.';
      } else if (error.response?.status === 403) {
        // ✅ NOUVEAU: Vérifier si c'est un problème d'email non vérifié
        const responseData = error.response?.data;
        
        if (responseData?.email_verified === false) {
          console.log('📧 [Login] Email non vérifié - Redirection vers VerifyEmail');
          
          // ✅ REDIRECTION IMMÉDIATE VERS VERIFY EMAIL
          navigate('/verify-email', {
            state: {
              email: formData.email,
              fromLoginError: true,
              projectName: null,
              originalError: responseData?.message || 'Email non vérifié',
            },
            replace: true,
          });

          // ✅ TOAST D'INFORMATION
          toast.info('📧 Email non vérifié', {
            description: 'Vous allez être redirigé vers la page de vérification email.',
            duration: 4000,
          });

          return; // ✅ SORTIR ICI POUR ÉVITER LE TOAST D'ERREUR
        }

        // ✅ AUTRES ERREURS 403 (suspension, etc.)
        errorMessage = responseData?.message || 'Votre compte est temporairement suspendu.';
        actionButton = {
          label: "Contacter support",
          onClick: () => navigate('/contact'),
        };
      } else if (error.response?.status === 404) {
        errorMessage = 'Aucun compte associé à cette adresse email.';
        actionButton = {
          label: "Créer un compte",
          onClick: () => navigate('/register'),
        };
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        
        // ✅ DÉTECTION SUPPLÉMENTAIRE EMAIL NON VÉRIFIÉ
        if (errorMessage.includes('email') && errorMessage.includes('vérifi')) {
          console.log('📧 [Login] Email non vérifié détecté dans message - Redirection');
          
          navigate('/verify-email', {
            state: {
              email: formData.email,
              fromLoginError: true,
              projectName: null,
              originalError: errorMessage,
            },
            replace: true,
          });

          toast.info('📧 Vérification email requise', {
            description: 'Redirection vers la page de vérification...',
            duration: 4000,
          });

          return; // ✅ SORTIR ICI
        }
      }

      // ✅ TOAST D'ERREUR CORRIGÉ AVEC ACTIONS (seulement si pas de redirection)
      toast.error('❌ Erreur de connexion', {
        description: errorMessage,
        duration: 8000, // Durée légèrement augmentée
        dismissible: true, // ✅ Garantir que le toast peut être fermé
        action: actionButton,
        // ✅ IMPORTANT : Forcer la mise à jour du DOM
        id: `login-error-${Date.now()}`,
      });

    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ GESTION CHANGEMENTS FORMULAIRE
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // ✅ FERMER MESSAGE DE VÉRIFICATION
  const dismissVerificationMessage = (): void => {
    setVerificationMessage(prev => ({ ...prev, show: false }));
  };

  return (
    <PublicRoute>
      <SEOHead
        title="Connexion | PixelRise"
        description="Connectez-vous à votre compte PixelRise pour accéder à votre dashboard et gérer vos projets."
        keywords="connexion, login, PixelRise, dashboard, compte utilisateur"
        canonicalUrl="https://pixelrise.com/login"
      />

      {/* ✅ ARRIÈRE-PLAN PREMIUM PIXELRISE */}
      <div className="min-h-screen bg-gradient-landing flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* ✅ ALERT DE VÉRIFICATION EMAIL AMÉLIORÉE */}
          {verificationMessage.show && (
            <div className="mb-6">
              <Alert
                className={`border-l-4 relative shadow-premium ${
                  verificationMessage.type === "success"
                    ? "border-l-green-500 bg-green-50 text-green-800"
                    : verificationMessage.type === "error"
                    ? "border-l-red-500 bg-red-50 text-red-800"
                    : "border-l-brand-blue bg-blue-50 text-blue-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {verificationMessage.type === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : verificationMessage.type === "error" ? (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Mail className="h-5 w-5 text-brand-blue mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">
                        {verificationMessage.title}
                      </h4>
                      <AlertDescription className="text-sm">
                        {verificationMessage.message}
                      </AlertDescription>
                      {verificationMessage.context === "newly_verified" && (
                        <p className="text-xs mt-2 opacity-75">
                          🎉 Votre compte est maintenant actif !
                        </p>
                      )}
                      {verificationMessage.timestamp && (
                        <p className="text-xs mt-1 opacity-60">
                          {new Date(
                            verificationMessage.timestamp
                          ).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={dismissVerificationMessage}
                    className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                    aria-label="Fermer le message"
                  >
                    ×
                  </button>
                </div>
              </Alert>
            </div>
          )}

          {/* ✅ CARTE DE CONNEXION THÈME PIXELRISE */}
          <Card className="bg-gradient-card backdrop-blur-glass shadow-premium border-card-border">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-business rounded-lg transform rotate-12 flex items-center justify-center shadow-premium">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-text-primary">
                Connexion
              </CardTitle>
              <CardDescription className="text-text-secondary">
                Connectez-vous à votre compte PixelRise
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ✅ CHAMP EMAIL */}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-text-primary font-medium"
                  >
                    Adresse email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 bg-white/90 border-slate-200 focus:border-brand-blue focus:ring-brand-blue transition-colors"
                      placeholder="votre@email.com"
                      required
                      disabled={isSubmitting || loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* ✅ CHAMP MOT DE PASSE */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-text-primary font-medium"
                  >
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 pr-10 bg-white/90 border-slate-200 focus:border-brand-blue focus:ring-brand-blue transition-colors"
                      placeholder="••••••••"
                      required
                      disabled={isSubmitting || loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted hover:text-text-secondary transition-colors"
                      disabled={isSubmitting || loading}
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ✅ OPTIONS */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      id="remember"
                      name="remember"
                      type="checkbox"
                      checked={formData.remember}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-slate-300 rounded"
                      disabled={isSubmitting || loading}
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm text-text-secondary"
                    >
                      Se souvenir de moi
                    </Label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-text-accent hover:text-text-hover font-medium transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                {/* ✅ BOUTON CONNEXION THÈME PIXELRISE */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-business hover:bg-gradient-business text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-cta hover:shadow-premium"
                  disabled={isSubmitting || loading}
                  size="lg"
                >
                  {isSubmitting || loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connexion...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Se connecter
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </div>
                  )}
                </Button>
              </form>

              {/* ✅ LIENS SUPPLÉMENTAIRES */}
              <div className="mt-6 text-center space-y-4">
                <div className="text-sm text-text-secondary">
                  Pas encore de compte ?{" "}
                  <Link
                    to="/register"
                    className="text-text-accent hover:text-text-hover font-medium transition-colors"
                  >
                    Créer un compte
                  </Link>
                </div>

                {/* ✅ LIEN RENVOI EMAIL SI ERREUR DE VÉRIFICATION */}
                {verificationMessage.show &&
                  verificationMessage.type === "error" && (
                    <div className="text-sm">
                      <Link
                        to="/verify-email"
                        state={{
                          email: formData.email,
                          fromError: true,
                          originalError: verificationMessage.message,
                        }}
                        className="text-text-accent hover:text-text-hover font-medium flex items-center justify-center space-x-1 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Renvoyer l'email de vérification</span>
                      </Link>
                    </div>
                  )}

                {/* ✅ SUPPORT */}
                <div className="text-xs text-text-muted">
                  Besoin d'aide ?{" "}
                  <Link
                    to="/contact"
                    className="text-text-accent hover:text-text-hover transition-colors"
                  >
                    Contactez le support
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ✅ INFORMATIONS SÉCURITÉ */}
          <div className="mt-6 text-center">
            <p className="text-xs text-text-muted">
              🔒 Connexion sécurisée avec chiffrement SSL
            </p>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
};

export default Login;