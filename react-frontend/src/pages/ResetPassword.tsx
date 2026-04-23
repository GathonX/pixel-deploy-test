// src/pages/ResetPassword.tsx
import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import plain from '@/services/plain';
import type { AxiosError } from 'axios';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await plain.get('/sanctum/csrf-cookie');
      await api.post('/reset-password', {
        email,
        token,
        password,
        password_confirmation: confirm,
      });
      toast({
        title: 'Succès',
        description: 'Votre mot de passe a bien été réinitialisé.',
      });
      navigate('/login');
    } catch (error: unknown) {
      if ((error as AxiosError).isAxiosError) {
        const axiosErr = error as AxiosError<{
          message?: string;
          errors?: Record<string, string[]>;
        }>;
        const msg =
          axiosErr.response?.data?.errors?.password?.[0] ??
          axiosErr.response?.data?.message ??
          axiosErr.message;
        toast({
          title: 'Erreur',
          description: msg,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Une erreur inattendue est survenue.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center relative">
      {/* Décos */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-pixelrise-yellow to-orange-400 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-pixelrise-yellow to-orange-400 rounded-full translate-y-1/2 -translate-x-1/2" />


      {/* Wrapper du formulaire */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white shadow-xl rounded-lg p-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-pixelrise-blue rounded-lg rotate-12 mr-1" />
              <span className="text-2xl font-bold">
                <span className="text-pixelrise-yellow">Pixel</span>Rise
              </span>
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-center">
            Choisissez un nouveau mot de passe
          </h1>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (readonly) */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Nouveau mot de passe */}
            <div className="relative space-y-1">
              <label htmlFor="password" className="block text-gray-700">
                Nouveau mot de passe
              </label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 transform translate-y-1/5 text-gray-500"
                aria-label="Afficher / Masquer le mot de passe"
              >
                {showPassword ? (
                  <EyeOffIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Confirmation du mot de passe */}
            <div className="relative space-y-1">
              <label htmlFor="confirm" className="block text-gray-700">
                Confirmer le mot de passe
              </label>
              <Input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 transform translate-y-1/5 text-gray-500"
                aria-label="Afficher / Masquer la confirmation"
              >
                {showConfirm ? (
                  <EyeOffIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Bouton Submit */}
            <Button
              type="submit"
              className="w-full bg-pixelrise-yellow hover:bg-amber-500 text-black font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Patientez…' : 'Changer le mot de passe'}
            </Button>
          </form>

          {/* Liens secondaires */}
          <div className="text-center space-y-2">
            <Link
              to="/login"
              className="block text-pixelrise-yellow hover:underline text-sm"
            >
              ← Retour à la connexion
            </Link>
            <p className="text-gray-600 text-sm">
              Pas encore de compte ?{' '}
              <Link
                to="/register"
                className="text-pixelrise-yellow font-medium hover:underline"
              >
                S’inscrire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
