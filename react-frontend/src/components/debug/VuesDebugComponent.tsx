// src/components/debug/VuesDebugComponent.tsx
// Composant de debug pour vérifier les vues depuis l'API

import React, { useState, useEffect } from "react";
import { fetchBlogPosts, BlogPostFromAPI } from "@/services/blogService";

interface ApiDebugInfo {
  postId: number;
  title: string;
  rawViews: number | undefined;
  rawViewCount: number | undefined;
  finalViews: number;
  otherFields: {
    likes: number;
    commentsCount: number;
    sharesCount: number;
  };
}

export const VuesDebugComponent: React.FC = () => {
  const [debugData, setDebugData] = useState<ApiDebugInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testApiData = async () => {
      try {
        console.log('[VuesDebugComponent] Test des données API...');
        const response = await fetchBlogPosts();
        const rawPosts: BlogPostFromAPI[] = Array.isArray(response.data.data) 
          ? response.data.data 
          : [];

        console.log('[VuesDebugComponent] Données brutes de l\'API:', rawPosts);

        const debugInfo: ApiDebugInfo[] = rawPosts.map(post => ({
          postId: post.id,
          title: post.title.substring(0, 50) + '...',
          rawViews: post.views,
          rawViewCount: post.viewCount,
          finalViews: post.views ?? post.viewCount ?? 0,
          otherFields: {
            likes: post.likes || 0,
            commentsCount: post.commentsCount || 0,
            sharesCount: post.sharesCount || 0,
          }
        }));

        setDebugData(debugInfo);

        // Log détaillé pour debug
        debugInfo.forEach(info => {
          console.log(`[VuesDebugComponent] Post ${info.postId}:`, {
            title: info.title,
            rawViews: info.rawViews,
            rawViewCount: info.rawViewCount,
            finalViews: info.finalViews,
            hasViews: info.finalViews > 0
          });
        });

      } catch (err) {
        console.error('[VuesDebugComponent] Erreur:', err);
        setError('Erreur lors du chargement des données API');
      } finally {
        setLoading(false);
      }
    };

    testApiData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">🔍 Test des vues API</h3>
        <p className="text-blue-700">Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-semibold text-red-800 mb-2">❌ Erreur de test</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const postsWithViews = debugData.filter(d => d.finalViews > 0);
  const postsWithoutViews = debugData.filter(d => d.finalViews === 0);

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-6">
      <h3 className="font-semibold text-gray-800 mb-4">🔍 Debug - Test des vues API</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <h4 className="font-semibold text-green-800">✅ Posts avec vues ({postsWithViews.length})</h4>
          {postsWithViews.slice(0, 3).map(post => (
            <div key={post.postId} className="text-sm text-green-700 mt-1">
              Post {post.postId}: {post.finalViews.toLocaleString()} vues
            </div>
          ))}
        </div>

        <div className="bg-red-50 p-3 rounded border border-red-200">
          <h4 className="font-semibold text-red-800">❌ Posts sans vues ({postsWithoutViews.length})</h4>
          {postsWithoutViews.slice(0, 3).map(post => (
            <div key={post.postId} className="text-sm text-red-700 mt-1">
              Post {post.postId}: 0 vues
            </div>
          ))}
        </div>
      </div>

      {/* Détail du premier post avec vues */}
      {postsWithViews.length > 0 && (
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">🔍 Détail du premier post avec vues:</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div><strong>ID:</strong> {postsWithViews[0].postId}</div>
            <div><strong>Titre:</strong> {postsWithViews[0].title}</div>
            <div><strong>API views:</strong> {postsWithViews[0].rawViews ?? 'undefined'}</div>
            <div><strong>API viewCount:</strong> {postsWithViews[0].rawViewCount ?? 'undefined'}</div>
            <div><strong>Vues finales:</strong> {postsWithViews[0].finalViews}</div>
            <div><strong>Autres stats:</strong> 
              {postsWithViews[0].otherFields.likes} likes, 
              {postsWithViews[0].otherFields.commentsCount} commentaires, 
              {postsWithViews[0].otherFields.sharesCount} partages
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600">
        <strong>Instructions:</strong> Si vous voyez vos 1351 vues dans "Posts avec vues", 
        le problème est résolu. Sinon, vérifiez que votre API Laravel retourne bien le champ "views".
      </div>
    </div>
  );
};