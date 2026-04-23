// src/pages/VerifyEmail.tsx - CORRECTION BOUCLE INFINIE

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, AlertCircle, Clock, RefreshCw, Edit, ArrowLeft, Info } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import type { AxiosError } from 'axios';

// ✅ INTERFACES TYPESCRIPT STRICTES
interface VerifyEmailState {
  isResending: boolean;
  lastResendTime: number | null;
  resendCount: number;
  maxResends: number;
  timeUntilNextResend: number;
  error: string | null;
}

interface ResendResponse {
  success: boolean;
  message: string;
  email?: string;
  remaining_attempts?: number;
  next_attempt_available_in?: number;
  rate_limited?: boolean;
}

interface ErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  remaining_attempts?: number;
}

interface EmailData {
  email: string;
  fromRegistration: boolean;
  projectName: string | null;
  fromError?: boolean;
  originalError?: string;
}

const VerifyEmail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // ✅ MÉMOISATION POUR ÉVITER LA BOUCLE INFINIE
  const emailData = useMemo((): EmailData => {
    console.log("🔄 [VerifyEmail] Calcul données email (une seule fois)");
    
    // 1. Essayer d'abord les données de navigation React Router
    if (location.state?.email) {
      console.log("📧 [VerifyEmail] Données depuis React Router:", location.state);
      return {
        email: location.state.email,
        fromRegistration: location.state.fromRegistration || false,
        projectName: location.state.projectName || null,
        fromError: location.state.fromError || false,
        originalError: location.state.originalError || null,
      };
    }
    
    // 2. Fallback : récupérer depuis sessionStorage
    try {
      const savedData = sessionStorage.getItem('verify_email_state');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log("💾 [VerifyEmail] Données depuis sessionStorage:", parsed);
        
        // Nettoyer sessionStorage après usage
        sessionStorage.removeItem('verify_email_state');
        
        return {
          email: parsed.email || '',
          fromRegistration: parsed.fromRegistration || false,
          projectName: parsed.projectName || null,
          fromError: parsed.fromError || false,
          originalError: parsed.originalError || null,
        };
      }
    } catch (e) {
      console.warn("⚠️ [VerifyEmail] Erreur sessionStorage:", e);
    }
    
    // 3. Valeurs par défaut si rien trouvé
    console.warn("⚠️ [VerifyEmail] Aucune donnée trouvée, valeurs par défaut");
    return {
      email: '',
      fromRegistration: false,
      projectName: null,
      fromError: false,
      originalError: null,
    };
  }, [location.state]); // ✅ Dépendance uniquement sur location.state

  const { email, fromRegistration, projectName, fromError, originalError } = emailData;

  // ✅ STATE MANAGEMENT COMPLET
  const [state, setState] = useState<VerifyEmailState>({
    isResending: false,
    lastResendTime: null,
    resendCount: 0,
    maxResends: 3,
    timeUntilNextResend: 0,
    error: null,
  });

  // ✅ TIMER POUR COUNTDOWN RENVOI
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state.timeUntilNextResend > 0) {
      interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeUntilNextResend: Math.max(0, prev.timeUntilNextResend - 1)
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.timeUntilNextResend]);

  // ✅ EFFET INITIAL : Démarrer timer si premier envoi
  useEffect(() => {
    if (fromRegistration) {
      setState(prev => ({
        ...prev,
        timeUntilNextResend: 60,
        lastResendTime: Date.now(),
      }));
    }
  }, [fromRegistration]);

  // ✅ DEBUG INITIAL (UNE SEULE FOIS)
  useEffect(() => {
    console.log("🎯 [VerifyEmail] Composant chargé avec:", {
      email,
      fromRegistration,
      projectName,
      fromError,
      originalError,
      currentPath: window.location.pathname
    });
    
    if (fromError && originalError) {
      toast.error('❌ Erreur précédente', {
        description: originalError,
        duration: 6000,
      });
    }
  }, []); // ✅ Dépendances vides pour une seule exécution

  // ✅ FONCTION : Masquer email pour sécurité
  const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return '***@***.***';
    
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : '*'.repeat(username.length);
    
    const domainParts = domain.split('.');
    const maskedDomain = domainParts.map(part => 
      part.length > 2 ? part.substring(0, 2) + '*'.repeat(part.length - 2) : '*'.repeat(part.length)
    ).join('.');
    
    return `${maskedUsername}@${maskedDomain}`;
  };

  // ✅ FONCTION : Formater temps restant
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  // ✅ FONCTION PRINCIPALE : Renvoyer email de vérification
  const handleResendEmail = async (): Promise<void> => {
    if (state.isResending || state.timeUntilNextResend > 0 || state.resendCount >= state.maxResends) {
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isResending: true, 
      error: null 
    }));

    try {
      console.log('📧 [VerifyEmail] Tentative renvoi email', {
        email,
        attempt: state.resendCount + 1,
        maxAttempts: state.maxResends,
      });

      const response = await api.post<ResendResponse>('/auth/resend-verification-email', {
        email: email
      });

      console.log('✅ [VerifyEmail] Renvoi email réussi', response.data);

      setState(prev => ({
        ...prev,
        isResending: false,
        resendCount: prev.resendCount + 1,
        lastResendTime: Date.now(),
        timeUntilNextResend: 1200, // 20 minutes
        error: null,
      }));

      toast.success('Email de vérification renvoyé', {
        description: `Consultez votre boîte email${email ? ` (${maskEmail(email)})` : ''}.`,
        duration: 5000,
      });

      const remainingAttempts = state.maxResends - (state.resendCount + 1);
      if (remainingAttempts > 0) {
        toast.info('Tentatives restantes', {
          description: `Vous pouvez encore renvoyer l'email ${remainingAttempts} fois.`,
          duration: 4000,
        });
      } else {
        toast.warning('Limite atteinte', {
          description: 'Vous avez atteint la limite de renvois. Contactez le support si nécessaire.',
          duration: 8000,
        });
      }

    } catch (error) {
      console.error('❌ [VerifyEmail] Erreur renvoi email:', error);
      
      const axiosError = error as AxiosError<ErrorResponse>;
      let errorMessage = 'Erreur lors du renvoi de l\'email de vérification.';
      let timeUntilNextResend = 0;

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        errorMessage = errorData.message || errorMessage;
        
        if (axiosError.response.status === 429) {
          errorMessage = 'Trop de tentatives. Veuillez patienter avant de réessayer.';
          timeUntilNextResend = 1800; // 30 minutes
        }
        
        if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0]?.[0];
          if (firstError) {
            errorMessage = firstError;
          }
        }
      } else if (axiosError.code === 'ERR_NETWORK') {
        errorMessage = 'Problème de connexion réseau. Vérifiez votre connexion internet.';
        timeUntilNextResend = 60;
      }

      setState(prev => ({
        ...prev,
        isResending: false,
        error: errorMessage,
        timeUntilNextResend: Math.max(timeUntilNextResend, prev.timeUntilNextResend),
      }));

      toast.error('Renvoi impossible', {
        description: errorMessage,
        duration: 8000,
      });
    }
  };

  // ✅ RENDU PRINCIPAL
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>

          <CardTitle className="text-2xl font-bold text-gray-900">
            {fromRegistration 
              ? 'Votre compte a été créé avec succès !'
              : 'Finalisez la vérification de votre adresse email'
            }
          </CardTitle>

          <CardDescription className="text-base text-gray-600">
            {fromRegistration
              ? 'Un email de vérification vient de vous être envoyé.'
              : 'Veuillez vérifier votre adresse email pour continuer.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ✅ INFORMATION EMAIL */}
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-700 font-medium">
              Un lien de vérification a été envoyé à :
            </p>
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="font-semibold text-gray-900 text-lg">
                {email || 'votre adresse email'}
              </p>
              {email && (
                <p className="text-xs text-gray-500 mt-1">
                  Masqué : {maskEmail(email)}
                </p>
              )}
            </div>
          </div>

          {/* ✅ INSTRUCTIONS DÉTAILLÉES */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">
                  📧 Étapes à suivre :
                </h4>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="font-medium min-w-[20px]">1.</span>
                    <span>Consultez votre boîte email (et dossier spam)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-medium min-w-[20px]">2.</span>
                    <span>Cliquez sur le lien de vérification</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-medium min-w-[20px]">3.</span>
                    <span>Revenez ici pour vous connecter</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* ✅ MESSAGE D'ERREUR */}
          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h4 className="font-medium text-red-900">Erreur</h4>
              </div>
              <p className="text-sm text-red-800">{state.error}</p>
            </div>
          )}

          {/* ✅ BOUTON RENVOI EMAIL */}
          <div className="space-y-4">
            <Button
              onClick={handleResendEmail}
              disabled={state.isResending || state.timeUntilNextResend > 0 || state.resendCount >= state.maxResends}
              className="w-full"
              variant={state.resendCount >= state.maxResends ? "destructive" : "default"}
            >
              {state.isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : state.timeUntilNextResend > 0 ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Renvoyer dans {formatTimeRemaining(state.timeUntilNextResend)}
                </>
              ) : state.resendCount >= state.maxResends ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Limite atteinte ({state.resendCount}/{state.maxResends})
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Renvoyer l'email ({state.resendCount}/{state.maxResends})
                </>
              )}
            </Button>

            {/* ✅ COMPTEUR TENTATIVES */}
            {state.resendCount > 0 && (
              <p className="text-xs text-gray-500 text-center">
                Tentatives utilisées : {state.resendCount}/{state.maxResends}
              </p>
            )}
          </div>

          {/* ✅ ACTIONS ALTERNATIVES */}
          <div className="space-y-3 pt-4 border-t">
            <Button
              onClick={() => navigate('/register')}
              variant="outline"
              className="w-full"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier l'adresse email
            </Button>

            <div className="text-center">
              <Link 
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour à la connexion
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;