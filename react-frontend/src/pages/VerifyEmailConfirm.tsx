// src/pages/VerifyEmailConfirm.tsx - WORKFLOW AUTO-LOGIN SÉCURISÉ OPTION 2

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import plain from '@/services/plain';
import type { AxiosError } from 'axios';

// ✅ INTERFACES TYPESCRIPT STRICTES
interface AutoLoginState {
  isProcessing: boolean;
  isSuccess: boolean;
  error: string | null;
  retryCount: number;
  maxRetries: number;
}

interface TempTokenExchangePayload {
  temp_token: string;
  user_id: number;
  context: string;
}

interface TempTokenExchangeResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    email_verified_at: string;
  };
  authenticated: boolean;
  context: string;
  session_id: string;
  redirect_to: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  retry_allowed?: boolean;
}

const VerifyEmailConfirm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser, refreshStatus } = useAuth();

  // ✅ EXTRACTION PARAMÈTRES URL SÉCURISÉE
  const token = searchParams.get('token');
  const userId = searchParams.get('user_id');
  const context = searchParams.get('context') || 'unknown';
  const verifiedAt = searchParams.get('verified_at');
  const error = searchParams.get('error');

  // ✅ STATE MANAGEMENT COMPLET
  const [state, setState] = useState<AutoLoginState>({
    isProcessing: false,
    isSuccess: false,
    error: null,
    retryCount: 0,
    maxRetries: 3,
  });

  // ✅ FONCTION PRINCIPALE : Auto-login sécurisé
  const performSecureAutoLogin = useCallback(async (): Promise<void> => {
    // ✅ 1. VALIDATION PARAMÈTRES
    if (!token || !userId) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Paramètres de connexion manquants. Veuillez utiliser le lien complet reçu par email.',
      }));
      return;
    }

    if (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error,
      }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      console.log('🔄 [AutoLogin] Début échange token temporaire', {
        userId,
        context,
        attempt: state.retryCount + 1,
      });

      // ✅ 2. ÉCHANGE TOKEN TEMPORAIRE CONTRE SESSION SANCTUM
      const payload: TempTokenExchangePayload = {
        temp_token: token,
        user_id: parseInt(userId),
        context: context,
      };

      const response = await api.post<TempTokenExchangeResponse>(
        '/auth/exchange-temp-token',
        payload
      );

      console.log('✅ [AutoLogin] Échange token réussi', response.data);

      // ✅ 3. MISE À JOUR STATE SUCCÈS
      setState(prev => ({
        ...prev,
        isProcessing: false,
        isSuccess: true,
        error: null,
      }));

      // ✅ 4. RAFRAÎCHIR CONTEXTE UTILISATEUR
      await refreshUser();
      
      // ✅ 5. TOAST DE SUCCÈS
      const successMessage = context === 'newly_verified'
        ? 'Email vérifié ! Connexion automatique réussie.'
        : 'Connexion automatique réussie.';

      toast.success(successMessage, {
        description: 'Redirection vers votre dashboard...',
        duration: 4000,
      });


      // ✅ 7. REDIRECTION AUTOMATIQUE APRÈS SUCCÈS
      setTimeout(() => {
        navigate('/workspace', {
          replace: true,
          state: {
            fromEmailVerification: true,
            context: context,
            message: context === 'newly_verified' ? 'Bienvenue ! Votre email a été vérifié.' : undefined,
          }
        });
      }, 2000);

    } catch (error) {
      console.error('❌ [AutoLogin] Erreur échange token:', error);
      
      const axiosError = error as AxiosError<ErrorResponse>;
      let errorMessage = 'Une erreur est survenue lors de la connexion automatique.';
      let retryAllowed = false;

      // ✅ 8. GESTION D'ERREURS GRANULAIRE
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        errorMessage = errorData.message || errorMessage;
        retryAllowed = errorData.retry_allowed ?? false;

        // Gestion erreurs de validation spécifiques
        if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0]?.[0];
          if (firstError) {
            errorMessage = firstError;
          }
        }
      } else if (axiosError.code === 'ERR_NETWORK') {
        errorMessage = 'Problème de connexion réseau. Vérifiez votre connexion internet.';
        retryAllowed = true;
      } else if (axiosError.code === 'ECONNABORTED') {
        errorMessage = 'La connexion a pris trop de temps. Veuillez réessayer.';
        retryAllowed = true;
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1,
      }));

      // ✅ 9. TOAST D'ERREUR AVEC ACTION
      if (retryAllowed && state.retryCount < state.maxRetries) {
        toast.error('Connexion automatique échouée', {
          description: errorMessage,
          action: {
            label: "Réessayer",
            onClick: () => performSecureAutoLogin(),
          },
          duration: 8000,
        });
      } else {
        toast.error('Connexion automatique impossible', {
          description: 'Vous pouvez vous connecter manuellement.',
          action: {
            label: "Se connecter",
            onClick: () => navigate('/login', { 
              state: { 
                emailVerified: context === 'newly_verified',
                message: context === 'newly_verified' ? 'Votre email a été vérifié ! Connectez-vous maintenant.' : undefined
              }
            })
          },
          duration: 10000,
        });
      }
    }
  }, [token, userId, context, navigate, refreshUser, refreshStatus, state.retryCount, state.maxRetries, error]);

  // ✅ EFFET : Lancer l'auto-login au montage
  useEffect(() => {
    performSecureAutoLogin();
  }, [performSecureAutoLogin]);

  // ✅ HANDLERS POUR LES ACTIONS UTILISATEUR
  const handleRetryAutoLogin = (): void => {
    if (state.retryCount >= state.maxRetries) {
      toast.warning('Nombre maximum de tentatives atteint', {
        description: 'Veuillez vous connecter manuellement.',
      });
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      error: null, 
      retryCount: prev.retryCount + 1 
    }));
    performSecureAutoLogin();
  };

  const handleGoToLogin = (): void => {
    navigate('/login', { 
      state: { 
        emailVerified: context === 'newly_verified',
        message: context === 'newly_verified' ? 'Votre email a été vérifié ! Connectez-vous maintenant.' : undefined
      },
      replace: true 
    });
  };

  const handleGoToDashboard = (): void => {
    navigate('/workspace', {
      replace: true,
      state: {
        fromEmailVerification: true,
        context: context,
      }
    });
  };

  // ✅ RENDU CONDITIONNEL OPTIMISÉ
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {state.isProcessing && (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            )}
            {state.isSuccess && (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
            {state.error && (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
          </div>

          <CardTitle className="text-2xl font-bold">
            {state.isProcessing && 'Connexion automatique...'}
            {state.isSuccess && (
              context === 'newly_verified' ? 'Email vérifié !' : 'Connexion réussie !'
            )}
            {state.error && 'Échec de la connexion'}
          </CardTitle>

          <CardDescription>
            {state.isProcessing && 'Validation de votre token de vérification...'}
            {state.isSuccess && 'Redirection vers votre espace personnel...'}
            {state.error && 'Une erreur est survenue lors de la connexion automatique.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ÉTAT : Traitement */}
          {state.isProcessing && (
            <div className="text-center space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-blue-800">
                    Authentification en cours...
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-500">
                {state.retryCount > 0 && `Tentative ${state.retryCount + 1}/${state.maxRetries + 1}`}
              </p>
            </div>
          )}

          {/* ÉTAT : Succès */}
          {state.isSuccess && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">
                      Authentification réussie
                    </h4>
                    <p className="text-green-700 text-sm">
                      {context === 'newly_verified'
                        ? 'Félicitations ! Votre email a été vérifié et vous êtes maintenant connecté.'
                        : 'Vous êtes maintenant connecté à votre compte.'
                      }
                    </p>
                    <p className="text-gray-600 text-sm mt-2">
                      Redirection automatique vers votre dashboard...
                    </p>
                    
                    {verifiedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Vérifié le {new Date(verifiedAt).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleGoToDashboard}
                className="w-full"
                size="lg"
              >
                Accéder au dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ÉTAT : Erreur */}
          {state.error && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">
                      Connexion automatique échouée
                    </h4>
                    <p className="text-red-700 text-sm">
                      {state.error}
                    </p>
                    
                    {state.retryCount > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Tentatives: {state.retryCount}/{state.maxRetries}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {state.retryCount < state.maxRetries && (
                  <Button 
                    onClick={handleRetryAutoLogin}
                    variant="default"
                    disabled={state.isProcessing}
                    className="w-full"
                  >
                    {state.isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Nouvelle tentative...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Réessayer la connexion
                      </>
                    )}
                  </Button>
                )}
                
                <Button 
                  onClick={handleGoToLogin}
                  variant="outline"
                  className="w-full"
                >
                  Connexion manuelle
                </Button>
              </div>
            </div>
          )}

          {/* Informations de debug (dev seulement) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-600">
              <strong>Debug Info:</strong><br />
              Token: {token ? `${token.substring(0, 20)}...` : 'Non fourni'}<br />
              User ID: {userId || 'Non fourni'}<br />
              Context: {context}<br />
              Retry Count: {state.retryCount}/{state.maxRetries}<br />
              Verified At: {verifiedAt || 'N/A'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailConfirm;