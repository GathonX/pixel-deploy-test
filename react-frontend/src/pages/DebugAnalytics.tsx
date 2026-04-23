// src/pages/DebugAnalytics.tsx - Page de debug Google Analytics
import React from 'react';
import GoogleAnalyticsProof from '@/components/debug/GoogleAnalyticsProof';

const DebugAnalytics: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🔬 Page de Test Google Analytics
          </h1>
          <p className="text-gray-600">
            Validation complète du système de tracking avec preuves techniques
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <span>Tracking ID: </span>
            <code className="bg-gray-200 px-2 py-1 rounded">
              {import.meta.env.VITE_GA_TRACKING_ID || 'Non configuré'}
            </code>
          </div>
        </div>
        
        <GoogleAnalyticsProof />
      </div>
    </div>
  );
};

export default DebugAnalytics;