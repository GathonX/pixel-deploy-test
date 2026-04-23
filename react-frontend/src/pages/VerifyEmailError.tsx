// src/pages/VerifyEmailError.tsx - PAGE D'ERREUR VÉRIFICATION EMAIL

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ArrowLeft, Mail, Clock } from 'lucide-react';

// ✅ INTERFACES TYPESCRIPT STRICTES
interface ErrorInfo {
  type: 'expired' | 'invalid' | 'server' | 'unknown';
  title: string;
  description: string;
  action: string;
  icon: React.ReactNode;
}

const VerifyEmailError: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // ✅ EXTRACTION PARAMÈTRES D'ERREUR
  const errorMessage = searchParams.get('error') || 'Erreur inconnue';
  const timestamp = searchParams.get('timestamp');

  // ✅ DÉTERMINER TYPE D'ERREUR ET ACTIONS
  const getErrorInfo = (message: string): ErrorInfo => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('expiré') || lowerMessage.includes('expired')) {
      return {
        type: 'expired',
        title: 'Lien expiré',
        description: 'Ce lien de vérification a expiré. Les liens sont valides pendant 60 minutes seulement.',
        action: 'Demander un nouveau lien',
        icon: <Clock className="w-8 h-8 text-orange-600" />
      };
    }
    
    if (lowerMessage.includes('invalide') || lowerMessage.includes('invalid')) {
      return {
        type: 'invalid',
        title: 'Lien invalide',
        description: 'Ce lien de vérification n\'est pas valide ou a déjà été utilisé.',
        action: 'Demander un nouveau lien',
        icon: <AlertTriangle className="w-8 h-8 text-red-600" />
      };
    }
    
    if (lowerMessage.includes('serveur') || lowerMessage.includes('server') || lowerMessage.includes('500')) {
      return {
        type: 'server',
        title: 'Erreur du serveur',
        description: 'Un problème temporaire empêche la vérification de votre email.',
        action: 'Réessayer',
        icon: <RefreshCw className="w-8 h-8 text-blue-600" />
      };
    }
    
    return {
      type: 'unknown',
      title: 'Erreur de vérification',
      description: 'Une erreur inattendue s\'est produite lors de la vérification.',
      action: 'Demander un nouveau lien',
      icon: <AlertTriangle className="w-8 h-8 text-gray-600" />
    };
  };

  const errorInfo = getErrorInfo(errorMessage);

  // ✅ HANDLERS ACTIONS
  const handleRequestNewLink = (): void => {
    navigate('/verify-email', { replace: true });
  };

  const handleRetry = (): void => {
    // Recharger la page pour retenter
    window.location.reload();
  };

  const handleGoToLogin = (): void => {
    navigate('/login', { replace: true });
  };

  const handleGoHome = (): void => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            {errorInfo.icon}
          </div>

          <CardTitle className="text-2xl font-bold text-gray-900">
            {errorInfo.title}
          </CardTitle>

          <CardDescription className="text-gray-600">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ✅ DÉTAILS DE L'ERREUR */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 mb-1">
                  Message d'erreur
                </h4>
                <p className="text-red-700 text-sm">
                  {errorMessage}
                </p>
                {timestamp && (
                  <p className="text-red-600 text-xs mt-2">
                    Survenue le {new Date(timestamp).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ✅ ACTIONS SELON TYPE D'ERREUR */}
          <div className="space-y-3">
            {errorInfo.type === 'server' ? (
              <Button
                onClick={handleRetry}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {errorInfo.action}
              </Button>
            ) : (
              <Button
                onClick={handleRequestNewLink}
                className="w-full"
                size="lg"
              >
                <Mail className="w-4 h-4 mr-2" />
                {errorInfo.action}
              </Button>
            )}

            <Button
              onClick={handleGoToLogin}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Se connecter manuellement
            </Button>
          </div>

          {/* ✅ CONSEILS SELON L'ERREUR */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              💡 Conseils :
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {errorInfo.type === 'expired' && (
                <>
                  <li>• Les liens expirent après 60 minutes pour votre sécurité</li>
                  <li>• Demandez un nouveau lien et utilisez-le rapidement</li>
                  <li>• Vérifiez l'heure de l'email reçu</li>
                </>
              )}
              {errorInfo.type === 'invalid' && (
                <>
                  <li>• Assurez-vous de cliquer sur le bon lien</li>
                  <li>• Utilisez le lien le plus récent reçu</li>
                  <li>• Ne copiez pas partiellement l'URL</li>
                </>
              )}
              {errorInfo.type === 'server' && (
                <>
                  <li>• Problème temporaire côté serveur</li>
                  <li>• Réessayez dans quelques minutes</li>
                  <li>• Contactez le support si le problème persiste</li>
                </>
              )}
              {errorInfo.type === 'unknown' && (
                <>
                  <li>• Vérifiez votre connexion internet</li>
                  <li>• Essayez depuis un autre navigateur</li>
                  <li>• Contactez le support si nécessaire</li>
                </>
              )}
            </ul>
          </div>

          {/* ✅ NAVIGATION ALTERNATIVE */}
          <div className="border-t pt-4 space-y-2">
            <Button
              onClick={handleGoHome}
              variant="ghost"
              className="w-full"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </div>

          {/* ✅ SUPPORT CONTACT */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Problème persistant ?{' '}
              <a 
                href="mailto:support@pixelrise.com" 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Contactez le support
              </a>
            </p>
          </div>

          {/* ✅ DEBUG INFO (dev seulement) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="border-t pt-4">
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  🔧 Debug Info (dev only)
                </summary>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                  <strong>Error Details:</strong><br />
                  Type: {errorInfo.type}<br />
                  Message: {errorMessage}<br />
                  Timestamp: {timestamp || 'N/A'}<br />
                  URL Params: {searchParams.toString()}<br />
                  User Agent: {navigator.userAgent.substring(0, 50)}...
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailError;