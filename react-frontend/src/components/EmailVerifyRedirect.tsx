// src/pages/EmailVerifyRedirect.tsx - COMPOSANT DE REDIRECTION

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * ✅ COMPOSANT DE REDIRECTION INTELLIGENTE
 * 
 * Ce composant gère la redirection depuis Laravel (/verify-email-confirmed)
 * vers le composant React approprié (/email/verify) en transférant tous les paramètres.
 */
const EmailVerifyRedirect: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔄 [EmailVerifyRedirect] Redirection intelligente...');
    
    // ✅ Extraire tous les paramètres de l'URL
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    
    // ✅ Construire la nouvelle URL avec tous les paramètres
    const newSearchParams = new URLSearchParams();
    
    if (token) {
      newSearchParams.set('token', token);
      console.log('🎟️ [EmailVerifyRedirect] Token transféré:', token.substring(0, 20) + '...');
    }
    
    if (email) {
      newSearchParams.set('email', email);
      console.log('📧 [EmailVerifyRedirect] Email transféré:', email);
    }
    
    // ✅ Ajouter d'autres paramètres si présents
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'token' && key !== 'email') {
        newSearchParams.set(key, value);
        console.log(`🔗 [EmailVerifyRedirect] Paramètre transféré: ${key}=${value}`);
      }
    }
    
    // ✅ Redirection vers le bon composant
    const newUrl = `/email/verify?${newSearchParams.toString()}`;
    console.log('➡️ [EmailVerifyRedirect] Redirection vers:', newUrl);
    
    navigate(newUrl, { replace: true });
  }, [navigate, searchParams]);

  // ✅ AFFICHAGE PENDANT LA REDIRECTION
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <h2 className="text-lg font-medium text-gray-900">Redirection en cours...</h2>
        <p className="text-gray-600">Vous allez être redirigé vers la page de vérification.</p>
      </div>
    </div>
  );
};

export default EmailVerifyRedirect;