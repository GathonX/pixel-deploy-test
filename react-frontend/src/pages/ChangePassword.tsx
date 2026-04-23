// src/pages/ChangePassword.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import type { AxiosError } from 'axios';
import SEOHead from '@/components/SEOHead';

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [newPassword, setNewPassword]         = useState('');
  const [showNew, setShowNew]                 = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isLoading, setIsLoading]             = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation côté client
    if (newPassword !== confirmPassword) {
      toast.error('Erreur de validation', {
        description: 'Les mots de passe ne correspondent pas.',
        duration: 4000,
      });
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Mot de passe trop court', {
        description: 'Le mot de passe doit contenir au moins 8 caractères.',
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);

    const loadingToastId = toast.loading('🔐 Mise à jour du mot de passe...', {
      description: 'Veuillez patienter',
      dismissible: false,
    });

    try {
      await api.put('/user/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      toast.success('✅ Mot de passe mis à jour !', {
        description: 'Votre mot de passe a bien été modifié.',
        id: loadingToastId,
        duration: 3000,
      });

      // Redirection vers le profil
      setTimeout(() => {
        navigate('/profile');
      }, 1500);

    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: any }>;

      let errorMessage = 'Impossible de changer le mot de passe.';

      if (axiosErr.response?.status === 422) {
        // Erreur de validation
        const errors = axiosErr.response?.data?.errors;
        if (errors?.current_password) {
          errorMessage = 'Le mot de passe actuel est incorrect.';
        } else if (errors?.password) {
          errorMessage = errors.password[0] || errorMessage;
        } else {
          errorMessage = axiosErr.response?.data?.message || errorMessage;
        }
      } else if (axiosErr.response?.data?.message) {
        errorMessage = axiosErr.response.data.message;
      }

      toast.error('❌ Erreur', {
        description: errorMessage,
        id: loadingToastId,
        duration: 6000,
        dismissible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Changer le mot de passe | PixelRise"
        description="Modifiez votre mot de passe pour sécuriser votre compte PixelRise."
        keywords="mot de passe, sécurité, compte, PixelRise"
        canonicalUrl="https://pixelrise.com/profile/change-password"
      />

      {/* ✅ ARRIÈRE-PLAN PREMIUM PIXELRISE (même que Login) */}
      <div className="min-h-screen bg-gradient-landing flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* ✅ BOUTON RETOUR */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center text-sm text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au profil
          </button>

          {/* ✅ CARTE THÈME PIXELRISE (même style que Login) */}
          <Card className="bg-gradient-card backdrop-blur-glass shadow-premium border-card-border">
            <CardHeader className="text-center pb-6">
              {/* ✅ LOGO PIXELRISE (même que Login) */}
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-business rounded-lg transform rotate-12 flex items-center justify-center shadow-premium">
                  <Lock className="text-white h-6 w-6" />
                </div>
              </div>

              <CardTitle className="text-2xl font-bold text-text-primary">
                Modifier le mot de passe
              </CardTitle>
              <CardDescription className="text-text-secondary">
                Sécurisez votre compte avec un nouveau mot de passe
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* ✅ MOT DE PASSE ACTUEL */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-text-primary font-medium">
                    Mot de passe actuel
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Lock className="h-5 w-5 text-text-muted" />
                    </div>
                    <Input
                      id="currentPassword"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Saisissez votre mot de passe actuel"
                      required
                      disabled={isLoading}
                      className="pl-10 pr-10 bg-input-bg border-input-border focus:border-brand-blue focus:ring-brand-blue/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Afficher / masquer mot de passe actuel"
                    >
                      {showCurrent ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ✅ NOUVEAU MOT DE PASSE */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-text-primary font-medium">
                    Nouveau mot de passe
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Lock className="h-5 w-5 text-text-muted" />
                    </div>
                    <Input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Saisissez votre nouveau mot de passe"
                      required
                      disabled={isLoading}
                      className="pl-10 pr-10 bg-input-bg border-input-border focus:border-brand-blue focus:ring-brand-blue/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Afficher / masquer nouveau mot de passe"
                    >
                      {showNew ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-text-muted">
                    Le mot de passe doit contenir au moins 8 caractères
                  </p>
                </div>

                {/* ✅ CONFIRMATION MOT DE PASSE */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-text-primary font-medium">
                    Confirmer le mot de passe
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Lock className="h-5 w-5 text-text-muted" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez votre nouveau mot de passe"
                      required
                      disabled={isLoading}
                      className="pl-10 pr-10 bg-input-bg border-input-border focus:border-brand-blue focus:ring-brand-blue/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Afficher / masquer confirmation"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ✅ BOUTON SUBMIT (même style que Login) */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-business hover:opacity-90 text-white font-semibold py-6 rounded-lg shadow-premium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Mise à jour en cours...
                    </>
                  ) : (
                    'Enregistrer le nouveau mot de passe'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;
