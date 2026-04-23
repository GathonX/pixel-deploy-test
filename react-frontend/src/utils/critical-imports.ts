// utils/critical-imports.ts - Bundle minimal pour démarrage rapide
import React from "react";

// === COMPOSANT DE CHARGEMENT ===
export const PageLoader: React.FC = () => {
  return React.createElement('div', 
    { className: 'min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50' },
    React.createElement('div', 
      { className: 'text-center' },
      React.createElement('div', 
        { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4' }
      ),
      React.createElement('p', 
        { className: 'text-gray-600 font-medium' }, 
        'Chargement...'
      )
    )
  );
};