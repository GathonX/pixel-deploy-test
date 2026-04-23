// src/pages/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import plain from '@/services/plain';
import SEOHead from '@/components/SEOHead';
import PublicRoute from '@/components/PublicRoute';
import type { AxiosError } from 'axios';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Email invalide', {
        description: 'Veuillez saisir une adresse email valide.',
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // CSRF pour Sanctum
      await plain.get('/sanctum/csrf-cookie');

      // Toast de chargement
      const loadingToastId = toast.loading('📧 Envoi en cours...', {
        description: 'Envoi du lien de réinitialisation',
      });

      // Envoi de la requête
      const { data } = await api.post<{ status: string }>('/forgot-password', { email });

      toast.success('✅ Email envoyé !', {
        description: data.status || 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe.',
        id: loadingToastId,
        duration: 6000,
      });

      // Redirection après 2 secondes
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error: unknown) {
      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';

      if ((error as AxiosError).isAxiosError) {
        const axiosErr = error as AxiosError<{
          message?: string;
          errors?: Record<string, string[]>;
        }>;

        errorMessage =
          axiosErr.response?.data?.errors?.email?.[0] ??
          axiosErr.response?.data?.message ??
          axiosErr.message;
      }

      toast.error('❌ Erreur', {
        description: errorMessage,
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicRoute>
      <SEOHead
        title="Mot de passe oublié | PixelRise"
        description="Réinitialisez votre mot de passe PixelRise en toute sécurité."
        keywords="mot de passe oublié, réinitialisation, récupération compte, PixelRise"
        canonicalUrl="https://pixelrise.com/forgot-password"
      />

      {/* ✅ ARRIÈRE-PLAN PREMIUM PIXELRISE */}
      <div className="min-h-screen bg-gradient-landing flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* ✅ CARTE THÈME PIXELRISE */}
          <Card className="bg-gradient-card backdrop-blur-glass shadow-premium border-card-border">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-business rounded-lg transform rotate-12 flex items-center justify-center shadow-premium">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-text-primary">
                Mot de passe oublié ?
              </CardTitle>
              <CardDescription className="text-text-secondary">
                Entrez votre adresse email pour recevoir un lien de réinitialisation
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
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-white/90 border-slate-200 focus:border-brand-blue focus:ring-brand-blue transition-colors"
                      placeholder="votre@email.com"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  <p className="text-xs text-text-muted">
                    Un lien de réinitialisation sera envoyé à cette adresse
                  </p>
                </div>

                {/* ✅ BOUTON ENVOYER THÈME PIXELRISE */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-business hover:bg-gradient-business text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-cta hover:shadow-premium"
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer le lien
                    </div>
                  )}
                </Button>
              </form>

              {/* ✅ LIENS SUPPLÉMENTAIRES */}
              <div className="mt-6 space-y-4">
                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-text-accent hover:text-text-hover font-medium inline-flex items-center space-x-1 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Retour à la connexion</span>
                  </Link>
                </div>

                <div className="text-center text-sm text-text-secondary">
                  Pas encore de compte ?{' '}
                  <Link
                    to="/register"
                    className="text-text-accent hover:text-text-hover font-medium transition-colors"
                  >
                    Créer un compte
                  </Link>
                </div>

                {/* ✅ SUPPORT */}
                <div className="text-center text-xs text-text-muted">
                  Besoin d'aide ?{' '}
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
              🔒 Réinitialisation sécurisée avec chiffrement SSL
            </p>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
};

export default ForgotPassword;
