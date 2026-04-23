// src/components/BlogDebug.tsx - COMPOSANT DE TEST TEMPORAIRE
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

const BlogDebug: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('🚨 [BlogDebug] État actuel:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      isAuthenticated,
      loading,
      userName: user?.name,
      userRole: user?.role,
      hasToken: !!localStorage.getItem('auth_token'),
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, loading, user, location]);

  // Affichage temporaire pour debug
  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-400 rounded-lg p-4 text-sm z-50 max-w-sm">
      <h3 className="font-bold text-red-800 mb-2">🔍 Debug Auth</h3>
      <div className="space-y-1 text-red-700">
        <div>Path: {location.pathname}</div>
        <div>Loading: {loading ? '✅' : '❌'}</div>
        <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
        <div>User: {user?.name || 'Non connecté'}</div>
        <div>Token: {localStorage.getItem('auth_token') ? '✅' : '❌'}</div>
      </div>
      
      {/* Tests */}
      <div className="mt-3 space-y-1">
        <button 
          onClick={() => {
            localStorage.removeItem('auth_token');
            window.location.reload();
          }}
          className="text-xs bg-red-200 px-2 py-1 rounded block w-full"
        >
          Clear Token & Reload
        </button>
        <button 
          onClick={() => navigate('/blog')}
          className="text-xs bg-blue-200 px-2 py-1 rounded block w-full"
        >
          Force Navigate /blog
        </button>
      </div>
    </div>
  );
};

export default BlogDebug;