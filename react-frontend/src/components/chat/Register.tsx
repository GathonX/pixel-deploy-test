// src/components/chat/Register.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EyeIcon, EyeOffIcon, Loader2, AlertCircle, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import api from '@/services/api';
import plain from '@/services/plain';

export interface RegisterProps {
  onClose?: () => void;
  onComplete?: () => void;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
  };
  redirect_to: string;
  redirect_state?: {
    email: string;
    fromRegistration: boolean;
  };
  email_sent: boolean;
  project?: {
    id: number;
    name: string;
  } | null;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface ErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

const Register: React.FC<RegisterProps> = ({ onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const navigate = useNavigate();

  const extractErrorMessage = (error: AxiosError<ErrorResponse>): string => {
    if (error.code === 'ECONNABORTED') {
      return "La requête a pris trop de temps. Vérifiez votre connexion et réessayez.";
    }
    if (error.code === 'ERR_NETWORK') {
      return "Problème de connexion réseau. Vérifiez votre connexion internet.";
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField && errors[firstErrorField]?.[0]) {
        return errors[firstErrorField][0];
      }
    }
    const status = error.response?.status;
    switch (status) {
      case 422: return "Les données saisies ne sont pas valides.";
      case 409: return "Cette adresse email est déjà utilisée.";
      case 429: return "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
      case 500: return "Erreur serveur. Veuillez réessayer plus tard.";
      default: return "Une erreur est survenue lors de la création du compte.";
    }
  };

  const suggestUserAction = (status?: number): void => {
    switch (status) {
      case 409:
        toast.info("Email déjà utilisé", {
          description: "Ce compte existe déjà. Voulez-vous vous connecter ?",
          action: {
            label: "Se connecter",
            onClick: () => { onClose?.(); navigate('/login'); }
          },
          duration: 8000,
        });
        break;
      case 422:
        toast.warning("Vérifiez vos informations", {
          description: "Assurez-vous que l'email est valide et que le mot de passe fait au moins 6 caractères.",
          duration: 6000,
        });
        break;
      case 500:
        toast.error("Problème temporaire", {
          description: "Le serveur rencontre des difficultés. Réessayez dans quelques instants.",
          duration: 6000,
        });
        break;
    }
  };

  const handleExistingEmailGuidance = async (email: string): Promise<void> => {
    try {
      const checkResponse = await api.post('/auth/check-email-status', { email });
      const emailStatus = checkResponse.data;

      if (emailStatus.exists && !emailStatus.verified) {
        toast.info('Compte non vérifié', {
          description: "Cette adresse email a un compte qui n'est pas encore vérifié.",
          duration: 10000,
          action: {
            label: "Renvoyer l'email",
            onClick: async () => {
              try {
                const loadingToast = toast.loading('Envoi en cours...');
                await api.post('/auth/resend-verification-email', { email });
                toast.success('Email renvoyé !', {
                  description: "Un nouvel email de vérification vient d'être envoyé.",
                  id: loadingToast,
                  duration: 6000
                });
              } catch (e) {
                toast.error('Erreur de renvoi', {
                  description: 'Impossible de renvoyer l\'email. Contactez le support.',
                  duration: 6000
                });
              }
            }
          }
        });
        setTimeout(() => {
          toast.info('Ou essayez de vous connecter', {
            description: 'Vous pouvez aussi tenter de vous connecter directement.',
            action: {
              label: "Se connecter",
              onClick: () => {
                onClose?.();
                navigate('/login', { state: { email, fromRegister: true } });
              }
            },
            duration: 12000
          });
        }, 3000);
      } else if (emailStatus.exists && emailStatus.verified) {
        toast.success('Compte trouvé !', {
          description: 'Ce compte existe déjà et est vérifié. Connectez-vous !',
          duration: 8000,
          action: {
            label: "Se connecter",
            onClick: () => {
              onClose?.();
              navigate('/login', { state: { email, fromRegister: true } });
            }
          }
        });
      }
    } catch {
      toast.info('Email déjà utilisé', {
        description: 'Cette adresse email est déjà associée à un compte.',
        duration: 10000,
        action: {
          label: "Se connecter",
          onClick: () => {
            onClose?.();
            navigate('/login', { state: { email, fromRegister: true } });
          }
        }
      });
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErr: FormErrors = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRe.test(formData.email)) {
      newErr.email = 'Adresse email invalide.';
    }
    if (formData.password.length < 8) {
      newErr.password = 'Mot de passe trop court (8+ caractères requis).';
    }
    if (formData.password !== formData.confirmPassword) {
      newErr.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }
    if (formData.name && formData.name.length < 2) {
      newErr.name = 'Le nom doit faire au moins 2 caractères.';
    }

    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Formulaire incomplet", {
        description: "Veuillez corriger les erreurs signalées.",
        duration: 4000,
      });
      return;
    }

    const loadingToastId = toast.loading('Création de compte', {
      description: "Enregistrement en cours...",
    });

    setIsLoading(true);

    try {
      await plain.get('/sanctum/csrf-cookie');

      const finalName = formData.name.trim() || formData.email.split('@')[0];

      const payload: RegisterPayload = {
        name: finalName,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      };

      const response = await api.post<RegisterResponse>('/register', payload);
      const data = response.data;

      setIsLoading(false);

      toast.success('Inscription réussie !', {
        description: data.message || 'Votre compte a été créé avec succès.',
        id: loadingToastId,
        duration: 4000,
      });

      if (data.email_sent) {
        setTimeout(() => {
          toast.info('Email de vérification envoyé', {
            description: `Un lien de vérification a été envoyé à ${data.user.email}`,
            duration: 6000,
          });
        }, 1000);
      }

      if (onClose) onClose();
      if (onComplete) onComplete();

      const redirectState = {
        email: data.user.email,
        fromRegistration: true,
        projectName: data.project?.name || null,
        timestamp: Date.now()
      };

      try {
        navigate('/verify-email', { state: redirectState, replace: true });

        setTimeout(() => {
          if (window.location.pathname !== '/verify-email') {
            try {
              sessionStorage.setItem('verify_email_state', JSON.stringify(redirectState));
            } catch {
              // ignore
            }
            window.location.href = '/verify-email';
          }
        }, 500);
      } catch {
        try {
          sessionStorage.setItem('verify_email_state', JSON.stringify(redirectState));
        } catch {
          // ignore
        }
        window.location.href = '/verify-email';
      }

    } catch (error: unknown) {
      setIsLoading(false);

      const axiosError = error as AxiosError<ErrorResponse>;
      const status = axiosError.response?.status;
      const errorMessage = extractErrorMessage(axiosError);

      setErrors({});
      toast.dismiss(loadingToastId);

      if (status === 422 && axiosError.response?.data?.errors?.email) {
        const emailError = axiosError.response.data.errors.email[0];

        if (emailError.includes("already been taken") || emailError.includes("déjà utilisé")) {
          toast.error('Adresse email déjà utilisée', {
            description: 'Cette adresse email est déjà associée à un compte existant.',
            duration: 6000,
          });
          setTimeout(async () => {
            await handleExistingEmailGuidance(formData.email);
          }, 1500);
          return;
        }
      }

      if (status === 422 && axiosError.response?.data?.errors) {
        const serverErrors = axiosError.response.data.errors;
        const newErrors: FormErrors = {};

        if (serverErrors.password) {
          const passwordError = serverErrors.password[0];
          if (passwordError.includes("at least")) {
            newErrors.password = "Le mot de passe doit contenir au moins 8 caractères.";
          } else if (passwordError.includes("confirmation")) {
            newErrors.confirmPassword = "La confirmation du mot de passe ne correspond pas.";
          } else {
            newErrors.password = "Le mot de passe n'est pas valide.";
          }
        }

        if (serverErrors.name && !serverErrors.name[0].includes("email")) {
          newErrors.name = "Le nom doit contenir au moins 2 caractères.";
        }

        if (serverErrors.password_confirmation) {
          newErrors.confirmPassword = "La confirmation du mot de passe ne correspond pas.";
        }

        if (serverErrors.email && !serverErrors.email[0].includes("already been taken")) {
          if (serverErrors.email[0].includes("valid email")) {
            newErrors.email = "L'adresse email n'est pas valide.";
          } else {
            newErrors.email = "L'adresse email est requise.";
          }
        }

        setErrors(newErrors);
        toast.error('Formulaire incomplet', {
          description: 'Veuillez corriger les erreurs signalées dans le formulaire.',
          duration: 6000,
        });
      } else {
        toast.error('Inscription impossible', {
          description: errorMessage,
          duration: 8000,
        });

        if (!errorMessage.includes("email") || !errorMessage.includes("utilisée")) {
          setErrors({ general: errorMessage });
        }
      }

      if (!(status === 422 && errorMessage.includes("email") && errorMessage.includes("utilisée"))) {
        setTimeout(() => {
          suggestUserAction(status);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-landing flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="bg-gradient-card backdrop-blur-glass shadow-premium border-card-border">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-business rounded-lg transform rotate-12 flex items-center justify-center shadow-premium">
                <span className="text-white font-bold text-xl">P</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-text-primary">Créer un compte</CardTitle>
            <CardDescription className="text-text-secondary">
              Rejoignez PixelRise et lancez votre projet digital
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-text-primary font-medium">
                  Nom <span className="text-text-muted font-normal">(facultatif)</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Votre nom complet"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    disabled={isLoading}
                    autoComplete="name"
                    className="pl-10 bg-white/90 border-slate-200 focus:border-brand-blue focus:ring-brand-blue/20 text-text-primary placeholder:text-text-muted"
                  />
                </div>
                {errors.name && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-text-primary font-medium">
                  Adresse email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className="pl-10 bg-white/90 border-slate-200 focus:border-brand-blue focus:ring-brand-blue/20 text-text-primary placeholder:text-text-muted"
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-text-primary font-medium">
                  Mot de passe *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => handleInputChange('password', e.target.value)}
                    placeholder="Au moins 8 caractères"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="pl-10 pr-10 bg-white/90 border-slate-200 focus:border-brand-blue focus:ring-brand-blue/20 text-text-primary placeholder:text-text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted hover:text-text-primary"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password}
                  </div>
                )}
                {formData.password && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">Force :</span>
                    <span className={`px-2 py-0.5 rounded font-medium ${
                      formData.password.length >= 12
                        ? 'bg-green-100 text-green-800'
                        : formData.password.length >= 8
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {formData.password.length >= 12 ? 'Fort' : formData.password.length >= 8 ? 'Moyen' : 'Faible'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirmation mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-text-primary font-medium">
                  Confirmer le mot de passe *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={e => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Retapez votre mot de passe"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="pl-10 pr-10 bg-white/90 border-slate-200 focus:border-brand-blue focus:ring-brand-blue/20 text-text-primary placeholder:text-text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted hover:text-text-primary"
                    aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              {/* Erreur générale */}
              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center text-red-800 text-sm">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    {errors.general}
                  </div>
                </div>
              )}

              {/* Bouton */}
              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !formData.email || !formData.password || !formData.confirmPassword}
                className="w-full bg-gradient-business hover:bg-gradient-business text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-cta hover:shadow-premium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-text-secondary">
                Déjà un compte ?{' '}
                <Link
                  to="/login"
                  className="text-brand-blue hover:text-brand-blue font-semibold hover:underline transition-colors"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
